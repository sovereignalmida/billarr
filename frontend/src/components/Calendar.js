import React, { useState, useMemo } from 'react';
import './Calendar.css';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function padDate(n) {
  return String(n).padStart(2, '0');
}

function advanceDate(dateStr, recurring) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  switch (recurring) {
    case 'weekly':    dt.setDate(dt.getDate() + 7); break;
    case 'monthly':   dt.setMonth(dt.getMonth() + 1); break;
    case 'quarterly': dt.setMonth(dt.getMonth() + 3); break;
    case 'annually':  dt.setFullYear(dt.getFullYear() + 1); break;
    default: return null;
  }
  return `${dt.getFullYear()}-${padDate(dt.getMonth() + 1)}-${padDate(dt.getDate())}`;
}

// Returns projected (virtual) bill entries for the given year/month.
// Only projects non-paid recurring bills forward from their due_date.
function buildProjectedBills(bills, year, month) {
  const targetPrefix = `${year}-${padDate(month + 1)}-`;
  const realDates = new Set(bills.map(b => b.due_date));
  const projected = [];

  bills
    .filter(b => b.recurring && b.recurring !== 'none' && b.status !== 'paid')
    .forEach(bill => {
      let cur = bill.due_date;
      for (let i = 0; i < 600; i++) {
        const next = advanceDate(cur, bill.recurring);
        if (!next) break;
        cur = next;
        const [cy, cm] = cur.split('-').map(Number);
        if (cy > year || (cy === year && cm - 1 > month)) break;
        if (cy === year && cm - 1 === month) {
          if (!realDates.has(cur)) {
            projected.push({ ...bill, due_date: cur, _projected: true, id: `proj-${bill.id}-${cur}` });
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
    return `${t.getFullYear()}-${padDate(t.getMonth() + 1)}-${padDate(t.getDate())}`;
  })();

  const projectedBills = useMemo(
    () => buildProjectedBills(bills, year, month),
    [bills, year, month]
  );

  const getBillsForDay = (day) => {
    const dateStr = `${year}-${padDate(month + 1)}-${padDate(day)}`;
    const real = bills.filter(b => b.due_date === dateStr);
    const proj = projectedBills.filter(b => b.due_date === dateStr);
    return [...real, ...proj];
  };

  const calendarDays = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${padDate(month + 1)}-${padDate(day)}`;
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
              title={`${bill.vendor} - $${parseFloat(bill.amount).toFixed(2)}${bill._projected ? ' (projected)' : ''}`}
            >
              <span className="bill-vendor">{bill.vendor}</span>
              <span className="bill-amount">${parseFloat(bill.amount).toFixed(2)}</span>
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
        <h2 className="calendar-title">{monthNames[month]} {year}</h2>
        <button className="nav-btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div className="calendar-legend">
        <span className="legend-item"><span className="legend-dot pending" /> Pending</span>
        <span className="legend-item"><span className="legend-dot paid" /> Paid</span>
        <span className="legend-item"><span className="legend-dot overdue" /> Overdue</span>
        <span className="legend-item"><span className="legend-dot projected" /> Projected</span>
      </div>

      <div className="calendar-grid">
        {dayNames.map(d => (
          <div key={d} className="calendar-day-name">{d}</div>
        ))}
        {calendarDays}
      </div>
    </div>
  );
};

export default Calendar;
