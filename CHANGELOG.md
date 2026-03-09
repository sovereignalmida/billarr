# Changelog

All notable changes to Billarr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/sovereignalmida/billarr/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/sovereignalmida/billarr/releases/tag/v1.0.0
