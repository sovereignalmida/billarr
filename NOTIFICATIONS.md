# 🔔 Notifications Guide

Complete guide to setting up and using notifications in Billarr.

## Overview

Billarr supports three notification methods:

1. **📱 Telegram** - Instant messages to your phone/desktop (FREE)
2. **📅 Google Calendar** - Automatic calendar events with reminders (FREE)
3. **📲 WhatsApp** - Coming soon!

You can use one, multiple, or all notification methods simultaneously.

---

## How the Scheduler Works

The notification system runs automatically in the background:

### Timing
- ⏰ Checks every **1 hour** automatically
- 🚀 Also checks immediately when the backend starts
- 🧪 Can be triggered manually for testing

### Logic
The scheduler will send notifications for bills that meet ALL these conditions:

✅ Status is **"pending"** (not "paid")  
✅ Due date is **today or in the future** (not past due)  
✅ Current date is **within the reminder window**  

**Example:**
- Bill due date: February 20, 2026
- Reminder days: 3
- Notifications sent on: Feb 17, 18, 19, 20
- Each day gets one reminder (no spam!)

### What Happens
1. Scheduler wakes up every hour
2. Checks database for bills needing reminders
3. Sends Telegram messages (if configured)
4. Logs results to console
5. Goes back to sleep

---

## Setup Guides

### 📱 Telegram Setup (5 minutes)

**Quick Steps:**
1. Message @BotFather → `/newbot`
2. Get bot token
3. Message @userinfobot → Get chat ID
4. **Start your bot** (send `/start`)
5. Enter credentials in Billarr Settings
6. Save and test!

**📖 Full Guide:** [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md)

**Telegram Notification Format:**
```
💰 Bill Reminder

🟡 Due in 2 days

Vendor: Electric Company
Amount: $125.50
Due Date: Friday, February 17, 2026
Payment: Credit Card
Account: #123456

📝 Notes appear here
```

---

### 📅 Google Calendar Setup (10 minutes)

**Quick Steps (Service Account):**
1. Create Google Cloud project
2. Enable Calendar API
3. Create service account → Download JSON
4. Share calendar with service account email
5. Copy JSON to `./data/google-credentials.json`
6. Restart backend
7. Enable in Settings

**📖 Full Guide:** [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)

**Calendar Event Features:**
- ✅ All-day events on due date
- ✅ Color-coded (yellow=pending, green=paid, red=overdue)
- ✅ Reminders set to your configured days
- ✅ Full bill details in description
- ✅ Auto-updates when you edit bills
- ✅ Auto-deletes when you delete bills

---

## Configuration

### In Billarr Settings

1. **Notification Method**
   - `none` - Disabled
   - `telegram` - Telegram only
   - `all` - All available methods

2. **Telegram Settings** (if using Telegram)
   - Bot Token - From @BotFather
   - Chat ID - From @userinfobot

3. **Google Calendar Sync** (if using Calendar)
   - Check the box to enable
   - Requires credentials file setup first

### Per-Bill Settings

When creating/editing each bill:

- **Reminder Days** - How many days before due date to start reminding
  - 0 = Remind only on due date
  - 1 = Remind 1 day before + due date
  - 3 = Remind 3, 2, 1 days before + due date
  - 7 = Remind entire week before

**Pro Tip:** Set different reminder days for different bill types:
- Rent/Mortgage: 7 days
- Utilities: 3 days  
- Subscriptions: 1 day
- Credit cards: 5 days

---

## Testing Your Setup

### Method 1: Test Button (Telegram only)

If Telegram is configured, a test button appears in Settings:

1. Open Settings
2. Scroll to "Test Notifications" section
3. Click "Test Now"
4. Check your Telegram

### Method 2: Manual API Trigger

```bash
curl -X POST http://localhost:3001/api/notifications/trigger
```

This immediately runs the notification check.

### Method 3: Restart Backend

```bash
docker compose restart backend
```

The scheduler runs on startup.

### Method 4: Create a Test Bill

1. Create a bill with:
   - Due date: Tomorrow
   - Reminder days: 1
   - Status: Pending
2. Wait up to 1 hour (or trigger manually)
3. Check for notification

---

## Troubleshooting

### No Notifications Being Sent

**Check 1: Settings Configured?**
- Settings → Notification Method = "telegram" or "all"
- Telegram credentials entered
- Settings saved

**Check 2: Bills in Reminder Window?**
```bash
# View backend logs
docker compose logs backend | tail -50

# Look for:
"📬 Found X bill(s) needing reminders"
```

If it says "0 bills", your bills aren't in the reminder window yet.

**Check 3: Telegram Bot Started?**
- Open Telegram
- Search for your bot
- Send `/start`
- Try test again

**Check 4: Backend Running?**
```bash
docker compose ps
```

Should show backend as "Up"

### Telegram Errors

**"Error: chat not found"**
- Solution: Start your bot in Telegram

**"Error: Unauthorized"**
- Solution: Check bot token is correct
- If exposed, revoke and create new bot

**"Error: Bad Request"**
- Solution: This is a code bug, report it

### Google Calendar Not Syncing

**"Google Calendar not initialized"**
- Check credentials file exists: `ls ./data/google-credentials.json`
- Check file is valid JSON
- Restart backend: `docker compose restart backend`

**Events not appearing**
- Verify calendar is shared with service account
- Check sync is enabled in Settings
- Look for errors: `docker compose logs backend | grep -i calendar`

**Wrong calendar**
- Set environment variable in docker-compose.yml:
  ```yaml
  environment:
    - GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
  ```

---

## Advanced Usage

### Multiple Notification Methods

Set method to "all" to use both Telegram and Calendar:
- Telegram: Instant push notifications
- Calendar: Visual calendar view + native calendar app reminders

### Customizing Check Frequency

Default: Every hour

To change, edit `/backend/notificationService.js`:

```javascript
// Line ~17 - Change interval
this.checkInterval = setInterval(() => {
  this.checkAndNotify();
}, 30 * 60 * 1000); // 30 minutes instead of 60
```

Then rebuild: `docker compose up -d --build`

### Custom Notification Messages

Edit `/backend/notificationService.js` → `formatMessage()` function

Example - Add emoji:
```javascript
formatMessage(bill, daysUntil) {
  let emoji = '💰';
  if (bill.category === 'utilities') emoji = '⚡';
  if (bill.category === 'rent') emoji = '🏠';
  
  return `${emoji} Bill Reminder\n\n...`;
}
```

### Notification Logs

View detailed logs:
```bash
# All notification activity
docker compose logs backend | grep "🔔\|📬\|✅\|❌"

# Just Telegram sends
docker compose logs backend | grep -i telegram

# Just Calendar syncs
docker compose logs backend | grep -i calendar
```

---

## Privacy & Security

### Telegram
- ✅ Bot only sends to your chat ID
- ✅ Messages are private between you and bot
- ✅ Bot can't read your other Telegram messages
- ⚠️ Keep bot token secret
- ⚠️ Revoke token if exposed

### Google Calendar
- ✅ Service account only accesses calendar you share
- ✅ No access to email or other Google services
- ✅ Can revoke access anytime
- ⚠️ Keep credentials JSON secure
- ⚠️ Don't commit to git

### Data Storage
- All notification settings stored in local SQLite database
- No data sent to external services except:
  - Telegram API (only when sending messages)
  - Google Calendar API (only when syncing)

---

## Disabling Notifications

### Temporarily
- Settings → Notification Method → "none"
- Scheduler still runs but won't send anything

### Permanently
- Disable in settings
- Delete credentials files:
  ```bash
  rm ./data/google-credentials.json
  rm ./data/google-token.json
  ```

### Delete Telegram Bot
1. Message @BotFather
2. `/mybots`
3. Select your bot
4. "Delete Bot"

---

## FAQ

**Q: Will I get spammed?**  
A: No! Each bill sends max one notification per day.

**Q: What if I miss a notification?**  
A: Overdue bills show in the calendar view. You can also set status to "overdue" manually.

**Q: Can I get email notifications?**  
A: Not yet, but it's on the roadmap!

**Q: Do I need both Telegram AND Calendar?**  
A: No, use whichever you prefer. Or use both!

**Q: What happens if the backend restarts?**  
A: Scheduler starts fresh. It will catch up on the next hourly check.

**Q: Can I use this for multiple people?**  
A: Each person needs their own chat ID. For Calendar, share with multiple service accounts.

**Q: How do I know if it's working?**  
A: Check logs: `docker compose logs backend -f`  
Look for "✅ Telegram notification sent" or "✅ Created calendar event"

**Q: Does it work offline?**  
A: No, internet required for Telegram and Google Calendar APIs.

**Q: What if my API credentials expire?**  
A: Telegram bot tokens don't expire unless revoked. Google Calendar tokens may need refresh (handled automatically).

---

## Roadmap

Planned features:
- 📧 Email notifications
- 📲 WhatsApp via Twilio
- 🔔 Discord webhooks
- 📊 Weekly summary reports
- ⏰ Custom notification times
- 🔄 Retry failed sends
- 📱 Push notifications (PWA)

---

## Support

Having issues?

1. **Check the guides:** TELEGRAM_SETUP.md, GOOGLE_CALENDAR_SETUP.md
2. **Check logs:** `docker compose logs backend`
3. **Test manually:** Use the test button or API trigger
4. **Open an issue:** Include logs and configuration (redact tokens!)

---

Happy bill tracking with Billarr! Never miss a payment again! ⚓🎉
