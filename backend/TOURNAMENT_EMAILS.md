# Tournament Email Notifications

This document explains the tournament email notification system that automatically sends tournament details to players when they are approved or added to tournaments.

## 📧 Features

- **Automatic email notifications** when tournament requests are approved by admins
- **Automatic email notifications** when players are directly added to tournaments by admins
- **Tournament results emails** automatically sent to all participants when tournaments complete
- **Rich HTML email templates** with tournament details, player information, and direct links
- **Personalized results summaries** with individual player stats, rankings, and game history
- **Responsive email design** that works on desktop and mobile
- **Fallback text versions** for email clients that don't support HTML
- **Error handling** that doesn't break the main functionality if email fails

## 🚀 Setup

### 1. Environment Variables

Add these environment variables to your `.env` file:

```env
# Email Configuration (Required)
SMTP_HOST=smtp.gmail.com                    # Your SMTP server
SMTP_PORT=587                              # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                          # true for SSL (port 465), false for TLS (port 587)
SMTP_USER=your-email@gmail.com             # Your email address
SMTP_PASS=your-app-password                # Your email password or app password

# Email Settings (Optional)
SMTP_FROM=noreply@yourchessclub.com        # From address (defaults to no-reply@your-backend-domain)
APP_NAME=Chess Club Results                # App name for emails (defaults to "Chess Results")
FRONTEND_URL=https://yoursite.com          # Frontend URL for tournament links (defaults to localhost:3000)
TEST_EMAIL=admin@yourclub.com              # Email for testing purposes
```

### 2. Gmail Setup Example

For Gmail, you'll need to:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://support.google.com/accounts/answer/185833
3. Use the App Password as `SMTP_PASS`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourclub@gmail.com
SMTP_PASS=your-16-char-app-password
```

### 3. Other Email Providers

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp.live.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Custom SMTP:**
```env
SMTP_HOST=mail.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
```

## 🧪 Testing

### Test the Email System

Run the test scripts to verify your email configuration:

**Test tournament registration emails:**
```bash
cd backend
node test-tournament-email.js
```

**Test tournament results emails:**
```bash
cd backend
node test-tournament-results-email.js
```

This will:
- Test both approval and admin-added email types
- Show configuration status
- Display any errors
- Send test emails if configured

### Expected Output

```
🧪 Testing tournament email functionality...

📧 Testing approval email...
✅ Approval email sent successfully: <message-id>

📧 Testing admin-added email...
✅ Admin-added email sent successfully: <message-id>

🎉 All email tests completed successfully!

📧 Email Configuration Check:
- SMTP_HOST: ✅ Set
- SMTP_USER: ✅ Set
- SMTP_PASS: ✅ Set
- SMTP_FROM: Using default
- APP_NAME: Chess Club Results
- FRONTEND_URL: https://yoursite.com
```

## 🎯 How It Works

### 1. Tournament Request Approval

When an admin approves a tournament request via `/api/tournament-requests/:request_id`:

1. ✅ Player is added to tournament participants
2. 🔔 In-app notification is created  
3. 📧 **Email with tournament details is sent**
4. 📝 Action is logged

### 2. Admin Adds Player Directly

When an admin directly adds a player via `/api/tournaments/:tournament_id/participants`:

1. ✅ Player is added to tournament participants
2. 🔍 System finds associated user account
3. 🔔 In-app notification is created
4. 📧 **Email with tournament details is sent**
5. 📝 Action is logged

### 3. Tournament Completion

When a tournament finishes (last round completed or ≤ 1 player remaining):

1. 🏆 Tournament is marked as completed (`tournament_over = true`)
2. 📈 Final standings are calculated automatically
3. 📧 **Results emails sent to ALL participants** with:
   - Individual final ranking and points
   - Personal game-by-game results
   - Win/Draw/Loss statistics
   - Top 3 finishers
   - Tournament summary
4. 📝 All email activity is logged

### 3. Email Content

Each email includes:

- **Tournament Information:**
  - Tournament name and location
  - Start and end dates (formatted nicely)
  - Number of rounds and time control
  - Arbiter information

- **Player Information:**
  - Player name and rating
  - Title (if any)

- **Interactive Elements:**
  - Direct link to tournament details page
  - Responsive design for mobile/desktop

## 📧 Email Templates

### Approval Email
```
Subject: 🎉 Tournament Request Approved - Spring Championship 2024

Great news! Your request to join "Spring Championship 2024" has been approved. 
You are now officially registered for the tournament!

[Tournament Details Table]
[Player Information Table]
[View Tournament Details Button]
```

### Admin Added Email
```
Subject: 🏆 You've Been Added to Tournament - Spring Championship 2024

You have been added to the tournament "Spring Championship 2024" by an administrator.

[Tournament Details Table]
[Player Information Table]  
[View Tournament Details Button]
```

### Tournament Results Email
```
Subject: 🏆 Tournament Results - Spring Championship 2024

Spring Championship 2024 - Tournament Complete! 🎉

[YOUR FINAL RESULTS]
🥇 #4 of 24 players
3.5/5 points (70% score rate)
3W • 1D • 1L

[TOURNAMENT SUMMARY]
📍 Location, 📅 Dates, 🎯 Format, 👥 Players, 👨‍⚖️ Arbiter

[🏆 TOP 3 FINISHERS]
🥇 1. Alexandra Champion - 4.5 points
🥈 2. Bobby Runner - 4.0 points  
🥉 3. Charlie Bronze - 4.0 points

[📋 YOUR GAMES]
Round 1: vs Alice Beginner (1400) - 🟢 Win
Round 2: vs Bob Intermediate (1700) - 🟡 Draw
Round 3: vs Charlie Bronze (1950) - 🔴 Loss
Round 4: vs Diana Expert (1900) - 🟢 Win
Round 5: vs Edward Strong (1800) - 🟢 Win

[View Full Results Button]
```

## 🔧 Technical Details

### Email Functions

**`sendTournamentDetailsEmail(to, tournament, player, options)`**
- `to`: Recipient email address
- `tournament`: Tournament object with all details
- `player`: Player object with name, rating, title
- `options`: 
  - `isApproval`: true for approval emails
  - `isAdminAdded`: true for admin-added emails
  - `frontendUrl`: Override frontend URL

### Error Handling

- Email failures are logged but don't break the main functionality
- If SMTP is not configured, operations continue normally with warnings
- Network failures are handled gracefully

### Performance

- Emails are sent asynchronously 
- Don't block the API response
- Minimal impact on response times

## 🚨 Troubleshooting

### Common Issues

**"Authentication failed"**
- Check SMTP username/password
- For Gmail, ensure App Password is used
- Verify 2FA is enabled (Gmail)

**"Connection timeout"**
- Check SMTP host and port
- Verify firewall/network settings
- Try different SMTP servers

**"Email not received"**
- Check spam/junk folder
- Verify recipient email address
- Check email provider logs

**"Email skipped"**
- SMTP configuration missing
- Check environment variables
- Run test script for diagnosis

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

This will show more detailed email sending logs.

## 🔐 Security Notes

- Never commit SMTP credentials to version control
- Use App Passwords instead of main account passwords
- Consider using dedicated email service accounts
- Monitor email sending limits
- Use TLS/SSL for secure transmission

## 📊 Monitoring

The system logs all email activities:

```
✅ Sent tournament details email to: player@example.com
⚠️ Failed to send tournament details email: SMTP Error
ℹ️ Email configuration not set up - skipping email
```

Monitor these logs to ensure emails are being delivered successfully.

## 🔧 Admin Functions

### Manual Results Email Trigger

Admins can manually send tournament results emails using the API:

```bash
POST /api/admin/tournaments/{tournament_id}/send-results-emails
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "message": "Tournament results emails sent successfully",
  "tournament_name": "Spring Championship 2024",
  "emails_sent": 18,
  "emails_failed": 2,
  "total_participants": 20
}
```

**Use Cases:**
- Resend emails if there were delivery issues
- Send emails for tournaments completed before this feature was implemented
- Test email delivery for specific tournaments

### Email Activity Monitoring

Monitor email sending through server logs:

```bash
# View recent email activity
tail -f logs/app-$(date +%Y-%m-%d).log | grep -E "(tournament.*email|📧|✅.*email|❌.*email)"
```

## 🔄 Future Enhancements

Potential improvements:
- Email templates customization
- Multiple language support  
- Email delivery tracking
- Bulk email notifications
- Email preferences per user
- Tournament reminders
- Results notifications