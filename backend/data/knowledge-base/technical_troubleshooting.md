# Technical Troubleshooting Guide

## Login & Authentication Issues

### I can't log in — what do I do?
1. Clear your browser cache and cookies (Ctrl+Shift+Delete / Cmd+Shift+Delete)
2. Try an incognito/private window
3. Disable browser extensions, especially ad blockers
4. Check if your password was saved correctly — try typing it manually
5. If using SSO, contact your IT admin to confirm your SSO session is valid
6. If none of the above work, use the "Forgot Password" flow or contact support

### My 2FA code is not working
- Make sure your device's time is synced correctly — TOTP codes are time-sensitive
- On Android: Settings → Date & Time → Automatic Date & Time (enable)
- On iOS: Settings → General → Date & Time → Set Automatically (enable)
- If you've lost your 2FA device, use one of your saved backup codes
- If backup codes are lost, contact support@acmeplatform.com with your account email and a photo ID

## Performance Issues

### The app is slow or pages are not loading
1. Check our status page at status.acmeplatform.com for ongoing incidents
2. Test your internet speed at fast.com — we recommend at least 5 Mbps
3. Clear browser cache
4. Disable browser extensions
5. Try a different browser or device

### Images and attachments are not loading
- Attachments are served from CDN at cdn.acmeplatform.com — ensure this domain is not blocked by your firewall or proxy
- Corporate networks sometimes block CDN domains; ask your IT team to whitelist *.acmeplatform.com

## GitHub Integration Issues

### Commits are not linking to tasks
- Ensure you include the task ID in your commit message using the format: `ACM-123`
- The integration requires the GitHub App to be installed on the repository
- Verify the integration is connected: Settings → Integrations → GitHub → Status
- Check that the repository is in the list of connected repos under that integration

### Pull requests are not syncing
- The GitHub webhook may have failed. Re-sync from Settings → Integrations → GitHub → Sync Now
- Check GitHub's webhook delivery logs: GitHub → Repo → Settings → Webhooks → Recent Deliveries

## Data Import Issues

### Jira import is failing
- Supported Jira export format: XML (Jira Cloud and Jira Server 8+)
- File size limit: 500 MB
- If your file is larger, split it by project in Jira before exporting
- Common failure reasons: malformed XML, unsupported custom field types
- Check the import error log in Settings → Imports → History for specific error messages

### CSV task import errors
- Required columns: Title (required), Description, Assignee (email), Due Date (YYYY-MM-DD), Priority (critical/high/medium/low)
- Maximum 5,000 rows per import
- Dates must be in YYYY-MM-DD format
- Download our template from Settings → Import → Download Template

## Notifications

### I'm not receiving email notifications
1. Check your spam/junk folder
2. Add notifications@acmeplatform.com to your contacts
3. Verify your notification preferences: Settings → Notifications
4. Check if emails are being filtered by your corporate mail server

### Slack notifications stopped working
- Re-authorize the Slack integration: Settings → Integrations → Slack → Reconnect
- Ensure the Acme Platform Slack app has permission to post to the target channel
- If using a private channel, the Slack bot must be manually invited: `/invite @acme-platform`

## Error Codes

| Code  | Meaning                    | Resolution                              |
|-------|----------------------------|-----------------------------------------|
| E1001 | Authentication failure     | Re-login or reset password              |
| E1002 | Session expired            | Refresh page and log in again           |
| E2001 | File too large             | Reduce file size (max 50 MB)            |
| E2002 | Unsupported file type      | Check supported formats in docs         |
| E3001 | Integration auth failure   | Reconnect integration in Settings       |
| E5001 | Server error               | Check status.acmeplatform.com, try later|
