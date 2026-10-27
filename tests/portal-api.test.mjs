import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePortalApi, mergePortalCatalogue } from '../worker/portal-api.js';
import { buildCalendar } from '../worker/index.js';
import { testDb } from './helpers/d1.mjs';

const ORIGIN = 'https://uniflow.test';
const base = { schema_version: 1, updated_at: '2026-10-27T00:00:00Z', societies: [{ id: 'art', name: 'Art Society', susu_url: 'https://www.susu.org/groups/art-soc' }, { id: 'boxing', name: 'Boxing' }], events: [{ id: 'art-existing', society_id: 'art', title: 'Art night', start: '2027-03-24T18:00:00Z', end: '2027-03-24T20:00:00Z', timezone: 'Europe/London' }, { id: 'boxing-existing', society_id: 'boxing', title: 'Training', start: '2027-03-24T18:00:00Z', end: '2027-03-24T20:00:00Z', timezone: 'Europe/London' }] };
const eventInput = { title: 'New members welcome', start: '2027-03-31T18:00:00+01:00', end: '2027-03-31T20:00:00+01:00', timezone: 'Europe/London', location: 'Building 42', description: 'Bring a friend.', source_url: 'https://example.com/book' };
function setup(t) {
  const db = testDb(); t.after(() => db.close());
  const env = { PORTAL_DB: db, PORTAL_ADMIN_KEY: 'owner-test-key-with-at-least-thirty-two-characters', PORTAL_ENVIRONMENT: 'preview' };
  async function call(path, method = 'GET', data, auth, extra = {}) {
    const headers = { origin: ORIGIN, ...extra };
    if (data !== undefined) headers['content-type'] = 'application/json';
    if (auth) { headers.cookie = auth.cookie; headers['x-csrf-token'] = auth.csrf_token; }
    const response = await handlePortalApi(new Request(ORIGIN + '/api/portal/' + path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) }), env, { loadBaseCatalogue: async () => structuredClone(base) });
    const body = await response.json(); return { response, body, status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], ...body };
  }
  const owner = () => call('session/admin', 'POST', { key: env.PORTAL_ADMIN_KEY });
  async function secretary(society = 'art') { const admin = await owner(); const invite = await call('admin/invitations', 'POST', { society_id: society, label: 'Alex secretary' }, admin); const token = new URL(invite.invite_url).hash.slice('#invite='.length); return call('session/invite', 'POST', { token }); }
  return { db, env, call, owner, secretary };
}

test('owner login, private invitation and revocation protect a society workspace', async t => {
  const { call, owner, db } = setup(t);
  assert.equal((await call('workspace')).status, 401);
  assert.equal((await call('session/admin', 'POST', { key: 'wrong' })).status, 401);
  const admin = await owner(); assert.equal(admin.role, 'admin');
  assert.match(admin.response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict.*Secure/);
  const invite = await call('admin/invitations', 'POST', { society_id: 'art', label: 'Alex' }, admin);
  assert.equal(invite.status, 201); assert.ok(invite.invite_url.startsWith(ORIGIN + '/secretary#invite='));
  const token = new URL(invite.invite_url).hash.slice(8);
  const stored = await db.prepare('SELECT * FROM portal_invitations').all(); assert.notEqual(stored.results[0].token_hash, token);
  const secretary = await call('session/invite', 'POST', { token }); assert.equal(secretary.role, 'secretary');
  assert.equal((await call('session/invite', 'POST', { token })).status, 401);
  const workspace = await call('workspace', 'GET', undefined, secretary);
  assert.equal(workspace.society.id, 'art'); assert.deepEqual(workspace.events.map(e => e.id), ['art-existing']);
  assert.equal((await call('admin/societies', 'GET', undefined, secretary)).status, 403);
  await call('admin/revoke', 'POST', { society_id: 'art' }, admin);
  assert.equal((await call('workspace', 'GET', undefined, secretary)).status, 401);
});

test('same-origin and CSRF protections reject forged writes', async t => {
  const { call, secretary, env } = setup(t);
  assert.equal((await call('session/admin', 'POST', { key: env.PORTAL_ADMIN_KEY }, null, { origin: 'https://evil.example' })).status, 403);
  const auth = await secretary();
  assert.equal((await call('profile', 'PATCH', { version: 0, description: 'bad' }, { ...auth, csrf_token: 'wrong' })).status, 403);
  assert.equal((await call('profile', 'PATCH', { version: 0, description: 'bad' }, auth, { origin: 'https://evil.example' })).status, 403);
});

test('one-use invitations resist parallel redemption and expire', async t => {
  const { call, owner, db } = setup(t); const admin = await owner();
  const issue = () => call('admin/invitations', 'POST', { society_id: 'art', label: 'Alex' }, admin);
  const invite = await issue(), token = new URL(invite.invite_url).hash.slice(8);
  const results = await Promise.all([call('session/invite', 'POST', { token }), call('session/invite', 'POST', { token })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 401]);
  const another = await issue(); await db.prepare('UPDATE portal_invitations SET expires_at=0 WHERE used_at IS NULL').run();
  assert.equal((await call('session/invite', 'POST', { token: new URL(another.invite_url).hash.slice(8) })).status, 401);
  await db.prepare('UPDATE portal_sessions SET expires_at=0').run();
  assert.equal((await call('admin/societies', 'GET', undefined, admin)).status, 401);
});

test('profile edits publish as an overlay without changing official identity', async t => {
  const { call, secretary, env } = setup(t); const auth = await secretary();
  assert.equal((await call('profile', 'PATCH', { version: 0, name: 'Impersonation' }, auth)).status, 400);
  assert.equal((await call('profile', 'PATCH', { version: 0, membership_url: 'javascript:alert(1)' }, auth)).status, 400);
  const saved = await call('profile', 'PATCH', { version: 0, how_to_join: 'Beginners welcome.\nThursday at 6pm.', membership_url: 'https://example.com/join', contact_email: 'art@example.com' }, auth);
  assert.equal(saved.profile_version, 1);
  assert.equal((await call('profile', 'PATCH', { version: 0, how_to_join: 'stale overwrite' }, auth)).status, 409);
  const publicData = await mergePortalCatalogue(base, env);
  assert.equal(publicData.societies[0].name, 'Art Society');
  assert.equal(publicData.societies[0].how_to_join, saved.society.how_to_join);
  assert.equal(publicData.societies[1].how_to_join, undefined);
  assert.ok(!JSON.stringify(publicData).includes('token_hash'));
});

test('event edits are society scoped, version checked and maintain calendar identity', async t => {
  const { call, secretary, env } = setup(t); const auth = await secretary();
  assert.equal((await call('events/boxing-existing', 'PATCH', { ...eventInput, version: 0 }, auth)).status, 404);
  assert.equal((await call('events', 'POST', { ...eventInput, society_id: 'boxing' }, auth)).status, 400);
  const create = await call('events', 'POST', eventInput, auth); assert.equal(create.status, 201); assert.equal(create.event.society_id, 'art');
  assert.equal(create.event.start, '2027-03-31T17:00:00.000Z');
  const changes = await Promise.all([call('events/' + create.event.id, 'PATCH', { ...eventInput, title: 'First update', version: 1 }, auth), call('events/' + create.event.id, 'PATCH', { ...eventInput, title: 'Second update', version: 1 }, auth)]);
  assert.deepEqual(changes.map(r => r.status).sort(), [200, 409]);
  const cancelled = await call('events/art-existing/cancel', 'POST', { version: 0 }, auth); assert.equal(cancelled.event.status, 'cancelled');
  const merged = await mergePortalCatalogue(base, env);
  const calendar = buildCalendar(merged.events.filter(e => e.society_id === 'art'), ORIGIN, ['Art Society']);
  assert.match(calendar, /UID:art-existing@society-synth/); assert.match(calendar, /STATUS:CANCELLED/); assert.match(calendar, /SEQUENCE:1/); assert.match(calendar, /URL:https:\/\/example.com\/book/);
  assert.equal(merged.events.filter(e => e.id === 'art-existing').length, 1);
});

test('invalid dates, durations and unsafe links never publish', async t => {
  const { call, secretary } = setup(t); const auth = await secretary();
  for (const patch of [{ title: '' }, { start: '2027-02-30T18:00:00Z' }, { end: eventInput.start }, { source_url: 'https://user:secret@example.com/' }, { timezone: 'America/New_York' }, { description: 'a'.repeat(4001) }, { start: '2027-03-31T18:00' }]) {
    assert.equal((await call('events', 'POST', { ...eventInput, ...patch }, auth)).status, 400, JSON.stringify(patch).slice(0, 100));
  }
});

test('unconfigured portals fail safely and auth attempts are rate limited', async t => {
  const response = await handlePortalApi(new Request(ORIGIN + '/api/portal/session'), {}, {});
  assert.deepEqual(await response.json(), { authenticated: false, configured: false });
  const { call } = setup(t);
  for (let i = 0; i < 20; i++) assert.equal((await call('session/admin', 'POST', { key: 'bad' })).status, 401);
  assert.equal((await call('session/admin', 'POST', { key: 'bad' })).status, 429);
});

test('branch previews cannot authenticate against the production database', async t => {
  const { env, call, owner } = setup(t);
  const auth = await owner();
  env.PORTAL_ALLOWED_ORIGINS = 'https://hack.marlowt.uk,https://marlowt.uk';
  assert.equal((await call('session', 'GET', undefined, auth)).configured, false);
  assert.equal((await call('session/admin', 'POST', { key: env.PORTAL_ADMIN_KEY })).status, 503);
  assert.equal((await call('admin/invitations', 'POST', { society_id: 'art', label: 'Alex' }, auth)).status, 503);
  env.PORTAL_ALLOWED_ORIGINS = ORIGIN;
  assert.equal((await call('session', 'GET', undefined, auth)).authenticated, true);
});

test('oversized request bodies are rejected without publishing', async t => {
  const { call, secretary, env } = setup(t); const auth = await secretary();
  assert.equal((await call('events', 'POST', { ...eventInput, description: 'x'.repeat(17000) }, auth)).status, 413);
  assert.equal((await mergePortalCatalogue(base, env)).events.length, base.events.length);
});
