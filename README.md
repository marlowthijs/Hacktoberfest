# Society Synth

Society Synth is a laptop-only society events board. Select the societies you follow, manage the weekly event list, and download an ICS file to import into Google Calendar.

## Run locally

From the repository folder, run:

    python3 -m http.server 8765 --bind 127.0.0.1

Open [http://127.0.0.1:8765](http://127.0.0.1:8765). Stop the server with Control-C.

Python 3 is the only requirement. There is no build step, Node.js install, Cloudflare account, or Google OAuth setup.

## Use the app

- Select societies on the main page. Picks are stored in this browser.
- Open **Team admin** to add societies and enter, edit, publish, or cancel events.
- Use **Export backup** to save event data and society picks. **Import backup** restores it in this browser.
- Download an ICS file for selected societies. In Google Calendar, choose **Settings → Import & export → Import**, select the file, and choose a calendar.

The starting catalogue is in **data/events.json** and includes the ECSS Hacktoberfest example. Browser edits are saved locally and take precedence over the starter file. Use **Restore starter data** to clear local edits and load the file again.

## Calendar behavior

This local version exports one-time calendar files. It does not sign in to Google, directly edit the primary calendar, or sync in the background. To avoid duplicates, remove an older imported copy before importing a replacement.

## Source files

- **index.html**, **app.js**, and **styles.css** — local app
- **data/events.json** — starter event catalogue
- The old Worker files are retained for reference and are not required to run the local app.

