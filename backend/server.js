const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const NotificationService = require('./notificationService');
const GoogleCalendarService = require('./googleCalendarService');
const BillService = require('./services/billService');
const AuthService = require('./services/authService');
const createAuthMiddleware = require('./middleware/auth');
const { dbGet, dbAll, dbRun } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy (Traefik/nginx) so X-Forwarded-For is handled correctly
// by express-rate-limit and req.ip
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});
const triggerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many trigger requests' },
});
app.use('/api', apiLimiter);

// ─── Legacy Basic Auth (backward compat when JWT_SECRET is not set) ───────────
// When JWT_SECRET IS set, this block is skipped entirely — JWT auth handles everything.
app.use('/api', (req, res, next) => {
  if (process.env.JWT_SECRET) return next(); // JWT mode — skip legacy auth
  const password = process.env.BILLARR_PASSWORD;
  if (!password) return next(); // no auth configured at all

  // Skip legacy auth for /api/auth/* so the frontend can check auth status
  if (req.path.startsWith('/auth/')) return next();

  const auth = req.headers['authorization'] || '';
  const b64 = auth.replace(/^Basic /, '');
  const decoded = Buffer.from(b64, 'base64').toString();
  const colonIndex = decoded.indexOf(':');
  const pass = colonIndex >= 0 ? decoded.slice(colonIndex + 1) : '';
  const passBuffer = Buffer.from(pass);
  const expectedBuffer = Buffer.from(password);
  const match =
    passBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(passBuffer, expectedBuffer);
  if (match) return next();
  res.set('WWW-Authenticate', 'Basic realm="Billarr"');
  return res.status(401).json({ error: 'Unauthorized' });
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
  },
  {
    name: '004_categories_table',
    sql: [
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `INSERT OR IGNORE INTO categories (name) VALUES
        ('utilities'),('rent'),('insurance'),('subscription'),
        ('credit-card'),('loan'),('other')`
    ]
  },
  {
    name: '005_payment_methods_table',
    sql: [
      `CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `INSERT OR IGNORE INTO payment_methods (name) VALUES
        ('credit-card'),('debit-card'),('bank-transfer'),('cash'),('check'),('direct-debit'),('paypal')`
    ]
  },
  {
    name: '006_users_table',
    sql: [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ]
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

  let appliedCount = 0;
  for (const migration of pending) {
    console.log(`  Applying migration: ${migration.name}`);
    let failed = false;
    for (const sql of migration.sql) {
      await new Promise((resolve) => {
        db.run(sql, (err) => {
          if (err) {
            if (err.message.includes('duplicate column')) {
              // Idempotent — column already exists, not a real failure
            } else {
              console.error(`  ❌ Failed in ${migration.name}: ${err.message}`);
              failed = true;
            }
          }
          resolve();
        });
      });
      if (failed) break;
    }
    if (failed) {
      console.error(`  Skipping migration record for ${migration.name} — will retry on next start`);
      continue;
    }
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO migrations (name) VALUES (?)',
        [migration.name],
        (err) => (err ? reject(err) : resolve())
      );
    });
    appliedCount++;
  }
  console.log(`✅ Applied ${appliedCount} of ${pending.length} pending migration(s)`);
}

// ─── JWT auth guard for all /api routes (when JWT_SECRET is set) ──────────────
// Applied after the legacy Basic Auth block, so only one mode runs at a time.
// /api/auth/* routes are excluded so login/setup/status are always accessible.
app.use('/api', (req, res, next) => {
  if (!process.env.JWT_SECRET) return next(); // not in JWT mode
  if (req.path.startsWith('/auth/')) return next(); // login/setup/status are public
  requireAuth(req, res, next); // requireAuth is wired up in main() below
});

// ─── Services (initialised in main(), used by routes) ─────────────────────────

let billService;
let authService;
let notificationService;
let requireAuth = (req, res, next) => next(); // overwritten in main()
let requireAdmin = (req, res, next) => next(); // overwritten in main()

// ─── API Routes ───────────────────────────────────────────────────────────────

// Auth ────────────────────────────────────────────────────────────────────────

// Status — always public, tells the frontend what auth mode is active
app.get('/api/auth/status', async (req, res) => {
  if (process.env.JWT_SECRET) {
    const userCount = await authService.getUserCount().catch(() => 0);
    return res.json({ mode: 'jwt', hasUsers: userCount > 0 });
  }
  if (process.env.BILLARR_PASSWORD) {
    return res.json({ mode: 'legacy' });
  }
  res.json({ mode: 'none' });
});

// First-run setup — creates the first admin; only works when no users exist
app.post('/api/auth/setup', authLimiter, async (req, res) => {
  if (!process.env.JWT_SECRET) return res.status(400).json({ error: 'JWT auth not enabled (JWT_SECRET not set)' });
  try {
    const count = await authService.getUserCount();
    if (count > 0) return res.status(409).json({ error: 'Setup already complete' });
    const { email, name, password } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'email, name, and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const user = await authService.createUser(email, name, password, 'admin');
    const { token } = await authService.login(email, password);
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  if (!process.env.JWT_SECRET) return res.status(400).json({ error: 'JWT auth not enabled' });
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Current user
app.get('/api/auth/me', (req, res, next) => requireAuth(req, res, next), (req, res) => {
  res.json(req.user || null);
});

// Change own password
app.put('/api/auth/password', (req, res, next) => requireAuth(req, res, next), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    await authService.updatePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Users (admin only) ───────────────────────────────────────────────────────────

app.get('/api/users', (req, res, next) => requireAdmin(req, res, next), async (req, res) => {
  try {
    res.json(await authService.getAllUsers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', (req, res, next) => requireAdmin(req, res, next), async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const user = await authService.createUser(email, name, password, role || 'member');
    res.json(user);
  } catch (err) {
    res.status(err.message.includes('already in use') ? 409 : 400).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req, res, next) => requireAdmin(req, res, next), async (req, res) => {
  try {
    const result = await authService.updateUser(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req, res, next) => requireAdmin(req, res, next), async (req, res) => {
  try {
    // Admins cannot delete themselves
    if (req.user && String(req.user.id) === String(req.params.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await authService.deleteUser(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// CSV helper shared by export and import
function parseCSVLine(line) {
  const fields = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur);
  return fields;
}

function escapeCSV(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

// Bills ───────────────────────────────────────────────────────────────────────

app.get('/api/bills', async (req, res) => {
  try {
    res.json(await billService.getAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bills/export', (req, res, next) => requireAdmin(req, res, next), async (req, res) => {
  try {
    const rows = await billService.getAll();
    const cols = ['id','vendor','amount','due_date','account_info','payment_method','category','notes','recurring','reminder_days','status','created_at'];
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => escapeCSV(r[c])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="billarr-export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await billService.getById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills', async (req, res) => {
  const errors = billService.validate(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });
  try {
    const result = await billService.create(req.body);
    res.json({ ...result, message: 'Bill created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bills/:id', async (req, res) => {
  const errors = billService.validate(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });
  try {
    const existing = await billService.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Bill not found' });
    const result = await billService.update(req.params.id, req.body, existing);
    res.json({ message: 'Bill updated successfully', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bills/:id', async (req, res) => {
  try {
    const result = await billService.delete(req.params.id);
    res.json({ message: 'Bill deleted successfully', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bills/import', (req, res, next) => requireAdmin(req, res, next), express.text({ type: ['text/csv', 'text/plain'], limit: '10mb' }), async (req, res) => {
  const text = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Empty CSV body' });

  const lines = text.trim().split('\n').map(l => l.trimEnd());
  const header = parseCSVLine(lines[0]).map(h => h.trim());
  const expected = ['id','vendor','amount','due_date','account_info','payment_method','category','notes','recurring','reminder_days','status','created_at'];
  if (!expected.every(col => header.includes(col))) {
    return res.status(400).json({ error: 'CSV header does not match expected format. Export a CSV from Billarr to get the correct format.' });
  }

  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseCSVLine(l);
    return Object.fromEntries(header.map((h, i) => [h, vals[i] ?? '']));
  });

  try {
    const result = await billService.importRows(rows);
    res.json({ message: 'Import complete', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backup / misc ───────────────────────────────────────────────────────────────

app.get('/api/backup', (req, res, next) => requireAdmin(req, res, next), async (req, res) => {
  try {
    const rows = await dbAll(db, 'SELECT * FROM bills');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="billarr-backup-${ts}.json"`);
    res.send(JSON.stringify(rows, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vendors', async (req, res) => {
  try {
    const rows = await dbAll(db, 'SELECT DISTINCT vendor FROM bills ORDER BY vendor ASC');
    res.json(rows.map(r => r.vendor));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payment methods ─────────────────────────────────────────────────────────────

app.get('/api/payment-methods', async (req, res) => {
  try {
    res.json(await dbAll(db, 'SELECT * FROM payment_methods ORDER BY name ASC'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment-methods', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Payment method name is required' });
  try {
    const { lastID } = await dbRun(db, 'INSERT INTO payment_methods (name) VALUES (?)', [name]);
    res.json({ id: lastID, name });
  } catch (err) {
    res.status(err.message.includes('UNIQUE') ? 409 : 500).json({ error: err.message });
  }
});

// Categories ──────────────────────────────────────────────────────────────────

app.get('/api/categories', async (req, res) => {
  try {
    res.json(await dbAll(db, 'SELECT * FROM categories ORDER BY name ASC'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  try {
    const { lastID } = await dbRun(db, 'INSERT INTO categories (name) VALUES (?)', [name]);
    res.json({ id: lastID, name });
  } catch (err) {
    res.status(err.message.includes('UNIQUE') ? 409 : 500).json({ error: err.message });
  }
});

// Settings ────────────────────────────────────────────────────────────────────

app.get('/api/settings', async (req, res) => {
  try {
    res.json(await dbGet(db, 'SELECT * FROM settings WHERE id = 1') || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res, next) => requireAdmin(req, res, next), async (req, res) => {
  const { notification_method, telegram_chat_id, telegram_bot_token, google_calendar_sync } = req.body;
  try {
    await dbRun(
      db,
      `UPDATE settings SET notification_method = ?, telegram_chat_id = ?,
       telegram_bot_token = ?, google_calendar_sync = ? WHERE id = 1`,
      [notification_method, telegram_chat_id, telegram_bot_token, google_calendar_sync]
    );
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health / notifications ──────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/notifications/trigger', triggerLimiter, async (req, res) => {
  try {
    await notificationService.checkAndNotify();
    res.json({ message: 'Notification check triggered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function main() {
  await runMigrations();

  // Auth
  authService = new AuthService(db);
  const middleware = createAuthMiddleware(authService);
  requireAuth  = middleware.requireAuth;
  requireAdmin = middleware.requireAdmin;

  // Services
  const googleCalendarService = new GoogleCalendarService(db);
  await googleCalendarService.initialize().catch(() => {
    console.log('ℹ️  Google Calendar will remain disabled');
  });
  billService        = new BillService(db, googleCalendarService);
  notificationService = new NotificationService(db);
  notificationService.start();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚓ Billarr API running on port ${PORT}`);
    if (process.env.JWT_SECRET) {
      console.log('🔐 JWT authentication enabled');
    } else if (process.env.BILLARR_PASSWORD) {
      console.log('🔒 Legacy password protection enabled (set JWT_SECRET to upgrade to user accounts)');
    } else {
      console.log('⚠️  No authentication configured');
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
