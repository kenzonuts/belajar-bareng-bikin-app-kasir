# Kas + Stock Management

Aplikasi web **Kas + Stock Management** dengan pendekatan **mobile-first**.

## Tech stack

- **Monorepo:** pnpm workspaces
- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS
- **Backend:** Hono, TypeScript
- **Database:** Supabase PostgreSQL + Prisma
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

Generate Prisma Client:

```bash
pnpm db:generate
```

Terapkan migration ke Supabase:

```bash
pnpm db:migrate
```

Seed data development (bukan production):

```bash
pnpm db:seed
```

Cek koneksi & validasi schema:

```bash
pnpm db:check
pnpm db:validate
```

Reset database development (hapus data + jalankan ulang migration & seed):

```bash
pnpm db:reset
```

### Schema MVP

```text
users
 ├── categories
 │     └── stock_items
 └── transactions  (INCOME | EXPENSE)
```

Row Level Security (RLS) aktif: user terautentikasi hanya mengakses data miliknya (stock melalui ownership category).

## Menjalankan development

```bash
pnpm dev
```

Atau terpisah:

```bash
pnpm dev:web   # http://localhost:5173
pnpm dev:api   # http://localhost:3001
```

Health check:

```bash
curl http://localhost:3001/health
```

## Lint, typecheck, dan build

```bash
pnpm lint
pnpm typecheck
pnpm format
pnpm build
```
# belajar-bareng-bikin-app-kasir
