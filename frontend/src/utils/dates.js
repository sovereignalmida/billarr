/**
 * Shared date utilities used across Calendar, ExpensesView, and BillDetails.
 * Keep in sync with backend/utils/dates.js for any logic changes.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Advance a Date object by one recurring interval.
 * Returns the next Date, or null for 'none'.
 */
export function advanceDate(date, recurring) {
  const next = new Date(date);
  switch (recurring) {
    case 'weekly':    next.setDate(next.getDate() + 7);         break;
    case 'monthly':   next.setMonth(next.getMonth() + 1);       break;
    case 'quarterly': next.setMonth(next.getMonth() + 3);       break;
    case 'annually':  next.setFullYear(next.getFullYear() + 1); break;
    default: return null;
  }
  return next;
}

/**
 * Given a YYYY-MM-DD string and a recurring interval, return the next
 * due date as a YYYY-MM-DD string, or null for 'none'.
 */
export function nextDueDateStr(dueDateStr, recurring) {
  const d = new Date(dueDateStr + 'T12:00:00');
  const next = advanceDate(d, recurring);
  if (!next) return null;
  return next.toISOString().split('T')[0];
}

/**
 * Days until a due date (negative = overdue). Compares calendar days,
 * not clock time, so midnight-normalised.
 */
export function getDaysUntilDue(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

/**
 * Format a YYYY-MM-DD string as a human-readable date without timezone drift.
 */
export function formatDueDate(dueDateStr, options = {}) {
  return new Date(dueDateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/** Format a number as a dollar amount string, e.g. "$12.50" */
export function fmt(amount) {
  return '$' + parseFloat(amount || 0).toFixed(2);
}

/** Zero-pad a number to 2 digits */
export function pad2(n) {
  return String(n).padStart(2, '0');
}
