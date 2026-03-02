import React, { useState, useMemo } from 'react';
import './ExpensesView.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function advanceDate(d, recurring) {
  const next = new Date(d);
  switch (recurring) {
    case 'weekly':    next.setDate(next.getDate() + 7);        break;
    case 'monthly':   next.setMonth(next.getMonth() + 1);      break;
    case 'quarterly': next.setMonth(next.getMonth() + 3);      break;
    case 'annually':  next.setFullYear(next.getFullYear() + 1); break;
    default: break;
  }
  return next;
}

function getYearOccurrences(dueDateStr, recurring, targetYear) {
  const results = [];
  // Use noon to avoid DST edge cases shifting dates
  let d = new Date(dueDateStr + 'T12:00:00');
  if (isNaN(d.getTime()) || d.getFullYear() > targetYear) return results;
  // Advance to target year
  while (d.getFullYear() < targetYear) d = advanceDate(d, recurring);
  // Collect all occurrences in target year
  while (d.getFullYear() === targetYear) {
    results.push(new Date(d));
    d = advanceDate(d, recurring);
  }
  return results;
}

function buildMonthData(bills, targetYear) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const months = Array.from({ length: 12 }, () => ({ actual: [], projected: [] }));

  // Place actual bills in their due_date month
  bills.forEach(bill => {
    const d = new Date(bill.due_date + 'T12:00:00');
    if (!isNaN(d.getTime()) && d.getFullYear() === targetYear) {
      months[d.getMonth()].actual.push(bill);
    }
  });

  // Project recurring bills into future months
  bills
    .filter(b => b.recurring && b.recurring !== 'none')
    .forEach(bill => {
      getYearOccurrences(bill.due_date, bill.recurring, targetYear).forEach(date => {
        if (date <= today) return; // only project future dates
        const m = date.getMonth();
        // Dedup: skip if same vendor already has an actual bill in this month
        if (months[m].actual.some(a => a.vendor === bill.vendor)) return;
        months[m].projected.push({
          ...bill,
          due_date: date.toISOString().split('T')[0],
          status: 'projected',
          _projected: true,
          id: `proj-${bill.id}-${date.getTime()}`,
        });
      });
    });

  return months.map(m => {
    const all = [...m.actual, ...m.projected];
    const total   = all.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    const paid    = m.actual.filter(b => b.status === 'paid').reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    const pending = all.filter(b => b.status !== 'paid').reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    return { actual: m.actual, projected: m.projected, total, paid, pending };
  });
}

function fmt(amount) {
  return '$' + parseFloat(amount || 0).toFixed(2);
}

const ExpensesView = ({ bills }) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);

  const monthData = useMemo(
    () => buildMonthData(bills, selectedYear),
    [bills, selectedYear]
  );

  const yearTotal = monthData.reduce((s, m) => s + m.total, 0);

  const toggleMonth = (idx) => {
    setSelectedMonth(prev => (prev === idx ? null : idx));
  };

  const currentMonthIdx = now.getFullYear() === selectedYear ? now.getMonth() : -1;

  return (
    <div className="expenses-container">
      <div className="expenses-header">
        <button className="year-nav-btn" onClick={() => { setSelectedYear(y => y - 1); setSelectedMonth(null); }}>
          ‹
        </button>
        <div className="expenses-title">
          <h2>{selectedYear} Annual Expenses</h2>
          <span className="expenses-year-total">{fmt(yearTotal)} total</span>
        </div>
        <button className="year-nav-btn" onClick={() => { setSelectedYear(y => y + 1); setSelectedMonth(null); }}>
          ›
        </button>
      </div>

      <div className="months-grid">
        {monthData.map((m, idx) => {
          const isCurrent  = idx === currentMonthIdx;
          const isSelected = idx === selectedMonth;
          const hasProjections = m.projected.length > 0;
          const billCount  = m.actual.length + m.projected.length;
          const paidPct    = m.total > 0 ? (m.paid / m.total) * 100 : 0;
          const pendingPct = m.total > 0 ? (m.pending / m.total) * 100 : 0;

          return (
            <div
              key={idx}
              className={[
                'month-card',
                isCurrent  ? 'current'          : '',
                isSelected ? 'selected'          : '',
                hasProjections ? 'has-projections' : '',
                billCount === 0 ? 'empty'        : '',
              ].filter(Boolean).join(' ')}
              onClick={() => toggleMonth(idx)}
            >
              <div className="month-name">{MONTH_NAMES[idx].slice(0, 3)}</div>
              <div className="month-total">{billCount > 0 ? fmt(m.total) : '—'}</div>
              <div className="month-count">
                {billCount > 0
                  ? `${billCount} bill${billCount !== 1 ? 's' : ''}${hasProjections ? ' ~' : ''}`
                  : 'no bills'}
              </div>
              {billCount > 0 && (
                <div className="month-status-bar">
                  <div className="bar-paid"    style={{ width: `${paidPct}%` }} />
                  <div className="bar-pending" style={{ width: `${pendingPct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedMonth !== null && (
        <div className="drill-down">
          <div className="drill-down-header">
            <h3>{MONTH_NAMES[selectedMonth]} {selectedYear}</h3>
            <div className="drill-down-summary">
              <span className="ds-total">Total: {fmt(monthData[selectedMonth].total)}</span>
              <span className="ds-paid">Paid: {fmt(monthData[selectedMonth].paid)}</span>
              <span className="ds-pending">Due: {fmt(monthData[selectedMonth].pending)}</span>
            </div>
          </div>

          {monthData[selectedMonth].actual.length === 0 && monthData[selectedMonth].projected.length === 0 ? (
            <p className="drill-empty">No bills this month.</p>
          ) : (
            <div className="bill-rows">
              {[...monthData[selectedMonth].actual, ...monthData[selectedMonth].projected]
                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                .map(bill => (
                  <div key={bill.id} className={`bill-row ${bill._projected ? 'projected' : ''}`}>
                    <div className="bill-row-vendor">
                      {bill._projected && <span className="proj-tilde">~</span>}
                      {bill.vendor}
                    </div>
                    <div className="bill-row-meta">
                      {bill.category && <span className="bill-row-category">{bill.category}</span>}
                      {bill.recurring && bill.recurring !== 'none' && (
                        <span className="bill-row-recurring">{bill.recurring}</span>
                      )}
                    </div>
                    <div className="bill-row-amount">{fmt(bill.amount)}</div>
                    <div className="bill-row-status">
                      {bill._projected
                        ? <span className="status-badge projected">projected</span>
                        : <span className={`status-badge ${bill.status}`}>{bill.status}</span>
                      }
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpensesView;
