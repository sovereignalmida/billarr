import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { fmt } from '../utils/dates';
import './Dashboard.css';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MonthlyBar({ month, total, paid, maxTotal }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const paidPct = total > 0 ? (paid / total) * 100 : 0;
  const label = month ? MONTH_SHORT[parseInt(month.split('-')[1], 10) - 1] : '';
  return (
    <div className="monthly-bar-item">
      <div className="monthly-bar-track">
        <div className="monthly-bar-fill" style={{ height: `${pct}%` }}>
          <div className="monthly-bar-paid" style={{ height: `${paidPct}%` }} />
        </div>
      </div>
      <div className="monthly-bar-label">{label}</div>
      <div className="monthly-bar-amount">{fmt(total)}</div>
    </div>
  );
}

function CategoryBar({ category, total, grandTotal }) {
  const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
  return (
    <div className="cat-bar-row">
      <div className="cat-bar-name">{category}</div>
      <div className="cat-bar-track">
        <div className="cat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="cat-bar-amount">{fmt(total)}</div>
    </div>
  );
}

function recurringLabel(r) {
  switch (r) {
    case 'weekly':    return '/wk';
    case 'monthly':   return '/mo';
    case 'quarterly': return '/qtr';
    case 'annually':  return '/yr';
    default:          return '';
  }
}

const Dashboard = ({ onAuthError }) => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([
        apiFetch('/api/reports/summary'),
        apiFetch('/api/reports/trends'),
      ]);
      setSummary(s);
      setTrends(t);
    } catch (err) {
      if (err.status === 401) onAuthError?.();
      else setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [onAuthError]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="dashboard-loading">Loading dashboard…</div>;
  if (error)   return <div className="dashboard-error">{error}</div>;
  if (!summary || !trends) return null;

  const { thisMonth, upcoming7, upcoming30, categoryBreakdown, overdueCount } = summary;
  const { monthlyTotals, priceChanges, subscriptions } = trends;

  // Last 6 months of trend data
  const last6 = monthlyTotals.slice(-6);
  const maxTotal = Math.max(...last6.map(m => m.total), 1);

  // Category chart — current month total across all categories
  const catGrandTotal = categoryBreakdown.reduce((s, c) => s + c.total, 0);

  // Subscriptions — sort by monthly_equivalent descending
  const subs = [...subscriptions].sort((a, b) => (b.monthly_equivalent || 0) - (a.monthly_equivalent || 0));
  const totalMoEquiv = subs.reduce((s, r) => s + (r.monthly_equivalent || 0), 0);

  return (
    <div className="dashboard">

      {/* ── Summary cards ─────────────────────────────────────────── */}
      <section className="dash-section">
        <h2 className="dash-section-title">This Month</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="sc-label">Total Due</div>
            <div className="sc-value">{fmt(thisMonth.total)}</div>
            <div className="sc-sub">{thisMonth.bill_count} bill{thisMonth.bill_count !== 1 ? 's' : ''}</div>
          </div>
          <div className="summary-card sc-paid">
            <div className="sc-label">Paid</div>
            <div className="sc-value">{fmt(thisMonth.paid)}</div>
            <div className="sc-sub">
              {thisMonth.total > 0
                ? `${Math.round((thisMonth.paid / thisMonth.total) * 100)}%`
                : '—'}
            </div>
          </div>
          <div className="summary-card sc-pending">
            <div className="sc-label">Still Due</div>
            <div className="sc-value">{fmt(thisMonth.pending)}</div>
          </div>
          <div className={`summary-card ${overdueCount > 0 ? 'sc-overdue' : ''}`}>
            <div className="sc-label">Overdue</div>
            <div className="sc-value">{overdueCount}</div>
            <div className="sc-sub">bill{overdueCount !== 1 ? 's' : ''}</div>
          </div>
          <div className="summary-card">
            <div className="sc-label">Due in 7 Days</div>
            <div className="sc-value">{fmt(upcoming7.total)}</div>
            <div className="sc-sub">{upcoming7.bill_count} bill{upcoming7.bill_count !== 1 ? 's' : ''}</div>
          </div>
          <div className="summary-card">
            <div className="sc-label">Due in 30 Days</div>
            <div className="sc-value">{fmt(upcoming30.total)}</div>
            <div className="sc-sub">{upcoming30.bill_count} bill{upcoming30.bill_count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </section>

      {/* ── Spend trend (last 6 months) ───────────────────────────── */}
      {last6.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">Spend — Last 6 Months</h2>
          <div className="monthly-bars">
            {last6.map(m => (
              <MonthlyBar key={m.month} {...m} maxTotal={maxTotal} />
            ))}
          </div>
          <div className="monthly-legend">
            <span className="legend-paid">Paid</span>
            <span className="legend-pending">Pending</span>
          </div>
        </section>
      )}

      {/* ── Category breakdown (this month) ──────────────────────── */}
      {categoryBreakdown.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">This Month by Category</h2>
          <div className="cat-bars">
            {categoryBreakdown.map(c => (
              <CategoryBar key={c.category} {...c} grandTotal={catGrandTotal} />
            ))}
          </div>
        </section>
      )}

      {/* ── Subscriptions ─────────────────────────────────────────── */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Recurring Bills</h2>
          {totalMoEquiv > 0 && (
            <span className="subs-total-equiv">{fmt(totalMoEquiv)}/mo equivalent</span>
          )}
        </div>
        {subs.length === 0 ? (
          <p className="dash-empty">No recurring bills set up yet.</p>
        ) : (
          <div className="subs-table">
            <div className="subs-header">
              <span>Vendor</span>
              <span>Category</span>
              <span>Cadence</span>
              <span>Amount</span>
              <span>/mo equiv</span>
              <span>Auto-renew</span>
            </div>
            {subs.map(s => (
              <div key={s.id} className="subs-row">
                <div className="subs-vendor">
                  {s.vendor}
                  {s.cancellation_url && (
                    <a
                      className="cancel-link"
                      href={s.cancellation_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Cancellation page"
                    >↗</a>
                  )}
                </div>
                <div className="subs-category">
                  {s.category
                    ? <span className="tag-cat">{s.category}</span>
                    : <span className="tag-none">—</span>}
                </div>
                <div>
                  <span className="tag-recurring">{s.recurring}</span>
                </div>
                <div className="subs-amount">
                  {fmt(s.amount)}<span className="subs-cadence">{recurringLabel(s.recurring)}</span>
                </div>
                <div className="subs-equiv">
                  {s.monthly_equivalent != null ? fmt(s.monthly_equivalent) : '—'}
                </div>
                <div>
                  {s.auto_renew
                    ? <span className="badge-autorenew on">on</span>
                    : <span className="badge-autorenew off">off</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Price changes ─────────────────────────────────────────── */}
      {priceChanges.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">Recent Price Changes</h2>
          <div className="price-changes">
            {priceChanges.map(pc => {
              const diff = pc.new_amount - (pc.old_amount || 0);
              const pct = pc.old_amount ? ((diff / pc.old_amount) * 100).toFixed(1) : null;
              return (
                <div key={pc.id} className="pc-row">
                  <div className="pc-vendor">{pc.vendor}</div>
                  <div className="pc-amounts">
                    <span className="pc-old">{pc.old_amount != null ? fmt(pc.old_amount) : '—'}</span>
                    <span className="pc-arrow">→</span>
                    <span className="pc-new">{fmt(pc.new_amount)}</span>
                  </div>
                  <div className={`pc-diff ${diff >= 0 ? 'up' : 'down'}`}>
                    {diff >= 0 ? '+' : ''}{fmt(diff)}
                    {pct && <span className="pc-pct"> ({pct}%)</span>}
                  </div>
                  <div className="pc-date">
                    {new Date(pc.changed_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
