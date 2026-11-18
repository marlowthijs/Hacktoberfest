# Mobile Google Calendar handoff

## Reported problem

Opening Google Calendar from iPhone Safari continued to launch its app, even with the previous long-press instructions. The app cannot add a URL subscription. Google's current help requires a computer browser for that setup: https://support.google.com/calendar/answer/37100?hl=en&co=GENIE.Platform%3DiOS

## Change

- Remove the mobile Google Calendar hyperlink, including the hidden desktop link's destination on phones. Detect iPhone, iPad desktop mode, Android, touch devices, and narrow browser windows.
- Offer a setup link that carries selected society IDs and the explicit tentative-date choice to another device. Restore only known societies, preserve existing choices for entirely invalid links, and consume the transfer parameters only after a successful catalogue load.
- Keep an optional phone-browser route with a typed address and desktop-site instructions. Clearly state that it may not work on every phone and offer the supported computer route.
- Distinguish the setup link from the subscribed calendar URL. Re-copying the calendar URL restores the correct clipboard value; blocked copying reveals a selectable manual fallback.
- Preserve normal desktop Google setup and Apple Calendar subscriptions.

## Validation

- 37 automated tests pass, including cross-device transfer, opt-in preservation, unknown IDs, load retries, clipboard denial, and absence of Google Calendar hyperlinks on mobile.
- Cloudflare deployment dry run passes with the existing database and allowed-origin bindings.
- Browser checks at 390px show the mobile instructions, setup-copy feedback, calendar recopy feedback, no Google Calendar links, no horizontal overflow, and no console errors. A 320px check caught the old fixed minimum page width overflowing beside a desktop scrollbar; removing that minimum leaves the page within the available width.
- Opening the generated setup URL at desktop size restores the choices and exposes the usual desktop Google setup after copying the feed.

These checks do not simulate installed iPhone apps or complete a subscription inside a real Google account. Safari's optional desktop-site workaround has not been verified on a physical iPhone.
