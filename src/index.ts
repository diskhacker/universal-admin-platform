import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import { requestContext } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error-handler.js";
import { getEnv } from "./config/env.js";
import { logger } from "./config/logger.js";
import { getDb, disconnectDb } from "./config/database.js";
import { disconnectRedis } from "./config/redis.js";

// Import routes
import authRoutes from "./modules/auth/routes.js";
import tenantRoutes from "./modules/tenants/routes.js";
import userRoutes from "./modules/users/routes.js";
import rbacRoutes from "./modules/rbac/routes.js";
import apiKeyRoutes from "./modules/api-keys/routes.js";
import billingRoutes from "./modules/billing/routes.js";
import notificationRoutes from "./modules/notifications/routes.js";
import auditRoutes from "./modules/audit/routes.js";
import settingsRoutes from "./modules/settings/routes.js";

const env = getEnv();
const app = new Hono();

// ── Global Middleware ──
app.use("*", secureHeaders());
app.use("*", timing());
app.use("*", cors({
  origin: env.CORS_ORIGINS === "*" ? "*" : env.CORS_ORIGINS.split(","),
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  maxAge: 86400,
}));
app.use("*", requestContext);
app.onError(errorHandler);

// ── Health Check ──
app.get("/health", async (c) => {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return c.json({ status: "healthy", service: "universal-admin-platform", version: "1.0.0", timestamp: new Date().toISOString() });
  } catch {
    return c.json({ status: "unhealthy" }, 503);
  }
});

// ── API Routes ──
const api = new Hono();
api.use("*", rateLimit);

api.route("/auth", authRoutes);
api.route("/tenants", tenantRoutes);
api.route("/users", userRoutes);
api.route("/rbac", rbacRoutes);
api.route("/api-keys", apiKeyRoutes);
api.route("/billing", billingRoutes);
api.route("/notifications", notificationRoutes);
api.route("/audit", auditRoutes);
api.route("/settings", settingsRoutes);

app.route("/api/v1", api);

// ── 404 ──
app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));

// ── Start Server ──
const port = env.PORT;

logger.info(`Starting Universal Admin Platform on port ${port}`);
logger.info(`Environment: ${env.NODE_ENV}`);

const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`UAP running at http://localhost:${info.port}`);
});

// ── Graceful Shutdown ──
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down...`);
  await disconnectDb();
  await disconnectRedis();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
