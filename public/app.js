const state = { user: null, societies: [], events: [], selectedIds: new Set(), view: 'discover', filter: 'all', query: '', admin: false, adminEvents: [] };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'That did not work. Please try again.');
  return payload;
}

function toast(message, type = '') {
  const node = $('#toast');
  node.textContent = message;
  node.className = `toast show${type ? ` ${type}` : ''}`;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => { node.className = 'toast'; }, 3200);
}

function initials(value = '') {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function palette(value = '') {
  const colors = ['#dc795d', '#799c81', '#8b83b9', '#d1a04c', '#55999a', '#bd7183'];
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function dateParts(value) {
  const date = new Date(value);
  return { weekday: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date), day: new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date), month: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date) };
}

function timeRange(event) {
  const options = { hour: 'numeric', minute: '2-digit' };
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const sameDay = start.toDateString() === end.toDateString();
  return `${new Intl.DateTimeFormat(undefined, options).format(start)}${sameDay ? ` – ${new Intl.DateTimeFormat(undefined, options).format(end)}` : ''}`;
}

function eventMarkup(event, index) {
  const society = state.societies.find((item) => item.id === event.society_id);
  const color = palette(event.society_name || society?.name || event.society_id);
  const date = dateParts(event.start_at);
  const joined = state.selectedIds.has(event.society_id);
  return `<article class="event-card" style="animation-delay:${Math.min(index, 8) * 35}ms;--society-color:${color}">
    <div class="date-tile"><span>${escapeHtml(date.weekday)} · ${escapeHtml(date.month)}</span><strong>${escapeHtml(date.day)}</strong></div>
    <div class="event-main"><div class="event-meta"><span class="event-society">${escapeHtml(event.society_abbreviation || event.society_name || society?.abbreviation || 'Society')}</span><span class="event-time">${escapeHtml(timeRange(event))}</span></div><h3 class="event-title">${escapeHtml(event.title)}</h3>${event.description ? `<p class="event-description">${escapeHtml(event.description)}</p>` : ''}${event.location ? `<div class="event-location"><span aria-hidden="true">⌖</span>${escapeHtml(event.location)}</div>` : ''}</div>
    <button class="join-button${joined ? ' joined' : ''}" data-join="${escapeHtml(event.society_id)}" aria-pressed="${joined}">${joined ? '✓ Following' : '＋ Follow'}</button>
  </article>`;
}

function renderEvents() {
  const search = state.query.toLowerCase().trim();
  const rows = state.events.filter((event) => {
    if (state.filter === 'following' && !state.selectedIds.has(event.society_id)) return false;
    if (state.view === 'following' && !state.selectedIds.has(event.society_id)) return false;
    const haystack = `${event.title} ${event.society_name} ${event.location} ${event.description}`.toLowerCase();
    return !search || haystack.includes(search);
  });
  const node = $('#events-list');
  if (!rows.length) {
    const connected = Boolean(state.user);
    const message = state.query ? 'Try another search.' : state.filter === 'following' || state.view === 'following' ? (connected ? 'Follow a society to see its events here.' : 'Connect your calendar to save your society picks.') : 'The team is adding this week’s events. Check back soon.';
    node.innerHTML = `<div class="empty-state"><div class="empty-symbol">✳</div><h3>${search ? 'No matches just yet' : 'A little room in your week'}</h3><p>${escapeHtml(message)}</p></div>`;
    return;
  }
  node.innerHTML = rows.map(eventMarkup).join('');
}

function renderSocieties() {
  $('#society-badge').textContent = state.societies.length;
  $('#society-total').textContent = state.societies.length;
  $('#following-count').textContent = state.selectedIds.size;
  $('#filter-following-count').textContent = state.selectedIds.size;
  const societies = state.societies;
  $('#sidebar-societies').innerHTML = societies.slice(0, 7).map((society) => `<div class="side-society"><span class="society-dot" style="--society-color:${palette(society.name)}"></span><span>${escapeHtml(society.abbreviation || society.name)}</span></div>`).join('') || '<div class="side-society"><span style="color:#91a6a2;font-size:11px">A new circle starts here.</span></div>';
  $('#societies-list').innerHTML = societies.map((society) => {
    const following = state.selectedIds.has(society.id);
    const count = state.events.filter((event) => event.society_id === society.id).length;
    return `<article class="society-card"><span class="society-avatar" style="--society-color:${palette(society.name)}">${escapeHtml(society.abbreviation || initials(society.name))}</span><div class="society-info"><strong title="${escapeHtml(society.name)}">${escapeHtml(society.name)}</strong><small>${following ? 'In your circles' : `${count} upcoming ${count === 1 ? 'event' : 'events'}`}</small></div><button class="join-button${following ? ' joined' : ''}" data-join="${escapeHtml(society.id)}" aria-pressed="${following}" aria-label="${following ? 'Unfollow' : 'Follow'} ${escapeHtml(society.name)}">${following ? '✓' : '+'}</button></article>`;
  }).join('') || '<div class="empty-state"><div class="empty-symbol">✳</div><h3>Find your first circle</h3><p>Societies will show up here once the team adds them.</p></div>';
  renderEvents();
}

function renderUser() {
  const connected = Boolean(state.user);
  $('#account-label').textContent = state.user?.email || 'Calendar not connected';
  $('#avatar').textContent = state.user ? initials(state.user.display_name || state.user.email) : '?';
  $('#connect-button').classList.toggle('hidden', connected);
  $('#sync-button').classList.toggle('hidden', !connected);
  $('#disconnect-button').classList.toggle('hidden', !connected);
  $('#calendar-card-action').textContent = connected ? 'Sync my calendar  ↻' : 'Connect Google Calendar  ↗';
  $('#calendar-card-copy').textContent = connected ? (state.user.last_sync_error ? `Last sync needs attention: ${state.user.last_sync_error}` : state.user.last_sync_at ? `Connected as ${state.user.email}. Last synced ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.user.last_sync_at))}.` : `Connected as ${state.user.email}. Follow the societies you care about and we'll add their events.`) : 'Connect Google Calendar and we’ll add events from the societies you follow.';
  $('#calendar-card-action').onclick = connected ? syncMyCalendar : connectCalendar;
  const now = new Date();
  $('#today-label').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now).toUpperCase();
  $('#week-label').textContent = `WEEK OF ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(now).toUpperCase()}`;
  $('#event-total').textContent = state.events.length;
  $('#welcome-title').innerHTML = state.user ? `Good to see you,<br /><em>${escapeHtml(state.user.display_name?.split(' ')[0] || 'friend')}.</em>` : 'Make room for<br /><em>good things.</em>';
}

function render() { renderUser(); renderSocieties(); }

async function load() {
  try {
    const data = await api('/api/bootstrap');
    state.user = data.user;
    state.societies = data.societies || [];
    state.events = data.events || [];
    state.selectedIds = new Set(data.selectedSocietyIds || []);
    render();
  } catch (error) {
    $('#events-list').innerHTML = `<div class="empty-state"><div class="empty-symbol">!</div><h3>We couldn’t load the campus board</h3><p>${escapeHtml(error.message)} Check the Cloudflare setup and try refreshing.</p></div>`;
  }
}

function connectCalendar() { window.location.assign('/auth/google'); }

async function syncMyCalendar() {
  const button = $('#sync-button');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '↻ Adding events…';
  try {
    const result = await api('/api/calendar/sync', { method: 'POST', body: '{}' });
    toast(`${result.added} added · ${result.updated} updated`);
    await load();
  } catch (error) { toast(error.message, 'error'); }
  finally { button.disabled = false; button.innerHTML = original; }
}

async function toggleSociety(societyId) {
  if (!state.user) { toast('Connect your Google Calendar to save your society picks.'); connectCalendar(); return; }
  const joined = state.selectedIds.has(societyId);
  try {
    await api(`/api/subscriptions/${encodeURIComponent(societyId)}`, { method: 'POST', body: JSON.stringify({ joined: !joined }) });
    if (joined) state.selectedIds.delete(societyId); else state.selectedIds.add(societyId);
    render();
    toast(joined ? 'You’ve updated your society picks.' : 'Added to your circles.');
  } catch (error) { toast(error.message, 'error'); }
}

function setFilter(filter) {
  state.filter = filter;
  $$('.filter-chip').forEach((chip) => {
    const active = chip.dataset.filter === filter;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-selected', String(active));
  });
  renderEvents();
}

function openAdmin() {
  $('#admin-dialog').showModal();
  checkAdminSession();
}

async function checkAdminSession() {
  try {
    const result = await api('/api/admin/session');
    state.admin = result.authenticated;
    $('#admin-login').classList.toggle('hidden', state.admin);
    $('#admin-dashboard').classList.toggle('hidden', !state.admin);
    if (state.admin) await loadAdminData();
  } catch { state.admin = false; }
}

async function loadAdminData() {
  const [events, societies] = await Promise.all([api('/api/admin/events'), api('/api/admin/societies')]);
  state.adminEvents = events.events;
  const activeSocieties = societies.societies.filter((society) => society.active);
  $('#admin-published-count').textContent = state.adminEvents.filter((event) => event.status === 'published').length;
  $('#admin-draft-count').textContent = state.adminEvents.filter((event) => event.status === 'draft').length;
  $('#admin-society-count').textContent = activeSocieties.length;
  $('#admin-events-body').innerHTML = state.adminEvents.map((event) => {
    const start = new Date(event.start_at);
    const label = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(start);
    return `<tr><td><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.society_name)}${event.location ? ` · ${escapeHtml(event.location)}` : ''}</small></td><td>${escapeHtml(label)}</td><td><span class="status-pill ${escapeHtml(event.status)}">${escapeHtml(event.status)}</span></td><td>${event.status !== 'cancelled' ? `<button class="table-action" data-edit-event="${escapeHtml(event.id)}">Edit</button> <button class="table-action" data-cancel-event="${escapeHtml(event.id)}">Cancel</button>` : ''}</td></tr>`;
  }).join('') || '<tr><td colspan="4">No events yet. Add one for this week.</td></tr>';
  $('#admin-events-body').insertAdjacentHTML('beforeend', '');
  const options = activeSocieties.map((society) => `<option value="${escapeHtml(society.id)}">${escapeHtml(society.name)}</option>`).join('');
  $('#event-form [name="society_id"]').innerHTML = options || '<option value="">Add a society first</option>';
}

function resetEventForm() {
  const form = $('#event-form');
  form.reset();
  form.elements.id.value = '';
  $('#event-form-title').textContent = 'Add an event';
  $('#event-form-message').textContent = '';
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const toLocal = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  form.elements.start_at.value = toLocal(start);
  form.elements.end_at.value = toLocal(end);
  form.elements.status.value = 'published';
}

function editEvent(id) {
  const event = state.adminEvents.find((item) => item.id === id);
  if (!event) return;
  resetEventForm();
  const form = $('#event-form');
  form.elements.id.value = event.id;
  form.elements.society_id.value = event.society_id;
  form.elements.title.value = event.title;
  const toLocal = (value) => {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  form.elements.start_at.value = toLocal(event.start_at);
  form.elements.end_at.value = toLocal(event.end_at);
  form.elements.location.value = event.location || '';
  form.elements.description.value = event.description || '';
  form.elements.status.value = event.status === 'cancelled' ? 'draft' : event.status;
  $('#event-form-title').textContent = 'Edit event';
  $('#event-dialog').showModal();
}

function toIso(value) { return new Date(value).toISOString(); }

async function saveEvent(form) {
  const data = new FormData(form);
  const id = data.get('id');
  const body = {
    society_id: data.get('society_id'), title: data.get('title'), start_at: toIso(data.get('start_at')), end_at: toIso(data.get('end_at')),
    location: data.get('location'), description: data.get('description'), status: data.get('status')
  };
  const message = $('#event-form-message');
  message.textContent = '';
  try {
    await api(id ? `/api/admin/events/${encodeURIComponent(id)}` : '/api/admin/events', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    $('#event-dialog').close();
    await Promise.all([load(), loadAdminData()]);
    toast(id ? 'Event updated.' : 'Event added to the board.');
  } catch (error) { message.textContent = error.message; }
}

async function cancelEvent(id) {
  const confirmed = window.confirm('Cancel this event? The next sync will remove the event created by Society Synth from subscribed calendars.');
  if (!confirmed) return;
  try { await api(`/api/admin/events/${encodeURIComponent(id)}`, { method: 'DELETE' }); await Promise.all([load(), loadAdminData()]); toast('Event cancelled.'); }
  catch (error) { toast(error.message, 'error'); }
}

$('#connect-button').addEventListener('click', connectCalendar);
$('#sync-button').addEventListener('click', syncMyCalendar);
$('#open-admin').addEventListener('click', openAdmin);
$('#close-admin').addEventListener('click', () => $('#admin-dialog').close());
$('#close-event-form').addEventListener('click', () => $('#event-dialog').close());
$('#cancel-event-form').addEventListener('click', () => $('#event-dialog').close());
$('#event-search').addEventListener('input', (event) => { state.query = event.target.value; renderEvents(); });
$$('.filter-chip').forEach((chip) => chip.addEventListener('click', () => setFilter(chip.dataset.filter)));
$$('.nav-item[data-view]').forEach((button) => button.addEventListener('click', () => {
  state.view = button.dataset.view;
  $$('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item === button));
  $('#page-label').textContent = state.view === 'following' ? 'My societies' : 'Discover';
  $('#events-heading').textContent = state.view === 'following' ? 'Your circles, coming up' : 'Coming up';
  if (state.view === 'following') setFilter('following'); else setFilter('all');
}));
document.addEventListener('click', (event) => {
  const join = event.target.closest('[data-join]');
  if (join) toggleSociety(join.dataset.join);
  const edit = event.target.closest('[data-edit-event]');
  if (edit) editEvent(edit.dataset.editEvent);
  const cancel = event.target.closest('[data-cancel-event]');
  if (cancel) cancelEvent(cancel.dataset.cancelEvent);
});

$('#admin-login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#admin-login-message');
  message.textContent = '';
  try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#admin-password').value }) }); $('#admin-password').value = ''; await checkAdminSession(); }
  catch (error) { message.textContent = error.message; }
});

$('#admin-logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST', body: '{}' }).catch(() => {});
  state.admin = false;
  $('#admin-dashboard').classList.add('hidden');
  $('#admin-login').classList.remove('hidden');
});

$('#society-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $('#society-form-message');
  const data = Object.fromEntries(new FormData(form).entries());
  try { await api('/api/admin/societies', { method: 'POST', body: JSON.stringify(data) }); form.reset(); message.textContent = 'Society added.'; message.style.color = '#568263'; await Promise.all([load(), loadAdminData()]); }
  catch (error) { message.textContent = error.message; message.style.color = ''; }
});

$('#add-event-button').addEventListener('click', async () => { await loadAdminData(); resetEventForm(); $('#event-dialog').showModal(); });
$('#event-form').addEventListener('submit', async (event) => { event.preventDefault(); await saveEvent(event.currentTarget); });
$('#admin-sync-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try { const result = await api('/api/admin/sync', { method: 'POST', body: '{}' }); toast(`Weekly sync complete · ${result.added} added · ${result.errors} errors`); }
  catch (error) { toast(error.message, 'error'); }
  finally { button.disabled = false; }
});

$('#disconnect-button').addEventListener('click', async () => {
  const confirmed = window.confirm('Disconnect Google Calendar? Your Society Synth picks and saved connection will be removed. Events already in Google Calendar stay there.');
  if (!confirmed) return;
  try { await api('/api/account/disconnect', { method: 'POST', body: '{}' }); state.user = null; state.selectedIds.clear(); await load(); toast('Calendar disconnected.'); }
  catch (error) { toast(error.message, 'error'); }
});

const params = new URLSearchParams(location.search);
if (params.has('google')) {
  const result = params.get('google');
  if (result === 'connected') toast('Google Calendar connected. Pick your societies to get started.');
  if (result === 'cancelled') toast('Calendar connection cancelled.');
  if (result === 'error') toast('Calendar connection could not be completed.', 'error');
  history.replaceState({}, '', location.pathname);
}

load();
