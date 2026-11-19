import { STUDENT_PLANNER } from './student-planner.js';

export const STUDENT_SCRIPT = String.raw`(() => {
'use strict';
const $ = id => document.getElementById(id);
const KEY = 'society-synth:selected-societies:v1';
const PREFS_KEY = 'uniflow:calendar-preferences:v1';
const setupParams = new URLSearchParams(location.search);
function stored(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
const saved = stored(KEY, []), prefs = stored(PREFS_KEY, {});
let selected = new Set(Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : []);
let catalogue = { societies: [], events: [] }, societyMap = new Map(), eventMap = new Map(), searchMap = new Map();
let societyLimit = 6, eventLimit = 6, kind = 'all', onlySelected = false, activeStep = 1;
let includeUnconfirmed = prefs?.includeUnconfirmed === true, copiedFeed = '', failedCopyFeed = '', copying = false;
let copiedSetup = '', failedSetup = '', copyingSetup = false, clipboardKind = '';
let loading = false, loaded = false, lastPayload = '', lastLiveIds = '', lastFetchAt = 0, lastRemoved = null, undoTimer;
let lastCopiedSelection = typeof prefs?.lastCopiedSelection === 'string' ? prefs.lastCopiedSelection : '';
const scrollPositions = new Map(), formatters = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const norm = value => String(value || '').toLocaleLowerCase('en-GB').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function save() { try { localStorage.setItem(KEY, JSON.stringify([...selected])); } catch {} }
function savePreferences() { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ provider: $('calendar-provider').value, includeUnconfirmed, lastCopiedSelection })); } catch {} }
function url(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; } }
function anchor(label, value) { const href = url(value); return href ? '<a target="_blank" rel="noopener noreferrer" href="' + esc(href) + '">' + esc(label) + ' <span aria-hidden="true">↗</span></a>' : ''; }
function fmt(value, options) {
  const key = JSON.stringify(options);
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', ...options }));
  return formatters.get(key).format(new Date(value));
}
const differentYear = value => fmt(value, { year: 'numeric' }) !== fmt(Date.now(), { year: 'numeric' });
const date = value => fmt(value, { day: 'numeric', month: 'short', ...(differentYear(value) ? { year: 'numeric' } : {}) });
const time = value => fmt(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const upcoming = e => e.status !== 'cancelled' && Date.parse(e.end) >= Date.now();
const uncertain = e => e.verification_status === 'needs_confirmation';
const societyFor = id => societyMap.get(id);
const eventsFor = (id, all = false) => (eventMap.get(id) || []).filter(e => upcoming(e) && (all || includeUnconfirmed || !uncertain(e)));
function indexCatalogue() {
  societyMap = new Map(catalogue.societies.map(s => [s.id, s]));
  searchMap = new Map(catalogue.societies.map(s => [s.id, norm([s.name, s.id, s.description, s.regular_schedule, s.instagram_url, s.susu_url].join(' '))]));
  eventMap = new Map();
  for (const e of [...catalogue.events].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))) {
    if (!eventMap.has(e.society_id)) eventMap.set(e.society_id, []);
    eventMap.get(e.society_id).push(e);
  }
}
function sourceNote(s) {
  if (s.portal_updated_at) return 'Society updated ' + date(s.portal_updated_at) + (s.source_checked_at ? '; SUSU profile checked ' + date(s.source_checked_at) : '');
  if (s.source_status === 'unavailable') return 'Source currently unavailable';
  if (s.directory_status === 'not_listed') return 'Not in the latest SUSU directory';
  return s.source_checked_at ? 'SUSU checked ' + date(s.source_checked_at) : 'Source check pending';
}
function contacts(s) {
  const links = [anchor('SUSU profile', s.susu_url), anchor('Instagram', s.instagram_url), anchor('Group chat', s.community_url), anchor('Website', s.website_url)];
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s.contact_email || '')) links.push('<a href="mailto:' + esc(s.contact_email) + '">Email</a>');
  return links.filter(Boolean).join('');
}
function score(s, q) { const name = norm(s.name), id = norm(s.id); return name === q || id === q ? 0 : name.startsWith(q) || id.startsWith(q) ? 1 : name.includes(q) || id.includes(q) ? 2 : 3; }
function rememberOpen(container) { return new Set([...container.querySelectorAll('details[open][data-detail]')].map(el => el.dataset.detail)); }
function renderSocieties() {
  const grid = $('society-grid'), open = rememberOpen(grid), focused = document.activeElement?.id;
  const q = norm($('society-search').value).trim(), tokens = q.split(/\s+/).filter(Boolean);
  const matches = catalogue.societies.filter(s => {
    if (kind !== 'all' && (s.category === 'sport' ? 'sport' : 'society') !== kind) return false;
    if (onlySelected && !selected.has(s.id)) return false;
    if (!q && !onlySelected && !eventsFor(s.id, true).length) return false;
    return tokens.every(t => searchMap.get(s.id).includes(t));
  });
  matches.sort((a, b) => q ? score(a, q) - score(b, q) || a.name.localeCompare(b.name) : $('society-sort').value === 'name' ? a.name.localeCompare(b.name) : (Date.parse(eventsFor(a.id)[0]?.start) || Infinity) - (Date.parse(eventsFor(b.id)[0]?.start) || Infinity) || a.name.localeCompare(b.name));
  const visible = matches.slice(0, societyLimit);
  $('society-result-count').textContent = matches.length ? visible.length + ' of ' + matches.length + (q ? ' matches' : ' with event information') : 'No matches';
  if (onlySelected && !q) $('society-result-count').textContent = visible.length + ' of ' + matches.length + ' selected';
  $('society-actions').hidden = matches.length <= societyLimit;
  $('society-toggle').textContent = 'Show ' + Math.min(6, Math.max(0, matches.length - societyLimit)) + ' more';
  $('clear-search').hidden = !q;
  grid.innerHTML = visible.map(s => {
    const list = eventsFor(s.id), all = eventsFor(s.id, true), next = list[0], chosen = selected.has(s.id);
    const logo = url(s.logo_url), initials = s.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3), checkId = 'follow-' + s.id;
    const details = '<details class="society-involvement" data-detail="' + esc(s.id) + '" ' + (open.has(s.id) ? 'open' : '') + '><summary id="details-' + esc(s.id) + '">About & how to join</summary><p>' + esc(s.description || 'Visit the official profile for society information.') + '</p>' +
      (s.how_to_join ? '<h4>How to get involved</h4><p>' + esc(s.how_to_join) + '</p>' : '') +
      (s.regular_schedule ? '<h4>Regular activities</h4><p>' + esc(s.regular_schedule) + '</p><p class="source-note">A published schedule is not confirmation of every date. Check with the society before going.</p>' : '') +
      (s.memberships?.length ? '<h4>Membership on SUSU</h4><ul class="membership-list">' + s.memberships.slice(0, 3).map(m => '<li>' + esc(m.name) + ' · <strong>' + esc(m.cost) + '</strong><small>' + esc(m.valid_period) + '</small></li>').join('') + '</ul>' : '') +
      anchor('Membership / joining page', s.membership_url) + '<div class="society-links">' + contacts(s) + '</div><p class="source-note">' + esc(sourceNote(s)) + '. ' +
      (['instagram_url', 'website_url', 'community_url', 'contact_email'].some(f => s[f] && !s.contact_sources?.[f] && !s.portal_fields?.includes(f)) ? 'Some previously supplied contact links have not been rechecked.' : '') + '</p><a class="report-link" href="mailto:marlow.thijs@icloud.com?subject=' + encodeURIComponent('UniFlow correction: ' + s.name) + '">Report an update</a></details>';
    return '<article class="society-card' + (chosen ? ' is-selected' : '') + '" data-card="' + esc(s.id) + '" tabindex="-1"><div class="society-top"><div class="society-monogram' + (logo ? ' has-logo' : '') + '">' +
      (logo ? '<img class="society-logo" src="' + esc(logo) + '" alt="" width="40" height="40" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '<span ' + (logo ? 'hidden' : '') + '>' + esc(initials) + '</span></div>' +
      '<label class="society-check"><input id="' + esc(checkId) + '" type="checkbox" data-society="' + esc(s.id) + '" aria-label="Follow ' + esc(s.name) + '" ' + (chosen ? 'checked' : '') + '><span>' + (chosen ? 'Following' : 'Follow') + '</span></label></div><h3><label for="' + esc(checkId) + '">' + esc(s.name) + '</label></h3><span class="society-type">' + (s.category === 'sport' ? 'Sport' : 'Society') + '</span>' +
      '<p class="society-description">' + esc(s.description || 'Find out how to join on the official profile.') + '</p><div class="next-event">' + (next ? '<span>Next · ' + date(next.start) + ' · ' + time(next.start) + '</span><strong>' + esc(next.title) + '</strong>' : all.length ? '<span class="unconfirmed">Dates need confirmation</span>' : '<span>Follow now for future events</span>') + '</div>' +
      '<span class="society-events">' + list.length + ' upcoming ' + (list.length === 1 ? 'event' : 'events') + '</span>' + details + '</article>';
  }).join('') || '<div class="empty-state"><strong>' + (onlySelected ? 'No selected societies match.' : q ? 'No societies match that search.' : 'No event listings match these filters.') + '</strong><p>' + (q ? 'Try a shorter name, or reset your filters to search every society.' : 'Search by name to find every society, including those without published dates.') + '</p><button class="button button-secondary" data-reset-search>Reset filters</button></div>';
  grid.querySelectorAll('.society-logo').forEach(img => { const fallback = () => { img.hidden = true; img.nextElementSibling.hidden = false; }; img.addEventListener('error', fallback, { once: true }); if (img.complete && !img.naturalWidth) fallback(); });
  document.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  $('selected-only').setAttribute('aria-pressed', String(onlySelected));
  if (focused && (focused.startsWith('follow-') || focused.startsWith('details-'))) $(focused)?.focus({ preventScroll: true });
}
function selectedEvents() { return [...selected].flatMap(id => eventsFor(id)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)); }
${STUDENT_PLANNER}
function updateNavigation() {
  document.querySelectorAll('[data-go-step]').forEach(el => {
    if (el.tagName === 'BUTTON' && Number(el.dataset.goStep) > 1) el.disabled = !loaded || (Number(el.dataset.goStep) === 3 && !selected.size);
    if (el.closest('.wizard-progress')) Number(el.dataset.goStep) === activeStep ? el.setAttribute('aria-current', 'step') : el.removeAttribute('aria-current');
  });
  $('return-calendar').hidden = !selected.size || activeStep === 3;
  const planShortcut = activeStep === 2 && eventScope !== 'plan' && planned.size > 0;
  const showBar = loaded && (selected.size > 0 || planShortcut) && activeStep < 3 && !(activeStep === 2 && eventScope === 'plan');
  $('journey-bar').hidden = !showBar;
  $('journey-bar').dataset.step = String(activeStep);
  document.body.classList.toggle('has-journey-bar', showBar);
  $('continue-review').hidden = activeStep !== 1;
  $('continue-calendar').hidden = activeStep !== 2 || planShortcut;
  $('view-event-plan').hidden = !planShortcut;
  if (planShortcut) { $('selection-next-title').textContent = planned.size + ' saved ' + (planned.size === 1 ? 'event' : 'events'); $('selection-next-detail').textContent = planStorageFailed ? 'Saved for this visit' : 'Your plan stays on this device'; }
  else { const count = selectedEvents().length; $('selection-next-title').textContent = selected.size + ' ' + (selected.size === 1 ? 'society' : 'societies') + ' selected'; $('selection-next-detail').textContent = count ? count + ' upcoming ' + (count === 1 ? 'event' : 'events') : 'Ready for future events'; }
  $('back-to-societies').hidden = activeStep !== 2;
}
function renderSelections() {
  $('selection-count').textContent = selected.size + ' selected';
  $('selected-tray').hidden = !selected.size;
  $('selected-summary').textContent = selected.size + ' selected · view or edit';
  $('selected-chips').innerHTML = [...selected].map(id => '<button class="selection-chip" data-remove="' + esc(id) + '" aria-label="Remove ' + esc(societyFor(id)?.name) + '">' + esc(societyFor(id)?.name) + ' <span aria-hidden="true">×</span></button>').join('');
  $('continue-review').disabled = !selected.size;
  $('continue-calendar').disabled = !selected.size;
  updateNavigation();
}
function isAppleMobile() { return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function isMobile() { return isAppleMobile() || /Android/i.test(navigator.userAgent) || !!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 640; }
function signature() { return [...selected].sort().join(',') + (includeUnconfirmed ? ':tentative' : ''); }
function renderFeed() {
  const mobile = isMobile(), provider = $('calendar-provider').value, google = provider === 'google', apple = provider === 'apple';
  const u = new URL('/calendar.ics', location.origin); u.searchParams.set('societies', [...selected].sort().join(','));
  if (includeUnconfirmed) u.searchParams.set('include_unconfirmed', '1');
  const link = selected.size ? u.href : '', copied = Boolean(link && copiedFeed === link), failed = Boolean(link && failedCopyFeed === link);
  const setup = new URL('/', location.origin); setup.searchParams.set('follow', [...selected].sort().join(','));
  if (includeUnconfirmed) setup.searchParams.set('tentative', '1');
  setup.hash = 'calendar';
  const setupLink = selected.size ? setup.href : '', setupCopied = Boolean(setupLink && copiedSetup === setupLink), setupFailed = Boolean(setupLink && failedSetup === setupLink);
  $('setup-url').value = setupLink;
  $('copy-setup-link').disabled = !setupLink || copyingSetup || copying;
  $('copy-setup-link').textContent = copyingSetup ? 'Copying…' : setupCopied && clipboardKind === 'setup' ? 'Setup link copied ✓' : 'Copy setup link';
  $('setup-copy-status').textContent = setupFailed ? 'Copying was blocked. Select and copy the setup link below, then send it to yourself.' : setupCopied ? 'Open this setup link on your computer. Your society choices will be ready there; you haven’t subscribed yet.' : 'This opens UniFlow with your choices, ready to finish in the same Google account you use on your phone.';
  $('setup-link-manual').hidden = !setupFailed;
  $('feed-url').value = link;
  $('copy-feed').disabled = $('recopy-feed').disabled = !link || copying || copyingSetup;
  $('copy-feed').textContent = copying ? 'Copying…' : copied && clipboardKind === 'feed' ? 'Copied ✓ — copy again' : 'Copy calendar link';
  $('recopy-feed').textContent = copying ? 'Copying…' : copied && clipboardKind === 'feed' ? 'Calendar link copied ✓' : 'Copy calendar link';
  $('browser-copy-status').textContent = failed ? 'Copying was blocked. Copy your calendar link from the field above.' : copied && clipboardKind === 'feed' ? 'Now open a new browser tab. Keep this calendar link copied for the final step.' : 'Copy the calendar link here before switching tabs. The setup link is only for continuing on a computer.';
  $('feed-status').textContent = copied ? 'Copied. Your next step is ready.' : selected.size + ' ' + (selected.size === 1 ? 'society' : 'societies') + ' · ' + selectedEvents().length + ' upcoming events';
  $('feed-status').classList.toggle('is-copied', copied);
  $('copy-guidance').textContent = failed ? 'Tap the link to select it, then copy it manually.' : clipboardKind === 'setup' && setupCopied ? 'Your setup link is copied. Copy the calendar link again before pasting into Google Calendar.' : copied ? 'Next, finish adding your calendar subscription.' : apple ? 'Or open Apple Calendar directly using the subscribe button.' : 'Copy first, then add it to your calendar.';
  $('feed-heading').textContent = apple ? 'Your society calendar' : '1. Copy your calendar link';
  $('calendar-waiting').hidden = copied || apple;
  $('desktop-calendar-steps').hidden = !copied || mobile || !google;
  $('mobile-calendar-steps').hidden = !copied || !mobile || !google;
  $('apple-calendar-steps').hidden = !apple;
  $('other-calendar-steps').hidden = !copied || provider !== 'other';
  $('calendar-next').classList.toggle('is-ready', copied || apple);
  if (mobile) $('desktop-google-link').removeAttribute('href');
  else $('desktop-google-link').href = 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';
  $('mobile-browser-title').textContent = isAppleMobile() ? 'Try Safari on this iPhone or iPad instead' : 'Try this phone’s browser instead';
  $('mobile-address-title').textContent = isAppleMobile() ? 'Type the address in a new Safari tab' : 'Type the address in a new browser tab';
  $('desktop-site-title').textContent = isAppleMobile() ? 'Request Desktop Website' : 'Turn on Desktop site';
  $('desktop-site-guidance').textContent = isAppleMobile() ? 'In Safari’s Page menu beside the address bar, choose “Request Desktop Website”. Sign in to the same Google account as the app.' : 'In your browser menu, turn on “Desktop site”. Sign in to the same Google account as the app.';
  $('download-feed').href = link ? link + '&download=1' : '#';
  $('download-feed').setAttribute('aria-disabled', String(!link));
  $('apple-subscribe').href = link ? link.replace(/^https?:/, 'webcal:') : '#';
  $('apple-subscribe').setAttribute('aria-disabled', String(!link));
  $('feed-warning').hidden = !includeUnconfirmed;
  $('selection-change-note').hidden = !lastCopiedSelection || lastCopiedSelection === signature();
  $('calendar-selection-count').textContent = selected.size + ' selected ' + (selected.size === 1 ? 'society' : 'societies') + ' · view selection';
  $('calendar-selection-summary').textContent = [...selected].map(id => societyFor(id)?.name).join(', ');
}
function render() { renderSocieties(); renderEvents(); renderSelections(); renderFeed(); }
function showStep(step, push = true, initial = false) {
  if (step < 1 || step > 3) return;
  if (step > 1 && (!loaded || (step === 3 && !selected.size))) { step = 1; $('announcement').textContent = 'Choose at least one society before continuing.'; }
  if (activeStep !== step) scrollPositions.set(activeStep, window.scrollY || 0);
  const changed = activeStep !== step; activeStep = step;
  document.querySelectorAll('[data-wizard-page]').forEach(page => page.hidden = Number(page.dataset.wizardPage) !== step);
  [1, 2, 3].forEach(n => { const el = $('wizard-progress-' + n); el.classList.toggle('is-current', n === step); el.classList.toggle('is-complete', n < step); });
  const hash = '#' + ['societies', 'events', 'calendar'][step - 1];
  if (push && location.hash !== hash) window.history.pushState({ uniflowStep: step }, '', hash);
  else if (initial || (!selected.size && location.hash !== hash)) window.history.replaceState({ uniflowStep: step }, '', hash);
  updateNavigation();
  if (changed && !initial) {
    document.querySelector('[data-wizard-page="' + step + '"] h1')?.focus({ preventScroll: true });
    window.scrollTo({ top: scrollPositions.get(step) || 0, behavior: 'auto' });
  }
  if (step === 3) hideUndo();
}
function updateFreshness(data) {
  const checked = data.refresh?.checked_at || data.updated_at, valid = Number.isFinite(Date.parse(checked));
  const stale = valid && Date.now() - Date.parse(checked) > 7 * 86400000;
  $('updated-label').textContent = valid ? 'Catalogue checked ' + date(checked) + '.' : '';
  $('catalogue-freshness').textContent = (valid ? (stale ? 'Last checked ' : 'Checked ') + date(checked) : 'Source dates in details') + ' · ' + data.societies.length + ' in directory';
  $('catalogue-freshness').title = stale ? 'Sources may have changed. Check official details before travelling.' : 'Published dates and unconfirmed schedules are labelled separately.';
}
async function load() {
  if (loading) return; loading = true; $('retry-load').disabled = true; $('society-grid').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/events', { cache: 'no-store' }); if (!response.ok) throw new Error('Catalogue unavailable');
    const data = await response.json(); if (!Array.isArray(data.societies) || !Array.isArray(data.events)) throw new Error('Invalid catalogue');
    const payload = JSON.stringify(data), liveIds = londonDay(Date.now()) + ':' + data.events.filter(upcoming).map(e => e.id).join(',');
    updateFreshness(data); $('load-error').hidden = true; lastFetchAt = Date.now();
    // A focus refresh must not collapse details or interrupt an unchanged page.
    if (loaded && payload === lastPayload && liveIds === lastLiveIds) return;
    catalogue = data; lastPayload = payload; lastLiveIds = liveIds; indexCatalogue();
    let invalidSetup = false;
    if (!loaded && setupParams.has('follow')) {
      const requested = [...new Set(setupParams.get('follow').split(',').filter(Boolean))];
      const valid = requested.filter(id => societyFor(id)); invalidSetup = !valid.length;
      $('setup-notice').hidden = false;
      if (valid.length) {
        selected = new Set(valid); includeUnconfirmed = setupParams.get('tentative') === '1';
        $('include-unconfirmed').checked = includeUnconfirmed; $('calendar-provider').value = 'google'; savePreferences();
        $('setup-notice').textContent = valid.length === requested.length ? 'Your society choices are ready. Copy your calendar link below to finish adding it.' : 'Your available societies are ready. Some groups in this setup link are no longer listed; review your selection before adding it.';
      } else $('setup-notice').textContent = 'This setup link has no available societies. Your saved choices are still here; choose your societies to continue.';
      const clean = new URL(location.href); clean.searchParams.delete('follow'); clean.searchParams.delete('tentative');
      history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
    }
    selected = new Set([...selected].filter(id => societyFor(id))); save();
    const firstLoad = !loaded; loaded = true; if (firstLoad) eventScope = selected.size ? 'following' : 'all'; render();
    if (firstLoad) showStep(invalidSetup ? 1 : Math.max(1, ['#societies', '#events', '#calendar'].indexOf(location.hash) + 1), false, true);
    else if (!selected.size && activeStep === 3) showStep(1, false);
  } catch {
    $('load-error').hidden = false;
    $('load-error-text').textContent = loaded ? 'Could not refresh. Your choices and the last loaded listings are still here.' : 'We couldn’t load the societies. Your saved choices are safe. Try again.';
    if (!loaded) { $('society-result-count').textContent = 'Catalogue unavailable'; $('society-grid').innerHTML = ''; }
  } finally { loading = false; $('retry-load').disabled = false; $('society-grid').setAttribute('aria-busy', 'false'); }
}
function hideUndo() { clearTimeout(undoTimer); $('undo-message').hidden = true; }
function scheduleUndoHide() { undoTimer = setTimeout(() => { if ($('undo-message').contains(document.activeElement)) scheduleUndoHide(); else hideUndo(); }, 8000); }
function changeSelection(id, chosen, check) {
  if (!societyFor(id)) return;
  $('setup-notice').hidden = true;
  if (chosen) selected.add(id);
  else { lastRemoved = { id, index: [...selected].indexOf(id) }; selected.delete(id); hideUndo(); $('undo-text').textContent = societyFor(id).name + ' removed'; $('undo-message').hidden = false; scheduleUndoHide(); }
  save();
  if (check && !(onlySelected && !chosen)) { check.closest('.society-card').classList.toggle('is-selected', chosen); check.nextElementSibling.textContent = chosen ? 'Following' : 'Follow'; }
  else renderSocieties();
  renderEvents(); renderSelections(); renderFeed();
  if (onlySelected && !chosen) $('selected-only').focus({ preventScroll: true });
  $('announcement').textContent = societyFor(id).name + (chosen ? ' followed.' : ' removed. Undo is available.');
}
$('society-grid').addEventListener('change', e => { const check = e.target.closest('[data-society]'); if (check) changeSelection(check.dataset.society, check.checked, check); });
$('society-grid').addEventListener('click', e => { if (e.target.closest('[data-reset-search]')) { $('society-search').value = ''; kind = 'all'; onlySelected = false; societyLimit = 6; renderSocieties(); $('society-search').focus(); } });
$('selected-chips').addEventListener('click', e => { const b = e.target.closest('[data-remove]'); if (b) { changeSelection(b.dataset.remove, false); if (!onlySelected) $('selected-summary').focus({ preventScroll: true }); } });
$('undo-remove').addEventListener('click', () => {
  if (!lastRemoved || !societyFor(lastRemoved.id)) return;
  const { id, index } = lastRemoved, ids = [...selected].filter(value => value !== id); ids.splice(Math.max(0, index), 0, id); selected = new Set(ids); lastRemoved = null;
  hideUndo(); save(); render(); ($('follow-' + id) || $('selected-only')).focus({ preventScroll: true }); $('announcement').textContent = societyFor(id).name + ' restored.';
});
$('society-search').addEventListener('input', () => { societyLimit = 6; renderSocieties(); });
$('clear-search').addEventListener('click', () => { $('society-search').value = ''; societyLimit = 6; renderSocieties(); $('society-search').focus(); });
document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { kind = b.dataset.kind; societyLimit = 6; renderSocieties(); }));
$('selected-only').addEventListener('click', () => { onlySelected = !onlySelected; societyLimit = 6; renderSocieties(); });
$('society-sort').addEventListener('change', () => { societyLimit = 6; renderSocieties(); });
function revealMore(containerId, selector, renderList, increase) {
  const previous = $(containerId).querySelectorAll(selector).length; increase(); renderList();
  const firstNew = $(containerId).querySelectorAll(selector)[previous]; firstNew?.focus({ preventScroll: true });
  firstNew?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
}
$('society-toggle').addEventListener('click', () => revealMore('society-grid', '.society-card', renderSocieties, () => { societyLimit += 6; }));
$('event-toggle').addEventListener('click', () => revealMore('event-list', '.event-card', renderEvents, () => { eventLimit += 6; }));
$('event-search').addEventListener('input', () => { eventLimit = 6; renderEvents(); });
$('clear-event-search').addEventListener('click', () => { $('event-search').value = ''; eventLimit = 6; renderEvents(); $('event-search').focus(); });
$('event-range').addEventListener('change', () => { eventLimit = 6; renderEvents(); });
$('include-unconfirmed').checked = includeUnconfirmed;
$('include-unconfirmed').addEventListener('change', e => { includeUnconfirmed = e.target.checked; eventLimit = 6; savePreferences(); render(); });
$('continue-review').addEventListener('click', () => { eventScope = 'following'; eventLimit = 6; renderEvents(); showStep(2); });
$('continue-calendar').addEventListener('click', () => showStep(3));
$('back-to-societies').addEventListener('click', () => showStep(1));
$('back-to-events').addEventListener('click', () => showStep(2));
document.querySelectorAll('[data-go-step]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); showStep(Number(el.dataset.goStep)); }));
window.addEventListener('popstate', () => { if (loaded) showStep(Math.max(1, ['#societies', '#events', '#calendar'].indexOf(location.hash) + 1), false); });
window.addEventListener('hashchange', () => { if (loaded) showStep(Math.max(1, ['#societies', '#events', '#calendar'].indexOf(location.hash) + 1), false); });
$('calendar-provider').value = ['google', 'apple', 'other'].includes(prefs?.provider) ? prefs.provider : 'google';
$('calendar-provider').addEventListener('change', () => { savePreferences(); renderFeed(); });
$('desktop-google-link').addEventListener('click', e => { if (isMobile()) { e.preventDefault(); renderFeed(); revealCalendarNext(); } });
$('retry-load').addEventListener('click', load);
for (const id of ['download-feed', 'apple-subscribe']) $(id).addEventListener('click', e => { if ($(id).getAttribute('aria-disabled') === 'true') e.preventDefault(); });
$('feed-url').addEventListener('click', () => $('feed-url').select());
function revealCalendarNext() { if (window.innerWidth <= 640) $('calendar-next').scrollIntoView?.({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
function markCopied(link) { copiedFeed = link; failedCopyFeed = ''; clipboardKind = 'feed'; lastCopiedSelection = signature(); savePreferences(); }
$('manual-copy-done').addEventListener('click', () => { if (!$('feed-url').value) return; markCopied($('feed-url').value); renderFeed(); revealCalendarNext(); $('announcement').textContent = 'Calendar instructions are ready.'; });
async function copyField(input, fallback = () => {}) {
  try { await navigator.clipboard.writeText(input.value); return true; }
  catch { try { fallback(); input.focus(); input.select(); return document.execCommand('copy'); } catch { return false; } }
}
async function copyCalendar(reveal = true) {
  const link = $('feed-url').value; if (!link || copying || copyingSetup) return; copying = true; renderFeed();
  const copied = await copyField($('feed-url'));
  copying = false;
  if (copied) { copiedFeed = link; clipboardKind = 'feed'; lastCopiedSelection = new URL(link).searchParams.get('societies') + (new URL(link).searchParams.has('include_unconfirmed') ? ':tentative' : ''); savePreferences(); failedCopyFeed = ''; }
  else { copiedFeed = ''; failedCopyFeed = link; }
  renderFeed(); if (reveal && copied && copiedFeed === $('feed-url').value) revealCalendarNext(); $('announcement').textContent = copied ? 'Link copied. Finish adding your subscription using the next step.' : 'Select and copy the calendar link manually.';
}
$('copy-feed').addEventListener('click', () => copyCalendar());
$('recopy-feed').addEventListener('click', () => copyCalendar(false));
$('setup-url').addEventListener('click', () => $('setup-url').select());
$('copy-setup-link').addEventListener('click', async () => {
  const link = $('setup-url').value; if (!link || copyingSetup || copying) return; copyingSetup = true; renderFeed();
  const copied = await copyField($('setup-url'), () => { $('setup-link-manual').hidden = false; });
  copyingSetup = false;
  if (copied) { copiedSetup = link; failedSetup = ''; clipboardKind = 'setup'; }
  else { copiedSetup = ''; failedSetup = link; }
  renderFeed();
  if (!copied) { $('setup-url').focus(); $('setup-url').select(); }
  $('announcement').textContent = copied ? 'Setup link copied. Open it on a computer to finish adding your calendar.' : 'Select and copy the setup link manually.';
});
let fullHeight = window.innerHeight;
function updateKeyboard() {
  const editing = document.activeElement?.matches('input[type="search"]'), viewportHeight = window.visualViewport?.height || window.innerHeight;
  if (!editing) fullHeight = window.innerHeight;
  const keyboard = window.innerWidth <= 640 && editing && (window.innerHeight - viewportHeight > 120 || fullHeight - viewportHeight > 150);
  document.body.classList.toggle('keyboard-open', Boolean(keyboard));
}
window.visualViewport?.addEventListener('resize', updateKeyboard);
window.addEventListener('resize', () => { updateKeyboard(); renderFeed(); });
document.addEventListener('focusin', updateKeyboard); document.addEventListener('focusout', () => setTimeout(updateKeyboard, 0));
for (const id of ['society-search', 'event-search']) $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } if (e.key === 'Escape') { e.target.value = ''; e.target.dispatchEvent(new Event('input')); } });
function refreshWhenIdle() { if (Date.now() - lastFetchAt >= 60000 && !document.activeElement?.matches('input,select,textarea')) load(); }
load(); window.addEventListener('focus', refreshWhenIdle); setInterval(refreshWhenIdle, 300000);
})();`;
