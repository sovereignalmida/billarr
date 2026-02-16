const fetch = require('node-fetch');

class NotificationService {
  constructor(db) {
    this.db = db;
    this.checkInterval = null;
  }

  // Start the scheduler - checks every hour
  start() {
    console.log('📅 Notification scheduler started');
    
    // Check immediately on start
    this.checkAndNotify();
    
    // Then check every hour
    this.checkInterval = setInterval(() => {
      this.checkAndNotify();
    }, 60 * 60 * 1000); // 1 hour
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('📅 Notification scheduler stopped');
    }
  }

  async checkAndNotify() {
    try {
      console.log('🔔 Checking for bills needing reminders...');
      
      // Get settings
      const settings = await this.getSettings();
      if (!settings || settings.notification_method === 'none') {
        console.log('ℹ️  Notifications disabled in settings');
        return;
      }

      // Get bills that need reminders
      const bills = await this.getBillsNeedingReminders();
      
      if (bills.length === 0) {
        console.log('✅ No bills need reminders right now');
        return;
      }

      console.log(`📬 Found ${bills.length} bill(s) needing reminders`);

      // Send notifications
      for (const bill of bills) {
        await this.sendNotification(bill, settings);
      }

    } catch (error) {
      console.error('❌ Error in notification check:', error);
    }
  }

  getSettings() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getBillsNeedingReminders() {
    return new Promise((resolve, reject) => {
      const today = new Date();
      
      this.db.all(
        `SELECT * FROM bills 
         WHERE status = 'pending' 
         AND date(due_date) >= date('now')
         ORDER BY due_date ASC`,
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // Filter bills where reminder should be sent
            const billsToNotify = rows.filter(bill => {
              const dueDate = new Date(bill.due_date);
              const diffTime = dueDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              // Send reminder if we're within the reminder window
              return diffDays >= 0 && diffDays <= bill.reminder_days;
            });
            
            resolve(billsToNotify);
          }
        }
      );
    });
  }

  async sendNotification(bill, settings) {
    const daysUntil = this.getDaysUntilDue(bill.due_date);
    const message = this.formatMessage(bill, daysUntil);

    console.log(`📤 Sending notification for: ${bill.vendor}`);

    // Send via configured methods
    if (settings.notification_method === 'telegram' || settings.notification_method === 'all') {
      await this.sendTelegram(message, settings);
    }

    if (settings.notification_method === 'all' && settings.google_calendar_sync) {
      // Google Calendar sync happens on bill create/update, not here
      console.log('ℹ️  Google Calendar sync enabled (handled on save)');
    }
  }

  async sendTelegram(message, settings) {
    if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
      console.log('⚠️  Telegram not configured');
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: settings.telegram_chat_id,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Telegram notification sent successfully');
      } else {
        console.error('❌ Telegram error:', data.description);
      }
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error.message);
    }
  }

  formatMessage(bill, daysUntil) {
    const dueDate = new Date(bill.due_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let timePhrase;
    if (daysUntil === 0) {
      timePhrase = '🔴 *DUE TODAY*';
    } else if (daysUntil === 1) {
      timePhrase = '🟡 *Due Tomorrow*';
    } else {
      timePhrase = `🟢 Due in ${daysUntil} days`;
    }

    return `💰 *Bill Reminder*\n\n` +
           `${timePhrase}\n\n` +
           `*Vendor:* ${bill.vendor}\n` +
           `*Amount:* $${parseFloat(bill.amount).toFixed(2)}\n` +
           `*Due Date:* ${dueDate}\n` +
           (bill.payment_method ? `*Payment:* ${bill.payment_method}\n` : '') +
           (bill.account_info ? `*Account:* ${bill.account_info}\n` : '') +
           (bill.notes ? `\n📝 ${bill.notes}` : '');
  }

  getDaysUntilDue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}

module.exports = NotificationService;
