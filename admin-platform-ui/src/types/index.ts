// ── API Response envelopes ──
export interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Auth ──
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user?: CurrentUser;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  status: UserStatus;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  preferences?: Record<string, unknown>;
  lastLoginAt?: string | null;
  createdAt?: string;
  tenantId?: string;
  permissions: string[];
  roleAssignments?: Array<{
    role: { name: string; displayName: string; permissions: string[] };
  }>;
}

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

// ── Tenant ──
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING" | "CANCELLED";
  logoUrl?: string | null;
  domain?: string | null;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  userCount?: number;
  activeSubscriptions?: number;
  totalProducts?: number;
}

// ── Product ──
export interface Product {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isActive?: boolean;
}

// ── User ──
export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  status: UserStatus;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  roleAssignments?: Array<{
    roleId: string;
    role: { id: string; name: string; displayName: string };
  }>;
}

// ── Role ──
export interface Role {
  id: string;
  productId: string;
  name: string;
  displayName: string;
  description?: string | null;
  permissions: string[];
  isSystem: boolean;
  isDefault: boolean;
  createdAt: string;
}

// ── API Key ──
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt?: string | null;
  usageCount: number;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
  /** Only present immediately after creation/rotation. */
  key?: string;
}

// ── Billing ──
export interface Plan {
  id: string;
  productId: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  sortOrder: number;
  limits: Record<string, number>;
  features: string[];
  isPublic?: boolean;
}

export interface Subscription {
  id: string;
  tenantId: string;
  productId: string;
  planId: string;
  status: "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELLED";
  plan: Plan;
  stripeSubId?: string | null;
  usageData?: Record<string, number>;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
}

// ── Audit ──
export interface AuditLog {
  id: string;
  tenantId?: string;
  actorId?: string | null;
  actorType?: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: {
    id?: string;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

// ── Notification ──
export interface Notification {
  id: string;
  tenantId: string;
  userId?: string | null;
  channel: string;
  subject?: string | null;
  body: string;
  status: "PENDING" | "SENT" | "FAILED" | "READ";
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

// ── Feature Flag ──
export interface FeatureFlag {
  id: string;
  productId: string;
  name: string;
  description?: string | null;
  isEnabled: boolean;
  targetType: "all" | "tenant" | "plan";
  targetIds: string[];
  createdAt: string;
  updatedAt?: string;
}

// ── Tenant Setting ──
export interface TenantSetting {
  id: string;
  tenantId: string;
  productId?: string | null;
  key: string;
  value: unknown;
  updatedBy?: string | null;
  updatedAt?: string;
}
