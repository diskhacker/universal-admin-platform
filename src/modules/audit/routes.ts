import { Hono } from "hono";
import { getDb } from "../../config/database.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { paginationToSkipTake, parsePagination } from "../../shared/utils/index.js";
import type { PaginatedResult } from "../../shared/types/index.js";

// ── Service ──

export class AuditService {
  private db = getDb();

  async list(
    tenantId: string,
    page: number,
    limit: number,
    filters?: { action?: string; resourceType?: string; actorId?: string; from?: Date; to?: Date }
  ): Promise<PaginatedResult<any>> {
    const where: any = { tenantId };
    if (filters?.action) where.action = { contains: filters.action };
    if (filters?.resourceType) where.resourceType = filters.resourceType;
    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters?.from) where.createdAt.gte = filters.from;
      if (filters?.to) where.createdAt.lte = filters.to;
    }

    const { skip, take } = paginationToSkipTake({ page, limit });
    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where, skip, take, orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      this.db.auditLog.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async export(tenantId: string, from: Date, to: Date, format: "json" | "csv"): Promise<string> {
    const logs = await this.db.auditLog.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { email: true } } },
    });

    if (format === "csv") {
      const header = "timestamp,actor,action,resource_type,resource_id,ip_address\n";
      const rows = logs.map((l: any) =>
        `${l.createdAt.toISOString()},${l.actor?.email || l.actorType},${l.action},${l.resourceType},${l.resourceId || ""},${l.ipAddress || ""}`
      ).join("\n");
      return header + rows;
    }

    return JSON.stringify(logs, null, 2);
  }

  async getStats(tenantId: string) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [today, week, total] = await Promise.all([
      this.db.auditLog.count({ where: { tenantId, createdAt: { gte: dayAgo } } }),
      this.db.auditLog.count({ where: { tenantId, createdAt: { gte: weekAgo } } }),
      this.db.auditLog.count({ where: { tenantId } }),
    ]);

    return { today, week, total };
  }
}

// ── Routes ──

const audit = new Hono();
const service = new AuditService();

audit.get("/", authenticate, requirePermission("audit:read"), async (c) => {
  const ctx = c.get("ctx");
  const { page, limit } = parsePagination(c.req.query("page"), c.req.query("limit"));
  const filters = {
    action: c.req.query("action"),
    resourceType: c.req.query("resourceType"),
    actorId: c.req.query("actorId"),
    from: c.req.query("from") ? new Date(c.req.query("from")!) : undefined,
    to: c.req.query("to") ? new Date(c.req.query("to")!) : undefined,
  };
  const result = await service.list(ctx.tenantId!, page, limit, filters);
  return c.json({ data: result });
});

audit.get("/stats", authenticate, requirePermission("audit:read"), async (c) => {
  const ctx = c.get("ctx");
  const stats = await service.getStats(ctx.tenantId!);
  return c.json({ data: stats });
});

audit.get("/export", authenticate, requirePermission("audit:export"), async (c) => {
  const ctx = c.get("ctx");
  const from = new Date(c.req.query("from") || Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = new Date(c.req.query("to") || Date.now());
  const format = (c.req.query("format") as "json" | "csv") || "json";
  const data = await service.export(ctx.tenantId!, from, to, format);

  if (format === "csv") {
    c.header("Content-Type", "text/csv");
    c.header("Content-Disposition", `attachment; filename="audit-${from.toISOString().slice(0, 10)}.csv"`);
    return c.text(data);
  }
  return c.json(JSON.parse(data));
});

export default audit;
