# ⚓ Billarr - Project Overview

![Billarr Logo](logo.png)

**Never walk the plank of late fees again!** 🏴‍☠️💰

## 🎯 What You've Got

A complete, production-ready bill tracking application with:
- ✨ Beautiful, modern React frontend
- 🚀 Fast Express.js backend
- 💾 SQLite database for data persistence
- 🐳 Docker deployment (just run `docker-compose up`)
- 📱 Fully responsive mobile design
- 🔔 Two-way Telegram bot (buttons + slash commands) and Google Calendar sync

## 📁 Project Structure

```
billarr/
├── logo.png                    # Main logo
├── backend/                    # Node.js/Express API
│   ├── server.js               # Routes; wires services together
│   ├── notificationService.js  # Reminder scheduler
│   ├── googleCalendarService.js
│   ├── services/               # Business logic, one class per domain
│   │   ├── billService.js
│   │   ├── reportService.js    # Dashboard/summary/trends queries
│   │   ├── telegramBotService.js  # Bot commands, buttons, webhook
│   │   ├── authService.js
│   │   ├── categoryService.js
│   │   └── paymentMethodService.js
│   ├── middleware/auth.js      # JWT/admin guards
│   ├── db/
│   │   ├── migrations.js       # Versioned schema migrations, auto-backup
│   │   └── index.js            # dbGet/dbAll/dbRun promise wrappers
│   ├── utils/
│   │   ├── dates.js            # Recurring-date math, shared with frontend
│   │   └── csv.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
│
├── frontend/                   # React application
│   ├── public/index.html
│   ├── src/
│   │   ├── components/         # Calendar, ListView, ExpensesView,
│   │   │                       # Dashboard, BillForm, BillDetails,
│   │   │                       # Settings, Login, NotificationTest
│   │   ├── utils/dates.js
│   │   ├── App.js
│   │   └── index.js
│   ├── nginx.conf              # Proxies /api, /health, /telegram/webhook to backend
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.example.yml  # Copy to docker-compose.yml to deploy
├── docker-compose.dev.yml      # Isolated local build/dev loop
├── start.sh                    # Quick start script
├── README.md                   # User documentation
├── DEPLOYMENT.md                # Deployment guide
├── CHANGELOG.md
└── .gitignore
```

## 🎨 Design Features

The app features a **clean, modern aesthetic** with:

### Typography
- **Display Font**: Fraunces (serif) for headers - elegant and distinctive
- **Body Font**: Manrope (sans-serif) - clean and highly readable
- Carefully balanced hierarchy

### Color Scheme
- **Primary**: Blue (#2563eb) - trustworthy and professional
- **Surface**: White with subtle shadows
- **Background**: Light gray (#fafbfc) for reduced eye strain
- **Accents**: Green for success, red for warnings, amber for pending

### UI Elements
- Smooth animations and transitions
- Hover states that feel responsive
- Card-based layouts with depth
- Mobile-first responsive design
- Glassmorphism effects on modals

## 🚀 Quick Start

1. **Navigate to the project**:
   ```bash
   cd billarr
   ```

2. **Run the start script**:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

3. **Open your browser**:
   ```
   http://localhost:8080
   ```

That's it! 🎉

## 🔧 Tech Stack

### Backend
- **Node.js** 18 (LTS)
- **Express.js** - Web framework
- **SQLite3** - Database
- **CORS** - Cross-origin support

### Frontend
- **React** 18 - UI library
- **CSS3** - Custom styling (no frameworks!)
- **Modern JavaScript** - ES6+ features

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Static file serving and reverse proxy

## 📊 Database Schema

Schema is versioned in `backend/db/migrations.js` — that file is the source of truth; a
timestamped JSON backup is written to `./data/` before every migration run. Summary:

### Bills Table
```sql
- id (PRIMARY KEY)
- vendor (TEXT), amount (REAL), due_date (TEXT)
- account_info, payment_method, category, notes (TEXT)
- recurring (TEXT: none/weekly/monthly/quarterly/annually)
- reminder_days (INTEGER), status (TEXT: pending/paid/overdue)
- auto_renew (INTEGER), cancellation_url (TEXT)     -- subscription metadata
- on_hold (INTEGER)                                  -- pause future recurring occurrences
- snoozed_until (TEXT)                               -- temporarily silence reminders
- calendar_event_id (TEXT), last_notified_at (DATETIME)
- created_at (DATETIME)
```

### Settings Table
```sql
- id (PRIMARY KEY)
- notification_method (TEXT), google_calendar_sync (INTEGER)
- telegram_chat_id, telegram_bot_token (TEXT)
- telegram_webhook_secret (TEXT)   -- verifies inbound webhook calls are really from Telegram
- created_at (DATETIME)
```

### Other tables
`categories`, `payment_methods` (user-defined, dynamic), `users` (JWT accounts, admin/member
roles), `bill_amount_history` (records every price change per bill), `migrations` (tracks which
migrations have run).

## 🌟 Key Features

### Calendar View
- Month navigation
- Visual bill indicators
- Color-coded by status
- Click to view details
- Responsive grid layout

### Bill Management
- Create, read, update, delete
- Recurring bill support, with a Hold action to pause future occurrences
- Categories and tags
- Custom reminder timing
- Status tracking (pending/paid/overdue)

### Dashboard & Reporting
- Summary cards, 6-month spend trend bars, category breakdown
- Subscription table with monthly-equivalent normalisation
- Price change history
- Annual Expenses view: 12-month grid with recurring projections and CSV export

### Notifications (Configurable)
- Two-way Telegram bot — inline buttons (Mark Paid / Hold / Snooze) and slash commands
  (`/due`, `/summary`, `/paid <vendor>`, etc.), delivered via webhook
- Google Calendar sync
- Customizable reminder timing per bill

### Mobile Experience
- Touch-friendly interface
- Optimized layouts
- Fast load times
- Add to home screen support

## 🔐 Privacy & Security

- **Self-hosted** - Your data never leaves your server
- **SQLite** - Local database storage
- **No analytics** - No tracking or third-party services
- **Open source** - Full transparency

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome)

## 🎯 Use Cases

Perfect for:
- 👨‍👩‍👧‍👦 Household bill management
- 💼 Small business expenses
- 🏠 Rental property management
- 📊 Personal finance tracking
- 🎓 Shared apartment bills

## 🛠️ Customization

### Change Colors
Edit `/frontend/src/App.css` - look for CSS variables in `:root`

### Add Categories
Modify the category options in `BillForm.js`

### Change Ports
Update `docker-compose.yml` port mappings

### Modify Reminder Logic
Edit backend notification scheduling in `server.js`

## 📈 Performance

- **Fast**: React optimizations and lazy loading
- **Lightweight**: ~500KB total bundle size
- **Efficient**: SQLite for minimal overhead
- **Scalable**: Handles hundreds of bills easily

## 🤝 Contributing Ideas

Already built: dark mode, multi-user accounts, CSV import/export, custom categories, and price
change history. Want to extend this further? Consider adding:
- Email notifications
- Bill splitting features
- Budget tracking
- PDF export
- Discord/webhook notifications

## 📞 Support Resources

- **README.md** - User guide and features
- **DEPLOYMENT.md** - Production deployment
- **Docker logs** - `docker-compose logs`
- **Health check** - `http://localhost:3001/health`

## 💡 Pro Tips

1. **Backup regularly** - Your data is in the `./data` folder
2. **Use categories** - Makes filtering and reporting easier
3. **Set realistic reminders** - 3-7 days works well for most bills
4. **Mark as paid** - Keep your dashboard clean
5. **Use recurring** - Set it once, never forget monthly bills

---

## 🎉 You're All Set!

You now have a complete, production-ready bill tracking application. Just run `./start.sh` and start managing your bills with style!

Questions? Check the README.md or DEPLOYMENT.md files for detailed information.

Happy tracking! 💰✨
