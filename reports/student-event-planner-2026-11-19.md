# Student event discovery and plans — 19 November 2026

Review branch: `codex/student-event-planner`, based on main at `22cd8a4`.

## Student benefit

Students previously had to follow a society before seeing its events. They can now use **Explore what's on** to find something to attend first, then decide whether to follow the society.

- Browse all events, followed societies or a saved plan. Search and filter by Southampton local dates and societies/sports; reveal six results at a time.
- Save individual events without following an entire society. A bottom shortcut keeps the saved plan reachable on a phone.
- See booking information, joining instructions and public society contacts within each event. Follow the society directly from those details.
- See overlaps between confirmed upcoming events in the plan. Cancelled, finished, unavailable and unconfirmed saved dates remain distinguishable.
- Download a single event or all eligible upcoming saved events as a one-time calendar file. A society subscription remains a separate route for automatic updates.

## Verification

- 57 automated tests pass, including eight new student/endpoint tests for date boundaries, overnight events, British Summer Time, midnight refreshes, saved-plan recovery, overlap detection, unavailable or cancelled events, blocked local storage, safe rendering and calendar downloads. The existing leader and mobile Google Calendar regression checks also pass.
- The Cloudflare Worker dry-run bundle passes without deploying.
- Local Chrome checks with the real bundled catalogue exercised discovery, saving two weekend events, reloading and downloading exactly those two events. No JavaScript page errors were reported.
- Checked desktop, tablet and phone widths (1280, 768, 390 and 320). The inspected discovery and plan views did not overflow horizontally. These are browser viewport checks, not physical iPhone/Safari tests.
- `git diff --check` passes. No production records or source catalogue entries were edited during testing.

## Boundaries

Plans are stored in the current browser, with a maximum of 200 events. They are not a cross-device account or a timetable integration. Calendar downloads are snapshots; students must check UniFlow for later changes. Unconfirmed events enter downloads only with explicit opt-in. There are no new application dependencies or database migrations.

The improvements are on a review branch and have not been merged into main or deployed. The local preview is `http://127.0.0.1:8787/#events` while the development server is running.
