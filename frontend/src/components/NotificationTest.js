import React, { useState } from 'react';
import './NotificationTest.css';

const NotificationTest = ({ apiUrl, onClose }) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const testNotifications = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      const response = await fetch(`${apiUrl}/api/notifications/trigger`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setResult({
          success: true,
          message: 'Notification check triggered! Check your Telegram/Calendar for updates. (Note: Only sends for bills due within reminder window)'
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to trigger notifications. Check backend logs.'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
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
