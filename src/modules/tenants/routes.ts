import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { TenantService } from "./tenants.service.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";
import { parsePagination } from "../../shared/utils/index.js";

const tenants = new Hono();
const service = new TenantService();

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional(),
  domain: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Get current tenant
tenants.get("/current", authenticate, async (c) => {
  const ctx = c.get("ctx");
  const tenant = await service.getById(ctx.tenantId!);
  const stats = await service.getStats(ctx.tenantId!);
  return c.json({ data: { ...tenant, ...stats } });
});

// Update current tenant
tenants.patch("/current", authenticate, requirePermission("tenants:write"), zValidator("json", updateSchema), async (c) => {
  const ctx = c.get("ctx");
  const input = c.req.valid("json");
  const tenant = await service.update(ctx.tenantId!, input);
  await logAudit(ctx, "tenant.updated", "tenant", tenant.id, input);
  return c.json({ data: tenant });
});

// ── Super Admin Routes (list all tenants) ──

tenants.get("/", authenticate, requirePermission("super:tenants:read"), async (c) => {
  const { page, limit } = parsePagination(c.req.query("page"), c.req.query("limit"));
  const search = c.req.query("search");
  const result = await service.list({ page, limit }, search);
  return c.json({ data: result });
});

tenants.get("/:id", authenticate, requirePermission("super:tenants:read"), async (c) => {
  const tenant = await service.getById(c.req.param("id"));
  const stats = await service.getStats(tenant.id);
  return c.json({ data: { ...tenant, ...stats } });
});

tenants.patch("/:id/status", authenticate, requirePermission("super:tenants:write"), async (c) => {
  const { status } = await c.req.json();
  const ctx = c.get("ctx");
  const tenant = await service.updateStatus(c.req.param("id"), status);
  await logAudit(ctx, "tenant.status_changed", "tenant", tenant.id, { status });
  return c.json({ data: tenant });
});

tenants.delete("/:id", authenticate, requirePermission("super:tenants:delete"), async (c) => {
  const ctx = c.get("ctx");
  const id = c.req.param("id");
  await service.delete(id);
  await logAudit(ctx, "tenant.deleted", "tenant", id);
  return c.json({ message: "Tenant deleted" });
});

export default tenants;
