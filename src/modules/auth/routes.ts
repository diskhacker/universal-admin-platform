import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AuthService } from "./auth.service.js";
import { authenticate } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

const auth = new Hono();
const service = new AuthService();

const registerSchema = z.object({
  tenantName: z.string().min(2).max(100),
  tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  productId: z.string(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantSlug: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const input = c.req.valid("json");
  const tokens = await service.register(input);
  return c.json({ data: tokens }, 201);
});

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const input = c.req.valid("json");
  const ctx = c.get("ctx");
  const tokens = await service.login(input);
  await logAudit(
    { ...ctx, tenantId: undefined, auth: undefined, apiKey: undefined, requestId: ctx.requestId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
    "user.login", "user", undefined, { email: input.email, tenantSlug: input.tenantSlug }
  );
  return c.json({ data: tokens });
});

auth.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid("json");
  const tokens = await service.refresh(refreshToken);
  return c.json({ data: tokens });
});

auth.get("/me", authenticate, async (c) => {
  const ctx = c.get("ctx");
  const { getDb } = await import("../../config/database.js");
  const user = await getDb().user.findUnique({
    where: { id: ctx.auth!.userId },
    select: {
      id: true, email: true, firstName: true, lastName: true, avatarUrl: true,
      status: true, emailVerified: true, twoFactorEnabled: true, preferences: true,
      lastLoginAt: true, createdAt: true,
      roleAssignments: { include: { role: { select: { name: true, displayName: true, permissions: true } } } },
    },
  });
  return c.json({ data: { ...user, tenantId: ctx.auth!.tenantId, permissions: ctx.auth!.permissions } });
});

export default auth;
