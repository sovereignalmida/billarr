const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const NotificationService = require('./notificationService');
const GoogleCalendarService = require('./googleCalendarService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const dbPath = process.env.DB_PATH || '/app/data/bills.db';
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      account_info TEXT,
      payment_method TEXT,
      category TEXT,
      notes TEXT,
      recurring TEXT DEFAULT 'none',
      reminder_days INTEGER DEFAULT 3,
      status TEXT DEFAULT 'pending',
      calendar_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add calendar_event_id column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE bills ADD COLUMN calendar_event_id TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add last_notified_at column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE bills ADD COLUMN last_notified_at DATETIME
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_method TEXT DEFAULT 'none',
      telegram_chat_id TEXT,
      telegram_bot_token TEXT,
      whatsapp_number TEXT,
      google_calendar_sync INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default settings if not exists
  db.run(`
    INSERT OR IGNORE INTO settings (id, notification_method) 
    SELECT 1, 'none' 
    WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1)
  `);
});

// Initialize services
const notificationService = new NotificationService(db);
const googleCalendarService = new GoogleCalendarService(db);

// Start notification scheduler
notificationService.start();

// Initialize Google Calendar (async, non-blocking)
googleCalendarService.initialize().catch(err => {
  console.log('ℹ️  Google Calendar will remain disabled');
});

// API Routes

// Get all bills
app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills ORDER BY due_date ASC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single bill
app.get('/api/bills/:id', (req, res) => {
  db.get('SELECT * FROM bills WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }
    res.json(row);
  });
});

// Create bill
app.post('/api/bills', async (req, res) => {
  const { vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days } = req.body;
  
  const sql = `INSERT INTO bills (vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [vendor, amount, due_date, account_info, payment_method, category, notes, recurring || 'none', reminder_days || 3], async function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const billId = this.lastID;
    
    // Try to sync with Google Calendar
    const bill = { id: billId, vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status: 'pending' };
    const eventId = await googleCalendarService.syncBill(bill, 'create');
    
    if (eventId) {
      // Update bill with calendar event ID
      db.run('UPDATE bills SET calendar_event_id = ? WHERE id = ?', [eventId, billId]);
    }
    
    res.json({ id: billId, message: 'Bill created successfully' });
  });
});

// Update bill
app.put('/api/bills/:id', async (req, res) => {
  const { vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status } = req.body;
  
  // First get the existing bill to get calendar_event_id
  db.get('SELECT * FROM bills WHERE id = ?', [req.params.id], async (err, existingBill) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const sql = `UPDATE bills SET vendor = ?, amount = ?, due_date = ?, account_info = ?, 
                 payment_method = ?, category = ?, notes = ?, recurring = ?, reminder_days = ?, status = ?
                 WHERE id = ?`;
    
    db.run(sql, [vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status, req.params.id], async function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Sync with Google Calendar
      const updatedBill = { 
        id: req.params.id, 
        vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status,
        calendar_event_id: existingBill?.calendar_event_id 
      };
      
      const eventId = await googleCalendarService.syncBill(updatedBill, 'update');
      
      if (eventId && !existingBill?.calendar_event_id) {
        // New event created, update the bill
        db.run('UPDATE bills SET calendar_event_id = ? WHERE id = ?', [eventId, req.params.id]);
      }
      
      res.json({ message: 'Bill updated successfully', changes: this.changes });
    });
  });
});

// Delete bill
app.delete('/api/bills/:id', (req, res) => {
  // Get bill first to delete calendar event
  db.get('SELECT * FROM bills WHERE id = ?', [req.params.id], async (err, bill) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (bill) {
      // Delete from Google Calendar if synced
      await googleCalendarService.syncBill(bill, 'delete');
    }
    
    db.run('DELETE FROM bills WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Bill deleted successfully', changes: this.changes });
    });
  });
});

// Get settings
app.get('/api/settings', (req, res) => {
  db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || {});
  });
});

// Update settings
app.put('/api/settings', (req, res) => {
  const { notification_method, telegram_chat_id, telegram_bot_token, whatsapp_number, google_calendar_sync } = req.body;
  
  const sql = `UPDATE settings SET notification_method = ?, telegram_chat_id = ?, 
               telegram_bot_token = ?, whatsapp_number = ?, google_calendar_sync = ?
               WHERE id = 1`;
  
  db.run(sql, [notification_method, telegram_chat_id, telegram_bot_token, whatsapp_number, google_calendar_sync], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Settings updated successfully' });
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual trigger for notifications (for testing)
app.post('/api/notifications/trigger', async (req, res) => {
  try {
    await notificationService.checkAndNotify();
    res.json({ message: 'Notification check triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚓ Billarr API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  notificationService.stop();
  db.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
