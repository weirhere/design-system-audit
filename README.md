# Design System Audit Tool

A local-first web application that crawls live product URLs, extracts design tokens from the DOM, compares them across products and an optional parent design system, classifies differences as **Inherit / Adapt / Extend**, and generates a phased migration roadmap with exportable deliverables.

## What it does

1. **Crawl** — Uses headless Chromium to visit product pages and extract visual tokens (colors, typography, spacing, elevation, borders, motion, opacity), UI components (buttons, inputs, navigation, etc.), and design patterns (forms, data display, feedback).

2. **Compare** — Builds a cross-product comparison matrix showing where products align and diverge. Color distance uses CIEDE2000; numeric values use ratio-based divergence.

3. **Classify** — Applies per-layer thresholds to sort every token into one of three categories:
   - **Inherit** — Use the parent design system value as-is
   - **Adapt** — Parent exists but needs a density/context modifier
   - **Extend** — No parent equivalent; new token needed

4. **Plan** — Generates a phased migration roadmap with effort estimates, priority ordering, and dependency awareness (tokens before components before patterns).

5. **Export** — JSON, CSV (tokens + comparison), self-contained HTML report, PDF, and Jira/Linear ticket stubs for bulk import.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Crawl engine | Playwright (`playwright-core`) |
| Database | SQLite via `better-sqlite3` + Drizzle ORM |
| Data grid | TanStack Table + TanStack Virtual |
| Charts | Recharts |
| PDF | Playwright `page.pdf()` |

## Getting started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
npx playwright install chromium
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created automatically at `data/audit.db` on first use.

### Build

```bash
npm run build
npm start
```

## Usage

1. **Create an audit** — Give it a name and add 1–6 product URLs to compare. Optionally add a parent design system URL.
2. **Start the crawl** — The engine visits each URL, extracts tokens/components/patterns, and streams progress via SSE.
3. **Review the report** — Browse the overview dashboard, token table, comparison matrix, component catalog, pattern coverage, and migration roadmap.
4. **Export** — Download results as JSON, CSV, HTML, PDF, or ticket stubs from the Export hub.

## Project structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/audits/         # REST API (CRUD, crawl, tokens, matrix, exports)
│   └── audits/             # UI pages (list, setup, audit, report)
├── lib/
│   ├── crawl/              # CrawlEngine, progress emitter, extractors
│   ├── analysis/           # Comparator, classifier, similarity, roadmap
│   ├── export/             # JSON, CSV, HTML, PDF, ticket formatters
│   └── db/                 # Drizzle schema + SQLite connection
├── components/             # React UI components
├── hooks/                  # SSE, audit, token hooks
└── types/                  # TypeScript type definitions
```

## Database

SQLite with WAL mode for concurrent reads. Tables:

- `audits` — Top-level project container
- `crawlJobs` — One per product URL per crawl
- `crawledPages` — Pages visited during crawl
- `extractedTokens` — Visual tokens (color, typography, spacing, etc.)
- `extractedComponents` — UI components with variants and states
- `extractedPatterns` — Design patterns (navigation, forms, etc.)
- `comparisonResults` — Cross-product divergence scores
- `migrationTasks` — Roadmap items with effort/priority/phase

Drizzle Kit commands:

```bash
npm run db:generate   # Generate migrations
npm run db:push       # Push schema to DB
npm run db:studio     # Open Drizzle Studio
```

## License

Private.
