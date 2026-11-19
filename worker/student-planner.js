export const STUDENT_PLANNER = String.raw`
const PLAN_KEY = 'uniflow:saved-events:v1';
const storedPlan = stored(PLAN_KEY, []);
let planned = new Set(Array.isArray(storedPlan) ? storedPlan.filter(id => typeof id === 'string' && id.length <= 200).slice(0, 200) : []);
let eventScope = selected.size ? 'following' : 'all', planStorageFailed = false;
const plannerDayFormatter = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit' });
const eventById = id => catalogue.events.find(e => e.id === id);
const planEvents = () => catalogue.events.filter(e => planned.has(e.id));
const downloadableEvents = () => planEvents().filter(e => upcoming(e) && (includeUnconfirmed || !uncertain(e)));

function savePlan() {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify([...planned])); planStorageFailed = false; }
  catch { planStorageFailed = true; }
}
function londonDay(value) {
  const p = Object.fromEntries(plannerDayFormatter.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return p.year + '-' + p.month + '-' + p.day;
}
function shiftDay(day, offset) { return new Date(Date.parse(day + 'T12:00:00Z') + offset * 86400000).toISOString().slice(0, 10); }
function inEventRange(event, range) {
  if (range === 'all') return true;
  const today = londonDay(Date.now());
  let start = today, end;
  if (range === 'today') end = shiftDay(today, 1);
  else if (range === 'tomorrow') { start = shiftDay(today, 1); end = shiftDay(today, 2); }
  else if (range === 'weekend') {
    const weekday = new Date(today + 'T12:00:00Z').getUTCDay();
    start = shiftDay(today, weekday === 0 ? -1 : 6 - weekday); end = shiftDay(start, 2);
  } else end = shiftDay(today, Number(range) || 30);
  // Compare Southampton calendar days, including overnight events and clock changes.
  return londonDay(event.start) < end && londonDay(Date.parse(event.end) - 1) >= start;
}
function calendarDownload(events) {
  const link = new URL('/events.ics', location.origin);
  link.searchParams.set('events', events.map(e => e.id).sort().join(','));
  if (includeUnconfirmed) link.searchParams.set('include_unconfirmed', '1');
  return link.href;
}
function setEventScope(scope) {
  eventScope = scope; eventLimit = 6; $('event-search').value = '';
  $('event-range').value = scope === 'plan' ? 'all' : '7';
  $('event-kind').value = 'all'; renderEvents();
}
function openWhatsOn() { setEventScope('all'); showStep(2); }
function renderPlanSummary() {
  const missing = [...planned].filter(id => !eventById(id)), available = downloadableEvents();
  $('plan-count').textContent = planned.size;
  $('plan-summary').hidden = eventScope !== 'plan';
  $('plan-download').hidden = !available.length;
  $('plan-download').href = available.length ? calendarDownload(available) : '#';
  $('plan-download').textContent = 'Download ' + available.length + ' upcoming ' + (available.length === 1 ? 'event' : 'events') + ' (.ics)';
  $('plan-unavailable').hidden = !missing.length;
  $('plan-unavailable-text').textContent = missing.length + ' saved ' + (missing.length === 1 ? 'event is' : 'events are') + ' no longer listed. They are excluded from downloads.';
  $('plan-storage-warning').hidden = !planStorageFailed;
  $('plan-storage-warning').textContent = 'Your browser could not save this plan. It is available for this visit only; download it before closing the page.';
}
function togglePlanned(id) {
  const event = eventById(id); if (!event) return;
  const removing = planned.has(id);
  if (removing) planned.delete(id);
  else {
    if (planned.size >= 200) { $('planner-status').textContent = 'Your plan has 200 events. Remove an older event before adding another.'; return; }
    planned.add(id);
  }
  savePlan(); renderEvents();
  $('planner-status').textContent = event.title + (removing ? ' removed from your plan.' : planStorageFailed ? ' saved for this visit only.' : ' saved to your plan on this device.');
  ($('save-event-' + id) || $('event-scope-plan')).focus({ preventScroll:true });
}
function renderEvents() {
  const container = $('event-list'), open = rememberOpen(container), focused = document.activeElement?.id;
  const source = eventScope === 'plan' ? planEvents() : catalogue.events.filter(e => upcoming(e) && (eventScope !== 'following' || selected.has(e.society_id)));
  const events = source.filter(e => eventScope === 'plan' || includeUnconfirmed || !uncertain(e));
  const q = norm($('event-search').value).trim(), eventKind = $('event-kind').value;
  const matches = events.filter(e => inEventRange(e, $('event-range').value) &&
    (eventKind === 'all' || (societyFor(e.society_id)?.category === 'sport' ? 'sport' : 'society') === eventKind) &&
    (!q || q.split(/\s+/).every(t => norm([e.title, societyFor(e.society_id)?.name, e.location, e.description, fmt(e.start, { weekday:'long', day:'numeric', month:'long', year:'numeric' })].join(' ')).includes(t))))
    .sort((a,b) => Number(!upcoming(a)) - Number(!upcoming(b)) || Date.parse(a.start) - Date.parse(b.start));
  const visible = matches.slice(0, eventLimit), unconfirmed = source.filter(e => upcoming(e) && uncertain(e)).length;
  const activePlan = planEvents().filter(e => upcoming(e) && !uncertain(e));
  $('events-title').textContent = eventScope === 'plan' ? 'Your event plan' : eventScope === 'following' ? 'Your societies’ events' : 'What’s on in Southampton';
  $('event-count').textContent = eventScope === 'plan' ? planned.size + ' saved' : events.length + ' upcoming events';
  $('event-intro').textContent = eventScope === 'plan' ? 'A shortlist of things you want to do. Saved on this device, with no account needed.' : eventScope === 'following' ? 'From your followed societies. Save individual events to build a plan.' : 'Find something to try. You can browse and save events before following a society.';
  $('event-result-count').textContent = matches.length ? visible.length + ' of ' + matches.length + ' events' : 'No matching dates';
  $('event-search').placeholder = eventScope === 'plan' ? 'Search your saved events' : 'Search events, societies or places';
  $('event-preview-note').textContent = eventScope === 'plan' ? 'Overlap warnings compare events in this plan only, not your personal timetable.' : 'Times are shown for Southampton. Following a society adds all its published events to your subscription.';
  $('event-range').querySelector('option[value="all"]').textContent = eventScope === 'plan' ? 'All saved dates' : 'All upcoming';
  $('clear-event-search').hidden = !q;
  $('unconfirmed-option').hidden = !unconfirmed;
  $('unconfirmed-count').textContent = unconfirmed + ' dates need confirmation. These are excluded from discovery and calendar downloads unless you include them; saved dates keep their warning.';
  $('event-actions').hidden = matches.length <= eventLimit;
  $('event-toggle').textContent = 'Show ' + Math.min(6, Math.max(0, matches.length - eventLimit)) + ' more';
  document.querySelectorAll('[data-event-scope]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.eventScope === eventScope)));
  renderPlanSummary();
  container.innerHTML = visible.map(e => {
    const society = societyFor(e.society_id), saved = planned.has(e.id), cancelled = e.status === 'cancelled', finished = Date.parse(e.end) < Date.now();
    const label = cancelled ? 'Cancelled — do not attend' : finished ? 'Finished' : uncertain(e) ? 'Date needs confirmation' : e.source_type === 'secretary' ? 'Published by society' : e.source_checked_at ? 'SUSU · checked ' + date(e.source_checked_at) : 'Previously supplied event';
    const clashes = saved && upcoming(e) && !uncertain(e) ? activePlan.filter(other => other.id !== e.id && Date.parse(other.start) < Date.parse(e.end) && Date.parse(other.end) > Date.parse(e.start)) : [];
    const joining = society?.how_to_join ? '<h4>How to get involved</h4><p>' + esc(society.how_to_join) + '</p>' : '<p>New to this society? Check the official details or ask the committee before your first visit.</p>';
    return '<article class="event-card' + (saved ? ' is-planned' : '') + (cancelled ? ' is-cancelled' : '') + '" data-event-card="' + esc(e.id) + '" tabindex="-1"><div class="event-date"><span class="day">' + fmt(e.start,{day:'2-digit'}) + '</span><span class="month">' + fmt(e.start,{month:'short',...(differentYear(e.start)?{year:'numeric'}:{})}) + '</span></div><div class="event-main">' +
      '<div class="event-card-heading"><div><div class="event-society">' + esc(society?.name) + '</div><h3>' + esc(e.title) + '</h3></div><button class="save-event" id="save-event-' + esc(e.id) + '" data-save-event="' + esc(e.id) + '" aria-pressed="' + saved + '" aria-label="' + esc((saved ? 'Remove ' : 'Save ') + e.title + (saved ? ' from your plan' : ' to your plan')) + '">' + (saved ? 'Saved ✓' : '+ Save') + '</button></div>' +
      '<p class="event-meta">' + esc(fmt(e.start,{weekday:'short'})) + ' · ' + time(e.start) + '–' + time(e.end) + (date(e.start)!==date(e.end)?' ('+date(e.end)+')':'') + '</p><p>' + esc(e.location || 'Location to be confirmed') + '</p><span class="source-badge' + (uncertain(e)||cancelled?' unconfirmed':'') + '">' + esc(label) + '</span>' +
      (clashes.length ? '<p class="event-clash">Overlaps your saved ' + esc(clashes.map(other => other.title).join(', ')) + '.</p>' : '') +
      '<div class="event-quick-links">' + (!cancelled && !finished ? anchor('Booking information', e.booking_url) : '') + '</div>' +
      '<details class="event-description" data-detail="' + esc(e.id) + '" ' + (open.has(e.id)?'open':'') + '><summary id="event-details-' + esc(e.id) + '">Details & joining info</summary>' +
      ((e.description||e.verification_note)?'<p>'+esc([e.verification_note,e.description].filter(Boolean).join('\n\n'))+'</p>':'') + joining +
      '<div class="society-links event-links">' + anchor('Official event', e.source_url||society?.susu_url) + contacts(society || {}) + '</div>' +
      '<button class="event-follow text-action" id="event-follow-' + esc(e.id) + '" data-follow-event="' + esc(e.society_id) + '" aria-pressed="' + selected.has(e.society_id) + '">' + esc(selected.has(e.society_id)?'Following '+society?.name:'Follow all '+society?.name+' events') + '</button>' +
      (!cancelled && !finished && (includeUnconfirmed||!uncertain(e)) ? '<a class="event-download" href="' + esc(calendarDownload([e])) + '">Download this event (.ics)</a><p class="download-note">A one-time calendar copy. Follow the society for automatic updates.</p>' : '') +
      '<a class="report-link" href="mailto:marlow.thijs@icloud.com?subject=' + encodeURIComponent('UniFlow event correction: '+e.title) + '">Report incorrect details</a></details></div></article>';
  }).join('') || '<div class="empty-state"><strong>' + (eventScope==='plan'&&!planned.size?'Your next adventure starts with one saved event.':eventScope==='following'&&!selected.size?'Follow a society or explore all events.':events.length?'No events match these filters.':eventScope==='following'?'No confirmed dates for these societies yet.':'No published events to show yet.') + '</strong><p>' + (eventScope==='following'?'You can still subscribe for future events, or explore what other societies are doing.':eventScope==='plan'&&!planned.size?'Tap Save on any event. It will be here when you return in this browser.':'Try another date or search. Dates needing confirmation stay clearly labelled.') + '</p><button class="button button-secondary" data-event-empty="' + (events.length?'reset':'explore') + '">' + (events.length?'Clear event filters':'Explore all events') + '</button></div>';
  if (focused && /^(event-details-|save-event-)/.test(focused)) $(focused)?.focus({preventScroll:true});
  updateNavigation();
}
$('explore-events').addEventListener('click', openWhatsOn);
$('view-event-plan').addEventListener('click', () => { setEventScope('plan'); $('events-title').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'auto'}); });
document.querySelectorAll('[data-event-scope]').forEach(button => button.addEventListener('click', () => setEventScope(button.dataset.eventScope)));
$('event-kind').addEventListener('change', () => { eventLimit = 6; renderEvents(); });
$('event-list').addEventListener('click', event => {
  const save = event.target.closest('[data-save-event]'); if (save) return togglePlanned(save.dataset.saveEvent);
  const follow = event.target.closest('[data-follow-event]'); if (follow) { const id = follow.dataset.followEvent, focusId = follow.id; changeSelection(id,!selected.has(id)); ($(focusId)||$('event-scope-following')).focus({preventScroll:true}); return; }
  const empty = event.target.closest('[data-event-empty]');
  if (empty) { if (empty.dataset.eventEmpty === 'explore') setEventScope('all'); $('event-search').value=''; $('event-range').value='all'; $('event-kind').value='all'; eventLimit=6; renderEvents(); $('event-search').focus(); }
});
$('clear-unavailable-plan').addEventListener('click', () => { planned = new Set([...planned].filter(id => eventById(id))); savePlan(); renderEvents(); $('event-scope-plan').focus(); });
`;
