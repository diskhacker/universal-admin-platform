import { getDb } from "../../config/database.js";
import { NotFoundError, ConflictError, ValidationError } from "../../shared/errors/index.js";
import { hashPassword, paginationToSkipTake } from "../../shared/utils/index.js";
import { eventBus, Events } from "../../shared/events/index.js";
import type { PaginationParams, PaginatedResult } from "../../shared/types/index.js";

export interface CreateUserInput {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  status?: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  preferences?: Record<string, unknown>;
}

const USER_SELECT = {
  id: true, tenantId: true, email: true, firstName: true, lastName: true,
  avatarUrl: true, status: true, emailVerified: true, twoFactorEnabled: true,
  preferences: true, lastLoginAt: true, createdAt: true, updatedAt: true,
  roleAssignments: { include: { role: { select: { id: true, name: true, displayName: true } } } },
};

export class UserService {
  private db = getDb();

  async getById(tenantId: string, userId: string) {
    const user = await this.db.user.findFirst({ where: { id: userId, tenantId }, select: USER_SELECT });
    if (!user) throw new NotFoundError("User", userId);
    return user;
  }

  async list(tenantId: string, pagination: PaginationParams, search?: string): Promise<PaginatedResult<any>> {
    const where: any = { tenantId };
    if (search) where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
    const { skip, take } = paginationToSkipTake(pagination);
    const [data, total] = await Promise.all([
      this.db.user.findMany({ where, select: USER_SELECT, skip, take, orderBy: { createdAt: "desc" } }),
      this.db.user.count({ where }),
    ]);
    return { data, total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) };
  }

  async create(tenantId: string, input: CreateUserInput) {
    const existing = await this.db.user.findUnique({ where: { tenantId_email: { tenantId, email: input.email } } });
    if (existing) throw new ConflictError("User with this email already exists in tenant");

    const data: any = { tenantId, email: input.email, firstName: input.firstName, lastName: input.lastName };
    if (input.password) data.passwordHash = await hashPassword(input.password);

    const user = await this.db.user.create({ data, select: USER_SELECT });

    if (input.roleId) {
      await this.db.roleAssignment.create({ data: { userId: user.id, roleId: input.roleId } });
    }

    await eventBus.emit(Events.USER_CREATED, { user });
    return this.getById(tenantId, user.id);
  }

  async update(tenantId: string, userId: string, input: UpdateUserInput) {
    await this.getById(tenantId, userId);
    const user = await this.db.user.update({ where: { id: userId }, data: input, select: USER_SELECT });
    await eventBus.emit(Events.USER_UPDATED, { user });
    return user;
  }

  async delete(tenantId: string, userId: string) {
    await this.getById(tenantId, userId);
    await this.db.user.delete({ where: { id: userId } });
    await eventBus.emit(Events.USER_DELETED, { userId, tenantId });
  }
}
