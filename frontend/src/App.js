import React, { useState, useEffect, useCallback } from 'react';
import Calendar from './components/Calendar';
import BillForm from './components/BillForm';
import BillDetails from './components/BillDetails';
import Settings from './components/Settings';
import Login from './components/Login';
import ExpensesView from './components/ExpensesView';
import { apiFetch } from './utils/apiFetch';
import './App.css';

function App() {
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [view, setView] = useState('calendar');
  const [error, setError] = useState(null);
  const [authPassword, setAuthPassword] = useState(() => sessionStorage.getItem('billarr-auth'));
  const [needsAuth, setNeedsAuth] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('billarr-theme') || 'light';
  });
  const [listFilter, setListFilter] = useState({
    status: '', category: '', paymentMethod: '', sortBy: 'due_date', sortDir: 'asc'
  });

  const API_URL = process.env.REACT_APP_API_URL || '';

  const showError = useCallback((message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleAuthError = useCallback(() => {
    sessionStorage.removeItem('billarr-auth');
    setAuthPassword(null);
    setNeedsAuth(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('billarr-theme', theme);
  }, [theme]);

  const fetchBills = useCallback(async () => {
    try {
      const data = await apiFetch(`${API_URL}/api/bills`);
      setBills(data);
      setNeedsAuth(false);
    } catch (err) {
      if (err.status === 401) {
        handleAuthError();
      } else {
        showError(`Failed to load bills: ${err.message}`);
      }
    }
  }, [API_URL, showError, handleAuthError]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills, authPassword]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (password) => {
    setAuthPassword(password);
    setNeedsAuth(false);
  };

  const handleSaveBill = async (billData) => {
    try {
      const url = editingBill
        ? `${API_URL}/api/bills/${editingBill.id}`
        : `${API_URL}/api/bills`;
      const method = editingBill ? 'PUT' : 'POST';
      await apiFetch(url, { method, body: JSON.stringify(billData) });
      fetchBills();
      setShowForm(false);
      setEditingBill(null);
    } catch (err) {
      if (err.status === 401) {
        handleAuthError();
      } else {
        showError(`Failed to save bill: ${err.message}`);
      }
    }
  };

  const handleDeleteBill = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    try {
      await apiFetch(`${API_URL}/api/bills/${id}`, { method: 'DELETE' });
      fetchBills();
      setSelectedBill(null);
    } catch (err) {
      if (err.status === 401) {
        handleAuthError();
      } else {
        showError(`Failed to delete bill: ${err.message}`);
      }
    }
  };

  const handleEditBill = (bill) => {
    setEditingBill(bill);
    setShowForm(true);
    setSelectedBill(null);
  };

  const handleBillClick = (bill) => {
    setSelectedBill(bill);
    setShowForm(false);
  };

  const handleNewBill = () => {
    setEditingBill(null);
    setShowForm(true);
    setSelectedBill(null);
  };

  if (needsAuth) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="app-brand">
            <img src="/logo.png" alt="Billarr" className="app-logo" />
          </div>
          <div className="header-actions">
            <button
              className={`view-toggle ${view === 'calendar' ? 'active' : ''}`}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
            <button
              className={`view-toggle ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
            <button
              className={`view-toggle ${view === 'expenses' ? 'active' : ''}`}
              onClick={() => setView('expenses')}
            >
              Expenses
            </button>
            <button className="btn-primary" onClick={handleNewBill}>
              + New Bill
            </button>
            <button className="btn-theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn-settings" onClick={() => setShowSettings(true)}>
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="error-banner-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="app-main">
        {view === 'expenses' ? (
          <ExpensesView bills={bills} />
        ) : view === 'calendar' ? (
          <Calendar
            bills={bills}
            onBillClick={handleBillClick}
            selectedBill={selectedBill}
          />
        ) : (
          <div className="list-view">
            <div className="list-filters">
              <select
                value={listFilter.status}
                onChange={e => setListFilter(f => ({ ...f, status: e.target.value }))}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={listFilter.category}
                onChange={e => setListFilter(f => ({ ...f, category: e.target.value }))}
              >
                <option value="">All Categories</option>
                {[...new Set(bills.map(b => b.category).filter(Boolean))].sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={listFilter.paymentMethod}
                onChange={e => setListFilter(f => ({ ...f, paymentMethod: e.target.value }))}
              >
                <option value="">All Payment Methods</option>
                {[...new Set(bills.map(b => b.payment_method).filter(Boolean))].sort().map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={`${listFilter.sortBy}:${listFilter.sortDir}`}
                onChange={e => {
                  const [sortBy, sortDir] = e.target.value.split(':');
                  setListFilter(f => ({ ...f, sortBy, sortDir }));
                }}
              >
                <option value="due_date:asc">Due Date ↑</option>
                <option value="due_date:desc">Due Date ↓</option>
                <option value="amount:asc">Amount ↑</option>
                <option value="amount:desc">Amount ↓</option>
                <option value="vendor:asc">Vendor A–Z</option>
                <option value="vendor:desc">Vendor Z–A</option>
              </select>
              {(listFilter.status || listFilter.category || listFilter.paymentMethod) && (
                <button
                  className="btn-clear-filters"
                  onClick={() => setListFilter(f => ({ ...f, status: '', category: '', paymentMethod: '' }))}
                >
                  Clear filters
                </button>
              )}
            </div>
            {(() => {
              const filtered = bills
                .filter(b => !listFilter.status || b.status === listFilter.status)
                .filter(b => !listFilter.category || b.category === listFilter.category)
                .filter(b => !listFilter.paymentMethod || b.payment_method === listFilter.paymentMethod)
                .sort((a, b) => {
                  let av = a[listFilter.sortBy], bv = b[listFilter.sortBy];
                  if (listFilter.sortBy === 'amount') { av = Number(av); bv = Number(bv); }
                  if (av < bv) return listFilter.sortDir === 'asc' ? -1 : 1;
                  if (av > bv) return listFilter.sortDir === 'asc' ? 1 : -1;
                  return 0;
                });
              if (filtered.length === 0) return (
                <div className="empty-state">
                  <p>{bills.length === 0 ? 'No bills yet. Create your first one!' : 'No bills match the current filters.'}</p>
                </div>
              );
              return (
                <div className="bills-list">
                  {filtered.map((bill) => (
                    <div
                      key={bill.id}
                      className={`bill-card ${selectedBill?.id === bill.id ? 'selected' : ''}`}
                      onClick={() => handleBillClick(bill)}
                    >
                      <div className="bill-card-header">
                        <h3>{bill.vendor}</h3>
                        <span className={`status-badge ${bill.status}`}>{bill.status}</span>
                      </div>
                      <div className="bill-card-body">
                        <p className="amount">${parseFloat(bill.amount).toFixed(2)}</p>
                        <p className="due-date">Due: {new Date(bill.due_date + 'T00:00:00').toLocaleDateString()}</p>
                        {bill.category && <span className="category-tag">{bill.category}</span>}
                        {bill.payment_method && <span className="category-tag">{bill.payment_method}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {showForm && (
        <BillForm
          bill={editingBill}
          onSave={handleSaveBill}
          onCancel={() => {
            setShowForm(false);
            setEditingBill(null);
          }}
        />
      )}

      {selectedBill && !showForm && (
        <BillDetails
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onEdit={handleEditBill}
          onDelete={handleDeleteBill}
        />
      )}

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
}

export default App;
