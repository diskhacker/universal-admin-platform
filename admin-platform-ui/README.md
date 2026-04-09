# admin-platform-ui

Universal Admin Platform (UAP) frontend — a product-agnostic admin UI that
powers the tenant and platform-operator experience across every SaaS product
built on UAP: **SigOps, Credora OS, Assera, Paynex, Talentra, Lifetra**.

## Tech stack

- **React 18** + **Vite** + **TypeScript**
- **MUI Material** (custom theme, dark-first with light toggle)
- **Zustand** — auth + UI state (persisted)
- **TanStack Query** — server state, caching, refetch
- **React Router v7** — nested routes, protected layouts
- **React Hook Form** — forms and validation
- **Axios** — REST client with JWT refresh interceptor
- **date-fns** — date formatting

## Features

### Auth
- Login (email + password + tenant slug)
- Register (tenant name + slug + user + product selection)
- Forgot password (stub — backend endpoint pending)
- JWT stored in Zustand (persisted). Automatic silent refresh on 401.

### Tenant admin
- **Dashboard** — user count, subscriptions, API keys, 24h events, recent activity
- **Users** — list, search, invite, suspend/activate/deactivate, delete
- **Roles** — per-product roles, create custom roles with permission chips
- **Billing** — current plan, usage bars, plan comparison, change plan, Stripe checkout
- **API Keys** — list, create with scopes, rotate, revoke, **reveal once on creation**
- **Settings** — workspace name/logo/domain, theme, animation preference
- **Audit Logs** — searchable table, filters (action, resource, date range), CSV/JSON export
- **Notifications** — in-app bell with unread count + full notifications page

### Super admin panel
- **Tenants** — list all, search, click-through to detail
- **Tenant Detail** — info, activate/suspend/delete
- **Products** — registered product catalog
- **Feature Flags** — per-product toggles, target by tenant or plan
- **Global Audit Log** — every action across every tenant

### UX
- **Dark-first theme** with light toggle (persisted)
- Primary color: `#2563EB`
- Animation preference: Full / Reduced / Off (persisted, respects OS reduced-motion)
- Sidebar navigation + top app bar
- Responsive — tablet and mobile friendly

## Project structure

```
src/
├── main.tsx                 ← Vite entry + QueryClientProvider + BrowserRouter
├── App.tsx                  ← Route tree + ThemeProvider
├── theme/                   ← MUI theme factory (buildTheme)
├── lib/
│   ├── api.ts               ← axios instance + JWT refresh interceptor
│   ├── config.ts            ← env vars, storage keys
│   └── products.ts          ← seeded UAP product list
├── stores/
│   ├── auth.store.ts        ← Zustand: tokens, user, tenantSlug, permissions
│   └── ui.store.ts          ← Zustand: themeMode, sidebar, animations
├── services/                ← Thin per-resource service layers over api.ts
│   ├── auth.service.ts
│   ├── tenant.service.ts
│   ├── users.service.ts
│   ├── rbac.service.ts
│   ├── apiKeys.service.ts
│   ├── billing.service.ts
│   ├── audit.service.ts
│   ├── notifications.service.ts
│   └── settings.service.ts
├── components/              ← Shared UI
│   ├── ProtectedRoute.tsx
│   ├── SidebarNav.tsx
│   ├── NotificationBell.tsx
│   ├── UserMenu.tsx
│   ├── PageHeader.tsx
│   ├── StatCard.tsx
│   └── EmptyState.tsx
├── layouts/
│   ├── AuthLayout.tsx       ← Public pages (login/register/forgot)
│   ├── TenantLayout.tsx     ← Tenant admin shell
│   └── SuperAdminLayout.tsx ← Super admin shell
├── pages/
│   ├── auth/                ← LoginPage, RegisterPage, ForgotPasswordPage
│   ├── tenant/              ← 8 tenant admin pages
│   ├── super/               ← 5 super admin pages
│   └── NotFoundPage.tsx
└── types/                   ← Shared TypeScript types
```

## Running

```bash
cd admin-platform-ui
cp .env.example .env          # point VITE_API_BASE_URL at UAP backend
npm install
npm run dev                   # http://localhost:5173
```

Make sure the UAP backend is running at `http://localhost:4100`. The dev
server also proxies `/api/*` to `http://localhost:4100` to avoid CORS in dev.

### Environment variables

| Variable              | Default                           | Description                    |
|-----------------------|-----------------------------------|--------------------------------|
| `VITE_API_BASE_URL`   | `http://localhost:4100/api/v1`    | UAP backend base URL           |
| `VITE_APP_NAME`       | `Universal Admin Platform`        | App name shown in UI chrome    |

## API integration

All API calls go through `src/lib/api.ts`, which:
1. Attaches `Authorization: Bearer <jwt>` from the Zustand auth store
2. On 401 (for non-auth endpoints), calls `POST /auth/refresh` once
3. Retries the original request on success
4. Clears auth state and redirects to `/login` on refresh failure

Service files (`src/services/*.service.ts`) are thin wrappers that unwrap the
UAP envelope `{ data: T }` and return typed results to TanStack Query hooks in
the pages.

## Role-based UI

The `ProtectedRoute` component checks:
- **Token present** → else redirect to `/login`
- **`requireSuperAdmin`** → user must have `*` or any `super:*` permission

`UserMenu` shows a "Super Admin" link only for users whose `permissions`
include `*` or any `super:*` permission.

## Build

```bash
npm run build                 # outputs to dist/
npm run preview               # preview the production build
```
