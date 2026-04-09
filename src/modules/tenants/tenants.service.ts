import { getDb } from "../../config/database.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../../shared/errors/index.js";
import { eventBus, Events } from "../../shared/events/index.js";
import type { PaginationParams, PaginatedResult } from "../../shared/types/index.js";
import { paginationToSkipTake } from "../../shared/utils/index.js";
import { tenants } from "../../db/schema.js";

type Tenant = typeof tenants.$inferSelect;
type TenantStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";

export interface UpdateTenantInput {
  name?: string;
  logoUrl?: string;
  domain?: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class TenantService {
  private db = getDb();

  async getById(id: string): Promise<Tenant> {
    const tenant = await this.db.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundError("Tenant", id);
    return tenant;
  }

  async getBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.db.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundError("Tenant", slug);
    return tenant;
  }

  async list(pagination: PaginationParams, search?: string): Promise<PaginatedResult<Tenant>> {
    const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {};
    const { skip, take } = paginationToSkipTake(pagination);
    const [data, total] = await Promise.all([
      this.db.tenant.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      this.db.tenant.count({ where }),
    ]);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    await this.getById(id);
    if (input.domain) {
      const existing = await this.db.tenant.findFirst({ where: { domain: input.domain, NOT: { id } } });
      if (existing) throw new ConflictError("Domain already in use");
    }
    const tenant = await this.db.tenant.update({ where: { id }, data: input });
    await eventBus.emit(Events.TENANT_UPDATED, { tenant });
    return tenant;
  }

  async updateStatus(id: string, status: TenantStatus): Promise<Tenant> {
    const tenant = await this.db.tenant.update({ where: { id }, data: { status } });
    if (status === "SUSPENDED") await eventBus.emit(Events.TENANT_SUSPENDED, { tenant });
    return tenant;
  }

  async getStats(tenantId: string) {
    const [userCount, productCount] = await Promise.all([
      this.db.user.count({ where: { tenantId } }),
      this.db.tenantProduct.count({ where: { tenantId } }),
    ]);
    return { userCount, productCount };
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.db.tenant.delete({ where: { id } });
  }
}
