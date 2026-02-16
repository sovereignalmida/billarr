import React, { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import BillForm from './components/BillForm';
import BillDetails from './components/BillDetails';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [view, setView] = useState('calendar');
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'light'
    return localStorage.getItem('billarr-theme') || 'light';
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('billarr-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchBills();
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const fetchBills = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bills`);
      const data = await response.json();
      setBills(data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const handleSaveBill = async (billData) => {
    try {
      const url = editingBill 
        ? `${API_URL}/api/bills/${editingBill.id}`
        : `${API_URL}/api/bills`;
      
      const method = editingBill ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });
      
      fetchBills();
      setShowForm(false);
      setEditingBill(null);
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handleDeleteBill = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    
    try {
      await fetch(`${API_URL}/api/bills/${id}`, { method: 'DELETE' });
      fetchBills();
      setSelectedBill(null);
    } catch (error) {
      console.error('Error deleting bill:', error);
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <img src="/logo.png" alt="Billarr" className="app-logo" />
            Billarr
          </h1>
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

      <main className="app-main">
        {view === 'calendar' ? (
          <Calendar 
            bills={bills} 
            onBillClick={handleBillClick}
            selectedBill={selectedBill}
          />
        ) : (
          <div className="list-view">
            {bills.length === 0 ? (
              <div className="empty-state">
                <p>No bills yet. Create your first one!</p>
              </div>
            ) : (
              <div className="bills-list">
                {bills.map(bill => (
                  <div 
                    key={bill.id} 
                    className={`bill-card ${selectedBill?.id === bill.id ? 'selected' : ''}`}
                    onClick={() => handleBillClick(bill)}
                  >
                    <div className="bill-card-header">
                      <h3>{bill.vendor}</h3>
                      <span className={`status-badge ${bill.status}`}>
                        {bill.status}
                      </span>
                    </div>
                    <div className="bill-card-body">
                      <p className="amount">${parseFloat(bill.amount).toFixed(2)}</p>
                      <p className="due-date">Due: {new Date(bill.due_date).toLocaleDateString()}</p>
                      {bill.category && <span className="category-tag">{bill.category}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
