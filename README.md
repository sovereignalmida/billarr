<div align="center">

# ⚓ Billarr

<img src="logo.png" alt="Billarr Logo" width="300"/>

**Self-hosted bill tracking and reminders for the \*arr stack**

*Never walk the plank of late fees again!* 🏴‍☠️💰

[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Screenshots](#-screenshots) • [Contributing](#-contributing)

</div>

---

## 🎯 What is Billarr?

Billarr is a beautiful, self-hosted bill tracking and reminder application designed for the self-hosted community. Keep track of all your bills, visualize them in a clean calendar view, and never miss a payment with integrated Telegram and Google Calendar notifications.

### Why Billarr?

- 🔒 **Privacy First** - Your financial data stays on your server
- 🏴‍☠️ **\*arr Ecosystem** - Fits perfectly with Sonarr, Radarr, and friends
- 📱 **Mobile Friendly** - Gorgeous responsive design
- 🔔 **Smart Reminders** - Telegram bots + Google Calendar sync
- 🐳 **Easy Deploy** - One Docker Compose command
- 🎨 **Beautiful UI** - Modern design with thoughtful UX

---

## ✨ Features

### 📅 Bill Management
- **Calendar View** - See all bills at a glance with color-coded status; recurring bills projected into future months
- **List View** - Filterable, sortable card view — filter by status, category, or payment method
- **Expenses View** - Annual 12-month grid with recurring projections and CSV export
- **Detailed Tracking** - Vendor, amount, due date, payment method, account info, and notes
- **Categories** - Dynamic categories with inline create-new
- **Payment Methods** - Dynamic dropdown with inline create-new
- **Vendor Autocomplete** - Pick from past vendors or type a new one
- **Recurring Bills** - Weekly, monthly, quarterly, or annual — auto-creates next bill on paid
- **Status Tracking** - Pending, paid, overdue

### 🔔 Notifications
- **📱 Telegram** - Instant push notifications to your phone
- **📅 Google Calendar** - Auto-sync bills as calendar events with reminders
- **🤖 Smart Scheduler** - Runs every hour, checks for bills in reminder window
- **⚙️ Customizable** - Set reminder days per bill

### 💾 Data Management
- **Auto Backup** - JSON backup written before every database migration (in `./data/`)
- **Manual Backup** - Download a JSON snapshot any time from Settings
- **CSV Export** - Export all bills or an annual expenses view to CSV
- **CSV Import** - Import bills from a Billarr-format CSV

### 🎨 Design
- **Clean & Modern** - Fraunces + Manrope typography
- **Dark Mode** - Toggle between light and dark themes
- **Responsive** - Works on desktop, tablet, and mobile

### 🔧 Technical
- **Self-Hosted** - Full control over your data
- **SQLite Database** - Lightweight, bind-mounted for easy backup
- **Pre-built Docker Images** - Pull from `ghcr.io`, no local build needed
- **RESTful API** - Clean Express backend
- **No Tracking** - Zero analytics or third-party services

---

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose

### Installation (pre-built images — recommended)

Create a `docker-compose.yml`:

```yaml
services:
  backend:
    image: ghcr.io/sovereignalmida/billarr-backend:latest
    container_name: billarr-backend
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_PATH=/app/data/bills.db
      # - BILLARR_PASSWORD=changeme   # uncomment to enable password protection
    restart: unless-stopped

  frontend:
    image: ghcr.io/sovereignalmida/billarr-frontend:latest
    container_name: billarr-frontend
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: unless-stopped
```

Then:

```bash
docker compose pull
docker compose up -d
# Access Billarr at http://localhost:8080
```

That's it — no cloning, no building. 🎉

### Updating

```bash
docker compose pull && docker compose up -d
```

Migrations run automatically on startup. Your data in `./data/` is always backed up to a timestamped JSON file before any schema change.

### Alternative: build from source

```bash
git clone https://github.com/sovereignalmida/billarr.git
cd billarr
cp docker-compose.example.yml docker-compose.yml
# Edit docker-compose.yml — swap image: lines for build: lines
docker compose up -d --build
```

### First Steps
1. Create your first bill
2. Set up notifications (optional)
   - [Telegram Setup Guide](TELEGRAM_SETUP.md)
   - [Google Calendar Guide](GOOGLE_CALENDAR_SETUP.md)
3. Configure reminder preferences per bill
4. Never miss a payment again!

---

## 📚 Documentation

- **[README.md](README.md)** - Full user guide with all features
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment & advanced configuration
- **[NOTIFICATIONS.md](NOTIFICATIONS.md)** - Complete notification setup guide
- **[TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)** - Telegram bot configuration
- **[GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)** - Google Calendar integration
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Technical overview & architecture

---

## 📱 Screenshots

<div align="center">

### Calendar View
*Visualize all your bills by due date with color-coded status*

### Bill Details
*Comprehensive bill information at your fingertips*

### Mobile Responsive
*Works beautifully on any device*

</div>

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Modern CSS, Responsive Design
- **Backend**: Node.js, Express, SQLite3
- **Notifications**: Telegram Bot API, Google Calendar API
- **Deployment**: Docker, Docker Compose, Nginx
- **Design**: Custom UI with Fraunces & Manrope fonts

---

## 🎨 Configuration

### Ports
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3001`

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BILLARR_PASSWORD` | *(unset)* | Enable password protection. Leave unset to disable auth. |
| `PORT` | `3001` | Backend API port |
| `DB_PATH` | `/app/data/bills.db` | SQLite database path inside container |

### Data Persistence

All data lives in `./data/` on the host — a bind mount, not a Docker volume. This means:
- Data survives `docker compose down`, image updates, and even `docker system prune`
- Pre-migration backups are written to `./data/bills-backup-{timestamp}.json` automatically
- Manual backups available any time via **Settings → Data Management → Download Backup**

---

## 🔔 Setting Up Notifications

### Telegram (Recommended - 5 minutes)
1. Message @BotFather on Telegram → `/newbot`
2. Get bot token and chat ID
3. Enter in Billarr settings
4. Done! 🎉

**Full guide:** [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)

### Google Calendar (10 minutes)
1. Create Google Cloud project
2. Enable Calendar API
3. Create service account
4. Share calendar with service account
5. Add credentials to `./data/google-credentials.json`

**Full guide:** [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

- 🐛 Report bugs
- 💡 Suggest new features
- 📖 Improve documentation
- 🔧 Submit pull requests

Please open an issue first to discuss major changes.

---

## 📋 Roadmap

- [ ] Email notifications
- [ ] Multi-user support
- [ ] Budget tracking / spending charts
- [ ] Bill splitting
- [ ] Mobile app (PWA)
- [ ] API webhooks

---

## 🙏 Acknowledgments

- Inspired by the amazing \*arr ecosystem
- Built for the self-hosted community
- Logo created with AI assistance

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/sovereignalmida/billarr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sovereignalmida/billarr/discussions)
- **Documentation**: Check the guides in this repo

---

<div align="center">

**Made with ❤️ for the self-hosted community**

⚓ *Hoist the sails on your finances* 🏴‍☠️

[⬆ Back to Top](#-billarr)

</div>
