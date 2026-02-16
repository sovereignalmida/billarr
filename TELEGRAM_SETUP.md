# 📱 Telegram Notifications Setup Guide

Get Billarr reminders sent directly to your Telegram!

## Quick Setup (5 minutes)

### Step 1: Create a Telegram Bot

1. **Open Telegram** on your phone or desktop

2. **Search for @BotFather** (the official bot for creating bots)

3. **Start a chat** with BotFather

4. **Send the command:** `/newbot`

5. **Choose a name** for your bot (e.g., "Billarr")

6. **Choose a username** for your bot (must end in 'bot', e.g., "mybillarr_bot")

7. **Save your bot token** - BotFather will send you something like:
   ```
   Use this token to access the HTTP API:
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567
   ```
   
   ⚠️ **Keep this token secret!** It gives full control of your bot.

### Step 2: Get Your Chat ID

1. **Search for @userinfobot** in Telegram

2. **Start a chat** and send any message

3. **Copy your Chat ID** - it will look like: `123456789`

### Step 3: Start Your Bot

**Important:** Before the bot can send you messages, you need to start it:

1. **Search for your bot** by the username you created (e.g., @mybillarr_bot)

2. **Click "Start"** or send `/start`

3. You should see a message like "Hi! I'm your Billarr bot"

### Step 4: Configure in Billarr

1. **Open Billarr** in your browser

2. **Click the ⚙️ Settings button**

3. **Set Notification Method** to "Telegram" (or "All Methods")

4. **Enter your Bot Token** from Step 1

5. **Enter your Chat ID** from Step 2

6. **Click "Save Settings"**

### Step 5: Test It!

1. **Create a test bill** with a due date in the next 1-3 days

2. **Wait for the scheduler** (runs every hour) or manually trigger:
   ```bash
   curl -X POST http://localhost:3001/api/notifications/trigger
   ```

3. **Check Telegram** - you should receive a notification! 🎉

---

## Notification Format

When a bill is due, you'll receive a message like:

```
💰 Bill Reminder

🟡 Due in 2 days

Vendor: Electric Company
Amount: $125.50
Due Date: Friday, February 17, 2026
Payment: Credit Card ending in 1234
Account: Account #987654

📝 Remember to pay before the due date!
```

### Status Indicators
- 🔴 **DUE TODAY** - Bill is due today!
- 🟡 **Due Tomorrow** - Bill is due tomorrow
- 🟢 **Due in X days** - Bill is coming up

---

## Scheduler Behavior

The notification scheduler:
- ✅ Runs automatically every hour
- ✅ Only sends for bills with status = "pending"
- ✅ Sends when current day is within the "reminder_days" window
- ✅ Won't spam - each check is logged
- ✅ Respects your notification settings

Example:
- Bill due date: February 20
- Reminder days: 3
- Notifications sent: February 17, 18, 19, 20 (one per day)

---

## Troubleshooting

### Not receiving notifications?

**Check 1: Did you start your bot?**
- Search for your bot in Telegram
- Click "Start"
- Try triggering manually

**Check 2: Verify credentials**
- Settings > Notification Method = "Telegram" or "All Methods"
- Bot token is correct (long string with colon)
- Chat ID is correct (just numbers)

**Check 3: Check logs**
```bash
docker compose logs backend | grep -i telegram
```

Look for:
- "✅ Telegram notification sent successfully" = Working!
- "❌ Telegram error" = Check your token/chat ID
- "⚠️ Telegram not configured" = Enter credentials in settings

**Check 4: Test the bot manually**

Try sending a message directly using curl:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "<YOUR_CHAT_ID>",
    "text": "Test message from Billarr!"
  }'
```

If this works, your credentials are correct!

### Common Errors

**"Error: chat not found"**
- You forgot to start the bot (Step 3)
- Wrong chat ID

**"Error: Unauthorized"**
- Wrong bot token
- Token got revoked (create a new bot)

**"Error: Bad Request: message text is empty"**
- This is a code error, not your setup

### No bills triggering notifications?

Check:
1. Bill status is "pending" (not "paid")
2. Due date is in the future
3. Current date is within the reminder_days window
4. Notification method includes Telegram

---

## Advanced Configuration

### Multiple Users

Each user needs:
- Their own chat ID (from @userinfobot)
- Same bot token (one bot can message many people)

In settings, you can only configure one chat ID. For multiple users, you'd need to modify the code or run separate instances.

### Custom Messages

To customize notification messages, edit `/backend/notificationService.js`:

```javascript
formatMessage(bill, daysUntil) {
  // Customize this function
  return `Your custom message format`;
}
```

### Notification Frequency

Default: Every hour

To change, edit `/backend/notificationService.js`:

```javascript
// Change from 60 minutes to 30 minutes:
this.checkInterval = setInterval(() => {
  this.checkAndNotify();
}, 30 * 60 * 1000); // 30 minutes
```

Or set to daily at specific time using a proper cron scheduler.

---

## Security Best Practices

✅ **DO:**
- Keep your bot token secret
- Use a unique bot for Bill Tracker
- Revoke old tokens if exposed

❌ **DON'T:**
- Share your bot token publicly
- Commit tokens to git (use .env files)
- Use the same bot token across multiple apps

If you think your token was exposed:
1. Message @BotFather
2. Send `/mybots`
3. Select your bot
4. Choose "API Token"
5. Click "Revoke current token"
6. Get new token and update settings

---

## Disabling Telegram Notifications

1. Go to Settings in Billarr
2. Change Notification Method to "none" or choose another method
3. Click "Save Settings"

The bot will still exist in Telegram but won't send messages.

To fully delete the bot:
1. Message @BotFather
2. Send `/mybots`
3. Select your bot
4. Choose "Delete Bot"

---

## Testing Without Waiting

Don't want to wait an hour for the scheduler?

**Option 1: Manual Trigger via API**
```bash
curl -X POST http://localhost:3001/api/notifications/trigger
```

**Option 2: Restart Backend**
The scheduler checks immediately on startup:
```bash
docker compose restart backend
```

**Option 3: Create a bill due today**
Set due date to today with reminder_days = 0

---

## FAQ

**Q: Can I use this with Telegram groups?**
A: Yes! Use the group chat ID instead. Add your bot to the group first.

**Q: Will I get spammed with notifications?**
A: No, the scheduler runs every hour but each bill only triggers once per day.

**Q: Can I get notifications in multiple languages?**
A: You'll need to modify the `formatMessage()` function in the code.

**Q: What if I change my phone number?**
A: Your chat ID stays the same! Your bot will still work.

**Q: Can I use someone else's bot?**
A: Not recommended for privacy. Create your own - it takes 2 minutes!

---

Need help? Check the main README.md or open an issue on GitHub!
