/**
 * Shared date utilities for the backend.
 * Keep in sync with frontend/src/utils/dates.js for any logic changes.
 */

const VALID_RECURRING = ['none', 'weekly', 'monthly', 'quarterly', 'annually'];

/**
 * Advance a Date by one recurring interval. Returns a new Date, or null for 'none'.
 */
function advanceDate(date, recurring) {
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
function nextDueDateStr(dueDateStr, recurring) {
  const d = new Date(dueDateStr + 'T12:00:00');
  const next = advanceDate(d, recurring);
  if (!next) return null;
  return next.toISOString().split('T')[0];
}

/**
 * Days until a due date (negative = overdue). Midnight-normalised so the
 * result doesn't depend on the time of day the function is called.
 */
function getDaysUntilDue(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

module.exports = { advanceDate, nextDueDateStr, getDaysUntilDue, VALID_RECURRING };
