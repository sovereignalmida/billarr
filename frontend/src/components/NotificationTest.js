import React, { useState } from 'react';
import { apiFetch } from '../utils/apiFetch';
import './NotificationTest.css';

const NotificationTest = ({ apiUrl }) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const testNotifications = async () => {
    setTesting(true);
    setResult(null);
    try {
      await apiFetch(`${apiUrl}/api/notifications/trigger`, { method: 'POST' });
      setResult({ success: true, message: 'Notification check triggered! Check your Telegram for updates. (Only sends for bills within their reminder window)' });
    } catch (err) {
      setResult({ success: false, message: `Failed: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="notification-test">
      <h4>🧪 Test Notifications</h4>
      <p>Manually trigger the notification checker to test your setup.</p>
      
      <button 
        className="btn-primary" 
        onClick={testNotifications}
        disabled={testing}
      >
        {testing ? 'Testing...' : 'Test Now'}
      </button>

      {result && (
        <div className={`test-result ${result.success ? 'success' : 'error'}`}>
          {result.success ? '✅' : '❌'} {result.message}
        </div>
      )}

      <div className="test-tips">
        <strong>Tips:</strong>
        <ul>
          <li>Create a bill due in 1-3 days to test</li>
          <li>Make sure notification method is set to Telegram</li>
          <li>Check your Telegram for the message</li>
          <li>Check backend logs with: <code>docker compose logs backend</code></li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationTest;
