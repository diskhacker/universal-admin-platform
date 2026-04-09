import { eq, and, or } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { tenants, users, tenantProducts, roleDefinitions, roleAssignments, plans } from "../../db/schema.js";
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken, verifyToken } from "../../shared/utils/index.js";
import { eventBus, Events } from "../../shared/events/index.js";
import type { AuthContext } from "../../shared/types/index.js";

export interface RegisterInput {
  tenantName: string;
  tenantSlug: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  productId: string;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantSlug: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthTokens> {
    const db = getDb();

    const existing = await db.query.tenants.findFirst({ where: eq(tenants.slug, input.tenantSlug) });
    if (existing) throw new ConflictError("Tenant slug already taken");

    const product = await db.query.products.findFirst({
      where: (p, { eq }) => eq(p.name, input.productId),
    });
    if (!product) throw new NotFoundError("Product", input.productId);

    const starterPlan = await db.query.plans.findFirst({
      where: and(eq(plans.productId, product.id), eq(plans.name, "starter")),
    });
    if (!starterPlan) throw new ValidationError("No starter plan configured");

    const defaultRole = await db.query.roleDefinitions.findFirst({
      where: and(eq(roleDefinitions.productId, product.id), eq(roleDefinitions.isDefault, true)),
    });
    const adminRole = await db.query.roleDefinitions.findFirst({
      where: and(eq(roleDefinitions.productId, product.id), eq(roleDefinitions.name, "admin")),
    });

    const passwordHash = await hashPassword(input.password);

    // Transaction
    const [tenant] = await db.insert(tenants).values({
      name: input.tenantName,
      slug: input.tenantSlug,
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    }).returning();

    const [user] = await db.insert(users).values({
      tenantId: tenant.id,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    }).returning();

    await db.insert(tenantProducts).values({
      tenantId: tenant.id,
      productId: product.id,
      planId: starterPlan.id,
      status: "TRIALING",
    });

    const assignedRoles: string[] = [];

    if (adminRole) {
      await db.insert(roleAssignments).values({ userId: user.id, roleId: adminRole.id });
      assignedRoles.push(adminRole.name);
    }
    if (defaultRole && defaultRole.id !== adminRole?.id) {
      await db.insert(roleAssignments).values({ userId: user.id, roleId: defaultRole.id });
      assignedRoles.push(defaultRole.name);
    }

    const permissions = await this.getUserPermissions(user.id);

    const authCtx: AuthContext = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      roles: assignedRoles,
      permissions,
    };

    const accessToken = await signAccessToken(authCtx);
    const refreshToken = await signRefreshToken(user.id, tenant.id);

    await eventBus.emit(Events.TENANT_CREATED, { tenant });
    await eventBus.emit(Events.USER_CREATED, { user });

    return { accessToken, refreshToken, expiresIn: 3600 };
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const db = getDb();

    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, input.tenantSlug) });
    if (!tenant) throw new UnauthorizedError("Invalid credentials");
    if (tenant.status === "SUSPENDED") throw new UnauthorizedError("Tenant suspended");

    const user = await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenant.id), eq(users.email, input.email)),
    });
    if (!user || !user.passwordHash) throw new UnauthorizedError("Invalid credentials");
    if (user.status !== "ACTIVE") throw new UnauthorizedError("Account disabled");

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) throw new UnauthorizedError("Invalid credentials");

    const assignments = await db.query.roleAssignments.findMany({
      where: eq(roleAssignments.userId, user.id),
      with: { role: true },
    });
    // Note: Drizzle relational queries need relations defined. Fallback to join:
    const rolesResult = await db.select({ name: roleDefinitions.name })
      .from(roleAssignments)
      .innerJoin(roleDefinitions, eq(roleAssignments.roleId, roleDefinitions.id))
      .where(eq(roleAssignments.userId, user.id));

    const roles = rolesResult.map((r) => r.name);
    const permissions = await this.getUserPermissions(user.id);

    const authCtx: AuthContext = {
      userId: user.id, tenantId: tenant.id, email: user.email, roles, permissions,
    };

    const accessToken = await signAccessToken(authCtx);
    const refreshToken = await signRefreshToken(user.id, tenant.id);

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await eventBus.emit(Events.USER_LOGIN, { userId: user.id, tenantId: tenant.id });

    return { accessToken, refreshToken, expiresIn: 3600 };
  }

  async refresh(token: string): Promise<AuthTokens> {
    const db = getDb();
    let payload;
    try { payload = await verifyToken(token); } catch { throw new UnauthorizedError("Invalid refresh token"); }
    if (payload.type !== "refresh") throw new UnauthorizedError("Not a refresh token");

    const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub as string) });
    if (!user || user.status !== "ACTIVE") throw new UnauthorizedError("User not found or disabled");

    const rolesResult = await db.select({ name: roleDefinitions.name })
      .from(roleAssignments)
      .innerJoin(roleDefinitions, eq(roleAssignments.roleId, roleDefinitions.id))
      .where(eq(roleAssignments.userId, user.id));

    const roles = rolesResult.map((r) => r.name);
    const permissions = await this.getUserPermissions(user.id);

    const authCtx: AuthContext = {
      userId: user.id, tenantId: user.tenantId, email: user.email, roles, permissions,
    };

    const accessToken = await signAccessToken(authCtx);
    const refreshToken = await signRefreshToken(user.id, user.tenantId);
    return { accessToken, refreshToken, expiresIn: 3600 };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const db = getDb();
    const rolesResult = await db.select({ permissions: roleDefinitions.permissions })
      .from(roleAssignments)
      .innerJoin(roleDefinitions, eq(roleAssignments.roleId, roleDefinitions.id))
      .where(and(
        eq(roleAssignments.userId, userId),
        or(
          eq(roleAssignments.expiresAt, null as any),
          // gt(roleAssignments.expiresAt, new Date()) // TODO: handle null comparison
        )
      ));

    const permSet = new Set<string>();
    for (const r of rolesResult) {
      const perms = r.permissions as string[];
      if (Array.isArray(perms)) perms.forEach((p) => permSet.add(p));
    }
    return Array.from(permSet);
  }
}
