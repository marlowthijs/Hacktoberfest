# uniflow

uniflow turns a weekly society event list into a public calendar feed that students can subscribe to in Google Calendar. Society committees can publish their own events and joining instructions through the secretary portal.

## Student journey

1. Search and follow societies or sports. Compact cards put **Follow** at the top; browsing shows six results at a time. Contact-only groups appear when searched for or in **My selection**. Choices stay saved on that device, including societies with no upcoming dates. Accidental removals have an **Undo** action.
2. Review events with search and 7-day, 30-day or all-upcoming filters. These filters change the preview, not the subscription. A bottom action bar keeps the next step in reach. Source dates and expandable joining details explain each listing.
3. Choose a calendar app. Google and other apps reveal the paste instructions after copying; Apple Calendar also offers a direct subscription link. Copying stays on UniFlow and, on small screens, scrolls to the next instruction. Failed copying selects the link and offers a manual route. A one-time `.ics` download remains under a disclosure.

The progress steps are clickable, and browser Back/Forward restore the previous step and scroll position. Search filters and expanded details survive navigation; unchanged background refreshes leave the page intact. Returning users can choose **Your calendar** in the header. Calendar-app and tentative-date preferences are saved locally. If the selection differs from a previously copied link, the app explains that an existing subscription needs replacing: changing browser selections does not change an older subscription URL.

## Refresh the SUSU catalogue

The [17 November 2026 refresh report](reports/catalogue-refresh-2026-11-17.md) records coverage, additions and outstanding source problems. The refresh tool reads the public society, Athletic Union and intramural directories, each profile, eight months of the SUSU calendar and additional event links on profiles. It extracts descriptions, logos, public contacts, membership fees and joining/schedule notes. It does not read private social content, send messages or invent dated occurrences from a regular schedule.

From a review branch, run:

```sh
npm ci
npm run refresh:catalogue
npm test
npm run dev
```

Review `data/events.json` and `reports/catalogue-refresh.json` before merging. The command updates local files only; it does not publish, change the portal database, or install a scheduled job. Normal runs fetch sources afresh. Public source snapshots are cached in ignored `.catalogue-cache/`; `--resume` uses existing snapshots for an interrupted run and `--cached` reprocesses them offline. Only reuse snapshots from the same collection: reprocessing old snapshots does not establish new freshness. `--date YYYY-MM-DD` preserves that collection date. For a reproducible review, `--baseline /path/to/catalogue.json` compares against that saved input instead of the working catalogue.

`source_checked_at` means the information was present on the cited SUSU page when checked, not that its organiser independently confirmed it. Previously supplied contact links are preserved if SUSU omits them, but are labelled as not rechecked. Membership prices include their published validity period. Profiles that disappear stay searchable and are flagged for review, so saved selections retain their IDs.

Events with `verification_status: "needs_confirmation"` are excluded from the default preview and subscribed feed. Students can explicitly include them; their URL adds `include_unconfirmed=1`, and their calendar entries are marked `[Unconfirmed]` and `STATUS:TENTATIVE`. A conflicting event date or an old generated schedule is never presented as a newly verified date. Existing event IDs and cancellation records are preserved. Calendar `sequence` tracks source changes separately from the portal's edit-conflict `version`.

## Update society events

The event catalogue lives in [`data/events.json`](data/events.json). Update this file in the GitHub repository when society teams send their weekly events. The public app reads the file from the repository's `main` branch and checks for updates every few minutes, so ordinary event edits do not need a Worker redeploy.

**Portal edits take priority:** once a secretary edits an event in the portal, its database copy overrides the JSON entry with the same ID. For those events, use the portal for future edits. Society profile fields published through the portal also override their matching JSON fields. New societies and their official identity still belong in the JSON catalogue.

Each event needs a stable `id`, its `society_id`, a title, ISO 8601 start and end times with an offset, a time-zone name, a location, and a short description. Add the society to `societies` before adding its events. Keep IDs stable when editing an existing event so calendar subscriptions can recognise it. `source_url` is optional and links the event card and calendar item to its official details page.

Society records can also include `susu_url`, `logo_url`, `instagram_url`, `instagram_bio`, `contact_email`, `website_url`, `community_url`, and `regular_schedule`. `logo_url` can point to the society's uploaded image on its official SUSU profile; the card shows initials if no logo is listed or the image cannot load. UniFlow shows the available contact links and regular activity notes on each society card. A schedule note is informational; only dated entries in `events` appear in the calendar feed.

```json
{
  "schema_version": 1,
  "updated_at": "2026-10-24T12:00:00Z",
  "societies": [
    { "id": "ecss", "name": "ECSS", "description": "Society events", "accent": "#b7ef72" }
  ],
  "events": [
    {
      "id": "hacktoberfest-2026",
      "society_id": "ecss",
      "title": "Hacktoberfest",
      "start": "2026-10-24T09:45:00+01:00",
      "end": "2026-10-24T20:00:00+01:00",
      "timezone": "Europe/London",
      "location": "Building 60 West",
      "description": "hackathon"
    }
  ]
}
```

## Google Calendar

Students select societies in the app, copy their calendar URL, then choose **Other calendars → + → From URL** in Google Calendar. The feed is a separate subscribed calendar; it does not write directly into the student's primary calendar. Google refreshes subscribed calendars periodically. The `.ics` download is available for a one-time import.

On phones, copying never navigates to Google Calendar and there is no tappable Google Calendar website link. iOS can route even a long-pressed link into the app, which cannot add URL subscriptions. Google's supported route is a computer browser: **Copy setup link** carries the selected society IDs and the tentative-date preference to UniFlow on another device, ready to finish with the same Google account. Opening the setup link restores only known society IDs, selects Google Calendar, and removes the transfer parameters after loading. Copying this setup link does not subscribe the user and is distinct from copying the `.ics` calendar link.

An optional mobile browser route tells students to re-copy their calendar link, manually type `calendar.google.com` into a new Safari/browser tab, request the desktop website, and use **Add calendar → From URL** if available. It does not promise that Google supports this on every phone. If the option is absent, use the computer route. The desktop Google link and Apple Calendar subscription route remain available for their respective devices/apps. See [Google's subscription help](https://support.google.com/calendar/answer/37100?hl=en&co=GENIE.Platform%3DiOS).

Selections stay in the student's browser. The generated feed URL contains only the selected society IDs and public event listings. Anyone who has that URL can view the corresponding feed.

## Deploy to Cloudflare

The live app at `hack.marlowt.uk` is the **`hacktoberfest2`** Cloudflare Worker. Its GitHub integration automatically builds and deploys changes pushed to `main`. Check **Workers & Pages → hacktoberfest2 → Deployments** for a successful deployment of your commit before expecting interface changes to appear.

The Worker runs plain JavaScript with a Cloudflare D1 database. Node.js 22.13+ is needed for development; no Node server runs in production. Wrangler and the test tools are development dependencies.

Before the first portal deployment, apply the database migration and configure `PORTAL_ADMIN_KEY` as a Cloudflare secret (see below). For a manual deployment, authenticate Wrangler with the Cloudflare account and run this from the repository directory:

```sh
npm ci
npm run db:production
npm run deploy
```

Changes to `worker/index.js` (including the interface and calendar setup flow) must be deployed, normally by the automatic build from `main`. The public app also reads `data/events.json` directly from `main`, so event edits are picked up after its cache refreshes even without a new Worker deployment.

`wrangler.toml` targets `hacktoberfest2`. The older `society-synth` Worker does not serve `hack.marlowt.uk`. The existing custom domains are managed in **Workers & Pages → hacktoberfest2 → Domains**.

## Try the secretary portal locally

1. Check out the branch you want to preview and open a terminal in the repository.
2. Run `npm ci`, then `npm run dev`.
3. Open [the owner portal](http://127.0.0.1:8787/secretary/admin).
4. Open `.portal-access/local-owner-key.txt` and paste that key into the owner login.
5. Search for a society, select it, enter a test secretary name, and create an invitation.
6. Open that invitation yourself **only for this local test**. Click **Open my workspace**.
7. Add an event or publish **How to get involved** details. Open [the student view](http://127.0.0.1:8787/) and search for the same society to see the result.

`npm run dev` creates a random local owner key and applies the schema to a local database automatically. Local edits never change the live website. Keep the terminal running; press Ctrl+C to stop. If port 8787 is busy, use `npm run dev -- --port 8788` and use that port in the links above.

Localhost and `workers.dev` previews use the catalogue bundled from the checked-out branch, so local JSON changes can be tested before merging. Local secretary edits are stored in `.wrangler/state` and do not write back to `data/events.json`. Set `CATALOGUE_REF` explicitly in `.dev.vars` to read a different published GitHub branch instead. Live custom domains continue reading GitHub `main`. Never commit `.dev.vars`, `.portal-access/`, `.catalogue-cache/` or `.wrangler/`; all are ignored by Git.

## Running the portal

After deployment:

- **Secretaries:** `/secretary` — open an invitation, manage events, or request access by email.
- **Owner:** `/secretary/admin` — issue invitation links and revoke a society’s access.

Verify the secretary through their society’s official contact details before sharing an invitation. The owner screen links to the SUSU profile. Copy the invitation and send it privately yourself; UniFlow does not send emails automatically. Opening a real invitation yourself consumes it.

An invitation expires after seven days and can be used once. It signs the secretary into that browser for 30 days. Returning to `/secretary` in the same browser opens their workspace. Signing out, clearing cookies, changing devices or reaching the expiry requires a new invitation. For a committee handover, revoke access first, then issue a new invitation. Published events and joining details survive revocation.

Secretaries can:

- Add, edit, duplicate, cancel and restore their society’s events.
- See upcoming events and imported dates needing confirmation separately, search their events and reveal six at a time.
- Publish an introduction, joining instructions, membership link, regular activity notes, public email and social links.
- Preview events and joining instructions before publishing.
- Resume automatically saved event and joining-details drafts from the same browser. Drafts are not public, are not synced to another device, and are removed if the browser's site data is cleared. Use **Publish** to make changes public.

If someone publishes a newer version while a draft is saved, the portal compares the published details with the draft and asks the secretary to review them before publishing. A failed connection keeps the form available; retrying the same new event does not create a second copy. Draft storage failures are shown explicitly, with a warning before leaving unsaved changes.

Dates use Southampton time (`Europe/London`), including British Summer Time. The form rejects the missing hour during the spring clock change; in autumn it uses the first occurrence of a repeated time. A regular activity note does not generate calendar events: add dated events, or duplicate an existing one and change the date.

Changing a start time moves the end time to keep the existing duration. Duplicating suggests the next future weekly occurrence at the same Southampton local time; check that suggested date before publishing the separate event.

Publishing updates the database immediately. Public catalogue and feed responses may be cached for up to five minutes. Google and other subscribed calendars refresh on their own schedule. One-off downloaded/imported `.ics` files do not update automatically. Cancellation keeps the event’s UID and adds `STATUS:CANCELLED` and an incremented sequence so subscriptions can recognise the change.

## Database and owner access

`wrangler.toml` binds `PORTAL_DB` to the `uniflow-portal` D1 database. The schema is in `migrations/0001_portal.sql`. The database and first migration have been prepared for this project. `PORTAL_ADMIN_KEY` has also been configured on the live Worker; adding this unused secret did not publish the portal code. The production owner key is saved locally in `.portal-access/production-owner-key.txt`, outside Git. Keep it private and back it up in your password manager. The local preview uses a different key.

For a fresh installation, create a D1 database, replace `database_id` in `wrangler.toml`, run `npm run db:production`, generate a random secret with at least 32 bytes of entropy, and set it with `npx wrangler secret put PORTAL_ADMIN_KEY`. Cloudflare cannot show the secret again. Do not put it in `wrangler.toml` or GitHub. Cloudflare documents [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) and [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

The configured `PORTAL_ALLOWED_ORIGINS` permits secretary access on `hack.marlowt.uk` and `marlowt.uk`, plus localhost for local development. Automatic branch-preview URLs cannot sign in or edit the production database. For a remote writable preview, create a separate Worker and D1 database with its own owner key and allowed origin; do not reuse production storage. Set `PORTAL_ENVIRONMENT="preview"` only for a genuinely isolated preview.

Database contents are separate from Git. Rolling back code does **not** roll back secretary edits. Keep database backups or use Cloudflare D1 Time Travel when recovering data. An unavailable database or upstream catalogue returns a temporary error instead of publishing an incomplete calendar feed.

## Security and tests

Invitation and session tokens are random; only their hashes are stored. Production sessions use Secure, HttpOnly, SameSite cookies. Writes require a matching origin, a session-bound CSRF token and society-scoped access. Input limits and URL/date validation run on the server; rendered user text is escaped. Concurrent edits use version checks and offer a reload rather than silently overwriting newer changes. Owner login and invitation redemption are rate limited. Audit entries record publication and access changes without storing raw tokens.

Run `npm test` for API and DOM integration tests, and `npx wrangler deploy --dry-run` to check the Worker bundle. Tests cover invitation redemption and expiry, revocation, society isolation, CSRF, concurrent edits, validation, preview isolation, safe public rendering, calendar cancellation and upstream failures.

Student and source-parser tests also cover search and progressive results, quiet-society subscriptions, mobile copy behaviour, source/committee separation, unsafe links, inconsistent source dates and tentative-calendar opt-in. Navigation tests exercise browser history and scroll restoration, undo, disclosure retention, clipboard failure, saved calendar preferences and keyboard-aware mobile controls.

Leader tests cover local draft recovery, newer-version comparisons, joining-details tab recovery, lost publication responses, duplicate prevention, confirmation of imported dates, duration-preserving edits, clock changes, focused validation errors and unavailable browser storage.

## Project files

- `worker/index.js` — page routes, public event API and iCalendar feed.
- `worker/student-client.js` — student discovery, saved selections, event review and calendar setup.
- `worker/student-page.js` / `worker/student-styles.js` — student page structure and responsive styling.
- `worker/portal-api.js` — invitation access, validation and D1 persistence.
- `worker/secretary-page.js` / `worker/portal-client.js` — secretary and owner interfaces.
- `worker/portal-drafts.js` / `worker/leader-styles.js` — local leader drafts, conflict review and responsive workspace styling.
- `data/events.json` — base society and event catalogue.
- `migrations/` — D1 database schema.
- `scripts/dev.mjs` — isolated local preview setup.
- `scripts/refresh-catalogue.mjs` — repeatable public SUSU source refresh.
- `reports/` — source coverage and refresh exceptions.
- `tests/` — API and interface integration tests.
- `wrangler.toml` — live Worker and database configuration.
