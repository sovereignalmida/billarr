import React, { useState, useEffect, useRef } from 'react';
import NotificationTest from './NotificationTest';
import { apiFetch } from '../utils/apiFetch';
import './Settings.css';

const Settings = ({ onClose, apiUrl }) => {
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
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
    setSaved(false);
    setSaveError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { whatsapp_number, ...settingsToSave } = settings;
    try {
      await apiFetch(`${apiUrl}/api/settings`, {
        method: 'PUT',
        body: JSON.stringify(settingsToSave)
      });
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(`Failed to save: ${err.message}`);
    }
  };

  const downloadFromApi = async (path, filename) => {
    const password = sessionStorage.getItem('billarr-auth');
    const headers = {};
    if (password) headers['Authorization'] = 'Basic ' + btoa(':' + password);
    const res = await fetch(`${apiUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackup = async () => {
    try {
      const ts = new Date().toISOString().split('T')[0];
      await downloadFromApi('/api/backup', `billarr-backup-${ts}.json`);
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
      const password = sessionStorage.getItem('billarr-auth');
      const headers = { 'Content-Type': 'text/csv' };
      if (password) headers['Authorization'] = 'Basic ' + btoa(':' + password);
      const res = await fetch(`${apiUrl}/api/bills/import`, {
        method: 'POST', headers, body: text
      });
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
          <div className="form-section">
            <h3>Data Management</h3>
            <div className="data-actions">
              <div className="data-action-group">
                <p className="data-action-label">Backup all bills as JSON</p>
                <button type="button" className="btn-data-action" onClick={handleBackup}>
                  Download Backup
                </button>
              </div>
              <div className="data-action-group">
                <p className="data-action-label">Export all bills to CSV</p>
                <button type="button" className="btn-data-action" onClick={handleExportCSV}>
                  Export CSV
                </button>
              </div>
              <div className="data-action-group">
                <p className="data-action-label">Import bills from CSV (Billarr format)</p>
                <button type="button" className="btn-data-action" onClick={() => fileInputRef.current?.click()}>
                  Import CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={handleImportCSV}
                />
              </div>
            </div>
            {importStatus && (
              <div className={`import-status import-status-${importStatus.type}`}>
                {importStatus.message}
                <button type="button" onClick={() => setImportStatus(null)}>×</button>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Notification Preferences</h3>
            
            <div className="form-group">
              <label>Notification Method</label>
              <select 
                name="notification_method" 
                value={settings.notification_method} 
                onChange={handleChange}
              >
                <option value="none">None</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>

            {settings.notification_method === 'telegram' && (
              <>
                <div className="form-group">
                  <label>Telegram Bot Token</label>
                  <input
                    type="text"
                    name="telegram_bot_token"
                    value={settings.telegram_bot_token || ''}
                    onChange={handleChange}
                    placeholder="Enter your bot token"
                  />
                  <small>Get a bot token from @BotFather on Telegram</small>
                </div>

                <div className="form-group">
                  <label>Telegram Chat ID</label>
                  <input
                    type="text"
                    name="telegram_chat_id"
                    value={settings.telegram_chat_id || ''}
                    onChange={handleChange}
                    placeholder="Enter your chat ID"
                  />
                  <small>Use @userinfobot to get your chat ID</small>
                </div>
              </>
            )}

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="google_calendar_sync"
                  checked={settings.google_calendar_sync === 1}
                  onChange={handleChange}
                />
                <span>Sync with Google Calendar</span>
              </label>
              <small>Bills will be added to your calendar as reminders</small>
            </div>
          </div>

          <div className="info-box">
            <h4>ℹ️ About Notifications</h4>
            <p>
              Configure your notification preferences to receive reminders before bills are due. 
              The reminder timing is set individually for each bill.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Scheduler:</strong> Runs every hour and checks for bills within their reminder window.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Setup Guides:</strong> See TELEGRAM_SETUP.md and GOOGLE_CALENDAR_SETUP.md for detailed instructions.
            </p>
          </div>

          {settings.notification_method === 'telegram' && (
            <NotificationTest apiUrl={apiUrl} />
          )}

          <div className="form-actions">
            {saved && <span className="save-indicator">✓ Saved!</span>}
            {saveError && <span className="save-error">{saveError}</span>}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn-primary">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
