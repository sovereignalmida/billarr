import React, { useState, useEffect } from 'react';
import NotificationTest from './NotificationTest';
import './Settings.css';

const Settings = ({ onClose, apiUrl }) => {
  const [settings, setSettings] = useState({
    notification_method: 'none',
    telegram_chat_id: '',
    telegram_bot_token: '',
    whatsapp_number: '',
    google_calendar_sync: 0
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/settings`);
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${apiUrl}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
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
                <option value="whatsapp">WhatsApp</option>
                <option value="all">All Methods</option>
              </select>
            </div>

            {(settings.notification_method === 'telegram' || settings.notification_method === 'all') && (
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

            {(settings.notification_method === 'whatsapp' || settings.notification_method === 'all') && (
              <div className="form-group">
                <label>WhatsApp Number</label>
                <input
                  type="tel"
                  name="whatsapp_number"
                  value={settings.whatsapp_number || ''}
                  onChange={handleChange}
                  placeholder="+1234567890"
                />
                <small>Include country code (e.g., +1 for US)</small>
              </div>
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

          {(settings.notification_method === 'telegram' || settings.notification_method === 'all') && (
            <NotificationTest apiUrl={apiUrl} />
          )}

          <div className="form-actions">
            {saved && <span className="save-indicator">✓ Saved!</span>}
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
