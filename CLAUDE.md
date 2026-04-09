# Universal Admin Platform (UAP)

## What This Is
Product-agnostic multi-tenant management microservice shared across ALL SaaS products: SigOps, Credora OS, Assera, Paynex, Talentra, Lifetra.

## Tech Stack
- **Framework:** Hono (edge-ready, fastest Node.js framework)
- **ORM:** Drizzle ORM (NOT Prisma — lightweight, pure TS, no binary)
- **Database:** PostgreSQL (separate instance from product DBs)
- **DB Driver:** `postgres` (postgres.js)
- **Cache:** Redis (ioredis)
- **Auth:** JWT via `jose` + API key auth + Argon2 password hashing
- **Validation:** Zod
- **Logging:** Pino
- **Billing:** Stripe
- **Language:** TypeScript (strict mode, ESM)

## Architecture
This is a standalone microservice. Each SaaS product registers itself, and UAP manages tenants, users, billing, and RBAC for that product. All products share the same auth system.

```
API Gateway → UAP (:4100)
                ├── Auth (register, login, JWT, refresh, 2FA)
                ├── Tenants (CRUD, lifecycle, super-admin)
                ├── Users (CRUD, invite, search)
                ├── RBAC (roles, permissions, assignments, approvals)
                ├── API Keys (generate, revoke, rotate, scoped)
                ├── Billing (Stripe, plans, subscriptions, usage metering)
                ├── Notifications (email, SMS, push, webhook, in-app, templates)
                ├── Audit (log, search, filter, export CSV/JSON)
                └── Settings (tenant-level, user preferences, feature flags)
```

## Project Structure
```
src/
├── config/          ← env validation, logger, Redis
├── db/
│   ├── schema.ts    ← Drizzle schema (ALL tables defined here)
│   ├── index.ts     ← Drizzle client (postgres.js driver)
│   └── seed.ts      ← Seed script (6 products, plans, roles, templates)
├── middleware/
│   ├── auth.ts      ← JWT + API key authentication
│   ├── rate-limit.ts ← Redis-backed rate limiting
│   ├── error-handler.ts
│   ├── audit.ts     ← Audit log helper
│   └── index.ts
├── modules/
│   ├── auth/        ← auth.service.ts + routes.ts
│   ├── tenants/     ← tenants.service.ts + routes.ts
│   ├── users/       ← users.service.ts + routes.ts
│   ├── rbac/        ← routes.ts (service + routes combined)
│   ├── api-keys/    ← routes.ts
│   ├── billing/     ← routes.ts (Stripe integration)
│   ├── notifications/ ← routes.ts
│   ├── audit/       ← routes.ts
│   └── settings/    ← routes.ts
├── shared/
│   ├── errors/      ← AppError, NotFoundError, etc.
│   ├── events/      ← Internal event bus
│   ├── types/       ← AuthContext, PaginatedResult, etc.
│   └── utils/       ← hashPassword, signJWT, generateApiKey, pagination
└── index.ts         ← Main Hono app entry point
```

## Database
- Schema defined in `src/db/schema.ts` using Drizzle pgTable
- 17 tables: products, tenants, tenantProducts, plans, users, oauthAccounts, sessions, invitations, roleDefinitions, roleAssignments, approvalRequests, apiKeys, auditLogs, notificationTemplates, notifications, tenantSettings, featureFlags
- Migrations: `npx drizzle-kit push` (dev) or `npx drizzle-kit migrate` (prod)
- Config: `drizzle.config.ts` at project root

## Conventions
- All routes in `src/modules/<name>/routes.ts`
- Business logic in `src/modules/<name>/<name>.service.ts` (when complex enough)
- All DB queries use Drizzle: `db.select().from(table).where(eq(...))`
- Zod schemas inline in route files for request validation
- `@hono/zod-validator` for request body validation
- Auth via middleware: `authenticate` (required) or `optionalAuth`
- Permission check: `requirePermission("resource:action")`
- Audit logging: `await logAudit(ctx, "action", "resource_type", resourceId, details)`
- Events via `eventBus.emit(Events.EVENT_NAME, data)`
- Errors thrown as AppError subclasses — caught by errorHandler middleware
- Session logs stored in `docs/session/`

## Running
```bash
cp .env.example .env          # configure DATABASE_URL, REDIS_URL, JWT_SECRET
npm install
npx drizzle-kit push          # create tables
tsx src/db/seed.ts             # seed products, plans, roles
npm run dev                    # http://localhost:4100
```

## API Base URL
`http://localhost:4100/api/v1`

## Products Pre-Seeded
sigops, credora-os, assera, paynex, talentra, lifetra — each with 4 plans (starter/pro/business/enterprise), 4 system roles (admin/member/viewer/billing_admin), 3 notification templates.

## What's Next
- Frontend: `admin-platform-ui` (React + Vite + Zustand + MUI)
- SSO/SAML integration
- Webhook delivery with retry queue
- Usage metering cron job
