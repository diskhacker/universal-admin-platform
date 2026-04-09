import { getDb } from "../config/database.js";
import type { RequestContext } from "../shared/types/index.js";

export async function logAudit(
  ctx: RequestContext,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const tenantId = ctx.tenantId;
  if (!tenantId) return;

  try {
    await getDb().auditLog.create({
      data: {
        tenantId,
        actorId: ctx.auth?.userId || null,
        actorType: ctx.apiKey ? "api_key" : ctx.auth ? "user" : "system",
        action,
        resourceType,
        resourceId: resourceId || null,
        details: details || {},
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
  } catch (err) {
    // Audit logging should never break the request
    console.error("Audit log failed:", err);
  }
}
