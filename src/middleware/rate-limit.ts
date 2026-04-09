import { createMiddleware } from "hono/factory";
import { getRedis } from "../config/redis.js";
import { getEnv } from "../config/env.js";
import { RateLimitError } from "../shared/errors/index.js";

export const rateLimit = createMiddleware(async (c, next) => {
  const redis = getRedis();
  const env = getEnv();
  const ctx = c.get("ctx");

  const identifier = ctx.apiKey?.keyId || ctx.auth?.userId || ctx.ipAddress;
  const key = `rl:${identifier}`;
  const window = env.RATE_LIMIT_WINDOW;
  const max = ctx.apiKey
    ? (await getApiKeyRateLimit(ctx.apiKey.keyId)) || env.RATE_LIMIT_MAX
    : env.RATE_LIMIT_MAX;

  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, window);

  c.header("X-RateLimit-Limit", String(max));
  c.header("X-RateLimit-Remaining", String(Math.max(0, max - current)));

  if (current > max) {
    const ttl = await redis.ttl(key);
    c.header("Retry-After", String(ttl));
    throw new RateLimitError(ttl);
  }

  await next();
});

async function getApiKeyRateLimit(keyId: string): Promise<number | null> {
  // Could cache this in Redis for performance
  const { getDb } = await import("../config/database.js");
  const apiKey = await getDb().apiKey.findUnique({ where: { id: keyId }, select: { rateLimit: true } });
  return apiKey?.rateLimit || null;
}
