# ChurchOS

Demo full-stack web app for Nigerian churches. Built as a portfolio / sales demo — no real SMS or payment integrations; everything is captured to a local SQLite Inbox.

## Architecture

- **Frontend**: `artifacts/churchos` — React + Vite, wouter routing, TanStack Query, shadcn/ui, Tailwind. Slate-900 + amber-500 brand palette.
- **Backend**: `artifacts/api-server` — Express 5, better-sqlite3 (file at `data/churchos.db`), multer for file uploads (`uploads/`), pino logging.
- **Contract**: `lib/api-spec/openapi.yaml` → orval generates `@workspace/api-client-react` (TanStack Query hooks) + `@workspace/api-zod` (Zod schemas). Run codegen with `pnpm --filter @workspace/api-spec run codegen`.

## Routes

- `/` — Marketing landing (hero, 5 features, 3-tier pricing, waitlist form).
- `/app` — Dashboard with KPI cards.
- `/app/visitors` — Visitor follow-up CRUD + status pipeline.
- `/app/bulletin` — Sunday bulletin generator (server returns sanitized HTML rendered in iframe srcDoc).
- `/app/giving` — Initiate (status `pending`) → Confirm (status `successful`) simulating mobile-money flow.
- `/app/members` — Attendance grid + ghost detection + cell-leader email alerts.
- `/app/sermons` — Sermon archive with audio upload, play counter, podcast RSS feed at `/api/sermons.rss`.
- `/app/inbox` — Captured SMS/email notifications, polled every 5s for unread badge.

## Demo data

Seeded in `db.ts` for "Demo Church Lagos": 8 members (mix of active/atRisk/ghost), 5 visitors, 5 giving records, 3 sermons (silent placeholder audio), 2 starter notifications.

## Important conventions

- All SMS/email goes through `notify(type, recipient, subject, body)` in `db.ts` — inserts to `notifications` table only.
- Attendance is **idempotent**: `attendance_log` has `UNIQUE(memberId, serviceDate)` and uses INSERT … ON CONFLICT … DO UPDATE. `consecutiveMisses` is recomputed from the log, not incremented.
- Member status thresholds: `<3` active, `3-5` atRisk, `6-11` ghost, `≥12` inactive (ordered correctly so each tier is reachable).
- Sermon uploads restricted via multer `fileFilter` to `audio/*` MIME + `.mp3/.m4a/.wav/.ogg/.aac` extensions; non-audio uploads reject with 400. Served files are extension-checked + path-sandboxed and sent with `X-Content-Type-Options: nosniff`.
- Zod validation errors converted to 400 JSON via centralized error middleware in `app.ts`.
- Frontend does NOT call `setBaseUrl` — the orval client already prefixes `/api`.

## Running

Workflows are auto-managed:
- `artifacts/api-server: API Server` — Express on `$PORT`, reachable at `/api`
- `artifacts/churchos: web` — Vite dev server, reachable at `/`

Restart workflows after code changes; the proxy serves both at `localhost:80`.
