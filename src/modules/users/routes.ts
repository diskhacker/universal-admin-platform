import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { UserService } from "./users.service.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";
import { parsePagination } from "../../shared/utils/index.js";

const users = new Hono();
const service = new UserService();

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  roleId: z.string().optional(),
});

const updateSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]).optional(),
  preferences: z.record(z.unknown()).optional(),
});

users.get("/", authenticate, requirePermission("users:read"), async (c) => {
  const ctx = c.get("ctx");
  const { page, limit } = parsePagination(c.req.query("page"), c.req.query("limit"));
  const result = await service.list(ctx.tenantId!, { page, limit }, c.req.query("search"));
  return c.json({ data: result });
});

users.get("/:id", authenticate, requirePermission("users:read"), async (c) => {
  const ctx = c.get("ctx");
  const user = await service.getById(ctx.tenantId!, c.req.param("id"));
  return c.json({ data: user });
});

users.post("/", authenticate, requirePermission("users:write"), zValidator("json", createSchema), async (c) => {
  const ctx = c.get("ctx");
  const input = c.req.valid("json");
  const user = await service.create(ctx.tenantId!, input);
  await logAudit(ctx, "user.created", "user", user.id, { email: input.email });
  return c.json({ data: user }, 201);
});

users.patch("/:id", authenticate, requirePermission("users:write"), zValidator("json", updateSchema), async (c) => {
  const ctx = c.get("ctx");
  const user = await service.update(ctx.tenantId!, c.req.param("id"), c.req.valid("json"));
  await logAudit(ctx, "user.updated", "user", user.id);
  return c.json({ data: user });
});

users.delete("/:id", authenticate, requirePermission("users:delete"), async (c) => {
  const ctx = c.get("ctx");
  const id = c.req.param("id");
  await service.delete(ctx.tenantId!, id);
  await logAudit(ctx, "user.deleted", "user", id);
  return c.json({ message: "User deleted" });
});

export default users;
