import React, { useState, useEffect } from 'react';
import './BillForm.css';

const BillForm = ({ bill, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    due_date: '',
    account_info: '',
    payment_method: '',
    category: '',
    notes: '',
    recurring: 'none',
    reminder_days: 3,
    status: 'pending'
  });

  useEffect(() => {
    if (bill) {
      setFormData({
        vendor: bill.vendor || '',
        amount: bill.amount || '',
        due_date: bill.due_date || '',
        account_info: bill.account_info || '',
        payment_method: bill.payment_method || '',
        category: bill.category || '',
        notes: bill.notes || '',
        recurring: bill.recurring || 'none',
        reminder_days: bill.reminder_days || 3,
        status: bill.status || 'pending'
      });
    }
  }, [bill]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{bill ? 'Edit Bill' : 'New Bill'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="bill-form">
          <div className="form-row">
            <div className="form-group">
              <label>Vendor *</label>
              <input
                type="text"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                required
                placeholder="Electric Company"
              />
            </div>

            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="">Select category</option>
                <option value="utilities">Utilities</option>
                <option value="rent">Rent/Mortgage</option>
                <option value="insurance">Insurance</option>
                <option value="subscription">Subscription</option>
                <option value="credit-card">Credit Card</option>
                <option value="loan">Loan</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Payment Method</label>
              <input
                type="text"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                placeholder="Credit Card, Bank Transfer, etc."
              />
            </div>

            <div className="form-group">
              <label>Recurring</label>
              <select name="recurring" value={formData.recurring} onChange={handleChange}>
                <option value="none">None</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Account Info</label>
            <input
              type="text"
              name="account_info"
              value={formData.account_info}
              onChange={handleChange}
              placeholder="Account number or other details"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Reminder (days before)</label>
              <input
                type="number"
                name="reminder_days"
                value={formData.reminder_days}
                onChange={handleChange}
                min="0"
                max="30"
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {bill ? 'Update Bill' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillForm;
