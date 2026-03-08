import React from 'react';
import { getDaysUntilDue, formatDueDate, fmt } from '../utils/dates';
import './BillDetails.css';

const BillDetails = ({ bill, onClose, onEdit, onDelete }) => {
  const daysUntil = getDaysUntilDue(bill.due_date);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bill-details" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bill Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="details-content">
          <div className="detail-header">
            <h3 className="vendor-name">{bill.vendor}</h3>
            <div className="amount-display">{fmt(bill.amount)}</div>
          </div>

          <div className={`status-banner ${bill.status}`}>
            <span className="status-text">{bill.status.toUpperCase()}</span>
            {daysUntil >= 0 && bill.status === 'pending' && (
              <span className="days-until">
                {daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
              </span>
            )}
            {daysUntil < 0 && bill.status !== 'paid' && (
              <span className="days-until overdue-text">
                {Math.abs(daysUntil)} day{Math.abs(daysUntil) !== 1 ? 's' : ''} overdue
              </span>
            )}
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <label>Due Date</label>
              <p>{formatDueDate(bill.due_date)}</p>
            </div>

            {bill.category && (
              <div className="detail-item">
                <label>Category</label>
                <p className="category-badge">{bill.category}</p>
              </div>
            )}

            {bill.payment_method && (
              <div className="detail-item">
                <label>Payment Method</label>
                <p>{bill.payment_method}</p>
              </div>
            )}

            {bill.recurring && bill.recurring !== 'none' && (
              <div className="detail-item">
                <label>Recurring</label>
                <p>{bill.recurring}</p>
              </div>
            )}

            {bill.account_info && (
              <div className="detail-item full-width">
                <label>Account Info</label>
                <p>{bill.account_info}</p>
              </div>
            )}

            {bill.notes && (
              <div className="detail-item full-width">
                <label>Notes</label>
                <p className="notes-text">{bill.notes}</p>
              </div>
            )}

            <div className="detail-item">
              <label>Reminder</label>
              <p>{bill.reminder_days} day{bill.reminder_days !== 1 ? 's' : ''} before due date</p>
            </div>
          </div>
        </div>

        <div className="details-actions">
          <button className="btn-danger" onClick={() => onDelete(bill.id)}>
            Delete
          </button>
          <button className="btn-primary" onClick={() => onEdit(bill)}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillDetails;
