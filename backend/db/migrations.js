const path = require('path');
const fs = require('fs');

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
  },
  {
    name: '007_bill_amount_history',
    sql: [
      `CREATE TABLE IF NOT EXISTS bill_amount_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL,
        old_amount REAL,
        new_amount REAL NOT NULL,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ]
  },
  {
    name: '008_subscription_metadata',
    sql: [
      `ALTER TABLE bills ADD COLUMN auto_renew INTEGER DEFAULT 0`,
      `ALTER TABLE bills ADD COLUMN cancellation_url TEXT`
    ]
  }
];

function backupBills(db, dataDir) {
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

async function runMigrations(db, dbPath) {
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
  await backupBills(db, dataDir);

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

module.exports = { runMigrations, MIGRATIONS };
