# UniFlow information refresh — 17 November 2026

This refresh checked the public SUSU society, Athletic Union and intramural directories and the profiles they link to. Testing and interface refinements finished on 18 November. This is a dated source check, not a claim that committees have personally reconfirmed every listing.

## Coverage and changes

| Measure | Result |
| --- | --- |
| Current directory entries | 378: 248 societies, 78 sports clubs, 52 intramural teams |
| Current profiles successfully read | 378 |
| Total UniFlow society records | 379, including one older unavailable profile retained for continuity |
| New societies | Gujarati Society and Habesha Basketball |
| Profiles with published membership fees and validity dates | 356 |
| Instagram links found on current SUSU profiles | 290 |
| Public email addresses found on current SUSU profiles | 351 |
| Website links found on current SUSU profiles | 115 |
| Discord or WhatsApp community links found on current profiles | 33 |
| Additional dated event entries | 190 |
| Total event records, including history | 953; all 763 existing IDs preserved |
| Upcoming published dates passing source checks as of 17 November | 216, across 19 societies/sports |
| Upcoming dates requiring confirmation | 417: 416 older listings plus one conflicting published event |

The 190 added entries include dated events earlier in November as well as future dates. They are not 190 additional future events. The calendar was checked from November 2026 through June 2027, together with extra event links on society profiles. The date counts will decrease as events pass.

Descriptions, logos, public contacts, joining information and regular schedules were refreshed where published. Previously supplied contacts absent from today's source remain available without a new verification claim. Social links were read from the public SUSU profiles; private Instagram content was not accessed. Committee names and personal committee contact sections were excluded. Wrapped tracking URLs were cleaned before storage.

## What still needs confirmation

- **Physoc Flames (Physics Netball):** its [old SUSU profile](https://www.susu.org/groups/physics-netball) no longer returns a recognisable society page and is absent from the current directories. Its existing record is retained and flagged as unavailable, rather than deleting students' saved selection.
- **Tamil Society — Variyaa X boat party:** [the published event](https://www.susu.org/event/27041/variyaa-x-tsoc-boat-party) has an inconsistent date range of more than seven days. It is marked as needing confirmation and excluded from the default subscribed calendar. No replacement date or finish time was guessed.
- **416 older upcoming entries:** these could not be matched to a currently published dated event in this check. Many were projected from recurring schedules. They remain in the data for review, but are excluded by default. A student can explicitly include tentative dates; these are labelled in both the app and calendar.
- **SUSU central events:** 71 upcoming calendar entries belonged to group 500 (SUSU), rather than a society. They were not assigned to an unrelated student society. They are listed in the machine-readable report for visibility.

Only 19 societies/sports currently have future dated events passing this source check. The remainder can still provide useful contact, membership or schedule information. This refresh does not invent events to make the directory appear more complete.

## Student experience

- Search all societies and sports by name or interest; browse six results at a time, filter by type, sort by next event or name, and reopen saved selections.
- Read joining instructions, membership fees, contact links and source-check dates without expanding every card. Quiet societies remain followed and contact-only societies appear in search.
- Review selected events by date range or search. Published dates are separated from unconfirmed schedules, with links to official event information.
- Follow a compact three-step calendar setup. Copying stays on the page; Apple subscriptions and Google's browser instructions have separate paths. Errors preserve saved choices and offer a retry.

## Validation

Automated tests cover source extraction and unsafe URLs, search and pagination, preserved selections, failed requests, calendar opt-in, stable event identity and sequence, and the secretary portal's access controls and publishing. Browser checks cover desktop, 390px and 320px layouts, source links, filters, saved choices, copying and calendar-provider switching. The Cloudflare build was checked without deployment.

No external calendar account was subscribed during testing. A desktop browser at a mobile width does not prove behaviour inside iPhone Safari; mobile navigation logic is also covered by the simulated-iPhone tests.

## Sources and repeating the refresh

- [SUSU societies](https://www.susu.org/activities/interest/societies)
- [SUSU Athletic Union clubs](https://www.susu.org/activities/interest/athletic-union)
- [SUSU intramural sports](https://www.susu.org/activities/interest/intramural-sports)
- [SUSU event calendar](https://www.susu.org/calendar)
- [Gujarati Society](https://www.susu.org/groups/gujarati-society)
- [Habesha Basketball](https://www.susu.org/groups/habesha-basketball)

Each society/event stores its own source link and check date. See `catalogue-refresh.json` alongside this report for changes and exceptions per record. The `npm run refresh:catalogue` command is documented in the README; it refreshes local files for review and does not deploy or schedule itself. Secretary-published database edits continue to take priority over the imported catalogue.
