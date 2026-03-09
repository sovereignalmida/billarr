/**
 * ReportService — aggregated spend summaries, trend data, and subscription views.
 *
 * All queries operate on the bills + bill_amount_history tables.
 * Returns plain objects/arrays safe to JSON-serialise directly.
 */

const { dbAll, dbGet } = require('../db');

/** Monthly-equivalent normalisation for recurring amounts */
function monthlyEquivalent(amount, recurring) {
  switch (recurring) {
    case 'weekly':    return (amount * 52) / 12;
    case 'monthly':   return amount;
    case 'quarterly': return amount / 3;
    case 'annually':  return amount / 12;
    default:          return null;
  }
}

class ReportService {
  constructor(db) {
    this.db = db;
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  // Snapshot of the current state: this month, this year, upcoming.

  async getSummary() {
    const [thisMonth, thisYear, upcoming7, upcoming30, categoryBreakdown, overdueCount] =
      await Promise.all([
        this._monthTotals("strftime('%Y-%m', 'now')"),
        this._yearTotals("strftime('%Y', 'now')"),
        this._upcomingTotals(7),
        this._upcomingTotals(30),
        this._categoryBreakdown(),
        this._overdueCount(),
      ]);

    return { thisMonth, thisYear, upcoming7, upcoming30, categoryBreakdown, overdueCount };
  }

  async _monthTotals(monthExpr) {
    const row = await dbGet(
      this.db,
      `SELECT
        COALESCE(SUM(amount), 0)                                          AS total,
        COALESCE(SUM(CASE WHEN status = 'paid'    THEN amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status != 'paid'   THEN amount ELSE 0 END), 0) AS pending,
        COUNT(*)                                                          AS bill_count
       FROM bills
       WHERE strftime('%Y-%m', due_date) = ${monthExpr}`
    );
    return row;
  }

  async _yearTotals(yearExpr) {
    const row = await dbGet(
      this.db,
      `SELECT
        COALESCE(SUM(amount), 0)                                          AS total,
        COALESCE(SUM(CASE WHEN status = 'paid'  THEN amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END), 0) AS pending,
        COUNT(*)                                                          AS bill_count
       FROM bills
       WHERE strftime('%Y', due_date) = ${yearExpr}`
    );
    return row;
  }

  async _upcomingTotals(days) {
    const row = await dbGet(
      this.db,
      `SELECT
        COALESCE(SUM(amount), 0) AS total,
        COUNT(*)                  AS bill_count
       FROM bills
       WHERE due_date BETWEEN date('now') AND date('now', '+${days} days')
         AND status != 'paid'`
    );
    return row;
  }

  async _overdueCount() {
    const row = await dbGet(
      this.db,
      `SELECT COUNT(*) AS count
       FROM bills
       WHERE status = 'overdue'
          OR (status = 'pending' AND due_date < date('now'))`
    );
    return row ? row.count : 0;
  }

  async _categoryBreakdown() {
    return dbAll(
      this.db,
      `SELECT
        COALESCE(category, 'uncategorized') AS category,
        COALESCE(SUM(amount), 0)            AS total,
        COUNT(*)                            AS bill_count
       FROM bills
       WHERE strftime('%Y-%m', due_date) = strftime('%Y-%m', 'now')
       GROUP BY COALESCE(category, 'uncategorized')
       ORDER BY total DESC`
    );
  }

  // ─── Trends ────────────────────────────────────────────────────────────────
  // Historical spend and price-change data.

  async getTrends() {
    const [monthlyTotals, priceChanges, subscriptions] = await Promise.all([
      this._monthlyTotals12(),
      this._recentPriceChanges(),
      this._subscriptions(),
    ]);

    return { monthlyTotals, priceChanges, subscriptions };
  }

  async _monthlyTotals12() {
    return dbAll(
      this.db,
      `SELECT
        substr(due_date, 1, 7)                                            AS month,
        COALESCE(SUM(amount), 0)                                          AS total,
        COALESCE(SUM(CASE WHEN status = 'paid'  THEN amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END), 0) AS pending,
        COUNT(*)                                                          AS bill_count
       FROM bills
       WHERE due_date >= date('now', '-11 months', 'start of month')
       GROUP BY substr(due_date, 1, 7)
       ORDER BY month ASC`
    );
  }

  async _recentPriceChanges() {
    return dbAll(
      this.db,
      `SELECT
        h.id,
        h.bill_id,
        b.vendor,
        h.old_amount,
        h.new_amount,
        h.changed_at
       FROM bill_amount_history h
       JOIN bills b ON h.bill_id = b.id
       ORDER BY h.changed_at DESC
       LIMIT 20`
    );
  }

  async _subscriptions() {
    const rows = await dbAll(
      this.db,
      `SELECT id, vendor, amount, due_date, category, payment_method,
              recurring, status, auto_renew, cancellation_url, notes
       FROM bills
       WHERE recurring != 'none'
       ORDER BY vendor ASC`
    );

    return rows.map(r => ({
      ...r,
      monthly_equivalent: monthlyEquivalent(r.amount, r.recurring),
    }));
  }
}

module.exports = ReportService;
