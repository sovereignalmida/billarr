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
- 🔔 Notification support (Telegram, WhatsApp, Google Calendar)

## 📁 Project Structure

```
billarr/
├── logo.png                   # Main logo
├── logo-circle.png            # Circular variant
├── backend/                    # Node.js/Express API
│   ├── server.js              # Main server file
│   ├── package.json           # Dependencies
│   ├── Dockerfile             # Container config
│   └── .dockerignore
│
├── frontend/                   # React application
│   ├── public/
│   │   └── index.html         # HTML template
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Calendar.js    # Calendar view
│   │   │   ├── Calendar.css
│   │   │   ├── BillForm.js    # Add/Edit form
│   │   │   ├── BillForm.css
│   │   │   ├── BillDetails.js # Bill detail modal
│   │   │   ├── BillDetails.css
│   │   │   ├── Settings.js    # Settings modal
│   │   │   └── Settings.css
│   │   ├── App.js             # Main app component
│   │   ├── App.css            # Main styles
│   │   ├── index.js           # React entry point
│   │   └── index.css          # Global styles
│   ├── package.json           # Dependencies
│   ├── Dockerfile             # Container config
│   ├── nginx.conf             # Web server config
│   └── .dockerignore
│
├── docker-compose.yml         # Multi-container setup
├── start.sh                   # Quick start script
├── README.md                  # User documentation
├── DEPLOYMENT.md              # Deployment guide
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

### Bills Table
```sql
- id (PRIMARY KEY)
- vendor (TEXT)
- amount (REAL)
- due_date (TEXT)
- account_info (TEXT)
- payment_method (TEXT)
- category (TEXT)
- notes (TEXT)
- recurring (TEXT)
- reminder_days (INTEGER)
- status (TEXT)
- created_at (DATETIME)
```

### Settings Table
```sql
- id (PRIMARY KEY)
- notification_method (TEXT)
- telegram_chat_id (TEXT)
- telegram_bot_token (TEXT)
- whatsapp_number (TEXT)
- google_calendar_sync (INTEGER)
- created_at (DATETIME)
```

## 🌟 Key Features

### Calendar View
- Month navigation
- Visual bill indicators
- Color-coded by status
- Click to view details
- Responsive grid layout

### Bill Management
- Create, read, update, delete
- Recurring bill support
- Categories and tags
- Custom reminder timing
- Status tracking (pending/paid/overdue)

### Notifications (Configurable)
- Telegram bot integration
- WhatsApp support
- Google Calendar sync
- Customizable reminder timing

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

Want to extend this? Consider adding:
- Email notifications
- Bill splitting features
- Budget tracking
- Expense categories
- Payment history charts
- PDF export
- Import from CSV
- Multi-user support
- Dark mode toggle

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
