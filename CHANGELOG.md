# Changelog

All notable changes to Billarr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

No unreleased changes.

---

## [2.2.1] - 2026-07-15

### Security
- **Admin authorization no longer trusts a JWT's embedded role claim.** `requireAdmin` previously
  decided admin access purely from the `role` field baked into the token at sign-time, with no
  database check. A token issued while a user was admin kept granting admin forever, even after
  that user was demoted or deleted, and would have granted admin to anyone holding a token forged
  with a leaked signing secret. It now re-checks the user's current role in the database
  (`authService.getUserRole()`) on every admin-gated request.
- **Backend port no longer published to the LAN by default.** `docker-compose.example.yml`'s
  backend service now binds `127.0.0.1:3001:3001` instead of `3001:3001` — the frontend already
  reaches the backend over Docker's internal network (`frontend/nginx.conf`), so nothing legitimate
  needs the host-level port exposed beyond localhost. Reduces exposure for the unauthenticated
  first-run `/api/auth/setup` endpoint in particular.

---

## [2.2.0] - 2026-07-14

### Added
- **Snooze a bill from Telegram** — `😴 1d`/`3d`/`5d` buttons on reminder messages, plus `/snooze <vendor> [days]` (default 1 day). Silences reminders for that one bill for the given number of days without touching its status, due date, or (for recurring bills) the series — it just expires on its own, nothing to remember to undo.

### Fixed
- **`Hold` didn't actually stop reminders for the bill you held** — `on_hold` only affected future recurring projections; the reminder scheduler (`getBillsNeedingReminders`) never checked it, so a held bill kept nagging you. Now held (and snoozed) bills are excluded from the reminder check entirely.

---

## [2.1.1] - 2026-07-14

### Fixed
- **Telegram webhook 405** — `billarr.casaalmida.com`-style deployments serve the public domain through the frontend's nginx container, which only proxied `/api` and `/health` to the backend. `/telegram/webhook` fell through to the SPA catch-all, which rejects any non-GET method with 405, so bot commands and button taps never reached the backend. Added the missing `location /telegram/webhook` proxy rule to `frontend/nginx.conf`.

---

## [2.1.0] - 2026-07-14

### Added
- **Two-way Telegram bot** — new `TelegramBotService` owns all Telegram I/O (previously push-only via `notificationService.js`)
- **Inline buttons on reminder messages** — "✅ Mark Paid" / "⏸ Hold", wired to the same `BillService.update()` the web UI uses
- **Slash commands** — `/start`, `/help`, `/due`, `/overdue`, `/summary`, `/paid <vendor>`, `/hold <vendor>`, `/resume <vendor>`
- **Auto chat-ID capture** — sending `/start` saves your chat ID automatically; no more manually looking it up via @userinfobot
- **Webhook-based delivery** — `POST /telegram/webhook` (outside the `/api` JWT gate, like `/health`), gated by a per-install secret token Telegram echoes back on every call. Auto-registered against Telegram whenever a bot token is saved in Settings, if `PUBLIC_URL` is set.
- New `PUBLIC_URL` environment variable — the externally-reachable URL Billarr registers with Telegram for the webhook

### Changed
- Outbound Telegram messages switched from Markdown to HTML `parse_mode`, fixing a real bug where vendor names containing `_`, `*`, `(`, etc. could fail to send (Markdown v1 requires escaping those characters; HTML only needs `&`/`<`/`>`)

---

## [2.0.2] - 2026-07-14

### Added
- **`on_hold` flag for recurring bills** — pause a recurring series (e.g. a subscription you've paused) without deleting it or losing its history. While held, the calendar and expenses-rollup projections stop generating future occurrences, and paying the bill no longer auto-creates its successor. Toggle from the bill edit form.

### Fixed
- **Dashboard "Recurring Bills" table listed every historical instance of a vendor**, not just the current one — same root cause as the [2.0.1] expenses-rollup bug (`reportService.js`'s subscriptions query wasn't narrowed to the latest row per vendor+recurring series).

---

## [2.0.1] - 2026-07-14

### Fixed
- **Duplicate projected recurring bills in the expenses rollup and calendar view** — every historical instance of a recurring bill (each paid month leaves behind a new row) was independently seeding its own forward projection, so a vendor paid monthly for 6 months would show up to 6 duplicate projected entries in a future month. Now only the most recent row per vendor+recurring series seeds projections.

---

## [2.0.0] - 2026-07-13

### Added
- **Dashboard view** — summary cards, 6-month spend trend bars, category breakdown chart, subscription table, price change history
- **Subscription management** — `auto_renew` flag and `cancellation_url` per recurring bill; shown in BillForm when recurring is set
- **Monthly-equivalent normalisation** — weekly/quarterly/annual bills converted to $/month equivalent in the dashboard
- **Price change history** — `bill_amount_history` table records every amount change; surfaced in Dashboard as a "Recent Price Changes" list
- **Reports API** — `GET /api/reports/summary` and `GET /api/reports/trends` endpoints backed by a dedicated `ReportService`
- **JWT user accounts** — full multi-user support with admin/member roles via `JWT_SECRET` env var
- **First-run setup wizard** — no-user state shows an account creation screen instead of a login prompt
- **User management** (admin) — create, edit role, and delete users from Settings
- **Custom categories and payment methods** — create new entries inline from the bill form
- **Annual Expenses view** — 12-month grid with recurring bill projections, paid/pending bars, drill-down, and CSV export
- **Semver-tagged GHCR releases** — tagging `v*.*.*` now also publishes `{major}`, `{major}.{minor}`, and the full version as image tags, alongside the existing `latest`/`sha-` tags, so deployments can pin a stable version
- **`docker-compose.dev.yml`** — isolated local dev/build loop (separate containers, ports, and data directory) that runs safely alongside a production instance

### Changed
- Migrations extracted from `server.js` into `backend/db/migrations.js`
- CSV helpers extracted into `backend/utils/csv.js`
- Category and payment method routes now delegate to `CategoryService` / `PaymentMethodService`
- `BillService.update()` now persists `auto_renew` and `cancellation_url`; records amount changes automatically
- README rewritten: tagline updated, authentication section added with first-run walkthrough, roadmap updated

---

## [1.0.0] - 2026-02-16

### Added
- Calendar view for bill visualisation with colour-coded status
- Complete bill management (create, edit, delete)
- Vendor, amount, due date, payment method, account info, notes tracking
- Recurring bills (weekly, monthly, quarterly, annually) with auto-creation on paid
- Telegram push notifications
- Google Calendar sync
- Background scheduler (every 30 minutes) for reminder checks
- Light/dark theme toggle
- Fully responsive mobile design
- Docker Compose deployment with pre-built GHCR images
- SQLite database with bind-mount data persistence
- Auto backup before schema migrations
- Manual JSON backup and CSV export from Settings
- CSV import (admin only)
- List view with status/category/payment-method filters
- Settings panel for notifications and Google Calendar
- Per-bill reminder day configuration (0–30 days)
- Rate limiting on all API routes
- Legacy single-password auth via `BILLARR_PASSWORD`

---

[Unreleased]: https://github.com/sovereignalmida/billarr/compare/v2.2.1...HEAD
[2.2.1]: https://github.com/sovereignalmida/billarr/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/sovereignalmida/billarr/compare/v2.1.1...v2.2.0
[2.1.1]: https://github.com/sovereignalmida/billarr/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/sovereignalmida/billarr/compare/v2.0.2...v2.1.0
[2.0.2]: https://github.com/sovereignalmida/billarr/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/sovereignalmida/billarr/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/sovereignalmida/billarr/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/sovereignalmida/billarr/releases/tag/v1.0.0
