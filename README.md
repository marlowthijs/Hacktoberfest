# Southampton Societies

Southampton Societies lists upcoming events from University of Southampton societies. Students select the societies they want to follow and download one .ics calendar file to import into Google Calendar or another calendar app.

The website is served by a Cloudflare Worker. Its static, Southampton-branded interface lives in the public folder; the Worker reads the shared event catalogue from data/events.json on the main branch and creates the downloadable calendar file.

## Update the event list

Open [data/events.json](https://github.com/marlowthijs/Hacktoberfest/edit/main/data/events.json) in GitHub and edit the societies or events arrays. Changes to the shared catalogue appear on the site after the Worker cache expires (up to five minutes).

Each society needs a stable id, a name, and a short description. Each event needs a stable id, a matching society_id, a title, start and end date-times, a timezone, a location, and a description. Use ISO 8601 date-times with the correct UK offset, and keep event IDs unchanged when editing an event.

Example event:

    {
      "id": "hacktoberfest-2026",
      "society_id": "ecss",
      "title": "Hacktoberfest",
      "start": "2026-10-24T09:45:00+01:00",
      "end": "2026-10-24T20:00:00+01:00",
      "timezone": "Europe/London",
      "location": "Building 60 West",
      "description": "Hackathon"
    }

Add a society to societies before adding its events. The updated_at field at the top of the catalogue controls the date displayed in the site footer.

## Deploy

The Wrangler configuration serves the static files from public/ and sends /api/events and /calendar.ics through the Worker. If Cloudflare Workers Builds is connected to this repository, changes pushed to main are deployed there. Keep hack.marlowt.uk attached to the society-synth Worker. If deploying manually, authenticate Wrangler and run:

    npx wrangler deploy

No Google sign-in or API keys are needed for the .ics download flow. Calendar imports are one-time snapshots; students download a fresh file when they want updated events.
