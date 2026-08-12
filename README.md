# Kas + Stock Management

Aplikasi web **Kas + Stock Management** dengan pendekatan **mobile-first** (brand UI: **KasFlow**).

## Tech stack

- **Monorepo:** pnpm workspaces
- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS
- **Backend:** Hono, TypeScript
- **Database:** Supabase PostgreSQL + Prisma
- **Auth:** Supabase Auth
- **Tooling:** ESLint, Prettier

## Prerequisites

- Node.js 20+
- pnpm 11+
- Akun [Supabase](https://supabase.com) + project PostgreSQL

## Install dependencies

```bash
pnpm install
```

## Environment variables

1. Salin template:

```bash
cp .env.example .env
```

2. Isi nilai dari Supabase Dashboard:

| Variable | Sumber | Catatan |
| --- | --- | --- |
| `SUPABASE_URL` | Project Settings → API | Public |
| `SUPABASE_ANON_KEY` | Project Settings → API | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API | **Secret — server only** |
| `DATABASE_URL` | Project Settings → Database | Session pooler URI (port 5432) |
| `VITE_SUPABASE_URL` | sama dengan `SUPABASE_URL` | Public only |
| `VITE_SUPABASE_ANON_KEY` | sama dengan `SUPABASE_ANON_KEY` | Public only |

Jangan commit file `.env`. Jangan pernah memasang `SUPABASE_SERVICE_ROLE_KEY` di frontend.

## Database (Supabase)

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm db:validate
pnpm db:validate-auth
```

### Schema MVP

```text
auth.users
    │
    ▼
public.users (profile, no password)
 ├── categories
 │     └── stock_items
 └── transactions  (INCOME | EXPENSE)
```

Profile `public.users` dibuat otomatis lewat trigger saat user register di Supabase Auth.

## Authentication

Routes:

| Path | Akses |
| --- | --- |
| `/login` | Public |
| `/register` | Public |
| `/dashboard` | Protected |

Akun seed development:

```text
email: dev@kas-stock.local
password: DevPassword123!
```

## Menjalankan development

```bash
pnpm dev
```

Atau terpisah:

```bash
pnpm dev:web   # http://localhost:5173
pnpm dev:api   # http://localhost:3001
```

## Lint, typecheck, dan build

```bash
pnpm lint
pnpm typecheck
pnpm format
pnpm build
```
