# Changelog

All notable changes to Billarr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-16

### 🎉 Initial Release

#### Added
- 📅 Beautiful calendar view for bill visualization
- 📝 Complete bill management (create, edit, delete)
- 💰 Track vendor, amount, due date, payment method, and more
- 🔄 Support for recurring bills (weekly, monthly, quarterly, annually)
- 📱 Telegram bot integration for instant notifications
- 📅 Google Calendar sync for automatic event creation
- ⏰ Background scheduler running hourly to check for due bills
- 🎨 Modern, clean UI with teal/navy branding
- 📱 Fully responsive mobile design
- 🏴‍☠️ "Billarr" branding with nautical theme
- 🐳 Docker Compose for easy deployment
- 💾 SQLite database for simple data persistence
- ⚙️ Settings panel for notification configuration
- 🧪 Test button for Telegram notifications
- 📖 Comprehensive documentation
  - README with quick start
  - TELEGRAM_SETUP.md guide
  - GOOGLE_CALENDAR_SETUP.md guide
  - NOTIFICATIONS.md master guide
  - DEPLOYMENT.md for production
  - CONTRIBUTING.md for developers

#### Features
- Color-coded bill status (pending, paid, overdue)
- Custom categories (utilities, rent, insurance, etc.)
- Customizable reminder days (0-30 days before due)
- Account info storage
- Notes field for additional information
- List view and Calendar view toggle
- Click bill for detailed modal
- Mobile-friendly touch interface
- PWA support (add to home screen)

#### Technical
- React 18 frontend
- Node.js/Express backend
- SQLite3 database
- Telegram Bot API integration
- Google Calendar API integration
- Docker multi-stage builds
- Nginx reverse proxy
- Health check endpoints
- Graceful shutdown handling

---

## [Unreleased]

### Planned
- Email notifications
- WhatsApp integration (via Twilio)
- Dark mode
- Export to CSV/PDF
- Budget tracking
- Bill splitting
- Multi-user support
- Payment history charts
- Receipt attachments
- Bill categories auto-complete

---

## Release Notes

### v1.0.0 - "Maiden Voyage" 🏴‍☠️

The first official release of Billarr! After extensive testing and development, we're proud to launch a fully-functional, self-hosted bill tracking solution.

**Highlights:**
- Complete bill management system
- Telegram notifications working perfectly
- Google Calendar sync fully implemented
- Beautiful UI that works great on mobile
- Comprehensive documentation
- Easy Docker deployment

**Known Issues:**
- WhatsApp integration not yet implemented (planned for future)
- Calendar sync requires manual Google Cloud setup (see docs)

**Migration Notes:**
- This is the initial release, no migration needed

---

[1.0.0]: https://github.com/sovereignalmida/billarr/releases/tag/v1.0.0
