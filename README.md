# Society Synth

Society Synth is a small campus events app that keeps a student's Google Calendar in sync with the societies they follow. It runs as a Cloudflare Worker with static assets and a D1 database. There is no build step or frontend framework.

## What it does

- Students connect a Google account, follow societies, browse published events, and sync their picks to their primary Google Calendar.
- Society staff use **Team admin** to add societies, enter events, save drafts, publish updates, or cancel events.
- The Monday 08:00 UTC Cron Trigger syncs future published events for every connected student. Staff and students can also run a sync on demand.
- Stable event IDs make repeat runs update an existing Society Synth event rather than add another copy.
- A cancelled event is removed from calendars on the next sync. Disconnecting a Google account revokes the token and deletes the stored user, subscription, and sync records; events already copied to Google Calendar stay there.
- Google refresh tokens are encrypted with AES-GCM before they are stored in D1. The Worker requests the `calendar.events.owned` scope and does not read calendar events.

The sample **Hacktoberfest** record from the brief is preloaded as a draft for ECSS. It is not visible to students or sent to calendars until staff edit and publish it.

## Deploy on Cloudflare

You'll need a Cloudflare account, Node.js 20 or newer, and a Google Cloud project. This repository is set up for a Cloudflare **Worker** (not Pages), since the scheduled calendar sync needs a server-side Cron Trigger.

### 1. Create a D1 database

From the project folder, install Wrangler and sign in:

```sh
npm install
npx wrangler login
npx wrangler d1 create society-synth-db --location weur
```

Copy the database ID Wrangler returns into `wrangler.jsonc`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`. Then create the tables and the example ECSS draft:

```sh
npx wrangler d1 migrations apply DB --remote
```

### 2. Set up Google Calendar access

In Google Cloud Console, create a project, enable the **Google Calendar API**, and create an OAuth client with application type **Web application**. Configure the consent screen for Society Synth and add the `calendar.events.owned` scope. Add your Google account as a test user while the app is in testing. Google issues refresh tokens that expire after 7 days while an external OAuth app remains in Testing, so the weekly sync is only durable after the app is moved to production and any required verification is complete.

Add these authorized redirect URIs to the OAuth client (replace the example domain):

```text
https://your-domain.example/auth/callback
http://localhost:8787/auth/callback
```

The production URI must exactly match the domain you connect to the Worker. Google's calendar access scopes may require OAuth app verification before a public launch; development/testing projects can stay in testing with named test users.

### 3. Add Worker secrets

Generate three long random values. Use separate values for `SESSION_SECRET` and `ADMIN_SECRET`; create `TOKEN_ENCRYPTION_KEY` as a base64-encoded 32-byte key:

```sh
openssl rand -hex 32
openssl rand -base64 32
```

Add the five values through Wrangler. Each command prompts for its value:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler secret put ADMIN_SECRET
```

`ADMIN_SECRET` is the shared password for **Team admin**. Keep it out of GitHub. For local development, copy `.dev.vars.example` to `.dev.vars`, fill it in with test credentials, and use local D1 migrations instead. The configured D1 binding still needs a database ID in `wrangler.jsonc`.

### 4. Deploy and connect your domain

```sh
npx wrangler deploy
```

In Cloudflare, open **Workers & Pages → society-synth → Settings → Domains & Routes** and add your domain as a custom domain. Then update the Google OAuth client's authorized redirect URI to the final HTTPS domain if needed.

To deploy from GitHub, connect the `society-synth` branch of `marlowthijs/Hacktoberfest` in **Workers & Pages → Create application → Connect to Git** and set the deploy command to `npm run deploy`. Create the D1 database and set its ID in `wrangler.jsonc` before the first build. Add the five Worker secrets in the Cloudflare dashboard. Before requesting public OAuth verification, update `/privacy.html` and the consent screen with your organization's name, verified domain, and a direct support contact.

### 5. Add this week's events

Open the deployed app, choose **Team admin**, and enter the shared admin password. Add a society if needed, then add this week's events and choose **Publish now**. Drafts are hidden from students. Use **Sync all calendars** to send changes immediately, or let the scheduled Monday sync run.

## Local preview

Create a Google OAuth client with the localhost callback above, then prepare local variables and tables:

```sh
cp .dev.vars.example .dev.vars
# Fill in .dev.vars with the test OAuth credentials and fresh random keys.
npx wrangler d1 migrations apply DB --local
npm run dev
```

Open the local URL printed by Wrangler. Local D1 data and credentials are separate from the deployed service.

## Data and operations

- Society records and events live in D1 and are managed from the Team admin panel.
- D1 stores only the minimum Google identity fields, the encrypted refresh token, society selections, and event-to-calendar IDs needed to keep updates idempotent.
- The Worker only writes or updates Society Synth events; when staff cancel one, it deletes that app-created event from Google Calendar.
- The weekly trigger runs at **08:00 UTC on Mondays**. Cloudflare cron times are UTC, so this does not shift with UK daylight saving time.
- See `/privacy.html` for the data practices shown to students and to link from the Google OAuth consent screen.

## References

- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Google Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Google OAuth web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
