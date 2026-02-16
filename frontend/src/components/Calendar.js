import React, { useState } from 'react';
import './Calendar.css';

const Calendar = ({ bills, onBillClick, selectedBill }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getBillsForDate = (date) => {
    return bills.filter(bill => {
      const billDate = new Date(bill.due_date);
      return billDate.toDateString() === date.toDateString();
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayBills = getBillsForDate(date);
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today && !isToday;

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
              className={`bill-indicator ${bill.status} ${selectedBill?.id === bill.id ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onBillClick(bill);
              }}
              title={`${bill.vendor} - $${parseFloat(bill.amount).toFixed(2)}`}
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
        <button className="nav-btn" onClick={previousMonth}>‹</button>
        <h2 className="calendar-title">
          {monthNames[month]} {year}
        </h2>
        <button className="nav-btn" onClick={nextMonth}>›</button>
      </div>

      <div className="calendar-grid">
        {dayNames.map(day => (
          <div key={day} className="calendar-day-name">
            {day}
          </div>
        ))}
        {calendarDays}
      </div>
    </div>
  );
};

export default Calendar;
