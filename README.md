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
- **Calendar View** - See all bills at a glance organized by due date
- **List View** - Quick card-based overview of all your bills
- **Detailed Tracking** - Store vendor, amount, due date, payment method, account info, and notes
- **Categories** - Organize bills by type (utilities, rent, subscriptions, etc.)
- **Recurring Bills** - Set weekly, monthly, quarterly, or annual recurring payments
- **Status Tracking** - Mark bills as pending, paid, or overdue

### 🔔 Notifications
- **📱 Telegram** - Instant push notifications to your phone
- **📅 Google Calendar** - Auto-sync bills as calendar events with reminders
- **🤖 Smart Scheduler** - Runs every hour, checks for bills in reminder window
- **⚙️ Customizable** - Set reminder days per bill (3 days before, 1 week before, etc.)

### 🎨 Design
- **Clean & Modern** - Thoughtful UI with Fraunces + Manrope typography
- **Responsive** - Works beautifully on desktop, tablet, and mobile
- **Dark Theme Ready** - Easy to customize colors
- **Accessible** - WCAG compliant design

### 🔧 Technical
- **Self-Hosted** - Full control over your data
- **SQLite Database** - Lightweight and portable
- **Docker Ready** - Deploy in seconds
- **RESTful API** - Clean backend architecture
- **No Tracking** - Zero analytics or third-party services

---

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- 5 minutes of your time

### Installation

```bash
# Clone the repository
git clone https://github.com/sovereignalmida/billarr.git
cd billarr

# Start the application
docker compose up -d

# Access Billarr at http://localhost:8080
```

That's it! 🎉

### First Steps
1. Create your first bill
2. Set up notifications (optional but recommended)
   - [Telegram Setup Guide](TELEGRAM_SETUP.md) - 5 minutes
   - [Google Calendar Guide](GOOGLE_CALENDAR_SETUP.md) - 10 minutes
3. Configure reminder preferences
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
Customize in `docker-compose.yml`:
```yaml
environment:
  - PORT=3001
  - DB_PATH=/app/data/bills.db
  - GOOGLE_CALENDAR_ID=primary
```

### Data Persistence
All data stored in `./data` directory - automatically backed up with your regular backups!

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
- [ ] WhatsApp integration
- [ ] Multi-user support
- [ ] Budget tracking
- [ ] Bill splitting
- [ ] Payment history charts
- [ ] CSV import/export
- [ ] Dark mode
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
