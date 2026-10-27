const DAY = 86400000;
const SESSION_AGE = 30 * DAY;
const PROFILE_LIMITS = { description: 800, how_to_join: 1600, membership_url: 2048, contact_email: 254, instagram_url: 2048, website_url: 2048, community_url: 2048, regular_schedule: 500 };
const EVENT_LIMITS = { title: 150, location: 250, description: 4000, source_url: 2048 };
const privateHeaders = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };

class PortalError extends Error {
  constructor(status, message, code = 'invalid_request') { super(message); this.status = status; this.code = code; }
}
const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: { ...privateHeaders, ...headers } });
const fail = (status, message, code) => { throw new PortalError(status, message, code); };
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
async function hash(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join(''); }
async function equalSecret(a, b) { const x = await hash(a), y = await hash(b); let diff = 0; for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i); return diff === 0; }
function cookieName(request) { return new URL(request.url).protocol === 'https:' ? '__Host-uniflow_portal' : 'uniflow_portal'; }
function sessionCookie(request, token, age = SESSION_AGE / 1000) { return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`; }
function readCookie(request) { const name = cookieName(request); return (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1) || ''; }
function assertOrigin(request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) fail(403, 'Please open the portal in its own browser tab and try again.', 'invalid_origin');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) fail(403, 'Use the secure HTTPS portal.', 'https_required');
}
async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'Send JSON data.');
  if (Number(request.headers.get('content-length')) > 16384) fail(413, 'This update is too large.');
  // Enforce a real streamed limit, including requests without Content-Length.
  const reader = request.body?.getReader(); let size = 0, text = ''; const decoder = new TextDecoder();
  if (reader) { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 16384) { await reader.cancel(); fail(413, 'This update is too large.'); } text += decoder.decode(value, { stream: true }); } text += decoder.decode(); }
  let data; try { data = JSON.parse(text); } catch { fail(400, 'The update was not valid JSON.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Send an object containing your update.');
  return data;
}
function allowFields(data, keys) { if (Object.keys(data).some(key => !keys.includes(key))) fail(400, 'This update contains an unsupported field.'); }
function textField(value, max, field, required = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail(400, `Please check ${field} (maximum ${max} characters).`);
  value = value.trim(); if (required && !value) fail(400, `Please enter ${field}.`); return value;
}
function safeUrl(value, field) {
  value = textField(value, 2048, field); if (!value) return '';
  let url; try { url = new URL(value); } catch { fail(400, `Enter a full https:// link for ${field}.`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(400, `Use a public http:// or https:// link for ${field}.`);
  return url.href;
}
function versionOf(value) { if (!Number.isSafeInteger(value) || value < 0) fail(400, 'Reload this item before editing it.', 'invalid_version'); return value; }
function validateProfile(data) {
  allowFields(data, ['version', ...Object.keys(PROFILE_LIMITS)]);
  const result = {};
  for (const [field, max] of Object.entries(PROFILE_LIMITS)) if (Object.hasOwn(data, field)) result[field] = field.endsWith('_url') ? safeUrl(data[field], field.replaceAll('_', ' ')) : textField(data[field], max, field.replaceAll('_', ' '));
  if (result.contact_email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.contact_email)) fail(400, 'Enter a valid public contact email.');
  return result;
}
function validInstant(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail(400, `Enter a valid ${label} with a time zone.`);
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || +value.slice(11, 13) > 23 || +value.slice(14, 16) > 59) fail(400, `Enter a valid ${label}.`);
  return new Date(value).toISOString();
}
function validateEvent(data, edit = false) {
  allowFields(data, [...Object.keys(EVENT_LIMITS), 'start', 'end', 'timezone', ...(edit ? ['version'] : [])]);
  const result = {};
  for (const [field, max] of Object.entries(EVENT_LIMITS)) result[field] = field.endsWith('_url') ? safeUrl(data[field], 'event link') : textField(data[field], max, field, field === 'title');
  if (data.timezone !== 'Europe/London') fail(400, 'Society events must use Southampton time (Europe/London).');
  result.start = validInstant(data.start, 'start date and time'); result.end = validInstant(data.end, 'end date and time'); result.timezone = 'Europe/London';
  const duration = Date.parse(result.end) - Date.parse(result.start);
  if (duration <= 0 || duration > 7 * DAY) fail(400, 'The end must be after the start and no more than seven days later.');
  return result;
}
async function authRateLimit(request, db) {
  const now = Date.now(), until = (Math.floor(now / 900000) + 1) * 900000;
  const key = await hash(`${request.headers.get('cf-connecting-ip') || 'local'}:${Math.floor(now / 900000)}`);
  await db.prepare('DELETE FROM portal_rate_limits WHERE expires_at < ?').bind(now).run();
  const row = await db.prepare('INSERT INTO portal_rate_limits (rate_key, attempts, expires_at) VALUES (?,1,?) ON CONFLICT(rate_key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(key, until).first();
  if (row.attempts > 20) fail(429, 'Too many sign-in attempts. Please try again in 15 minutes.', 'rate_limited');
}
async function currentSession(request, env) {
  const token = readCookie(request); if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await env.PORTAL_DB.prepare('SELECT * FROM portal_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(token), Date.now()).first();
  if (!row) return null;
  return { ...row, csrf_token: await hash('csrf:' + token) };
}
function sessionView(session, env) { return { authenticated: true, configured: true, role: session.role, society_id: session.society_id, csrf_token: session.csrf_token, expires_at: session.expires_at, environment: env.PORTAL_ENVIRONMENT || 'production' }; }
async function createSession(request, env, role, society_id, label) {
  const token = randomToken(), tokenHash = await hash(token), now = Date.now();
  await env.PORTAL_DB.prepare('INSERT INTO portal_sessions (token_hash,role,society_id,label,created_at,expires_at) VALUES (?,?,?,?,?,?)').bind(tokenHash, role, society_id, label, now, now + SESSION_AGE).run();
  return json({ authenticated: true, configured: true, role, society_id, csrf_token: await hash('csrf:' + token), expires_at: now + SESSION_AGE, environment: env.PORTAL_ENVIRONMENT || 'production' }, 200, { 'set-cookie': sessionCookie(request, token) });
}
async function audit(db, session, action, id) {
  // A logging failure must not tell the secretary to repeat an already saved edit.
  try { await db.prepare('INSERT INTO portal_audit (society_id,actor,action,object_id,created_at) VALUES (?,?,?,?,?)').bind(session.society_id || null, session.label, action, id, new Date().toISOString()).run(); }
  catch (error) { console.error('Portal audit failed:', error.name); }
}

export async function mergePortalCatalogue(base, env) {
  if (!env.PORTAL_DB) return base;
  const [profiles, events] = await env.PORTAL_DB.batch([env.PORTAL_DB.prepare('SELECT * FROM portal_profiles'), env.PORTAL_DB.prepare('SELECT * FROM portal_events')]);
  const profilesById = new Map(profiles.results.map(row => [row.society_id, row]));
  const ids = new Set(base.societies.map(s => s.id));
  const mergedEvents = new Map(base.events.map(e => [e.id, { ...e, version: 0 }]));
  let latest = base.updated_at || '';
  for (const row of events.results) {
    if (!ids.has(row.society_id)) continue;
    const prior = mergedEvents.get(row.event_id); if (prior && prior.society_id !== row.society_id) continue;
    mergedEvents.set(row.event_id, { ...JSON.parse(row.data_json), id: row.event_id, society_id: row.society_id, version: row.version, modified_at: row.modified_at });
    if (row.modified_at > latest) latest = row.modified_at;
  }
  const societies = base.societies.map(s => { const row = profilesById.get(s.id); if (!row) return s; if (row.modified_at > latest) latest = row.modified_at; return { ...s, ...JSON.parse(row.data_json), id: s.id, name: s.name }; });
  return { ...base, societies, events: [...mergedEvents.values()], updated_at: latest || null };
}

export async function handlePortalApi(request, env, { loadBaseCatalogue }) {
  const url = new URL(request.url), path = url.pathname;
  if (!path.startsWith('/api/portal/')) return null;
  try {
    const allowed = !env.PORTAL_ALLOWED_ORIGINS || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || env.PORTAL_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).includes(url.origin);
    if (!allowed) {
      if (path === '/api/portal/session' && request.method === 'GET') return json({ authenticated: false, configured: false });
      fail(503, 'Secretary access is disabled on this preview. Use the live UniFlow portal or a local preview.', 'preview_disabled');
    }
    if (path === '/api/portal/session' && request.method === 'GET') {
      if (!env.PORTAL_DB) return json({ authenticated: false, configured: false });
      const session = await currentSession(request, env); return json(session ? sessionView(session, env) : { authenticated: false, configured: true, environment: env.PORTAL_ENVIRONMENT || 'production' });
    }
    if (!env.PORTAL_DB) fail(503, 'The secretary portal is not set up yet. Please contact the UniFlow team.', 'not_configured');
    const db = env.PORTAL_DB;
    const mutation = !['GET', 'HEAD'].includes(request.method);
    if (mutation) assertOrigin(request);
    if (request.method === 'POST' && ['/api/portal/session/admin', '/api/portal/session/invite'].includes(path)) {
      await authRateLimit(request, db); const body = await readBody(request);
      if (path.endsWith('/admin')) {
        allowFields(body, ['key']);
        if (!env.PORTAL_ADMIN_KEY || env.PORTAL_ADMIN_KEY.length < 32) fail(503, 'Owner access has not been configured.', 'not_configured');
        if (typeof body.key !== 'string' || body.key.length > 256 || !await equalSecret(body.key, env.PORTAL_ADMIN_KEY)) fail(401, 'That owner key is not valid.', 'invalid_key');
        return await createSession(request, env, 'admin', null, 'UniFlow owner');
      }
      allowFields(body, ['token']);
      if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) fail(401, 'This invitation is invalid, expired or already used. Ask for a new link.', 'invalid_invite');
      const tokenHash = await hash(body.token), now = Date.now();
      const invitation = await db.prepare('SELECT * FROM portal_invitations WHERE token_hash=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>?').bind(tokenHash, now).first();
      if (!invitation) fail(401, 'This invitation is invalid, expired or already used. Ask for a new link.', 'invalid_invite');
      const base = await loadBaseCatalogue();
      if (!base.societies.some(s => s.id === invitation.society_id)) fail(403, 'This society is no longer listed. Contact UniFlow.');
      const sessionToken = randomToken(), sessionHash = await hash(sessionToken);
      // Session creation and one-use redemption share a transaction. The conditional
      // INSERT wins once; the UPDATE only consumes an invitation when that insert won.
      const results = await db.batch([
        db.prepare("INSERT INTO portal_sessions (token_hash,role,society_id,label,created_at,expires_at) SELECT ?,'secretary',society_id,label,?,? FROM portal_invitations WHERE token_hash=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>?").bind(sessionHash, now, now + SESSION_AGE, tokenHash, now),
        db.prepare('UPDATE portal_invitations SET used_at=? WHERE token_hash=? AND used_at IS NULL AND changes()>0').bind(now, tokenHash),
      ]);
      if (!results[0].meta.changes) fail(401, 'This invitation has already been used. Ask for a new link.', 'invalid_invite');
      return json({ authenticated: true, configured: true, role: 'secretary', society_id: invitation.society_id, csrf_token: await hash('csrf:' + sessionToken), expires_at: now + SESSION_AGE, environment: env.PORTAL_ENVIRONMENT || 'production' }, 200, { 'set-cookie': sessionCookie(request, sessionToken) });
    }
    const session = await currentSession(request, env);
    if (!session) fail(401, 'Your session has ended. Please use a new invitation link.', 'sign_in_required');
    if (mutation && request.headers.get('x-csrf-token') !== session.csrf_token) fail(403, 'Refresh the portal and try again.', 'invalid_csrf');
    if (path === '/api/portal/logout' && request.method === 'POST') {
      await db.prepare('DELETE FROM portal_sessions WHERE token_hash=?').bind(session.token_hash).run();
      return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, '', 0) });
    }
    if (path.startsWith('/api/portal/admin/')) {
      if (session.role !== 'admin') fail(403, 'Only the UniFlow owner can manage society access.');
      const base = await loadBaseCatalogue();
      if (path.endsWith('/societies') && request.method === 'GET') {
        const now = Date.now();
        const access = await db.prepare("SELECT society_id, COUNT(*) AS active_sessions FROM portal_sessions WHERE role='secretary' AND expires_at>? GROUP BY society_id").bind(now).all();
        const invites = await db.prepare('SELECT society_id,label,expires_at FROM portal_invitations WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at>?').bind(now).all();
        return json({ societies: base.societies.map(({ id, name, susu_url, contact_email }) => ({ id, name, susu_url, contact_email })), access: access.results, invitations: invites.results });
      }
      if (request.method !== 'POST') fail(405, 'This action requires POST.');
      const body = await readBody(request);
      const society = base.societies.find(s => s.id === body.society_id); if (!society) fail(400, 'Choose a listed society.');
      if (path.endsWith('/invitations')) {
        allowFields(body, ['society_id', 'label']);
        const label = textField(body.label, 100, 'secretary name', true), token = randomToken(), now = Date.now();
        await db.prepare('INSERT INTO portal_invitations (token_hash,society_id,label,created_at,expires_at) VALUES (?,?,?,?,?)').bind(await hash(token), society.id, label, now, now + 7 * DAY).run();
        await audit(db, session, 'invite_created', society.id);
        return json({ invite_url: url.origin + '/secretary#invite=' + token, expires_at: now + 7 * DAY }, 201);
      }
      if (path.endsWith('/revoke')) {
        allowFields(body, ['society_id']);
        await db.batch([db.prepare('DELETE FROM portal_sessions WHERE society_id=?').bind(society.id), db.prepare('UPDATE portal_invitations SET revoked_at=? WHERE society_id=? AND revoked_at IS NULL').bind(Date.now(), society.id)]);
        await audit(db, session, 'access_revoked', society.id); return json({ ok: true });
      }
      fail(404, 'Portal action not found.');
    }
    if (session.role !== 'secretary') fail(403, 'Use a society invitation to open its workspace.');
    const base = await loadBaseCatalogue(), catalogue = await mergePortalCatalogue(base, env);
    const society = catalogue.societies.find(s => s.id === session.society_id);
    if (!society) fail(403, 'This society is no longer listed. Contact UniFlow.');
    if (path === '/api/portal/workspace' && request.method === 'GET') {
      const profile = await db.prepare('SELECT version FROM portal_profiles WHERE society_id=?').bind(society.id).first();
      return json({ society, events: catalogue.events.filter(e => e.society_id === society.id), profile_version: profile?.version || 0 });
    }
    if (path === '/api/portal/profile' && request.method === 'PATCH') {
      const body = await readBody(request), version = versionOf(body.version), patch = validateProfile(body);
      const prior = await db.prepare('SELECT data_json FROM portal_profiles WHERE society_id=?').bind(society.id).first();
      const data = { ...(prior ? JSON.parse(prior.data_json) : {}), ...patch }, modified = new Date().toISOString();
      const result = version === 0
        ? await db.prepare('INSERT INTO portal_profiles (society_id,data_json,version,modified_at) VALUES (?,?,1,?) ON CONFLICT(society_id) DO NOTHING RETURNING version').bind(society.id, JSON.stringify(data), modified).first()
        : await db.prepare('UPDATE portal_profiles SET data_json=?,version=version+1,modified_at=? WHERE society_id=? AND version=? RETURNING version').bind(JSON.stringify(data), modified, society.id, version).first();
      if (!result) fail(409, 'Someone saved newer society details. Reload them before saving your changes.', 'conflict');
      await audit(db, session, 'profile_published', society.id); return json({ society: { ...society, ...data }, profile_version: result.version });
    }
    const eventMatch = path.match(/^\/api\/portal\/events\/([^/]+)(\/cancel)?$/);
    if (path === '/api/portal/events' && request.method === 'POST') {
      const data = validateEvent(await readBody(request));
      const id = society.id + '-' + crypto.randomUUID(), modified = new Date().toISOString();
      const event = { ...data, id, society_id: society.id, status: 'confirmed', version: 1, modified_at: modified };
      await db.prepare('INSERT INTO portal_events (event_id,society_id,data_json,version,modified_at) VALUES (?,?,?,1,?)').bind(id, society.id, JSON.stringify(event), modified).run();
      await audit(db, session, 'event_created', id); return json({ event }, 201);
    }
    if (eventMatch && ((request.method === 'PATCH' && !eventMatch[2]) || (request.method === 'POST' && eventMatch[2]))) {
      const id = decodeURIComponent(eventMatch[1]), prior = catalogue.events.find(e => e.id === id && e.society_id === society.id);
      if (!prior) fail(404, 'That event is not part of your society.', 'not_found');
      const body = await readBody(request), version = versionOf(body.version);
      if (eventMatch[2]) allowFields(body, ['version']);
      const data = eventMatch[2] ? prior : validateEvent(body, true), modified = new Date().toISOString();
      const event = { ...data, id, society_id: society.id, status: eventMatch[2] ? 'cancelled' : 'confirmed', version: version + 1, modified_at: modified };
      const result = version === 0
        ? await db.prepare('INSERT INTO portal_events (event_id,society_id,data_json,version,modified_at) VALUES (?,?,?,1,?) ON CONFLICT(event_id) DO NOTHING RETURNING version').bind(id, society.id, JSON.stringify(event), modified).first()
        : await db.prepare('UPDATE portal_events SET data_json=?,version=version+1,modified_at=? WHERE event_id=? AND society_id=? AND version=? RETURNING version').bind(JSON.stringify(event), modified, id, society.id, version).first();
      if (!result) fail(409, 'Someone saved a newer version of this event. Reload it before saving your changes.', 'conflict');
      await audit(db, session, eventMatch[2] ? 'event_cancelled' : 'event_published', id); return json({ event });
    }
    fail(404, 'Portal action not found.');
  } catch (error) {
    if (error instanceof PortalError) return json({ error: error.message, code: error.code }, error.status);
    console.error('Portal request failed:', error.name);
    return json({ error: 'We could not save or load your changes. Please try again.', code: 'unavailable' }, 503);
  }
}
