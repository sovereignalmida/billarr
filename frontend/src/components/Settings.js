import React, { useState, useEffect, useRef } from 'react';
import NotificationTest from './NotificationTest';
import { apiFetch } from '../utils/apiFetch';
import './Settings.css';

// ─── Users panel (admin only) ─────────────────────────────────────────────────

const UsersPanel = ({ apiUrl }) => {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'member' });
  const [userError, setUserError] = useState(null);

  const fetchUsers = () => {
    apiFetch(`${apiUrl}/api/users`).then(setUsers).catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, [apiUrl]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setUserError(null);
    if (newUser.password.length < 8) { setUserError('Password must be at least 8 characters'); return; }
    try {
      await apiFetch(`${apiUrl}/api/users`, { method: 'POST', body: JSON.stringify(newUser) });
      setNewUser({ email: '', name: '', password: '', role: 'member' });
      setShowAdd(false);
      fetchUsers();
    } catch (err) {
      setUserError(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove user "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`${apiUrl}/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await apiFetch(`${apiUrl}/api/users/${id}`, { method: 'PUT', body: JSON.stringify({ role }) });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="users-panel">
      <div className="users-list">
        {users.map(u => (
          <div key={u.id} className="user-row">
            <div className="user-row-info">
              <span className="user-row-name">{u.name}</span>
              <span className="user-row-email">{u.email}</span>
            </div>
            <div className="user-row-actions">
              <select
                value={u.role}
                onChange={e => handleRoleChange(u.id, e.target.value)}
                className="user-role-select"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                className="btn-user-delete"
                onClick={() => handleDelete(u.id, u.name)}
                title="Remove user"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd ? (
        <form onSubmit={handleAddUser} className="add-user-form">
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} required placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} required placeholder="email@example.com" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} required placeholder="8+ characters" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {userError && <p className="user-error">{userError}</p>}
          <div className="add-user-actions">
            <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setUserError(null); }}>Cancel</button>
            <button type="submit" className="btn-primary">Add User</button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-add-user" onClick={() => setShowAdd(true)}>
          + Add User
        </button>
      )}
    </div>
  );
};

// ─── Main Settings component ──────────────────────────────────────────────────

const Settings = ({ onClose, apiUrl, isAdmin = true, currentUser = null }) => {
  const [settings, setSettings] = useState({
    notification_method: 'none',
    telegram_chat_id: '',
    telegram_bot_token: '',
    google_calendar_sync: 0
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    apiFetch(`${apiUrl}/api/settings`)
      .then(data => setSettings(data))
      .catch(err => console.error('Error fetching settings:', err));
  }, [apiUrl]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
    setSaved(false);
    setSaveError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { whatsapp_number, ...settingsToSave } = settings;
    try {
      await apiFetch(`${apiUrl}/api/settings`, { method: 'PUT', body: JSON.stringify(settingsToSave) });
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(`Failed to save: ${err.message}`);
    }
  };

  const downloadFromApi = async (path, filename) => {
    const token = localStorage.getItem('billarr-token');
    const password = sessionStorage.getItem('billarr-auth');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    else if (password) headers['Authorization'] = 'Basic ' + btoa(':' + password);
    const res = await fetch(`${apiUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackup = async () => {
    try {
      await downloadFromApi('/api/backup', `billarr-backup-${new Date().toISOString().split('T')[0]}.json`);
    } catch (err) {
      setImportStatus({ type: 'error', message: `Backup failed: ${err.message}` });
    }
  };

  const handleExportCSV = async () => {
    try {
      await downloadFromApi('/api/bills/export', 'billarr-export.csv');
    } catch (err) {
      setImportStatus({ type: 'error', message: `Export failed: ${err.message}` });
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportStatus({ type: 'loading', message: 'Importing...' });
    try {
      const text = await file.text();
      const token = localStorage.getItem('billarr-token');
      const password = sessionStorage.getItem('billarr-auth');
      const headers = { 'Content-Type': 'text/csv' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      else if (password) headers['Authorization'] = 'Basic ' + btoa(':' + password);
      const res = await fetch(`${apiUrl}/api/bills/import`, { method: 'POST', headers, body: text });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setImportStatus({ type: 'success', message: `Imported ${data.imported} bills${data.skipped ? `, skipped ${data.skipped} invalid` : ''}.` });
    } catch (err) {
      setImportStatus({ type: 'error', message: `Import failed: ${err.message}` });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">

          {/* Data Management — admin only */}
          {isAdmin && (
            <div className="form-section">
              <h3>Data Management</h3>
              <div className="data-actions">
                <div className="data-action-group">
                  <p className="data-action-label">Backup all bills as JSON</p>
                  <button type="button" className="btn-data-action" onClick={handleBackup}>Download Backup</button>
                </div>
                <div className="data-action-group">
                  <p className="data-action-label">Export all bills to CSV</p>
                  <button type="button" className="btn-data-action" onClick={handleExportCSV}>Export CSV</button>
                </div>
                <div className="data-action-group">
                  <p className="data-action-label">Import bills from CSV (Billarr format)</p>
                  <button type="button" className="btn-data-action" onClick={() => fileInputRef.current?.click()}>Import CSV</button>
                  <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleImportCSV} />
                </div>
              </div>
              {importStatus && (
                <div className={`import-status import-status-${importStatus.type}`}>
                  {importStatus.message}
                  <button type="button" onClick={() => setImportStatus(null)}>×</button>
                </div>
              )}
            </div>
          )}

          {/* Notifications — admin only */}
          {isAdmin && (
            <div className="form-section">
              <h3>Notification Preferences</h3>
              <div className="form-group">
                <label>Notification Method</label>
                <select name="notification_method" value={settings.notification_method} onChange={handleChange}>
                  <option value="none">None</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>
              {settings.notification_method === 'telegram' && (
                <>
                  <div className="form-group">
                    <label>Telegram Bot Token</label>
                    <input type="text" name="telegram_bot_token" value={settings.telegram_bot_token || ''} onChange={handleChange} placeholder="Enter your bot token" />
                    <small>Get a bot token from @BotFather on Telegram</small>
                  </div>
                  <div className="form-group">
                    <label>Telegram Chat ID</label>
                    <input type="text" name="telegram_chat_id" value={settings.telegram_chat_id || ''} onChange={handleChange} placeholder="Enter your chat ID" />
                    <small>Use @userinfobot to get your chat ID</small>
                  </div>
                </>
              )}
              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" name="google_calendar_sync" checked={settings.google_calendar_sync === 1} onChange={handleChange} />
                  <span>Sync with Google Calendar</span>
                </label>
                <small>Bills will be added to your calendar as reminders</small>
              </div>
              {settings.notification_method === 'telegram' && <NotificationTest apiUrl={apiUrl} />}
            </div>
          )}

          {/* Users — admin only, JWT mode */}
          {isAdmin && localStorage.getItem('billarr-token') && (
            <div className="form-section">
              <h3>Users</h3>
              <UsersPanel apiUrl={apiUrl} />
            </div>
          )}

          {/* Account — always visible when JWT auth is active */}
          {currentUser && (
            <div className="form-section">
              <h3>Account</h3>
              <div className="form-group">
                <label>Signed in as</label>
                <p className="account-info">{currentUser.name} &middot; <span className="account-email">{currentUser.email}</span></p>
              </div>
            </div>
          )}

          <div className="form-actions">
            {saved && <span className="save-indicator">✓ Saved!</span>}
            {saveError && <span className="save-error">{saveError}</span>}
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            {isAdmin && <button type="submit" className="btn-primary">Save Settings</button>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
