<div align="center">

<img src="logo.png" alt="Billarr Logo" width="200"/>

# Billarr

### Self-Hosted Bill Tracking & Reminders for the *arr Stack

**Never miss a payment again! 🏴‍☠️**

[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

[Features](#-features) • [Quick Start](#-quick-start) • [Setup](#-setup-guides) • [Contributing](#-contributing)

---

</div>

## 🎯 What is Billarr?

Billarr is a beautiful, self-hosted bill tracking application designed to integrate seamlessly with your *arr stack. Keep track of all your bills, visualize them on a calendar, and never miss a payment with automated reminders via Telegram and Google Calendar.

**Privacy First** - Your financial data stays on YOUR server  
**Beautiful UI** - Clean, modern interface that works perfectly on mobile  
**Smart Reminders** - Automated notifications via Telegram & Google Calendar  
**Easy Deploy** - One command with Docker Compose

---

## ✨ Features

### 📅 **Calendar View**
- Visual calendar showing all your bills by due date
- Color-coded by status (pending, paid, overdue)
- Click any bill to see full details
- Month navigation

### 📝 **Bill Management**
- Create, edit, and delete bills with ease
- Track vendor, amount, due date, payment method, and more
- Support for recurring bills (weekly, monthly, quarterly, annually)
- Custom categories and notes
- Account information storage

### 🔔 **Smart Notifications**
- **Telegram Bot Integration** - Instant push notifications
- **Google Calendar Sync** - Automatic calendar events with reminders
- **Hourly Scheduler** - Background service checks for upcoming bills
- **Customizable Timing** - Set reminder days per bill (0-30 days before due)

### 📱 **Mobile Friendly**
- Fully responsive design
- Touch-optimized interface
- Add to home screen on iOS/Android
- Works great on tablets

### 🔒 **Privacy & Security**
- Self-hosted - your data never leaves your server
- No analytics or tracking
- SQLite database - simple and reliable
- Optional Google Calendar OAuth

---

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sovereignalmida/billarr.git
   cd billarr
   ```

2. **Start the application**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   
   Or manually:
   ```bash
   docker compose up -d --build
   ```

3. **Access Billarr**
   
   Open your browser to: **http://localhost:8080**

That's it! 🎉

---

## 📚 Setup Guides

### 📱 Telegram Notifications (5 minutes)

Get instant bill reminders on your phone!

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Get your bot token
4. Message [@userinfobot](https://t.me/userinfobot) to get your Chat ID
5. **Start your bot** (send `/start` to it)
6. Enter credentials in Billarr Settings
7. Test with the "Test Now" button!

**📖 Full Guide:** [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)

### 📅 Google Calendar Sync (10 minutes)

Automatically create calendar events for your bills!

1. Create a Google Cloud project
2. Enable Calendar API
3. Create service account credentials
4. Share your calendar with the service account
5. Download credentials JSON
6. Copy to `./data/google-credentials.json`
7. Restart and enable in settings

**📖 Full Guide:** [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)

### 🔔 All About Notifications

**📖 Master Guide:** [NOTIFICATIONS.md](NOTIFICATIONS.md)

---

## 🛠️ Configuration

### Environment Variables

Create a `.env` file or modify `docker-compose.yml`:

```yaml
# Backend
PORT=3001
DB_PATH=/app/data/bills.db
GOOGLE_CREDENTIALS_PATH=/app/data/google-credentials.json
GOOGLE_CALENDAR_ID=primary

# Frontend
REACT_APP_API_URL=http://localhost:8080
```

### Ports

Default ports:
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:3001

To change ports, edit `docker-compose.yml`

---

## 💾 Data & Backups

### Data Location

All data is stored in the `./data` directory:
- `bills.db` - SQLite database with bills and settings
- `google-credentials.json` - Google Calendar credentials (optional)
- `google-token.json` - Google OAuth token (optional)

### Backup

Simple backup:
```bash
cp -r ./data ./data-backup-$(date +%Y%m%d)
```

Automated daily backup:
```bash
# Add to crontab
0 2 * * * /path/to/billarr/backup.sh
```

**📖 Full Guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🔧 Development

### Running Locally (without Docker)

**Backend:**
```bash
cd backend
npm install
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

Frontend: http://localhost:3000  
Backend: http://localhost:3001

### Tech Stack

- **Frontend:** React 18, Modern CSS
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Notifications:** Telegram Bot API, Google Calendar API
- **Deployment:** Docker, Nginx

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. 🐛 **Report bugs** - Open an issue
2. 💡 **Suggest features** - Share your ideas
3. 📝 **Improve docs** - Fix typos, add examples
4. 🔨 **Submit PRs** - Fix bugs, add features

### Development Roadmap

- [ ] Email notifications
- [ ] WhatsApp integration (via Twilio)
- [ ] Export to CSV/PDF
- [ ] Budget tracking
- [ ] Bill splitting
- [ ] Dark mode
- [ ] Multi-user support
- [ ] Payment history charts
- [ ] Bill categories auto-complete
- [ ] Receipt attachments

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- Inspired by the *arr stack ecosystem (Sonarr, Radarr, etc.)
- Built with modern web technologies
- Community-driven development

---

## ⚓ Stay Connected

- **Issues:** [GitHub Issues](https://github.com/sovereignalmida/billarr/issues)
- **Discussions:** [GitHub Discussions](https://github.com/sovereignalmida/billarr/discussions)

---

<div align="center">

**Made with ❤️ for the self-hosted community**

🏴‍☠️ **Never walk the plank of late fees!** 🏴‍☠️

[⬆ Back to Top](#billarr)

</div>
