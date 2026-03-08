import React, { useState, useMemo } from 'react';
import { MONTH_NAMES, DAY_NAMES, advanceDate, fmt, pad2 } from '../utils/dates';
import './Calendar.css';

// Returns projected (virtual) bill entries for the given year/month.
// Only projects non-paid recurring bills forward from their due_date.
// The 600-iteration cap prevents runaway loops for very old start dates.
function buildProjectedBills(bills, year, month) {
  const realDates = new Set(bills.map(b => b.due_date));
  const projected = [];

  bills
    .filter(b => b.recurring && b.recurring !== 'none' && b.status !== 'paid')
    .forEach(bill => {
      let cur = new Date(bill.due_date + 'T12:00:00');
      for (let i = 0; i < 600; i++) {
        const next = advanceDate(cur, bill.recurring);
        if (!next) break;
        cur = next;
        const cy = cur.getFullYear();
        const cm = cur.getMonth();
        if (cy > year || (cy === year && cm > month)) break;
        if (cy === year && cm === month) {
          const dateStr = `${cy}-${pad2(cm + 1)}-${pad2(cur.getDate())}`;
          if (!realDates.has(dateStr)) {
            projected.push({ ...bill, due_date: dateStr, _projected: true, id: `proj-${bill.id}-${dateStr}` });
          }
        }
      }
    });

  return projected;
}

const Calendar = ({ bills, onBillClick, selectedBill }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
  })();

  const projectedBills = useMemo(
    () => buildProjectedBills(bills, year, month),
    [bills, year, month]
  );

  const getBillsForDay = (day) => {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const real = bills.filter(b => b.due_date === dateStr);
    const proj = projectedBills.filter(b => b.due_date === dateStr);
    return [...real, ...proj];
  };

  const calendarDays = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const dayBills = getBillsForDay(day);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;

    calendarDays.push(
      <div
        key={day}
        className={`calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${dayBills.length > 0 ? 'has-bills' : ''}`}
      >
        <div className="day-number">{day}</div>
        <div className="day-bills">
          {dayBills.map(bill => (
            <div
              key={bill.id}
              className={`bill-indicator ${bill._projected ? 'projected' : bill.status} ${selectedBill?.id === bill.id ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!bill._projected) onBillClick(bill);
              }}
              title={`${bill.vendor} - ${fmt(bill.amount)}${bill._projected ? ' (projected)' : ''}`}
            >
              <span className="bill-vendor">{bill.vendor}</span>
              <span className="bill-amount">{fmt(bill.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="nav-btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
        <h2 className="calendar-title">{MONTH_NAMES[month]} {year}</h2>
        <button className="nav-btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-dot pending" /> Pending</span>
        <span className="legend-item"><span className="legend-dot paid" /> Paid</span>
        <span className="legend-item"><span className="legend-dot overdue" /> Overdue</span>
        <span className="legend-item"><span className="legend-dot projected" /> Projected</span>
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map(d => (
          <div key={d} className="calendar-day-name">{d}</div>
        ))}
        {calendarDays}
      </div>
    </div>
  );
};

export default Calendar;
