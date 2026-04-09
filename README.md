# Universal Admin Platform (UAP)

A product-agnostic multi-tenant management microservice shared across all SaaS products.

## Products Supported
- **SigOps** — AI-assisted Execution OS for Infrastructure
- **Credora OS** — Credora Operating System
- **Assera** — Assera Platform
- **Paynex** — Payment Platform
- **Talentra** — Talent Platform
- **Lifetra** — Lifetra Platform

## Features
- Multi-tenant management with full lifecycle
- Authentication (email/password, OAuth, SSO/SAML, 2FA)
- RBAC with custom roles, permissions, approval workflows
- Billing via Stripe (plans, subscriptions, usage metering)
- API key management (scoped, rate-limited, rotatable)
- Multi-channel notifications (email, SMS, push, webhook, in-app)
- Universal audit logging with search and export
- Tenant & user settings with feature flags
- Super-admin panel for cross-tenant management

## Tech Stack
- **Hono** — Edge-ready web framework
- **Prisma** — Type-safe ORM
- **PostgreSQL** — Primary database
- **Redis** — Cache, rate limiting, sessions
- **Stripe** — Payment processing
- **Zod** — Runtime validation
- **jose** — JWT handling
- **Argon2** — Password hashing

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd universal-admin-platform
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database and Redis URLs

# Setup database
npx prisma generate
npx prisma migrate dev
npm run db:seed

# Start development server
npm run dev
# → Running at http://localhost:4100
```

## Docker

```bash
docker-compose up -d
# → UAP at http://localhost:4100
# → PostgreSQL at localhost:5433
# → Redis at localhost:6380
```

## API Documentation
Base URL: `http://localhost:4100/api/v1`

| Endpoint | Description |
|----------|-------------|
| `POST /auth/register` | Register new tenant + user |
| `POST /auth/login` | Login |
| `GET /auth/me` | Current user profile |
| `GET /tenants/current` | Current tenant info |
| `GET/POST /users` | List/create users |
| `GET/POST /rbac/roles/:productId` | List/create roles |
| `POST /rbac/assign` | Assign role to user |
| `GET/POST /api-keys` | List/create API keys |
| `GET /billing/plans/:productId` | List plans |
| `GET /notifications` | User notifications |
| `GET /audit` | Audit logs |
| `GET/PUT /settings/tenant` | Tenant settings |
| `GET /health` | Health check |

## Architecture
UAP is a standalone microservice. Each SaaS product registers itself and UAP manages tenants, users, billing, and RBAC for that product. All products share the same auth system, enabling single sign-on across the portfolio.
