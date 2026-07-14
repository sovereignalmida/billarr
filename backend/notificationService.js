const { getDaysUntilDue } = require('./utils/dates');
const TelegramBotService = require('./services/telegramBotService');
const { escapeHtml } = TelegramBotService;

/*
 * BILLARR SMART NOTIFICATION SCHEDULE
 * =====================================
 * 7+ days away  → Once daily at 9am
 * 3-6 days away → Once daily at 9am
 * 1-2 days away → Twice daily at 9am + 6pm
 * Due TODAY     → Three times: 9am, 12pm, 6pm
 * OVERDUE       → Once daily at 9am (persistent reminder)
 *
 * Checker runs every 30 minutes but uses last_notified_at
 * to ensure we only send at the right times.
 */

const SCHEDULE = {
  MORNING:   9,   // 9:00 AM
  MIDDAY:   12,   // 12:00 PM
  EVENING:  18,   // 6:00 PM
};

class NotificationService {
  constructor(db, telegramBotService) {
    this.db = db;
    this.telegramBotService = telegramBotService;
    this.checkInterval = null;
  }

  // Start the scheduler - checks every 30 minutes
  start() {
    console.log('📅 Billarr smart notification scheduler started');
    console.log('   📋 Schedule:');
    console.log('   • 7+ days: Once daily at 9am');
    console.log('   • 3-6 days: Once daily at 9am');
    console.log('   • 1-2 days: 9am + 6pm');
    console.log('   • Due today: 9am + 12pm + 6pm');
    console.log('   • Overdue: Once daily at 9am');

    // Check immediately on start
    this.checkAndNotify();

    // Then check every 30 minutes
    this.checkInterval = setInterval(() => {
      this.checkAndNotify();
    }, 30 * 60 * 1000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('📅 Notification scheduler stopped');
    }
  }

  getCurrentHour() {
    return new Date().getHours();
  }

  shouldNotifyNow(daysUntilDue, lastNotifiedAt) {
    const currentHour = this.getCurrentHour();
    const now = new Date();
    const lastNotified = lastNotifiedAt ? new Date(lastNotifiedAt) : null;

    // Was last notification sent in a specific hour window today?
    const notifiedInWindow = (windowHour) => {
      if (!lastNotified) return false;
      const windowStart = new Date(now);
      windowStart.setHours(windowHour, 0, 0, 0);
      const windowEnd = new Date(now);
      windowEnd.setHours(windowHour + 1, 59, 59, 999);
      return lastNotified >= windowStart && lastNotified <= windowEnd;
    };

    // Was last notification sent today at all?
    const notifiedToday = () => {
      if (!lastNotified) return false;
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return lastNotified >= today;
    };

    // OVERDUE: Once daily at 9am
    if (daysUntilDue < 0) {
      if (currentHour >= SCHEDULE.MORNING && currentHour < SCHEDULE.MORNING + 2) {
        return !notifiedToday();
      }
      return false;
    }

    // DUE TODAY: 9am, 12pm, 6pm
    if (daysUntilDue === 0) {
      if (currentHour >= SCHEDULE.MORNING && currentHour < SCHEDULE.MORNING + 2) {
        return !notifiedInWindow(SCHEDULE.MORNING);
      }
      if (currentHour >= SCHEDULE.MIDDAY && currentHour < SCHEDULE.MIDDAY + 2) {
        return !notifiedInWindow(SCHEDULE.MIDDAY);
      }
      if (currentHour >= SCHEDULE.EVENING && currentHour < SCHEDULE.EVENING + 2) {
        return !notifiedInWindow(SCHEDULE.EVENING);
      }
      return false;
    }

    // 1-2 DAYS AWAY: 9am + 6pm
    if (daysUntilDue <= 2) {
      if (currentHour >= SCHEDULE.MORNING && currentHour < SCHEDULE.MORNING + 2) {
        return !notifiedInWindow(SCHEDULE.MORNING);
      }
      if (currentHour >= SCHEDULE.EVENING && currentHour < SCHEDULE.EVENING + 2) {
        return !notifiedInWindow(SCHEDULE.EVENING);
      }
      return false;
    }

    // 3+ DAYS AWAY: Once daily at 9am
    if (currentHour >= SCHEDULE.MORNING && currentHour < SCHEDULE.MORNING + 2) {
      return !notifiedToday();
    }
    return false;
  }

  async checkAndNotify() {
    try {
      console.log('🔔 Checking for bills needing reminders...');

      const settings = await this.getSettings();
      if (!settings || settings.notification_method === 'none') {
        console.log('ℹ️  Notifications disabled in settings');
        return;
      }

      const bills = await this.getBillsNeedingReminders();

      if (bills.length === 0) {
        console.log('✅ No bills need reminders right now');
        return;
      }

      console.log(`📬 Found ${bills.length} bill(s) in reminder window`);
      let notifiedCount = 0;

      for (const bill of bills) {
        const daysUntil = this.getDaysUntilDue(bill.due_date);

        if (this.shouldNotifyNow(daysUntil, bill.last_notified_at)) {
          console.log(`📤 Sending: ${bill.vendor} (${daysUntil >= 0 ? daysUntil + ' days away' : 'OVERDUE ' + Math.abs(daysUntil) + ' days'})`);
          await this.sendNotification(bill, settings, daysUntil);
          await this.updateLastNotified(bill.id);
          notifiedCount++;
        } else {
          console.log(`⏭️  Skipping ${bill.vendor} - not in notification window`);
        }
      }

      if (notifiedCount > 0) {
        console.log(`✅ Sent ${notifiedCount} notification(s)`);
      } else {
        console.log('⏰ Bills in reminder window but outside notification hours');
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
      this.db.all(
        `SELECT * FROM bills WHERE status = 'pending' ORDER BY due_date ASC`,
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const billsToNotify = rows.filter(bill => {
              const daysUntil = this.getDaysUntilDue(bill.due_date);
              // Include overdue bills up to 30 days
              if (daysUntil < 0 && daysUntil >= -30) return true;
              // Include bills within reminder window
              return daysUntil >= 0 && daysUntil <= bill.reminder_days;
            });
            resolve(billsToNotify);
          }
        }
      );
    });
  }

  updateLastNotified(billId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE bills SET last_notified_at = CURRENT_TIMESTAMP WHERE id = ?',
        [billId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async sendNotification(bill, settings, daysUntil) {
    if (settings.notification_method !== 'telegram' && settings.notification_method !== 'all') return;
    if (!settings.telegram_chat_id) {
      console.log('⚠️  Telegram not configured');
      return;
    }
    const message = this.formatMessage(bill, daysUntil);
    try {
      await this.telegramBotService.sendMessage(
        settings.telegram_chat_id,
        message,
        TelegramBotService.billActionKeyboard(bill)
      );
      console.log('✅ Telegram notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error.message);
    }
  }

  formatMessage(bill, daysUntil) {
    const dueDate = new Date(bill.due_date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let timePhrase;
    if (daysUntil < 0) {
      timePhrase = `🔴 <b>OVERDUE by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}</b>`;
    } else if (daysUntil === 0) {
      timePhrase = '🔴 <b>DUE TODAY</b>';
    } else if (daysUntil === 1) {
      timePhrase = '🟡 <b>Due Tomorrow</b>';
    } else if (daysUntil <= 3) {
      timePhrase = `🟠 <b>Due in ${daysUntil} days</b>`;
    } else {
      timePhrase = `🟢 Due in ${daysUntil} days`;
    }

    return `💰 <b>Bill Reminder</b>\n\n` +
      `${timePhrase}\n\n` +
      `<b>Vendor:</b> ${escapeHtml(bill.vendor)}\n` +
      `<b>Amount:</b> $${parseFloat(bill.amount).toFixed(2)}\n` +
      `<b>Due Date:</b> ${dueDate}\n` +
      (bill.payment_method ? `<b>Payment:</b> ${escapeHtml(bill.payment_method)}\n` : '') +
      (bill.account_info ? `<b>Account:</b> ${escapeHtml(bill.account_info)}\n` : '') +
      (bill.notes ? `\n📝 ${escapeHtml(bill.notes)}` : '');
  }

  getDaysUntilDue(dueDate) {
    return getDaysUntilDue(dueDate);
  }
}

module.exports = NotificationService;
