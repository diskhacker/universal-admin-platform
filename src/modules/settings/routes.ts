import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../../config/database.js";
import { NotFoundError } from "../../shared/errors/index.js";
import { eventBus, Events } from "../../shared/events/index.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

// ── Service ──

export class SettingsService {
  private db = getDb();

  // ── Tenant Settings ──

  async getTenantSettings(tenantId: string, productId?: string) {
    const where: any = { tenantId };
    if (productId) where.productId = productId;
    else where.productId = null;
    return this.db.tenantSetting.findMany({ where });
  }

  async getTenantSetting(tenantId: string, key: string, productId?: string) {
    const setting = await this.db.tenantSetting.findUnique({
      where: { tenantId_productId_key: { tenantId, productId: productId || "", key } },
    });
    return setting?.value ?? null;
  }

  async setTenantSetting(tenantId: string, key: string, value: unknown, productId?: string, updatedBy?: string) {
    const setting = await this.db.tenantSetting.upsert({
      where: { tenantId_productId_key: { tenantId, productId: productId || "", key } },
      create: { tenantId, productId: productId || null, key, value: value as any, updatedBy },
      update: { value: value as any, updatedBy },
    });
    await eventBus.emit(Events.SETTINGS_UPDATED, { tenantId, key, productId });
    return setting;
  }

  async deleteTenantSetting(tenantId: string, key: string, productId?: string) {
    await this.db.tenantSetting.delete({
      where: { tenantId_productId_key: { tenantId, productId: productId || "", key } },
    });
  }

  async bulkSetTenantSettings(tenantId: string, settings: Record<string, unknown>, productId?: string, updatedBy?: string) {
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      results.push(await this.setTenantSetting(tenantId, key, value, productId, updatedBy));
    }
    return results;
  }

  // ── Feature Flags ──

  async listFeatureFlags(productId: string) {
    return this.db.featureFlag.findMany({ where: { productId }, orderBy: { name: "asc" } });
  }

  async isFeatureEnabled(productId: string, flagName: string, tenantId?: string, planName?: string): Promise<boolean> {
    const flag = await this.db.featureFlag.findUnique({
      where: { productId_name: { productId, name: flagName } },
    });
    if (!flag) return false;
    if (!flag.isEnabled) return false;
    if (flag.targetType === "all") return true;

    const targetIds = flag.targetIds as string[];
    if (flag.targetType === "tenant" && tenantId) return targetIds.includes(tenantId);
    if (flag.targetType === "plan" && planName) return targetIds.includes(planName);
    return false;
  }

  async setFeatureFlag(productId: string, name: string, isEnabled: boolean, targetType?: string, targetIds?: string[]) {
    return this.db.featureFlag.upsert({
      where: { productId_name: { productId, name } },
      create: { productId, name, isEnabled, targetType: targetType || "all", targetIds: targetIds || [] },
      update: { isEnabled, targetType, targetIds },
    });
  }

  // ── User Preferences ──

  async getUserPreferences(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { preferences: true } });
    return user?.preferences || {};
  }

  async updateUserPreferences(userId: string, preferences: Record<string, unknown>) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { preferences: true } });
    if (!user) throw new NotFoundError("User", userId);
    const merged = { ...(user.preferences as Record<string, unknown>), ...preferences };
    await this.db.user.update({ where: { id: userId }, data: { preferences: merged } });
    return merged;
  }
}

// ── Routes ──

const settings = new Hono();
const service = new SettingsService();

// Tenant settings
settings.get("/tenant", authenticate, requirePermission("settings:read"), async (c) => {
  const ctx = c.get("ctx");
  const productId = c.req.query("productId");
  const result = await service.getTenantSettings(ctx.tenantId!, productId);
  return c.json({ data: result });
});

settings.put("/tenant", authenticate, requirePermission("settings:write"),
  zValidator("json", z.object({ key: z.string(), value: z.unknown(), productId: z.string().optional() })),
  async (c) => {
    const ctx = c.get("ctx");
    const { key, value, productId } = c.req.valid("json");
    const result = await service.setTenantSetting(ctx.tenantId!, key, value, productId, ctx.auth?.userId);
    await logAudit(ctx, "settings.updated", "tenant_setting", result.id, { key });
    return c.json({ data: result });
  }
);

settings.put("/tenant/bulk", authenticate, requirePermission("settings:write"),
  zValidator("json", z.object({ settings: z.record(z.unknown()), productId: z.string().optional() })),
  async (c) => {
    const ctx = c.get("ctx");
    const { settings: settingsData, productId } = c.req.valid("json");
    const results = await service.bulkSetTenantSettings(ctx.tenantId!, settingsData, productId, ctx.auth?.userId);
    await logAudit(ctx, "settings.bulk_updated", "tenant_setting", undefined, { keys: Object.keys(settingsData) });
    return c.json({ data: results });
  }
);

settings.delete("/tenant/:key", authenticate, requirePermission("settings:write"), async (c) => {
  const ctx = c.get("ctx");
  await service.deleteTenantSetting(ctx.tenantId!, c.req.param("key"), c.req.query("productId"));
  await logAudit(ctx, "settings.deleted", "tenant_setting", undefined, { key: c.req.param("key") });
  return c.json({ message: "Setting deleted" });
});

// Feature flags
settings.get("/flags/:productId", authenticate, requirePermission("settings:read"), async (c) => {
  const flags = await service.listFeatureFlags(c.req.param("productId"));
  return c.json({ data: flags });
});

settings.get("/flags/:productId/:name", authenticate, async (c) => {
  const ctx = c.get("ctx");
  const enabled = await service.isFeatureEnabled(c.req.param("productId"), c.req.param("name"), ctx.tenantId!);
  return c.json({ data: { enabled } });
});

settings.put("/flags/:productId", authenticate, requirePermission("super:settings:write"),
  zValidator("json", z.object({ name: z.string(), isEnabled: z.boolean(), targetType: z.string().optional(), targetIds: z.array(z.string()).optional() })),
  async (c) => {
    const ctx = c.get("ctx");
    const input = c.req.valid("json");
    const flag = await service.setFeatureFlag(c.req.param("productId"), input.name, input.isEnabled, input.targetType, input.targetIds);
    await logAudit(ctx, "feature_flag.updated", "feature_flag", flag.id, input);
    return c.json({ data: flag });
  }
);

// User preferences
settings.get("/preferences", authenticate, async (c) => {
  const ctx = c.get("ctx");
  const prefs = await service.getUserPreferences(ctx.auth!.userId);
  return c.json({ data: prefs });
});

settings.patch("/preferences", authenticate,
  zValidator("json", z.record(z.unknown())),
  async (c) => {
    const ctx = c.get("ctx");
    const prefs = await service.updateUserPreferences(ctx.auth!.userId, c.req.valid("json"));
    return c.json({ data: prefs });
  }
);

export default settings;
