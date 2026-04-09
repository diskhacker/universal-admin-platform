import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../../config/database.js";
import { NotFoundError } from "../../shared/errors/index.js";
import { generateApiKey, hashApiKey } from "../../shared/utils/index.js";
import { eventBus, Events } from "../../shared/events/index.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

// ── Service ──

export class ApiKeyService {
  private db = getDb();

  async list(tenantId: string) {
    return this.db.apiKey.findMany({
      where: { tenantId },
      select: { id: true, name: true, keyPrefix: true, scopes: true, rateLimit: true, lastUsedAt: true, usageCount: true, expiresAt: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(tenantId: string, input: { name: string; scopes: string[]; rateLimit?: number; expiresAt?: Date }) {
    const { key, prefix } = generateApiKey();
    const keyHash = await hashApiKey(key);

    const apiKey = await this.db.apiKey.create({
      data: {
        tenantId, name: input.name, keyPrefix: prefix, keyHash,
        scopes: input.scopes, rateLimit: input.rateLimit || 1000,
        expiresAt: input.expiresAt,
      },
    });

    await eventBus.emit(Events.API_KEY_CREATED, { keyId: apiKey.id, tenantId });

    // Return the full key ONLY on creation (never stored in plain text)
    return { ...apiKey, key };
  }

  async revoke(tenantId: string, keyId: string) {
    const apiKey = await this.db.apiKey.findFirst({ where: { id: keyId, tenantId } });
    if (!apiKey) throw new NotFoundError("API Key", keyId);
    await this.db.apiKey.update({ where: { id: keyId }, data: { isActive: false } });
    await eventBus.emit(Events.API_KEY_REVOKED, { keyId, tenantId });
  }

  async rotate(tenantId: string, keyId: string) {
    const existing = await this.db.apiKey.findFirst({ where: { id: keyId, tenantId } });
    if (!existing) throw new NotFoundError("API Key", keyId);

    // Revoke old key
    await this.db.apiKey.update({ where: { id: keyId }, data: { isActive: false } });

    // Create new key with same settings
    return this.create(tenantId, {
      name: existing.name,
      scopes: existing.scopes as string[],
      rateLimit: existing.rateLimit,
      expiresAt: existing.expiresAt || undefined,
    });
  }
}

// ── Routes ──

const apiKeys = new Hono();
const service = new ApiKeyService();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  rateLimit: z.number().min(10).max(100000).optional(),
  expiresAt: z.string().datetime().optional(),
});

apiKeys.get("/", authenticate, requirePermission("api_keys:read"), async (c) => {
  const ctx = c.get("ctx");
  const keys = await service.list(ctx.tenantId!);
  return c.json({ data: keys });
});

apiKeys.post("/", authenticate, requirePermission("api_keys:write"), zValidator("json", createSchema), async (c) => {
  const ctx = c.get("ctx");
  const input = c.req.valid("json");
  const result = await service.create(ctx.tenantId!, {
    ...input,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
  });
  await logAudit(ctx, "api_key.created", "api_key", result.id, { name: input.name });
  return c.json({ data: result }, 201);
});

apiKeys.post("/:id/revoke", authenticate, requirePermission("api_keys:write"), async (c) => {
  const ctx = c.get("ctx");
  await service.revoke(ctx.tenantId!, c.req.param("id"));
  await logAudit(ctx, "api_key.revoked", "api_key", c.req.param("id"));
  return c.json({ message: "API key revoked" });
});

apiKeys.post("/:id/rotate", authenticate, requirePermission("api_keys:write"), async (c) => {
  const ctx = c.get("ctx");
  const result = await service.rotate(ctx.tenantId!, c.req.param("id"));
  await logAudit(ctx, "api_key.rotated", "api_key", result.id);
  return c.json({ data: result });
});

export default apiKeys;
