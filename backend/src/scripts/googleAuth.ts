/**
 * One-time setup: get a Google OAuth refresh token for the clinic's Gmail
 * account, so the backend can create Google Meet links on its calendar.
 *
 *   1. Put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (a "Desktop app" OAuth
 *      client) in backend/.env.
 *   2. Run:  npm run google-auth
 *   3. Open the printed URL, sign in AS THE CLINIC'S GOOGLE ACCOUNT, allow.
 *   4. Copy the printed GOOGLE_REFRESH_TOKEN into Render's env vars (and
 *      your local .env if testing online bookings locally).
 *
 * The refresh token is a secret: it is printed to YOUR terminal only so you
 * can copy it. Don't paste it into chats, tickets or commits.
 *
 * Only asks for calendar.events (create/delete events), not mail or
 * contacts or other calendars' settings.
 */
import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env first.');
  process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent', // always return a refresh token
    state,
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (!code && !error) {
    res.writeHead(404).end();
    return;
  }

  const finish = (message: string, exitCode: number) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end(message);
    server.close();
    setTimeout(() => process.exit(exitCode), 100);
  };

  if (error || url.searchParams.get('state') !== state) {
    console.error(`❌ Authorization failed: ${error ?? 'state mismatch'}`);
    finish('Authorization failed. Check the terminal.', 1);
    return;
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code as string,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const json = (await tokenResponse.json()) as { refresh_token?: string; error?: string; error_description?: string };

  if (!json.refresh_token) {
    console.error(`❌ No refresh token returned: ${json.error ?? ''} ${json.error_description ?? ''}`);
    finish('No refresh token returned. Check the terminal.', 1);
    return;
  }

  console.log('\n✅ Success. Add this to your backend environment (Render + local .env):\n');
  console.log(`GOOGLE_REFRESH_TOKEN=${json.refresh_token}\n`);
  console.log('Keep it secret. If it ever leaks, revoke access at https://myaccount.google.com/permissions and run this again.');
  finish('Done. You can close this tab and return to the terminal.', 0);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Open this URL in your browser and sign in as the CLINIC\'s Google account:\n');
  console.log(authUrl + '\n');
  console.log(`Waiting for Google to redirect back to ${REDIRECT_URI} ...`);
});
