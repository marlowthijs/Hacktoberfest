const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_COOKIE = 'society_synth_session';
const ADMIN_COOKIE = 'society_synth_admin';
const STATE_COOKIE = 'society_synth_oauth_state';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders } });
}

function redirect(url, status = 302, cookies = []) {
  const headers = new Headers({ Location: url, 'Cache-Control': 'no-store' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status, headers });
}

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function cookieMap(request) {
  const value = request.headers.get('Cookie') || '';
  return Object.fromEntries(value.split(';').map((part) => part.trim().split(/=(.*)/s).slice(0, 2)).filter(([name, item]) => name && item !== undefined));
}

function cookie(request, name, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function clearCookie(request, name) { return cookie(request, name, '', 0); }

function ensureSecret(value, name) {
  if (!value || value.length < 32) throw new HttpError(503, `${name} is not configured. Follow the deployment setup guide.`);
  return value;
}

async function signValue(payload, secret) {
  const text = base64url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', encoder.encode(ensureSecret(secret, 'Session secret')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
  return `${text}.${base64url(signature)}`;
}

async function verifyValue(value, secret) {
  if (!value || !value.includes('.')) return null;
  const [text, signatureText] = value.split('.');
  try {
    const key = await crypto.subtle.importKey('raw', encoder.encode(ensureSecret(secret, 'Session secret')), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, fromBase64url(signatureText), encoder.encode(text));
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(fromBase64url(text)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    return null;
  }
}

function randomToken(byteLength = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function constantTimeEqual(a, b) {
  const left = encoder.encode(String(a));
  const right = encoder.encode(String(b));
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

function requireDatabase(env) {
  if (!env.DB) throw new HttpError(503, 'The Society Synth database is not connected yet. Complete the Cloudflare setup steps.');
  return env.DB;
}

function requireGoogleConfig(env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new HttpError(503, 'Google Calendar is not configured yet. Add the OAuth credentials in Cloudflare.');
}

function assertSameOrigin(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return;
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'This request could not be verified. Refresh the page and try again.');
}

async function readJson(request) {
  try { return await request.json(); }
  catch { throw new HttpError(400, 'Please send valid form data.'); }
}

function requiredString(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label} is required.`);
  const clean = value.trim();
  if (clean.length > maxLength) throw new HttpError(400, `${label} must be ${maxLength} characters or fewer.`);
  return clean;
}

function optionalString(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be text.`);
  const clean = value.trim();
  if (clean.length > maxLength) throw new HttpError(400, `${label} must be ${maxLength} characters or fewer.`);
  return clean;
}

function normalizedDate(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label} is required.`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new HttpError(400, `${label} is not a valid date and time.`);
  return date.toISOString();
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || `society-${crypto.randomUUID().slice(0, 8)}`;
}

async function currentUser(request, env, required = true) {
  const token = cookieMap(request)[SESSION_COOKIE];
  const session = await verifyValue(token, env.SESSION_SECRET);
  if (!session?.sub) {
    if (required) throw new HttpError(401, 'Connect your Google Calendar to continue.');
    return null;
  }
  const row = await requireDatabase(env).prepare('SELECT user_id, email, display_name, last_sync_at, last_sync_error FROM users WHERE user_id = ?').bind(session.sub).first();
  if (!row && required) throw new HttpError(401, 'Your calendar connection has expired. Please connect again.');
  return row || null;
}

async function requireAdmin(request, env) {
  const session = await verifyValue(cookieMap(request)[ADMIN_COOKIE], env.ADMIN_SECRET);
  if (!session?.role || session.role !== 'admin') throw new HttpError(401, 'Sign in to team admin first.');
}

function oauthRedirectUrl(request) { return `${new URL(request.url).origin}/auth/callback`; }

async function startOAuth(request, env) {
  requireGoogleConfig(env);
  const state = randomToken(32);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: oauthRedirectUrl(request),
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events.owned',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state
  });
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302, [cookie(request, STATE_COOKIE, state, 600)]);
}

async function exchangeAuthorizationCode(code, request, env) {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: oauthRedirectUrl(request),
    grant_type: 'authorization_code'
  });
  const response = await fetch(GOOGLE_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new HttpError(502, 'Google could not complete the calendar connection. Check the OAuth setup and try again.');
  return result;
}

function decodeKey(value) {
  try { return fromBase64url(value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')); }
  catch { throw new HttpError(503, 'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.'); }
}

function base64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptRefreshToken(token, env) {
  if (!env.TOKEN_ENCRYPTION_KEY) throw new HttpError(503, 'The token encryption key is not configured. Follow the deployment setup guide.');
  let raw;
  try { raw = decodeBase64(env.TOKEN_ENCRYPTION_KEY); } catch { throw new HttpError(503, 'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.'); }
  if (raw.length !== 32) throw new HttpError(503, 'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(token)));
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0); packed.set(ciphertext, iv.length);
  return base64(packed);
}

async function decryptRefreshToken(value, env) {
  let raw;
  try { raw = decodeBase64(env.TOKEN_ENCRYPTION_KEY); } catch { throw new HttpError(503, 'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.'); }
  if (raw.length !== 32) throw new HttpError(503, 'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  const packed = decodeBase64(value);
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  try { return decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.slice(0, 12) }, key, packed.slice(12))); }
  catch { throw new HttpError(500, 'The saved Google connection could not be read. Reconnect your calendar.'); }
}

async function finishOAuth(request, env) {
  const cookies = cookieMap(request);
  const params = new URL(request.url).searchParams;
  if (params.has('error')) return redirect('/?google=cancelled', 302, [clearCookie(request, STATE_COOKIE)]);
  const state = params.get('state') || '';
  const code = params.get('code') || '';
  if (!code || !state || !constantTimeEqual(state, cookies[STATE_COOKIE] || '')) throw new HttpError(400, 'The calendar connection could not be verified. Please try again.');
  requireGoogleConfig(env);
  const tokens = await exchangeAuthorizationCode(code, request, env);
  const infoResponse = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const profile = await infoResponse.json().catch(() => ({}));
  if (!infoResponse.ok || !profile.sub || !profile.email) throw new HttpError(502, 'Google did not return an account we could use. Please try again.');
  const db = requireDatabase(env);
  const prior = await db.prepare('SELECT refresh_token_enc FROM users WHERE user_id = ?').bind(profile.sub).first();
  const encrypted = tokens.refresh_token ? await encryptRefreshToken(tokens.refresh_token, env) : prior?.refresh_token_enc;
  if (!encrypted) throw new HttpError(400, 'Google did not provide offline calendar access. Disconnect the app in your Google account and reconnect.');
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO users (user_id, email, display_name, refresh_token_enc, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
    refresh_token_enc = excluded.refresh_token_enc, updated_at = excluded.updated_at`)
    .bind(profile.sub, profile.email, profile.name || profile.given_name || '', encrypted, now, now).run();
  const session = await signValue({ sub: profile.sub, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, env.SESSION_SECRET);
  return redirect('/?google=connected', 302, [cookie(request, SESSION_COOKIE, session, 60 * 60 * 24 * 30), clearCookie(request, STATE_COOKIE)]);
}

async function bootstrap(request, env) {
  const db = requireDatabase(env);
  const now = new Date().toISOString();
  const [societyResult, eventResult, user] = await Promise.all([
    db.prepare(`SELECT s.id, s.slug, s.name, s.abbreviation, s.description,
      (SELECT COUNT(*) FROM subscriptions sub WHERE sub.society_id = s.id) AS member_count
      FROM societies s WHERE s.active = 1 ORDER BY s.name COLLATE NOCASE`).all(),
    db.prepare(`SELECT e.id, e.society_id, e.title, e.start_at, e.end_at, e.location, e.description,
      s.name AS society_name, s.abbreviation AS society_abbreviation
      FROM events e JOIN societies s ON s.id = e.society_id
      WHERE e.status = 'published' AND e.end_at >= ? ORDER BY e.start_at ASC`).bind(now).all(),
    currentUser(request, env, false)
  ]);
  let selectedSocietyIds = [];
  if (user) {
    const result = await db.prepare('SELECT society_id FROM subscriptions WHERE user_id = ?').bind(user.user_id).all();
    selectedSocietyIds = (result.results || []).map((row) => row.society_id);
  }
  return json({
    user: user ? { email: user.email, display_name: user.display_name, last_sync_at: user.last_sync_at, last_sync_error: user.last_sync_error } : null,
    societies: societyResult.results || [], events: eventResult.results || [], selectedSocietyIds
  });
}

async function subscribe(request, env, societyId) {
  const user = await currentUser(request, env);
  const body = await readJson(request);
  if (typeof body.joined !== 'boolean') throw new HttpError(400, 'Choose whether you want to follow this society.');
  const db = requireDatabase(env);
  const society = await db.prepare('SELECT id FROM societies WHERE id = ? AND active = 1').bind(societyId).first();
  if (!society) throw new HttpError(404, 'That society is not available.');
  if (body.joined) {
    await db.prepare('INSERT OR IGNORE INTO subscriptions (user_id, society_id, created_at) VALUES (?, ?, ?)').bind(user.user_id, societyId, new Date().toISOString()).run();
  } else {
    await db.prepare('DELETE FROM subscriptions WHERE user_id = ? AND society_id = ?').bind(user.user_id, societyId).run();
  }
  return json({ ok: true, joined: body.joined });
}

async function adminSession(request, env) {
  const session = await verifyValue(cookieMap(request)[ADMIN_COOKIE], env.ADMIN_SECRET);
  return json({ authenticated: session?.role === 'admin' });
}

async function adminLogin(request, env) {
  const expected = ensureSecret(env.ADMIN_SECRET, 'ADMIN_SECRET');
  const body = await readJson(request);
  if (typeof body.password !== 'string' || !constantTimeEqual(body.password, expected)) throw new HttpError(401, 'That password did not match.');
  const value = await signValue({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 }, expected);
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, ADMIN_COOKIE, value, 60 * 60 * 12) });
}

async function adminLogout(request) { return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(request, ADMIN_COOKIE) }); }

async function listAdminSocieties(env) {
  const result = await requireDatabase(env).prepare(`SELECT s.id, s.slug, s.name, s.abbreviation, s.description, s.active, s.created_at,
    (SELECT COUNT(*) FROM subscriptions sub WHERE sub.society_id = s.id) AS member_count
    FROM societies s ORDER BY s.name COLLATE NOCASE`).all();
  return json({ societies: result.results || [] });
}

async function createSociety(request, env) {
  const body = await readJson(request);
  const name = requiredString(body.name, 'Society name', 90);
  const abbreviation = optionalString(body.abbreviation, 'Short name', 12);
  const description = optionalString(body.description, 'Description', 240);
  const slug = slugify(name);
  const id = `society-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  try {
    await requireDatabase(env).prepare('INSERT INTO societies (id, slug, name, abbreviation, description, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
      .bind(id, slug, name, abbreviation, description, now).run();
  } catch { throw new HttpError(409, 'A society with a similar name is already on the board.'); }
  return json({ id, slug, name, abbreviation, description, active: 1 }, 201);
}

async function deactivateSociety(env, id) {
  const result = await requireDatabase(env).prepare('UPDATE societies SET active = 0 WHERE id = ?').bind(id).run();
  if (!result.meta?.changes) throw new HttpError(404, 'That society was not found.');
  return json({ ok: true });
}

async function listAdminEvents(env) {
  const result = await requireDatabase(env).prepare(`SELECT e.id, e.society_id, e.title, e.start_at, e.end_at, e.location, e.description,
    e.status, e.created_at, e.updated_at, s.name AS society_name, s.abbreviation AS society_abbreviation
    FROM events e JOIN societies s ON s.id = e.society_id ORDER BY e.start_at ASC`).all();
  return json({ events: result.results || [] });
}

async function eventValues(body, env) {
  const db = requireDatabase(env);
  const societyId = requiredString(body.society_id, 'Society', 100);
  const society = await db.prepare('SELECT id FROM societies WHERE id = ? AND active = 1').bind(societyId).first();
  if (!society) throw new HttpError(400, 'Choose an active society.');
  const title = requiredString(body.title, 'Event name', 120);
  const startAt = normalizedDate(body.start_at, 'Start time');
  const endAt = normalizedDate(body.end_at, 'End time');
  if (new Date(endAt) <= new Date(startAt)) throw new HttpError(400, 'The end time must be after the start time.');
  const status = body.status === 'draft' ? 'draft' : 'published';
  return { societyId, title, startAt, endAt, location: optionalString(body.location, 'Location', 180), description: optionalString(body.description, 'Description', 1600), status };
}

async function createEvent(request, env) {
  const values = await eventValues(await readJson(request), env);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await requireDatabase(env).prepare(`INSERT INTO events (id, society_id, title, start_at, end_at, location, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, values.societyId, values.title, values.startAt, values.endAt, values.location, values.description, values.status, now, now).run();
  return json({ id, ...values }, 201);
}

async function updateEvent(request, env, id) {
  const values = await eventValues(await readJson(request), env);
  const result = await requireDatabase(env).prepare(`UPDATE events SET society_id = ?, title = ?, start_at = ?, end_at = ?, location = ?, description = ?, status = ?, updated_at = ? WHERE id = ? AND status != 'cancelled'`)
    .bind(values.societyId, values.title, values.startAt, values.endAt, values.location, values.description, values.status, new Date().toISOString(), id).run();
  if (!result.meta?.changes) throw new HttpError(404, 'That event is no longer available to edit.');
  return json({ id, ...values });
}

async function cancelEvent(env, id) {
  const result = await requireDatabase(env).prepare(`UPDATE events SET status = 'cancelled', updated_at = ? WHERE id = ? AND status != 'cancelled'`)
    .bind(new Date().toISOString(), id).run();
  if (!result.meta?.changes) throw new HttpError(404, 'That event was not found or was already cancelled.');
  return json({ ok: true, calendar_action: 'The event will be removed from calendars on the next sync.' });
}

async function encryptKey(env) {
  if (!env.TOKEN_ENCRYPTION_KEY) throw new HttpError(503, 'The token encryption key is not configured.');
}

async function accessTokenFor(user, env) {
  requireGoogleConfig(env);
  await encryptKey(env);
  const refreshToken = await decryptRefreshToken(user.refresh_token_enc, env);
  const body = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' });
  const response = await fetch(GOOGLE_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new HttpError(401, 'Google Calendar access expired. Disconnect and connect your calendar again.');
  return result.access_token;
}

async function calendarRequest(accessToken, method, url, body) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (response.ok) return { ok: true, status: response.status };
  if (response.status === 404) return { ok: false, status: 404 };
  if (response.status === 409) return { ok: false, status: 409 };
  if (response.status === 401) throw new HttpError(401, 'Google Calendar access expired. Connect your calendar again.');
  if (response.status === 403) throw new HttpError(502, 'Google Calendar did not allow this update. Check that the Calendar API and calendar.events.owned permission are enabled.');
  throw new HttpError(502, `Google Calendar returned an error (${response.status}). Check the connection and try again.`);
}

async function deterministicEventId(userId, eventId) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(`${userId}:${eventId}`));
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function calendarBody(event) {
  const details = [`Society: ${event.society_name}`, event.description || '', 'Added by Society Synth.'].filter(Boolean).join('\n\n');
  return {
    summary: event.title,
    description: details,
    location: event.location || undefined,
    start: { dateTime: event.start_at },
    end: { dateTime: event.end_at },
    extendedProperties: { private: { societySynthEventId: event.id, societySynth: '1' } }
  };
}

async function syncOneUser(user, env) {
  const db = requireDatabase(env);
  let added = 0;
  let updated = 0;
  let cancelled = 0;
  try {
    const accessToken = await accessTokenFor(user, env);
    const now = new Date().toISOString();
    const [activeResult, cancelledResult, entriesResult] = await Promise.all([
      db.prepare(`SELECT e.id, e.title, e.start_at, e.end_at, e.location, e.description, s.name AS society_name
        FROM subscriptions sub JOIN events e ON e.society_id = sub.society_id JOIN societies s ON s.id = e.society_id
        WHERE sub.user_id = ? AND e.status = 'published' AND e.end_at >= ? ORDER BY e.start_at ASC`)
        .bind(user.user_id, now).all(),
      db.prepare(`SELECT e.id, ce.google_event_id FROM calendar_entries ce JOIN events e ON e.id = ce.event_id
        WHERE ce.user_id = ? AND e.status = 'cancelled'`).bind(user.user_id).all(),
      db.prepare('SELECT event_id, google_event_id FROM calendar_entries WHERE user_id = ?').bind(user.user_id).all()
    ]);
    const entries = new Map((entriesResult.results || []).map((row) => [row.event_id, row.google_event_id]));
    for (const event of activeResult.results || []) {
      const eventId = await deterministicEventId(user.user_id, event.id);
      const storedId = entries.get(event.id);
      const googleId = storedId || eventId;
      const body = { ...calendarBody(event), id: googleId };
      const url = `${GOOGLE_CALENDAR_URL}/${encodeURIComponent(googleId)}?sendUpdates=none`;
      let result;
      if (storedId) {
        result = await calendarRequest(accessToken, 'PUT', url, body);
        if (result.status === 404) {
          result = await calendarRequest(accessToken, 'POST', `${GOOGLE_CALENDAR_URL}?sendUpdates=none`, body);
          if (result.status === 409) { await calendarRequest(accessToken, 'PUT', url, body); updated += 1; }
          else added += 1;
        } else updated += 1;
      } else {
        result = await calendarRequest(accessToken, 'POST', `${GOOGLE_CALENDAR_URL}?sendUpdates=none`, body);
        if (result.status === 409) {
          await calendarRequest(accessToken, 'PUT', url, body);
          updated += 1;
        } else added += 1;
      }
      entries.set(event.id, googleId);
      await db.prepare(`INSERT INTO calendar_entries (user_id, event_id, google_event_id, synced_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, event_id) DO UPDATE SET google_event_id = excluded.google_event_id, synced_at = excluded.synced_at`)
        .bind(user.user_id, event.id, googleId, new Date().toISOString()).run();
    }
    for (const event of cancelledResult.results || []) {
      const googleId = event.google_event_id || await deterministicEventId(user.user_id, event.id);
      await calendarRequest(accessToken, 'DELETE', `${GOOGLE_CALENDAR_URL}/${encodeURIComponent(googleId)}`);
      await db.prepare('DELETE FROM calendar_entries WHERE user_id = ? AND event_id = ?').bind(user.user_id, event.id).run();
      cancelled += 1;
    }
    const syncedAt = new Date().toISOString();
    await db.prepare('UPDATE users SET last_sync_at = ?, last_sync_error = NULL, updated_at = ? WHERE user_id = ?').bind(syncedAt, syncedAt, user.user_id).run();
    return { added, updated, cancelled, errors: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calendar sync failed.';
    await db.prepare('UPDATE users SET last_sync_error = ?, updated_at = ? WHERE user_id = ?').bind(message.slice(0, 500), new Date().toISOString(), user.user_id).run().catch(() => {});
    throw error;
  }
}

async function syncAllUsers(env) {
  const result = await requireDatabase(env).prepare('SELECT user_id, email, display_name, refresh_token_enc FROM users').all();
  const summary = { users: (result.results || []).length, added: 0, updated: 0, cancelled: 0, errors: 0 };
  for (const user of result.results || []) {
    try {
      const synced = await syncOneUser(user, env);
      summary.added += synced.added;
      summary.updated += synced.updated;
      summary.cancelled += synced.cancelled;
    } catch (error) {
      summary.errors += 1;
      console.error('Society Synth calendar sync failed for a user:', error instanceof Error ? error.message : 'unknown error');
    }
  }
  return summary;
}

async function syncCurrentUser(request, env) {
  const user = await currentUser(request, env);
  const stored = await requireDatabase(env).prepare('SELECT user_id, email, display_name, refresh_token_enc FROM users WHERE user_id = ?').bind(user.user_id).first();
  try { return json(await syncOneUser(stored, env)); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(502, 'Calendar sync did not finish. Check your Google connection and try again.'); }
}

async function disconnectAccount(request, env) {
  const user = await currentUser(request, env);
  const db = requireDatabase(env);
  const stored = await db.prepare('SELECT refresh_token_enc FROM users WHERE user_id = ?').bind(user.user_id).first();
  if (stored?.refresh_token_enc && env.TOKEN_ENCRYPTION_KEY) {
    try {
      const token = await decryptRefreshToken(stored.refresh_token_enc, env);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }) });
    } catch (error) { console.warn('Google token revocation did not complete:', error instanceof Error ? error.message : 'unknown error'); }
  }
  await db.prepare('DELETE FROM users WHERE user_id = ?').bind(user.user_id).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(request, SESSION_COOKIE) });
}

async function routeApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path === '/api/bootstrap' && method === 'GET') return bootstrap(request, env);
  if (path === '/api/admin/session' && method === 'GET') return adminSession(request, env);
  if (path === '/api/admin/login' && method === 'POST') return adminLogin(request, env);
  if (path === '/api/admin/logout' && method === 'POST') return adminLogout(request);

  const subscriptionMatch = path.match(/^\/api\/subscriptions\/([^/]+)$/);
  if (subscriptionMatch && method === 'POST') return subscribe(request, env, decodeURIComponent(subscriptionMatch[1]));
  if (path === '/api/calendar/sync' && method === 'POST') return syncCurrentUser(request, env);
  if (path === '/api/account/disconnect' && method === 'POST') return disconnectAccount(request, env);

  if (path === '/api/admin/societies' && method === 'GET') { await requireAdmin(request, env); return listAdminSocieties(env); }
  if (path === '/api/admin/societies' && method === 'POST') { await requireAdmin(request, env); return createSociety(request, env); }
  const societyMatch = path.match(/^\/api\/admin\/societies\/([^/]+)$/);
  if (societyMatch && method === 'DELETE') { await requireAdmin(request, env); return deactivateSociety(env, decodeURIComponent(societyMatch[1])); }

  if (path === '/api/admin/events' && method === 'GET') { await requireAdmin(request, env); return listAdminEvents(env); }
  if (path === '/api/admin/events' && method === 'POST') { await requireAdmin(request, env); return createEvent(request, env); }
  const eventMatch = path.match(/^\/api\/admin\/events\/([^/]+)$/);
  if (eventMatch && method === 'PUT') { await requireAdmin(request, env); return updateEvent(request, env, decodeURIComponent(eventMatch[1])); }
  if (eventMatch && method === 'DELETE') { await requireAdmin(request, env); return cancelEvent(env, decodeURIComponent(eventMatch[1])); }
  if (path === '/api/admin/sync' && method === 'POST') {
    await requireAdmin(request, env);
    return json(await syncAllUsers(env));
  }
  throw new HttpError(404, 'That Society Synth action was not found.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/auth/google' && request.method === 'GET') return await startOAuth(request, env);
      if (url.pathname === '/auth/callback' && request.method === 'GET') {
        try { return await finishOAuth(request, env); }
        catch (error) {
          if (error instanceof HttpError) return redirect('/?google=error', 302, [clearCookie(request, STATE_COOKIE)]);
          throw error;
        }
      }
      if (url.pathname.startsWith('/api/')) {
        assertSameOrigin(request);
        return await routeApi(request, env);
      }
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('Society Synth assets are not configured.', { status: 503 });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      console.error('Society Synth request failed:', message);
      return json({ error: status === 500 ? 'Something went wrong. Check the Worker logs and try again.' : message }, status);
    }
  },

  async scheduled(_controller, env, context) {
    context.waitUntil(syncAllUsers(env).then((summary) => console.info('Society Synth weekly calendar sync finished:', JSON.stringify(summary))));
  }
};
