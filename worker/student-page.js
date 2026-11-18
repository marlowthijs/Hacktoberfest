import { STUDENT_SCRIPT } from './student-client.js';
import { STUDENT_STYLES } from './student-styles.js';

const SEARCH_ICON = '<svg class="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" stroke-width="1.7"></circle><path d="m13.2 13.2 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>';

export const STUDENT_PAGE = String.raw`<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#002f4c">
  <meta name="description" content="Find Southampton societies and sports, choose your favourites and follow their events in one calendar.">
  <title>uniflow | Southampton Societies</title>
  <style>${STUDENT_STYLES}</style>
</head>
<body>
  <a class="skip-link" href="#societies" data-go-step="1">Skip to societies</a>
  <header class="topbar"><div class="shell topbar-inner">
    <a class="brand" href="/" aria-label="University of Southampton uniflow home"><img class="brand-logo" src="/southampton-logo.svg" alt="University of Southampton" width="166" height="48"><span class="brand-divider" aria-hidden="true"></span><span class="brand-label">uniflow</span></a>
    <div class="header-links"><a href="/secretary">For societies</a><button class="header-calendar" id="return-calendar" data-go-step="3" hidden>Your calendar ↗</button></div>
  </div></header>
  <main class="shell">
    <nav aria-label="Calendar setup steps"><ol class="wizard-progress">
      <li id="wizard-progress-1" class="is-current"><button data-go-step="1" aria-current="step"><span class="wizard-step-number">1</span><span>Choose <small>societies</small></span></button></li>
      <li id="wizard-progress-2"><button data-go-step="2" disabled><span class="wizard-step-number">2</span><span>Review <small>events</small></span></button></li>
      <li id="wizard-progress-3"><button data-go-step="3" disabled><span class="wizard-step-number">3</span><span>Add <small>to calendar</small></span></button></li>
    </ol></nav>
    <noscript><p class="no-script">Turn on JavaScript to choose societies and create your calendar. For help, email <a href="mailto:marlow.thijs@icloud.com">marlow.thijs@icloud.com</a>.</p></noscript>
    <div id="load-error" class="load-error" role="status" hidden><span id="load-error-text"></span><button id="retry-load" class="text-action">Try again</button></div>
    <section class="wizard-page" id="societies" data-wizard-page="1" aria-labelledby="societies-title">
      <div class="section-heading"><div><h1 id="societies-title" tabindex="-1">Find your societies</h1><p>Pick your favourites. Keep their events in one calendar.</p></div><span class="selection-count" id="selection-count">0 selected</span></div>
      <div class="discovery-toolbar">
        <div class="search-field">${SEARCH_ICON}<label class="sr-only" for="society-search">Search societies by name or interest</label><input id="society-search" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search societies or sports"><button id="clear-search" class="search-clear" aria-label="Clear society search" hidden>×</button></div>
        <div class="filter-chips" aria-label="Filter societies"><button data-kind="all" aria-pressed="true">All</button><button data-kind="society" aria-pressed="false">Societies</button><button data-kind="sport" aria-pressed="false">Sports</button><button id="selected-only" aria-pressed="false">My selection</button></div>
      </div>
      <div class="results-toolbar"><div class="result-meta"><span id="society-result-count" role="status" aria-live="polite">Loading societies…</span><p class="freshness-note" id="catalogue-freshness">Checking the catalogue…</p></div><label class="sort-label" for="society-sort"><span>Sort</span><select id="society-sort" aria-label="Sort societies"><option value="next">Next event</option><option value="name">A–Z</option></select></label></div>
      <details id="selected-tray" class="selected-tray" hidden><summary id="selected-summary">Your selection</summary><div id="selected-chips"></div></details>
      <div class="society-grid" id="society-grid" aria-busy="true"><div class="empty-state">Gathering the society list…</div></div>
      <div class="list-actions" id="society-actions" hidden><button class="expand-button" id="society-toggle" aria-controls="society-grid">Show 6 more</button></div>
      <p class="catalogue-contact">Looking for a quieter society? Search to see every group, including those without published dates. <a href="mailto:marlow.thijs@icloud.com?subject=Add%20my%20society%20to%20UniFlow">Missing a society?</a></p>
    </section>
    <section class="wizard-page" id="events" data-wizard-page="2" hidden aria-labelledby="events-title">
      <div class="section-heading"><div><h1 id="events-title" tabindex="-1">Your upcoming events</h1><p id="event-intro">A quick look at what’s coming up.</p></div><span class="selection-count" id="event-count"></span></div>
      <div class="event-toolbar"><div class="search-field">${SEARCH_ICON}<label class="sr-only" for="event-search">Search events by title, society, place or date</label><input id="event-search" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search your events"><button id="clear-event-search" class="search-clear" aria-label="Clear event search" hidden>×</button></div><label class="sort-label" for="event-range"><span>Dates</span><select id="event-range"><option value="7">Next 7 days</option><option value="30" selected>Next 30 days</option><option value="all">All upcoming</option></select></label><span class="result-meta" id="event-result-count" role="status" aria-live="polite"></span></div>
      <p class="event-preview-note">This is a preview. Your calendar includes all published dates and future updates.</p>
      <details id="unconfirmed-option" class="unconfirmed-option" hidden><summary>Dates that need confirmation</summary><p id="unconfirmed-count"></p><label><input id="include-unconfirmed" type="checkbox">Include these unconfirmed dates in my calendar</label><p>They will be labelled tentative. Check times and venues with the society before going.</p></details>
      <div class="event-list" id="event-list"></div>
      <div class="list-actions" id="event-actions" hidden><button class="expand-button" id="event-toggle" aria-controls="event-list">Show 6 more</button></div>
    </section>
    <section class="wizard-page" id="calendar" data-wizard-page="3" hidden aria-labelledby="calendar-title">
      <div class="calendar-back"><button class="text-action" id="back-to-events">← Back to events</button></div>
      <div class="section-heading"><div><h1 id="calendar-title" tabindex="-1">Make it your calendar</h1><p>Add it once. New society events will appear as your calendar refreshes.</p></div></div>
      <div class="calendar-preferences"><label class="sort-label" for="calendar-provider"><span>My calendar</span><select id="calendar-provider"><option value="google">Google Calendar</option><option value="apple">Apple Calendar</option><option value="other">Another calendar app</option></select></label><details class="calendar-selection"><summary id="calendar-selection-count"></summary><p id="calendar-selection-summary"></p></details></div>
      <p id="selection-change-note" class="selection-change-note" hidden>You copied a different selection before. If you already subscribed, replace that subscription with this new link.</p>
      <p id="feed-warning" class="feed-warning" hidden>This link includes tentative dates. Check with the society before going.</p>
      <div class="sync-card">
        <div class="sync-copy"><h2 id="feed-heading">1. Copy your calendar link</h2><p>No sign-up. No access to your personal calendar.</p><div class="feed-status" id="feed-status" role="status" aria-live="polite"></div>
          <label class="feed-box" for="feed-url"><span class="feed-label">Your calendar link</span><input class="feed-url" id="feed-url" readonly aria-label="Your calendar feed link" placeholder="Choose a society to create your link"></label>
          <button class="button calendar-action" id="copy-feed" disabled>Copy calendar link</button><p class="copy-guidance" id="copy-guidance" role="status" aria-live="polite"></p>
          <p class="feed-foot">The link contains public society events only. Your choices stay saved on this device.</p>
        </div>
        <div class="calendar-next" id="calendar-next">
          <div id="calendar-waiting"><h2>2. Add it to your calendar</h2><p>Copy your link first, then we’ll show you exactly where to paste it.</p><button class="calendar-confirm-copy" id="manual-copy-done">I’ve copied it manually →</button></div>
          <div id="desktop-calendar-steps" hidden><h2>2. Add it to Google Calendar</h2><ol class="steps"><li><strong>Open “From URL”</strong>The button below opens the right settings page.</li><li><strong>Paste your link</strong>Select “Add calendar” to subscribe.</li></ol><a class="calendar-open" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer">Open Google Calendar ↗</a><p>Your society calendar will appear under “Other calendars”. Google chooses when to refresh new events.</p></div>
          <div id="mobile-calendar-steps" hidden><h2 id="mobile-finish-title">Finish in your browser</h2><p id="mobile-calendar-note">The Google Calendar app cannot add a calendar by URL. Use its desktop website for this one-time setup.</p><ol class="steps"><li><strong>Open the website in a new tab</strong>Press and hold this link, then choose “Open in New Tab”.<a class="mobile-google-link" id="mobile-google-link" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer" aria-describedby="mobile-browser-guidance">Google Calendar website ↗</a></li><li><strong id="desktop-site-title">Request Desktop Website</strong><span id="desktop-site-guidance"></span></li><li><strong>Paste your link</strong>Choose Settings → Add calendar → From URL, then “Add calendar”.</li></ol><p id="mobile-browser-guidance" role="status"></p><details class="mobile-calendar-help"><summary>Still opening the app?</summary><p>Type <strong>calendar.google.com</strong> into your browser, then request its desktop website. Use the same Google account as the app.</p><p>If “From URL” is unavailable on your phone, finish this one-time setup on a computer. The calendar can then appear in the Google Calendar app.</p></details></div>
          <div id="apple-calendar-steps" hidden><h2>Subscribe in Apple Calendar</h2><p>Open the link below, then confirm the subscription in Calendar.</p><a class="calendar-open" id="apple-subscribe" href="#" aria-disabled="true">Open in Apple Calendar ↗</a><details class="mobile-calendar-help"><summary>Prefer to paste the link?</summary><p>Copy your link, then open Calendar → Calendars → Add Calendar → Add Subscription Calendar and paste it there.</p></details></div>
          <div id="other-calendar-steps" hidden><h2>2. Subscribe using your link</h2><p>In your calendar’s settings, look for “Subscribe from URL”, “From web” or “Add subscription calendar”. Paste the copied link and confirm.</p><p>Choose a subscription to receive future updates. Importing a file is a one-time copy.</p></div>
        </div>
      </div>
      <details class="calendar-extras"><summary>Prefer a one-time download?</summary><p>An imported file will not receive new events or later changes.</p><a class="snapshot-link" id="download-feed" href="#" aria-disabled="true">Download .ics file</a></details>
    </section>
    <footer class="footer"><div class="footer-left">Student-run for Southampton. Not an official University service.<br><span id="updated-label"></span></div><div class="footer-right"><a href="mailto:marlow.thijs@icloud.com?subject=UniFlow%20feedback">Feedback: marlow.thijs@icloud.com</a><a href="/secretary">Society portal</a></div></footer>
  </main>
  <aside class="journey-bar" id="journey-bar" aria-label="Next step" hidden><div class="shell journey-inner"><button class="button bar-back" id="back-to-societies" hidden>← Societies</button><div class="journey-summary"><strong id="selection-next-title"></strong><span id="selection-next-detail"></span></div><button class="button button-primary" id="continue-review" disabled>Review events →</button><button class="button button-primary" id="continue-calendar" hidden disabled>Add to calendar →</button></div></aside>
  <div class="undo-message" id="undo-message" hidden><span id="undo-text" role="status"></span><button id="undo-remove">Undo</button></div>
  <div class="sr-only" id="announcement" role="status" aria-live="polite"></div>
  <script>${STUDENT_SCRIPT}</script>
</body>
</html>`;
