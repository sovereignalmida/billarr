import React, { useState, useEffect, useCallback } from 'react';
import Calendar from './components/Calendar';
import BillForm from './components/BillForm';
import BillDetails from './components/BillDetails';
import ListView from './components/ListView';
import Settings from './components/Settings';
import Login from './components/Login';
import ExpensesView from './components/ExpensesView';
import { apiFetch, clearAuth } from './utils/apiFetch';
import './App.css';

function App() {
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [view, setView] = useState('calendar');
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('billarr-theme') || 'light');

  // authStatus: null = loading | { mode: 'jwt'|'legacy'|'none', hasUsers: bool }
  const [authStatus, setAuthStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || '';

  const showError = useCallback((message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleAuthError = useCallback(() => {
    clearAuth();
    setCurrentUser(null);
    setNeedsLogin(true);
  }, []);

  // Check auth status on mount
  useEffect(() => {
    fetch(`${API_URL}/api/auth/status`)
      .then(r => r.json())
      .then(status => {
        setAuthStatus(status);
        if (status.mode === 'none') {
          setNeedsLogin(false);
        } else if (status.mode === 'jwt') {
          if (!localStorage.getItem('billarr-token')) setNeedsLogin(true);
        } else if (status.mode === 'legacy') {
          if (!sessionStorage.getItem('billarr-auth')) setNeedsLogin(true);
        }
      })
      .catch(() => setAuthStatus({ mode: 'none' }));
  }, [API_URL]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('billarr-theme', theme);
  }, [theme]);

  const fetchBills = useCallback(async () => {
    try {
      const data = await apiFetch(`${API_URL}/api/bills`);
      setBills(data);
    } catch (err) {
      if (err.status === 401) handleAuthError();
      else showError(`Failed to load bills: ${err.message}`);
    }
  }, [API_URL, showError, handleAuthError]);

  useEffect(() => {
    if (authStatus && !needsLogin) fetchBills();
  }, [authStatus, needsLogin, fetchBills]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLogin = (user) => {
    setCurrentUser(user || null);
    setNeedsLogin(false);
  };

  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
    setBills([]);
    setNeedsLogin(true);
  };

  const handleSaveBill = async (billData) => {
    try {
      const url = editingBill ? `${API_URL}/api/bills/${editingBill.id}` : `${API_URL}/api/bills`;
      const method = editingBill ? 'PUT' : 'POST';
      await apiFetch(url, { method, body: JSON.stringify(billData) });
      fetchBills();
      setShowForm(false);
      setEditingBill(null);
    } catch (err) {
      if (err.status === 401) handleAuthError();
      else showError(`Failed to save bill: ${err.message}`);
    }
  };

  const handleDeleteBill = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    try {
      await apiFetch(`${API_URL}/api/bills/${id}`, { method: 'DELETE' });
      fetchBills();
      setSelectedBill(null);
    } catch (err) {
      if (err.status === 401) handleAuthError();
      else showError(`Failed to delete bill: ${err.message}`);
    }
  };

  const handleEditBill  = (bill) => { setEditingBill(bill); setShowForm(true); setSelectedBill(null); };
  const handleBillClick = (bill) => { setSelectedBill(bill); setShowForm(false); };
  const handleNewBill   = ()     => { setEditingBill(null); setShowForm(true); setSelectedBill(null); };

  // Loading auth status
  if (!authStatus) return null;

  // Show login / first-run setup
  if (needsLogin) {
    const loginMode = authStatus.mode === 'jwt'
      ? (authStatus.hasUsers ? 'jwt' : 'setup')
      : 'legacy';
    return <Login mode={loginMode} onLogin={handleLogin} />;
  }

  // isAdmin: true when auth is off, legacy mode, or user has admin role
  const isAdmin = authStatus.mode === 'none'
    || authStatus.mode === 'legacy'
    || (currentUser && currentUser.role === 'admin');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="app-brand">
            <img src="/logolong.png" alt="Billarr" className="app-logo" />
          </div>
          <div className="header-actions">
            <button className={`view-toggle ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>
              Calendar
            </button>
            <button className={`view-toggle ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              List
            </button>
            <button className={`view-toggle ${view === 'expenses' ? 'active' : ''}`} onClick={() => setView('expenses')}>
              Expenses
            </button>
            <button className="btn-primary" onClick={handleNewBill}>
              + New Bill
            </button>
            <button className="btn-theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {currentUser && (
              <div className="user-menu">
                <span className="user-name">{currentUser.name}</span>
                {currentUser.role === 'admin' && <span className="user-role-badge">admin</span>}
              </div>
            )}
            <button className="btn-settings" onClick={() => setShowSettings(true)} title="Settings">
              ⚙️
            </button>
            {authStatus.mode !== 'none' && (
              <button className="btn-logout" onClick={handleLogout} title="Sign out">
                ↩
              </button>
            )}
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
          <Calendar bills={bills} onBillClick={handleBillClick} selectedBill={selectedBill} />
        ) : (
          <ListView bills={bills} selectedBill={selectedBill} onBillClick={handleBillClick} />
        )}
      </main>

      {showForm && (
        <BillForm
          bill={editingBill}
          onSave={handleSaveBill}
          onCancel={() => { setShowForm(false); setEditingBill(null); }}
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
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

export default App;
