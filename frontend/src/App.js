import React, { useState, useEffect, useCallback } from 'react';
import Calendar from './components/Calendar';
import BillForm from './components/BillForm';
import BillDetails from './components/BillDetails';
import ListView from './components/ListView';
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
            <img src="/logolong.png" alt="Billarr" className="app-logo" />
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
          <ListView
            bills={bills}
            selectedBill={selectedBill}
            onBillClick={handleBillClick}
          />
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
