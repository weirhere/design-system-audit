# CLAUDE.md - Project Instructions

## Project Overview
Design System Audit Tool - a Next.js web app that crawls websites, extracts design tokens (colors, typography, spacing), compares them against a reference design system, classifies deviations, and generates migration roadmaps with exportable reports.

## Tech Stack
- Next.js 14.2 (App Router), TypeScript, Tailwind CSS 3
- Playwright-core for crawling + PDF generation
- Supabase PostgreSQL via `postgres` (postgres.js) + Drizzle ORM
- TanStack Table + TanStack Virtual, Recharts

## Important Config Gotchas
- Next.js 14.2 uses `experimental.serverComponentsExternalPackages` (NOT `serverExternalPackages`)
- Next.js 14.2 does NOT support `next.config.ts` — must use `.mjs` or `.js`
- `autoprefixer` must be explicitly installed as a devDependency
- `Buffer` can't be passed to `NextResponse` directly — use `new Uint8Array(buffer)`
- TypeScript narrowing doesn't flow into `ReadableStream.start()` closures — assign to const first
- `postgres` requires `{ prepare: false }` for Supabase Transaction Pooler (port 6543)
- `getDb()` returns a noop drizzle instance when `DATABASE_URL` is unset (build-time safety)
- Drizzle schemas use `pg-core` (`pgTable`, `boolean()`, `timestamp()`) — NOT `sqlite-core`

## Project Structure
```
src/lib/db/        — Drizzle schema (pg-core) + postgres.js singleton connection
src/lib/crawl/     — CrawlEngine, progress EventEmitter, extractors
src/lib/analysis/  — Comparator, classifier, similarity (CIEDE2000), roadmap
src/lib/export/    — JSON, CSV, HTML, PDF, Jira/Linear ticket generators
src/hooks/         — SSE, audit, tokens hooks
src/components/    — UI primitives, audit controls, token table, comparison matrix
```

## Git & GitHub Workflow
- **Branching:** Always create feature branches off `main`. Never push directly to `main`.
- **Branch naming:** Use `feat/`, `fix/`, `chore/`, or `docs/` prefixes (e.g. `feat/add-dark-mode-support`).
- **Commits:** Use conventional commit messages — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- **Pull requests:** All changes go through PRs. Include a summary and test plan.
- **Don't force-push** to `main`. Force-push to feature branches only when necessary.

## Common Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run Drizzle migrations
npm run db:push      # Push schema to Supabase (requires DATABASE_URL)
npm run db:studio    # Open Drizzle Studio
```

## Database
- Hosted on **Supabase** (PostgreSQL) — `DATABASE_URL` env var required
- Use the **Transaction Pooler** connection string (port 6543) for serverless compatibility
- `npm run db:push` pushes schema changes — load `.env.local` first: `source .env.local && npm run db:push`
- Auth tables use **singular** names (`user`, `account`, `session`, `verificationToken`) as required by `@auth/drizzle-adapter`

## Code Style
- Follow existing patterns in the codebase
- Use TypeScript strict mode conventions
- Prefer server components; use `'use client'` only when needed
- Use Tailwind CSS for styling — avoid inline styles or CSS modules
