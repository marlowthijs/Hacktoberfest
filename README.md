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

Selections stay in the student's browser. The generated feed URL contains only the selected society IDs and public event listings. Anyone who has that URL can view the corresponding feed.

## Deploy to Cloudflare

The app is a dependency-free Cloudflare Worker. From this directory, authenticate Wrangler with the Cloudflare account, then run:

```sh
npx wrangler deploy
```

Wrangler publishes to the Worker URL. To use a Cloudflare domain, attach the deployed Worker to a domain in **Workers & Pages → Settings → Domains & Routes**. The domain's zone must be available in the Cloudflare account.

## Project files

- `worker/index.js` — public app, event API, and iCalendar feed.
- `data/events.json` — weekly event catalogue, also served from the GitHub `main` branch.
- `wrangler.toml` — Cloudflare Worker configuration.
