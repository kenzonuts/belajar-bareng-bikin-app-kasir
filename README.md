# Kas + Stock Management

Aplikasi web **Kas + Stock Management** dengan pendekatan **mobile-first**.

Phase 01 saat ini hanya mencakup fondasi project (frontend, backend, database connection, tooling). Fitur bisnis belum dibuat.

## Tech stack

- **Monorepo:** pnpm workspaces
- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS
- **Backend:** Hono, TypeScript
- **Database:** SQLite + Prisma (PostgreSQL via Docker Compose tersedia sebagai opsi)
- **Tooling:** ESLint, Prettier, Docker Compose

## Prerequisites

- Node.js 20+
- pnpm 11+
- Docker + Docker Compose (opsional, untuk PostgreSQL)

## Install dependencies

```bash
pnpm install
```

## Environment variables

1. Salin contoh env:

```bash
cp .env.example .env
```

2. Sesuaikan nilai di `.env` jika perlu. Variabel penting:

- `DATABASE_URL` — koneksi database (default SQLite: `file:./dev.db`)
- `API_URL` / `VITE_API_URL` — base URL backend untuk frontend
- `API_PORT` — port backend (default `3001`)

Jangan commit file `.env`.

## Database

Generate Prisma Client:

```bash
pnpm db:generate
```

Jalankan migration:

```bash
pnpm db:migrate
```

Cek koneksi database:

```bash
pnpm --filter @kas-stock/api run db:check
```

> Catatan Phase 01: belum ada schema bisnis. Migration baseline sudah ada untuk Phase 02.

### Opsi PostgreSQL (Docker)

Jika Docker tersedia dan user punya akses Docker daemon:

```bash
pnpm db:up
```

Lalu ubah `DATABASE_URL` ke PostgreSQL dan ganti `provider` di `apps/api/prisma/schema.prisma` menjadi `postgresql`.

## Menjalankan development

Jalankan frontend + backend sekaligus:

```bash
pnpm dev
```

Atau terpisah:

```bash
# Frontend — http://localhost:5173
pnpm dev:web

# Backend — http://localhost:3001
pnpm dev:api
```

Health check backend:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{ "status": "ok" }
```

## Lint, format, dan build

```bash
pnpm lint
pnpm format
pnpm build
```
