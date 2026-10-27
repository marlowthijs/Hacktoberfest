# uniflow

uniflow turns a weekly society event list into a public calendar feed that students can subscribe to in Google Calendar. It starts with the ECSS Hacktoberfest entry from the project brief.

## Update society events

The event catalogue lives in [`data/events.json`](data/events.json). Update this file in the GitHub repository when society teams send their weekly events. The public Site reads the file from the repository's `main` branch and checks for updates every few minutes, so ordinary event edits do not need a Site redeploy.

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

On phones, the button only copies the feed link: navigating automatically can launch the Google Calendar app, which cannot add URL subscriptions. The app shows browser instructions instead. In iPhone Safari, press and hold the Google Calendar website link, choose **Open in New Tab**, and use Safari's **Request Desktop Website** option. If Google does not offer **From URL** there, complete the one-time setup on a computer with the same Google account. A normal tap on UniFlow's mobile Google Calendar link displays the long-press instructions without navigating.

Selections stay in the student's browser. The generated feed URL contains only the selected society IDs and public event listings. Anyone who has that URL can view the corresponding feed.

## Deploy to Cloudflare

The live app at `hack.marlowt.uk` is the **`hacktoberfest2`** Cloudflare Worker. Its GitHub integration automatically builds and deploys changes pushed to `main`. Check **Workers & Pages → hacktoberfest2 → Deployments** for a successful deployment of your commit before expecting interface changes to appear.

The app is a dependency-free Worker. If a manual deployment is needed, authenticate Wrangler with the Cloudflare account, then run this from the repository directory:

```sh
npx wrangler deploy
```

Changes to `worker/index.js` (including the interface and calendar setup flow) must be deployed, normally by the automatic build from `main`. The public app also reads `data/events.json` directly from `main`, so event edits are picked up after its cache refreshes even without a new Worker deployment.

`wrangler.toml` targets `hacktoberfest2`. The older `society-synth` Worker does not serve `hack.marlowt.uk`. The existing custom domains are managed in **Workers & Pages → hacktoberfest2 → Domains**.

## Project files

- `worker/index.js` — public app, event API, and iCalendar feed.
- `data/events.json` — weekly event catalogue, also served from the GitHub `main` branch.
- `wrangler.toml` — Cloudflare Worker configuration.
