import { pgTable, text, boolean, integer, timestamp, jsonb, uniqueIndex, index, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──

export const tenantStatusEnum = pgEnum("tenant_status", ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["ACTIVE", "PAST_DUE", "CANCELLED", "PAUSED", "TRIALING"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED", "DEACTIVATED"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]);
export const approvalStatusEnum = pgEnum("approval_status", ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]);
export const notificationStatusEnum = pgEnum("notification_status", ["PENDING", "SENT", "DELIVERED", "FAILED", "READ"]);

// ── Products ──

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  domain: text("domain"),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

// ── Tenants ──

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain").unique(),
  logoUrl: text("logo_url"),
  status: tenantStatusEnum("status").notNull().default("TRIAL"),
  trialEndsAt: timestamp("trial_ends_at"),
  settings: jsonb("settings").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

// ── Tenant Products ──

export const tenantProducts = pgTable("tenant_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  planId: text("plan_id").notNull().references(() => plans.id),
  stripeSubId: text("stripe_subscription_id"),
  status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
  currentPeriodEnd: timestamp("current_period_end"),
  usageData: jsonb("usage_data").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [uniqueIndex("tenant_product_uniq").on(t.tenantId, t.productId)]);

// ── Plans ──

export const plans = pgTable("plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull().default(0),
  priceYearly: integer("price_yearly").notNull().default(0),
  stripePriceIdMo: text("stripe_price_id_monthly"),
  stripePriceIdYr: text("stripe_price_id_yearly"),
  limits: jsonb("limits").notNull().default({}),
  features: jsonb("features").notNull().default([]),
  isPublic: boolean("is_public").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [uniqueIndex("plan_product_name").on(t.productId, t.name)]);

// ── Users ──

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  emailVerified: boolean("email_verified").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  preferences: jsonb("preferences").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [uniqueIndex("user_tenant_email").on(t.tenantId, t.email)]);

// ── OAuth Accounts ──

export const oauthAccounts = pgTable("oauth_accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccId: text("provider_account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("oauth_provider_acc").on(t.provider, t.providerAccId)]);

// ── Sessions ──

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Invitations ──

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  roleId: text("role_id").notNull().references(() => roleDefinitions.id),
  token: text("token").notNull().unique(),
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  invitedBy: text("invited_by").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("invitation_tenant_email").on(t.tenantId, t.email)]);

// ── RBAC ──

export const roleDefinitions = pgTable("role_definitions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [uniqueIndex("role_product_name").on(t.productId, t.name)]);

export const roleAssignments = pgTable("role_assignments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull().references(() => roleDefinitions.id),
  expiresAt: timestamp("expires_at"),
  grantedBy: text("granted_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("role_user_role").on(t.userId, t.roleId)]);

// ── Approval Requests ──

export const approvalRequests = pgTable("approval_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull(),
  productId: text("product_id").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  status: approvalStatusEnum("status").notNull().default("PENDING"),
  approvedBy: text("approved_by"),
  reason: text("reason"),
  expiresAt: timestamp("expires_at").notNull(),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── API Keys ──

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  scopes: jsonb("scopes").notNull().default([]),
  rateLimit: integer("rate_limit").notNull().default(1000),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Audit Logs ──

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  actorId: text("actor_id"),
  actorType: text("actor_type").notNull(),
  productId: text("product_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details").notNull().default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("audit_tenant_created").on(t.tenantId, t.createdAt),
  index("audit_tenant_action").on(t.tenantId, t.action),
]);

// ── Notifications ──

export const notificationTemplates = pgTable("notification_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [uniqueIndex("template_product_name_channel").on(t.productId, t.name, t.channel)]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id"),
  channel: text("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: notificationStatusEnum("status").notNull().default("PENDING"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("notif_tenant_user_created").on(t.tenantId, t.userId, t.createdAt)]);

// ── Settings ──

export const tenantSettings = pgTable("tenant_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: text("product_id"),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [uniqueIndex("setting_tenant_product_key").on(t.tenantId, t.productId, t.key)]);

// ── Feature Flags ──

export const featureFlags = pgTable("feature_flags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  targetType: text("target_type").notNull().default("all"),
  targetIds: jsonb("target_ids").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [uniqueIndex("flag_product_name").on(t.productId, t.name)]);
