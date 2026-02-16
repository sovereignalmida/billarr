const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleCalendarService {
  constructor(db) {
    this.db = db;
    this.calendar = null;
    this.auth = null;
  }

  async initialize() {
    try {
      // Check if credentials file exists
      const credsPath = process.env.GOOGLE_CREDENTIALS_PATH || '/app/data/google-credentials.json';
      
      if (!fs.existsSync(credsPath)) {
        console.log('ℹ️  Google Calendar: No credentials file found at', credsPath);
        console.log('ℹ️  To enable Google Calendar sync:');
        console.log('   1. Create OAuth credentials at https://console.cloud.google.com');
        console.log('   2. Download credentials.json');
        console.log('   3. Place at:', credsPath);
        return false;
      }

      const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      
      // For service account
      if (credentials.type === 'service_account') {
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
      } else {
        // For OAuth2 (requires token)
        const tokenPath = process.env.GOOGLE_TOKEN_PATH || '/app/data/google-token.json';
        
        if (!fs.existsSync(tokenPath)) {
          console.log('⚠️  Google Calendar: Credentials found but no token file');
          console.log('   Run the OAuth flow to generate token.json');
          return false;
        }

        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        
        this.auth = new google.auth.OAuth2(
          credentials.installed.client_id,
          credentials.installed.client_secret,
          credentials.installed.redirect_uris[0]
        );
        
        this.auth.setCredentials(token);
      }

      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      console.log('✅ Google Calendar service initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar:', error.message);
      return false;
    }
  }

  async syncBill(bill, action = 'create') {
    if (!this.calendar) {
      console.log('ℹ️  Google Calendar not initialized, skipping sync');
      return null;
    }

    try {
      // Check if sync is enabled in settings
      const settings = await this.getSettings();
      if (!settings.google_calendar_sync) {
        return null;
      }

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      if (action === 'delete' && bill.calendar_event_id) {
        await this.calendar.events.delete({
          calendarId,
          eventId: bill.calendar_event_id
        });
        console.log(`✅ Deleted calendar event for: ${bill.vendor}`);
        return null;
      }

      const event = this.createEventFromBill(bill);

      if (action === 'update' && bill.calendar_event_id) {
        const response = await this.calendar.events.update({
          calendarId,
          eventId: bill.calendar_event_id,
          resource: event
        });
        console.log(`✅ Updated calendar event for: ${bill.vendor}`);
        return response.data.id;
      } else {
        const response = await this.calendar.events.insert({
          calendarId,
          resource: event
        });
        console.log(`✅ Created calendar event for: ${bill.vendor}`);
        return response.data.id;
      }

    } catch (error) {
      console.error('❌ Google Calendar sync error:', error.message);
      return null;
    }
  }

  createEventFromBill(bill) {
    const dueDate = new Date(bill.due_date);
    const reminderDays = bill.reminder_days || 3;
    
    // Create all-day event on due date
    const dateStr = dueDate.toISOString().split('T')[0];

    return {
      summary: `💰 ${bill.vendor} - $${parseFloat(bill.amount).toFixed(2)}`,
      description: this.formatDescription(bill),
      start: {
        date: dateStr
      },
      end: {
        date: dateStr
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: reminderDays * 24 * 60 }, // Days before
          { method: 'email', minutes: reminderDays * 24 * 60 }
        ]
      },
      colorId: this.getColorId(bill.status)
    };
  }

  formatDescription(bill) {
    let desc = `Bill Payment Due\n\n`;
    desc += `Amount: $${parseFloat(bill.amount).toFixed(2)}\n`;
    
    if (bill.payment_method) {
      desc += `Payment Method: ${bill.payment_method}\n`;
    }
    
    if (bill.account_info) {
      desc += `Account: ${bill.account_info}\n`;
    }
    
    if (bill.category) {
      desc += `Category: ${bill.category}\n`;
    }
    
    if (bill.recurring && bill.recurring !== 'none') {
      desc += `Recurring: ${bill.recurring}\n`;
    }
    
    if (bill.notes) {
      desc += `\nNotes: ${bill.notes}`;
    }

    return desc;
  }

  getColorId(status) {
    // Google Calendar color IDs
    const colors = {
      'pending': '5',  // Yellow
      'paid': '10',    // Green
      'overdue': '11'  // Red
    };
    return colors[status] || '5';
  }

  getSettings() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row || { google_calendar_sync: 0 });
      });
    });
  }
}

module.exports = GoogleCalendarService;
