# 📅 Google Calendar Integration Setup Guide

This guide will walk you through setting up Google Calendar sync for Billarr.

## Overview

When enabled, Billarr will automatically:
- Create calendar events for each bill on its due date
- Set reminders based on your reminder_days setting
- Update events when you edit bills
- Delete events when you delete bills
- Color-code events by status (yellow=pending, green=paid, red=overdue)

## Setup Options

There are two ways to set up Google Calendar integration:

### Option 1: Service Account (Recommended for Personal Use)

**Best for:** Single user, automated setup, no OAuth flow needed

1. **Create a Google Cloud Project**
   - Go to https://console.cloud.google.com
   - Create a new project (e.g., "Billarr")

2. **Enable Google Calendar API**
   - In your project, go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Give it a name (e.g., "billarr-service")
   - Click "Create and Continue"
   - Skip optional steps, click "Done"

4. **Create Service Account Key**
   - Click on your newly created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose "JSON" format
   - Download the file

5. **Install the Credentials**
   ```bash
   # Copy the downloaded file to your bill-tracker data directory
   cp ~/Downloads/your-service-account-key.json ./data/google-credentials.json
   ```

6. **Share Your Calendar with the Service Account**
   - Open Google Calendar (https://calendar.google.com)
   - Click settings (gear icon) > Settings
   - In the left sidebar, click on your calendar name
   - Scroll to "Share with specific people"
   - Click "Add people"
   - Paste the service account email (found in the JSON file, looks like: `billarr-service@project-id.iam.gserviceaccount.com`)
   - Set permission to "Make changes to events"
   - Click "Send"

7. **Restart the Application**
   ```bash
   docker compose restart backend
   ```

8. **Enable in Settings**
   - Open Billarr
   - Go to Settings
   - Check "Sync with Google Calendar"
   - Save

**That's it!** Your bills will now sync to Google Calendar.

---

### Option 2: OAuth 2.0 (For Multiple Users)

**Best for:** Multiple users, more secure, requires OAuth flow

1. **Create a Google Cloud Project**
   - Follow steps 1-2 from Option 1 above

2. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen:
     - User type: External
     - App name: "Billarr"
     - Add your email
     - Add scopes: `../auth/calendar`
   - Application type: "Desktop app"
   - Name: "Billarr OAuth"
   - Click "Create"
   - Download the credentials JSON

3. **Run OAuth Authorization Script**
   
   Create a file `authorize.js` in the backend directory:
   
   ```javascript
   const { google } = require('googleapis');
   const fs = require('fs');
   const readline = require('readline');

   const SCOPES = ['https://www.googleapis.com/auth/calendar'];
   const TOKEN_PATH = './data/google-token.json';
   const CREDENTIALS_PATH = './data/google-credentials.json';

   async function authorize() {
     const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
     const { client_secret, client_id, redirect_uris } = credentials.installed;
     const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

     const authUrl = oAuth2Client.generateAuthUrl({
       access_type: 'offline',
       scope: SCOPES,
     });

     console.log('Authorize this app by visiting this url:', authUrl);
     
     const rl = readline.createInterface({
       input: process.stdin,
       output: process.stdout,
     });

     rl.question('Enter the code from that page here: ', (code) => {
       rl.close();
       oAuth2Client.getToken(code, (err, token) => {
         if (err) return console.error('Error retrieving access token', err);
         fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
         console.log('Token stored to', TOKEN_PATH);
       });
     });
   }

   authorize();
   ```

4. **Run the Authorization**
   ```bash
   # Copy credentials file
   cp ~/Downloads/credentials.json ./data/google-credentials.json
   
   # Run authorization script
   cd backend
   npm install
   node authorize.js
   
   # Follow the prompts:
   # 1. Open the URL in your browser
   # 2. Authorize the app
   # 3. Copy the code
   # 4. Paste it back into the terminal
   ```

5. **Restart and Enable**
   - Restart: `docker compose restart backend`
   - Enable in app settings

---

## Troubleshooting

### "Google Calendar: No credentials file found"

Make sure the credentials file exists at `./data/google-credentials.json`

### "Google Calendar: Credentials found but no token file"

You need to run the OAuth flow (Option 2, step 4)

### "Failed to initialize Google Calendar"

Check the logs:
```bash
docker compose logs backend
```

Common issues:
- Invalid JSON in credentials file
- API not enabled in Google Cloud Console
- Service account not shared with calendar (Option 1)

### Events not appearing in calendar

1. Check that sync is enabled in Settings
2. Verify the service account has calendar access
3. Check backend logs for sync errors
4. Try manually triggering: `curl -X POST http://localhost:3001/api/notifications/trigger`

### Wrong calendar being used

By default, events are added to your primary calendar. To use a different calendar:

```bash
# In docker-compose.yml, add:
environment:
  - GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
```

To find your calendar ID:
1. Open Google Calendar settings
2. Click on the calendar name
3. Scroll down to "Integrate calendar"
4. Copy the "Calendar ID"

---

## Environment Variables

Optional configuration in `docker-compose.yml`:

```yaml
backend:
  environment:
    - GOOGLE_CREDENTIALS_PATH=/app/data/google-credentials.json
    - GOOGLE_TOKEN_PATH=/app/data/google-token.json
    - GOOGLE_CALENDAR_ID=primary
```

---

## Security Notes

- **Never commit** credentials or token files to git (they're in `.gitignore`)
- **Service account keys** have full access - keep them secure
- **OAuth tokens** can be revoked at https://myaccount.google.com/permissions
- **Backup your credentials** - if lost, you'll need to create new ones

---

## Testing

After setup, test by:

1. Creating a test bill with a due date tomorrow
2. Check Google Calendar - event should appear
3. Edit the bill - event should update
4. Delete the bill - event should be removed

---

## Disabling Google Calendar Sync

To disable:
1. Uncheck "Sync with Google Calendar" in settings
2. Optionally, remove credentials files:
   ```bash
   rm ./data/google-credentials.json
   rm ./data/google-token.json
   ```

Existing calendar events will remain but won't be updated.

---

Need help? Check the main README.md or open an issue!
