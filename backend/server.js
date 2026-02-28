const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const NotificationService = require('./notificationService');
const GoogleCalendarService = require('./googleCalendarService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Auth middleware — protect all /api routes when BILLARR_PASSWORD is set
app.use('/api', (req, res, next) => {
  const password = process.env.BILLARR_PASSWORD;
  if (!password) return next(); // auth disabled if no password configured
  const auth = req.headers['authorization'] || '';
  const b64 = auth.replace(/^Basic /, '');
  const decoded = Buffer.from(b64, 'base64').toString();
  const colonIndex = decoded.indexOf(':');
  const pass = colonIndex >= 0 ? decoded.slice(colonIndex + 1) : '';
  if (pass === password) return next();
  res.set('WWW-Authenticate', 'Basic realm="Billarr"');
  res.status(401).json({ error: 'Unauthorized' });
});

// Database setup
const dbPath = process.env.DB_PATH || '/app/data/bills.db';
const db = new sqlite3.Database(dbPath);

// ─── Migration system ─────────────────────────────────────────────────────────

const MIGRATIONS = [
  {
    name: '001_initial_schema',
    sql: [
      `CREATE TABLE IF NOT EXISTS bills (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_method TEXT DEFAULT 'none',
        telegram_chat_id TEXT,
        telegram_bot_token TEXT,
        whatsapp_number TEXT,
        google_calendar_sync INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `INSERT OR IGNORE INTO settings (id, notification_method)
       SELECT 1, 'none' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1)`
    ]
  },
  {
    name: '002_add_calendar_event_id',
    sql: [`ALTER TABLE bills ADD COLUMN calendar_event_id TEXT`]
  },
  {
    name: '003_add_last_notified_at',
    sql: [`ALTER TABLE bills ADD COLUMN last_notified_at DATETIME`]
  }
];

function backupBills(dataDir) {
  return new Promise((resolve) => {
    db.all('SELECT * FROM bills', [], (err, rows) => {
      if (err || !rows || rows.length === 0) return resolve();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const file = path.join(dataDir, `bills-backup-${ts}.json`);
      fs.writeFile(file, JSON.stringify(rows, null, 2), (writeErr) => {
        if (!writeErr) console.log(`📦 Bills backed up to ${file}`);
        resolve();
      });
    });
  });
}

async function runMigrations() {
  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => (err ? reject(err) : resolve())
    );
  });

  const applied = await new Promise((resolve, reject) => {
    db.all('SELECT name FROM migrations', [], (err, rows) =>
      err ? reject(err) : resolve(new Set(rows.map((r) => r.name)))
    );
  });

  const pending = MIGRATIONS.filter((m) => !applied.has(m.name));
  if (pending.length === 0) {
    console.log('✅ Database schema up to date');
    return;
  }

  const dataDir = path.dirname(dbPath);
  await backupBills(dataDir);

  for (const migration of pending) {
    console.log(`  Applying migration: ${migration.name}`);
    for (const sql of migration.sql) {
      await new Promise((resolve) => {
        db.run(sql, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.warn(`  Warning in ${migration.name}: ${err.message}`);
          }
          resolve();
        });
      });
    }
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO migrations (name) VALUES (?)',
        [migration.name],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }
  console.log(`✅ Applied ${pending.length} migration(s)`);
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_STATUSES   = ['pending', 'paid', 'overdue'];
const VALID_RECURRING  = ['none', 'weekly', 'monthly', 'quarterly', 'annually'];
const VALID_CATEGORIES = ['utilities', 'rent', 'insurance', 'subscription', 'credit-card', 'loan', 'other'];

function validateBill({ vendor, amount, due_date, reminder_days, status, recurring, category }) {
  const errors = [];
  if (!vendor || !String(vendor).trim()) {
    errors.push('vendor is required');
  }
  if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('amount must be a positive number');
  }
  if (!due_date || isNaN(Date.parse(due_date))) {
    errors.push('due_date must be a valid date');
  }
  if (reminder_days !== undefined && reminder_days !== null) {
    const rd = Number(reminder_days);
    if (isNaN(rd) || rd < 0 || rd > 30) errors.push('reminder_days must be between 0 and 30');
  }
  if (status && !VALID_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (recurring && !VALID_RECURRING.includes(recurring)) {
    errors.push(`recurring must be one of: ${VALID_RECURRING.join(', ')}`);
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  return errors;
}

// ─── Recurring bill helper ────────────────────────────────────────────────────

function nextDueDate(dueDateStr, recurring) {
  const d = new Date(dueDateStr);
  switch (recurring) {
    case 'weekly':    d.setDate(d.getDate() + 7);       break;
    case 'monthly':   d.setMonth(d.getMonth() + 1);     break;
    case 'quarterly': d.setMonth(d.getMonth() + 3);     break;
    case 'annually':  d.setFullYear(d.getFullYear() + 1); break;
    default: return null;
  }
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Get all bills
app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills ORDER BY due_date ASC', [], (err, rows) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    res.json(rows);
  });
});

// Get single bill
app.get('/api/bills/:id', (req, res) => {
  db.get('SELECT * FROM bills WHERE id = ?', [req.params.id], (err, row) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    if (!row) { res.status(404).json({ error: 'Bill not found' }); return; }
    res.json(row);
  });
});

// Create bill
app.post('/api/bills', async (req, res) => {
  const { vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days } = req.body;

  const errors = validateBill(req.body);
  if (errors.length > 0) { res.status(400).json({ errors }); return; }

  const sql = `INSERT INTO bills (vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(
    sql,
    [vendor, amount, due_date, account_info, payment_method, category, notes, recurring || 'none', reminder_days || 3],
    async function (err) {
      if (err) { res.status(500).json({ error: err.message }); return; }

      const billId = this.lastID;
      const bill = { id: billId, vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status: 'pending' };
      const eventId = await googleCalendarService.syncBill(bill, 'create');
      if (eventId) {
        db.run('UPDATE bills SET calendar_event_id = ? WHERE id = ?', [eventId, billId]);
      }

      res.json({ id: billId, message: 'Bill created successfully' });
    }
  );
});

// Update bill
app.put('/api/bills/:id', async (req, res) => {
  const { vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status } = req.body;

  const errors = validateBill(req.body);
  if (errors.length > 0) { res.status(400).json({ errors }); return; }

  db.get('SELECT * FROM bills WHERE id = ?', [req.params.id], async (err, existingBill) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    if (!existingBill) { res.status(404).json({ error: 'Bill not found' }); return; }

    const sql = `UPDATE bills SET vendor = ?, amount = ?, due_date = ?, account_info = ?,
                 payment_method = ?, category = ?, notes = ?, recurring = ?, reminder_days = ?, status = ?
                 WHERE id = ?`;

    db.run(
      sql,
      [vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status, req.params.id],
      async function (err) {
        if (err) { res.status(500).json({ error: err.message }); return; }

        // Sync with Google Calendar
        const updatedBill = {
          id: req.params.id, vendor, amount, due_date, account_info, payment_method,
          category, notes, recurring, reminder_days, status,
          calendar_event_id: existingBill.calendar_event_id
        };
        const eventId = await googleCalendarService.syncBill(updatedBill, 'update');
        if (eventId && !existingBill.calendar_event_id) {
          db.run('UPDATE bills SET calendar_event_id = ? WHERE id = ?', [eventId, req.params.id]);
        }

        // Auto-create next bill for recurring bills when marked paid
        let nextBillCreated = false;
        const wasJustPaid = status === 'paid' && existingBill.status !== 'paid';
        if (wasJustPaid && recurring && recurring !== 'none') {
          const newDue = nextDueDate(due_date, recurring);
          if (newDue) {
            db.run(
              `INSERT INTO bills (vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [vendor, amount, newDue, account_info, payment_method, category, notes, recurring, reminder_days || 3],
              function (insertErr) {
                if (!insertErr) {
                  console.log(`🔄 Auto-created next ${recurring} bill for ${vendor} due ${newDue}`);
                }
              }
            );
            nextBillCreated = true;
          }
        }

        res.json({ message: 'Bill updated successfully', changes: this.changes, nextBillCreated });
      }
    );
  });
});

// Delete bill
app.delete('/api/bills/:id', (req, res) => {
  db.get('SELECT * FROM bills WHERE id = ?', [req.params.id], async (err, bill) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    if (bill) {
      await googleCalendarService.syncBill(bill, 'delete');
    }
    db.run('DELETE FROM bills WHERE id = ?', [req.params.id], function (err) {
      if (err) { res.status(500).json({ error: err.message }); return; }
      res.json({ message: 'Bill deleted successfully', changes: this.changes });
    });
  });
});

// Get settings
app.get('/api/settings', (req, res) => {
  db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
    if (err) { res.status(500).json({ error: err.message }); return; }
    res.json(row || {});
  });
});

// Update settings
app.put('/api/settings', (req, res) => {
  const { notification_method, telegram_chat_id, telegram_bot_token, google_calendar_sync } = req.body;

  const sql = `UPDATE settings SET notification_method = ?, telegram_chat_id = ?,
               telegram_bot_token = ?, google_calendar_sync = ?
               WHERE id = 1`;

  db.run(sql, [notification_method, telegram_chat_id, telegram_bot_token, google_calendar_sync], function (err) {
    if (err) { res.status(500).json({ error: err.message }); return; }
    res.json({ message: 'Settings updated successfully' });
  });
});

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual notification trigger (for testing)
app.post('/api/notifications/trigger', async (req, res) => {
  try {
    await notificationService.checkAndNotify();
    res.json({ message: 'Notification check triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Startup ──────────────────────────────────────────────────────────────────

let notificationService;
let googleCalendarService;

async function main() {
  await runMigrations();

  notificationService = new NotificationService(db);
  googleCalendarService = new GoogleCalendarService(db);

  notificationService.start();
  googleCalendarService.initialize().catch(() => {
    console.log('ℹ️  Google Calendar will remain disabled');
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚓ Billarr API running on port ${PORT}`);
    if (process.env.BILLARR_PASSWORD) {
      console.log('🔒 Password protection enabled');
    } else {
      console.log('⚠️  No BILLARR_PASSWORD set — running without authentication');
    }
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  if (notificationService) notificationService.stop();
  db.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});
