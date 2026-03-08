import React, { useState } from 'react';
import { fmt } from '../utils/dates';

const INITIAL_FILTER = {
  status: '', category: '', paymentMethod: '', sortBy: 'due_date', sortDir: 'asc'
};

const ListView = ({ bills, selectedBill, onBillClick }) => {
  const [filter, setFilter] = useState(INITIAL_FILTER);

  const setField = (field, value) => setFilter(f => ({ ...f, [field]: value }));
  const hasActiveFilter = filter.status || filter.category || filter.paymentMethod;

  const filtered = bills
    .filter(b => !filter.status      || b.status         === filter.status)
    .filter(b => !filter.category    || b.category        === filter.category)
    .filter(b => !filter.paymentMethod || b.payment_method === filter.paymentMethod)
    .sort((a, b) => {
      let av = a[filter.sortBy], bv = b[filter.sortBy];
      if (filter.sortBy === 'amount') { av = Number(av); bv = Number(bv); }
      if (av < bv) return filter.sortDir === 'asc' ? -1 : 1;
      if (av > bv) return filter.sortDir === 'asc' ?  1 : -1;
      return 0;
    });

  const uniqueSorted = (arr) => [...new Set(arr.filter(Boolean))].sort();

  return (
    <div className="list-view">
      <div className="list-filters">
        <select value={filter.status} onChange={e => setField('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>

        <select value={filter.category} onChange={e => setField('category', e.target.value)}>
          <option value="">All Categories</option>
          {uniqueSorted(bills.map(b => b.category)).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={filter.paymentMethod} onChange={e => setField('paymentMethod', e.target.value)}>
          <option value="">All Payment Methods</option>
          {uniqueSorted(bills.map(b => b.payment_method)).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={`${filter.sortBy}:${filter.sortDir}`}
          onChange={e => {
            const [sortBy, sortDir] = e.target.value.split(':');
            setFilter(f => ({ ...f, sortBy, sortDir }));
          }}
        >
          <option value="due_date:asc">Due Date ↑</option>
          <option value="due_date:desc">Due Date ↓</option>
          <option value="amount:asc">Amount ↑</option>
          <option value="amount:desc">Amount ↓</option>
          <option value="vendor:asc">Vendor A–Z</option>
          <option value="vendor:desc">Vendor Z–A</option>
        </select>

        {hasActiveFilter && (
          <button
            className="btn-clear-filters"
            onClick={() => setFilter(f => ({ ...f, status: '', category: '', paymentMethod: '' }))}
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>{bills.length === 0 ? 'No bills yet. Create your first one!' : 'No bills match the current filters.'}</p>
        </div>
      ) : (
        <div className="bills-list">
          {filtered.map(bill => (
            <div
              key={bill.id}
              className={`bill-card ${selectedBill?.id === bill.id ? 'selected' : ''}`}
              onClick={() => onBillClick(bill)}
            >
              <div className="bill-card-header">
                <h3>{bill.vendor}</h3>
                <span className={`status-badge ${bill.status}`}>{bill.status}</span>
              </div>
              <div className="bill-card-body">
                <p className="amount">{fmt(bill.amount)}</p>
                <p className="due-date">Due: {new Date(bill.due_date + 'T00:00:00').toLocaleDateString()}</p>
                {bill.category       && <span className="category-tag">{bill.category}</span>}
                {bill.payment_method && <span className="category-tag">{bill.payment_method}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListView;
