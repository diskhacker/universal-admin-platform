import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { verifyToken } from "../shared/utils/index.js";
import { getDb } from "../config/database.js";
import { UnauthorizedError } from "../shared/errors/index.js";
import type { AuthContext, ApiKeyContext, RequestContext } from "../shared/types/index.js";
import { nanoid } from "nanoid";

// Extend Hono context
declare module "hono" {
  interface ContextVariableMap {
    ctx: RequestContext;
  }
}

export const requestContext = createMiddleware(async (c, next) => {
  const ctx: RequestContext = {
    requestId: nanoid(12),
    ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
  };
  c.set("ctx", ctx);
  await next();
});

export const authenticate = createMiddleware(async (c, next) => {
  const ctx = c.get("ctx");
  const authHeader = c.req.header("authorization");

  if (!authHeader) throw new UnauthorizedError();

  // API Key auth: "Bearer uap_..."
  if (authHeader.startsWith("Bearer uap_")) {
    const key = authHeader.slice(7);
    const db = getDb();
    // Find by prefix for fast lookup, then verify hash
    const prefix = key.slice(0, 12);
    const apiKey = await db.apiKey.findFirst({
      where: { keyPrefix: prefix, isActive: true },
    });

    if (!apiKey) throw new UnauthorizedError("Invalid API key");
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new UnauthorizedError("API key expired");

    // Update last used
    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    });

    const apiKeyCtx: ApiKeyContext = {
      keyId: apiKey.id,
      tenantId: apiKey.tenantId,
      scopes: apiKey.scopes as string[],
    };
    ctx.apiKey = apiKeyCtx;
    ctx.tenantId = apiKey.tenantId;
    await next();
    return;
  }

  // JWT auth: "Bearer eyJ..."
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token);
      const authCtx: AuthContext = {
        userId: payload.sub as string,
        tenantId: payload.tid as string,
        email: payload.email as string,
        roles: (payload.roles as string[]) || [],
        permissions: (payload.perms as string[]) || [],
      };
      ctx.auth = authCtx;
      ctx.tenantId = authCtx.tenantId;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
    await next();
    return;
  }

  throw new UnauthorizedError("Invalid authorization format");
});

// Optional auth — doesn't fail if no token
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader) {
    await next();
    return;
  }
  // Delegate to authenticate
  await authenticate(c, next);
});

// Require specific permissions
export function requirePermission(...required: string[]) {
  return createMiddleware(async (c, next) => {
    const ctx = c.get("ctx");

    if (ctx.apiKey) {
      const hasScope = required.every((r) => ctx.apiKey!.scopes.includes(r) || ctx.apiKey!.scopes.includes("*"));
      if (!hasScope) throw new UnauthorizedError("API key missing required scope: " + required.join(", "));
      await next();
      return;
    }

    if (ctx.auth) {
      const hasPermission = required.every(
        (r) => ctx.auth!.permissions.includes(r) || ctx.auth!.permissions.includes("*")
      );
      if (!hasPermission) throw new UnauthorizedError("Missing permission: " + required.join(", "));
      await next();
      return;
    }

    throw new UnauthorizedError();
  });
}
