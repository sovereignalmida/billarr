# Billarr 🏴‍☠️

Self-hosted bill tracking and reminder application. Never walk the plank of late fees!

## Quick Start

```bash
# Create directories
mkdir -p billarr/data && cd billarr

# Download docker-compose.yml
curl -O https://raw.githubusercontent.com/sovereignalmida/billarr/main/docker-compose.yml

# Start Billarr
docker compose up -d

# Access at http://localhost:8080
```

## What is Billarr?

Billarr is a beautiful, privacy-first bill tracking application that integrates with Telegram and Google Calendar to send you payment reminders. Perfect for homelab enthusiasts and *arr stack fans!

### Features

- 📅 **Calendar View** - Visualize all bills by due date
- 🔔 **Smart Reminders** - Telegram & Google Calendar notifications
- 📱 **Mobile Friendly** - Works great on phones and tablets
- 🔒 **Privacy First** - Your data stays on YOUR server
- 🐳 **Easy Deploy** - One command with Docker Compose

## Environment Variables

```yaml
# Backend
PORT=3001
DB_PATH=/app/data/bills.db

# Frontend  
REACT_APP_API_URL=http://localhost:8080

# Google Calendar (optional)
GOOGLE_CREDENTIALS_PATH=/app/data/google-credentials.json
GOOGLE_CALENDAR_ID=primary
```

## Volumes

- `./data:/app/data` - SQLite database and credentials

## Ports

- `8080` - Frontend web interface
- `3001` - Backend API (optional expose)

## Setup Notifications

### Telegram (5 minutes)

1. Message @BotFather on Telegram → `/newbot`
2. Get bot token
3. Message @userinfobot → Get chat ID  
4. Start your bot (send `/start`)
5. Configure in Billarr Settings

[Full Guide](https://github.com/sovereignalmida/billarr/blob/main/TELEGRAM_SETUP.md)

### Google Calendar (10 minutes)

1. Create Google Cloud project
2. Enable Calendar API
3. Create service account
4. Download credentials to `./data/google-credentials.json`
5. Share calendar with service account email

[Full Guide](https://github.com/sovereignalmida/billarr/blob/main/GOOGLE_CALENDAR_SETUP.md)

## Health Check

```bash
curl http://localhost:3001/health
```

## Support

- [GitHub](https://github.com/sovereignalmida/billarr)
- [Issues](https://github.com/sovereignalmida/billarr/issues)
- [Documentation](https://github.com/sovereignalmida/billarr#readme)

## License

MIT - See [LICENSE](https://github.com/sovereignalmida/billarr/blob/main/LICENSE)
