/**
 * BillService — all bill business logic.
 *
 * Intentionally decoupled from Express so it can be called directly
 * by AI agents, webhooks, CLI tools, or tests without going through HTTP.
 */

const { dbGet, dbAll, dbRun } = require('../db');
const { VALID_STATUSES, VALID_RECURRING } = require('../constants');
const { nextDueDateStr } = require('../utils/dates');

/** Record a price change in bill_amount_history when amount differs. */
async function recordAmountChange(db, billId, oldAmount, newAmount) {
  const old = parseFloat(oldAmount);
  const next = parseFloat(newAmount);
  if (isNaN(old) || isNaN(next) || old === next) return;
  await dbRun(
    db,
    'INSERT INTO bill_amount_history (bill_id, old_amount, new_amount) VALUES (?, ?, ?)',
    [billId, old, next]
  ).catch(err => console.error('Failed to record amount change:', err));
}

class BillService {
  constructor(db, googleCalendarService = null) {
    this.db = db;
    this.gcal = googleCalendarService;
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  validate({ vendor, amount, due_date, reminder_days, status, recurring }) {
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
    return errors;
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  getAll() {
    return dbAll(this.db, 'SELECT * FROM bills ORDER BY due_date ASC');
  }

  getById(id) {
    return dbGet(this.db, 'SELECT * FROM bills WHERE id = ?', [id]);
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async create(data) {
    const { vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days,
            auto_renew, cancellation_url } = data;

    const { lastID } = await dbRun(
      this.db,
      `INSERT INTO bills (vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, auto_renew, cancellation_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vendor, amount, due_date, account_info, payment_method, category, notes, recurring || 'none', reminder_days ?? 3,
       auto_renew ? 1 : 0, cancellation_url || null]
    );

    const bill = { id: lastID, vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status: 'pending', auto_renew: auto_renew ? 1 : 0, cancellation_url: cancellation_url || null };

    if (this.gcal) {
      const eventId = await this.gcal.syncBill(bill, 'create').catch(() => null);
      if (eventId) {
        await dbRun(this.db, 'UPDATE bills SET calendar_event_id = ? WHERE id = ?', [eventId, lastID]);
      }
    }

    return { id: lastID };
  }

  async update(id, data, existingBill) {
    const { vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status } = data;

    await recordAmountChange(this.db, id, existingBill.amount, amount);

    const { changes } = await dbRun(
      this.db,
      `UPDATE bills SET vendor = ?, amount = ?, due_date = ?, account_info = ?,
       payment_method = ?, category = ?, notes = ?, recurring = ?, reminder_days = ?, status = ?,
       auto_renew = ?, cancellation_url = ?
       WHERE id = ?`,
      [vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status,
       data.auto_renew ?? existingBill.auto_renew ?? 0,
       data.cancellation_url !== undefined ? data.cancellation_url : existingBill.cancellation_url,
       id]
    );

    // Google Calendar sync
    if (this.gcal) {
      const updatedBill = {
        id, vendor, amount, due_date, account_info, payment_method,
        category, notes, recurring, reminder_days, status,
        calendar_event_id: existingBill.calendar_event_id,
      };
      const eventId = await this.gcal.syncBill(updatedBill, 'update').catch(() => null);
      if (eventId && !existingBill.calendar_event_id) {
        await dbRun(this.db, 'UPDATE bills SET calendar_event_id = ? WHERE id = ?', [eventId, id]);
      }
    }

    // Auto-create next bill when a recurring bill is marked paid
    let nextBillCreated = false;
    const wasJustPaid = status === 'paid' && existingBill.status !== 'paid';
    if (wasJustPaid && recurring && recurring !== 'none') {
      const newDue = nextDueDateStr(due_date, recurring);
      if (newDue) {
        await dbRun(
          this.db,
          `INSERT INTO bills (vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [vendor, amount, newDue, account_info, payment_method, category, notes, recurring, reminder_days ?? 3]
        ).catch(err => console.error('Failed to create next recurring bill:', err));
        console.log(`🔄 Auto-created next ${recurring} bill for ${vendor} due ${newDue}`);
        nextBillCreated = true;
      }
    }

    return { changes, nextBillCreated };
  }

  async delete(id) {
    const bill = await this.getById(id);
    if (bill && this.gcal) {
      await this.gcal.syncBill(bill, 'delete').catch(() => null);
    }
    const { changes } = await dbRun(this.db, 'DELETE FROM bills WHERE id = ?', [id]);
    return { changes };
  }

  // ─── CSV import ────────────────────────────────────────────────────────────

  async importRows(rows) {
    let imported = 0;
    let skipped = 0;

    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO bills (vendor, amount, due_date, account_info, payment_method, category, notes, recurring, reminder_days, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    await new Promise((resolve) => {
      rows.forEach(r => {
        const errors = this.validate(r);
        if (errors.length > 0) { skipped++; return; }
        stmt.run(
          r.vendor, Number(r.amount), r.due_date, r.account_info || null,
          r.payment_method || null, r.category || null, r.notes || null,
          r.recurring || 'none', Number(r.reminder_days) || 3,
          r.status || 'pending', r.created_at || null,
          (err) => { if (err) skipped++; else imported++; }
        );
      });
      stmt.finalize(resolve);
    });

    return { imported, skipped };
  }
}

module.exports = BillService;
