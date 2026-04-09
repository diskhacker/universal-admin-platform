import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../../config/database.js";
import { NotFoundError, ConflictError } from "../../shared/errors/index.js";
import { eventBus, Events } from "../../shared/events/index.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

// ── Service ──

export class RbacService {
  private db = getDb();

  async listRoles(productId: string) {
    return this.db.roleDefinition.findMany({ where: { productId }, orderBy: { name: "asc" } });
  }

  async createRole(productId: string, input: { name: string; displayName: string; description?: string; permissions: string[] }) {
    const existing = await this.db.roleDefinition.findUnique({ where: { productId_name: { productId, name: input.name } } });
    if (existing) throw new ConflictError("Role already exists");
    return this.db.roleDefinition.create({ data: { productId, ...input } });
  }

  async updateRole(roleId: string, input: { displayName?: string; description?: string; permissions?: string[] }) {
    const role = await this.db.roleDefinition.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError("Role", roleId);
    if (role.isSystem) throw new ConflictError("Cannot modify system role");
    return this.db.roleDefinition.update({ where: { id: roleId }, data: input });
  }

  async deleteRole(roleId: string) {
    const role = await this.db.roleDefinition.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError("Role", roleId);
    if (role.isSystem) throw new ConflictError("Cannot delete system role");
    await this.db.roleDefinition.delete({ where: { id: roleId } });
  }

  async assignRole(userId: string, roleId: string, grantedBy?: string, expiresAt?: Date) {
    const role = await this.db.roleDefinition.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError("Role", roleId);
    const assignment = await this.db.roleAssignment.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId, grantedBy, expiresAt },
      update: { expiresAt, grantedBy },
    });
    await eventBus.emit(Events.ROLE_ASSIGNED, { userId, roleId, role: role.name });
    return assignment;
  }

  async revokeRole(userId: string, roleId: string) {
    await this.db.roleAssignment.delete({ where: { userId_roleId: { userId, roleId } } });
    await eventBus.emit(Events.ROLE_REVOKED, { userId, roleId });
  }

  async getUserRoles(userId: string) {
    return this.db.roleAssignment.findMany({
      where: { userId }, include: { role: true },
    });
  }

  // Approval workflows
  async createApproval(tenantId: string, productId: string, resourceType: string, resourceId: string, requestedBy: string, expiresInMinutes = 60) {
    return this.db.approvalRequest.create({
      data: {
        tenantId, productId, resourceType, resourceId, requestedBy,
        expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      },
    });
  }

  async resolveApproval(approvalId: string, approvedBy: string, status: "APPROVED" | "REJECTED", reason?: string) {
    const approval = await this.db.approvalRequest.findUnique({ where: { id: approvalId } });
    if (!approval) throw new NotFoundError("Approval", approvalId);
    if (approval.status !== "PENDING") throw new ConflictError("Approval already resolved");
    if (approval.expiresAt < new Date()) throw new ConflictError("Approval expired");
    const updated = await this.db.approvalRequest.update({
      where: { id: approvalId },
      data: { status, approvedBy, reason, resolvedAt: new Date() },
    });
    await eventBus.emit(Events.APPROVAL_RESOLVED, { approval: updated });
    return updated;
  }
}

// ── Routes ──

const rbac = new Hono();
const service = new RbacService();

const createRoleSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-z_]+$/),
  displayName: z.string().min(2).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

const assignRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
  expiresAt: z.string().datetime().optional(),
});

rbac.get("/roles/:productId", authenticate, async (c) => {
  const roles = await service.listRoles(c.req.param("productId"));
  return c.json({ data: roles });
});

rbac.post("/roles/:productId", authenticate, requirePermission("roles:write"), zValidator("json", createRoleSchema), async (c) => {
  const ctx = c.get("ctx");
  const role = await service.createRole(c.req.param("productId"), c.req.valid("json"));
  await logAudit(ctx, "role.created", "role", role.id, { name: role.name });
  return c.json({ data: role }, 201);
});

rbac.patch("/roles/:id", authenticate, requirePermission("roles:write"), async (c) => {
  const ctx = c.get("ctx");
  const input = await c.req.json();
  const role = await service.updateRole(c.req.param("id"), input);
  await logAudit(ctx, "role.updated", "role", role.id);
  return c.json({ data: role });
});

rbac.delete("/roles/:id", authenticate, requirePermission("roles:delete"), async (c) => {
  const ctx = c.get("ctx");
  await service.deleteRole(c.req.param("id"));
  await logAudit(ctx, "role.deleted", "role", c.req.param("id"));
  return c.json({ message: "Role deleted" });
});

rbac.post("/assign", authenticate, requirePermission("roles:assign"), zValidator("json", assignRoleSchema), async (c) => {
  const ctx = c.get("ctx");
  const input = c.req.valid("json");
  const assignment = await service.assignRole(input.userId, input.roleId, ctx.auth?.userId, input.expiresAt ? new Date(input.expiresAt) : undefined);
  await logAudit(ctx, "role.assigned", "role_assignment", assignment.id, input);
  return c.json({ data: assignment });
});

rbac.delete("/assign/:userId/:roleId", authenticate, requirePermission("roles:assign"), async (c) => {
  const ctx = c.get("ctx");
  await service.revokeRole(c.req.param("userId"), c.req.param("roleId"));
  await logAudit(ctx, "role.revoked", "role_assignment", undefined, { userId: c.req.param("userId"), roleId: c.req.param("roleId") });
  return c.json({ message: "Role revoked" });
});

rbac.get("/users/:userId/roles", authenticate, requirePermission("users:read"), async (c) => {
  const roles = await service.getUserRoles(c.req.param("userId"));
  return c.json({ data: roles });
});

export default rbac;
