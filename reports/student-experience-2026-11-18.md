# Student experience refinements — 18 November 2026

## Changes

- Removed the repeated introduction and duplicate navigation so society choices appear sooner.
- Made society and event cards more compact, moved Follow controls to the top, and kept longer information behind disclosures.
- Kept the next action visible in a bottom bar, with space reserved underneath the page and support for phone safe areas and the on-screen keyboard.
- Made all three progress steps navigable. Browser Back and Forward preserve the search, choices and each step's scroll position.
- Added undo for a removed society, a compact selection manager and a returning-user calendar shortcut.
- Preserved expanded details when loading more results or refreshing the catalogue. Indexed societies/events and reused date formatters; returning to the tab within a minute does not download the catalogue again.
- Split calendar choices into Google, Apple and other apps. Copying reveals the next instructions and moves them into view on narrow screens. A manual path is available if clipboard access fails. Apple subscriptions can be opened directly.
- Saved calendar preferences and explained when changed society choices require replacing an older calendar subscription link.

## Verification

- All 31 automated tests passed, including secretary-portal regression tests and seven new student-journey tests.
- Cloudflare dry-run build passed; no deployment was performed.
- Browser checks covered desktop, 768px tablet, 390px phone and 320px narrow-phone layouts, with no horizontal overflow in the inspected views.
- Exercised following, removing and undoing a choice; searching; event review; browser Back; calendar copying; revealing the next instructions; and retaining the chosen calendar app across reload.
- Tested clipboard denial and manual recovery, unchanged/changed background refreshes, scroll restoration, mobile keyboard behaviour and iPhone-specific navigation in DOM integration tests.

Responsive browser checks and a simulated iPhone user agent do not replace testing on a physical iPhone. No external calendar was subscribed during verification. The catalogue and production database were unchanged by this interface update.
