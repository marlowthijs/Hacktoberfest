import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import { SECRETARY_PAGE } from '../worker/secretary-page.js';
import { PORTAL_SCRIPT } from '../worker/portal-client.js';
import { handlePortalApi, mergePortalCatalogue } from '../worker/portal-api.js';
import worker from '../worker/index.js';
import { testDb } from './helpers/d1.mjs';

const origin = 'https://uniflow.test';
const base = { schema_version: 1, updated_at: '2026-10-27T00:00:00Z', societies: [{ id: 'art', name: 'Art Society', description: 'Make things together.' }], events: [] };
async function until(check) { for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(r => setTimeout(r, 5)); } assert.ok(check(), 'UI did not reach the expected state'); }
function app(t, env, url) {
  let cookie = ''; const errors = [], requests = [];
  const console = new VirtualConsole(); console.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(SECRETARY_PAGE, { url, runScripts: 'outside-only', virtualConsole: console, beforeParse(w) {
    w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.confirm = () => true;
    w.fetch = async (path, init = {}) => {
      requests.push({ path, init, hash: w.location.hash });
      if (path === '/api/events') return Response.json(base);
      const headers = { ...init.headers, origin }; if (cookie) headers.cookie = cookie;
      const response = await handlePortalApi(new Request(new URL(path, origin), { ...init, headers }), env, { loadBaseCatalogue: async () => structuredClone(base) });
      if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      return response;
    };
  } });
  dom.window.eval(PORTAL_SCRIPT); t.after(() => dom.window.close());
  const d = dom.window.document;
  const submit = id => { const form = d.getElementById(id); form.dispatchEvent(new dom.window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: form.querySelector('button[type="submit"],button:not([type])') })); };
  return { dom, d, submit, requests, errors };
}

test('owner invites secretary, who publishes details and events, duplicates and cancels', async t => {
  const db = testDb(); t.after(() => db.close());
  const env = { PORTAL_DB: db, PORTAL_ADMIN_KEY: 'a'.repeat(64), PORTAL_ENVIRONMENT: 'preview' };
  const admin = app(t, env, origin + '/secretary/admin');
  await until(() => !admin.d.getElementById('owner-login').hidden);
  admin.d.getElementById('owner-key').value = env.PORTAL_ADMIN_KEY; admin.submit('owner-login-form');
  await until(() => !admin.d.getElementById('admin').hidden);
  admin.d.querySelector('[data-society="art"]').click(); admin.d.getElementById('invite-label').value = 'Alex'; admin.submit('invite-form');
  await until(() => !admin.d.getElementById('invite-result').hidden);
  const invite = admin.d.getElementById('invite-url').value; assert.match(invite, /#invite=/);
  const secretary = app(t, env, invite);
  await until(() => !secretary.d.getElementById('invite').hidden);
  assert.equal(secretary.dom.window.location.hash, ''); assert.equal(secretary.requests[0].hash, '');
  secretary.d.getElementById('accept-invite').click();
  await until(() => !secretary.d.getElementById('workspace').hidden);
  assert.equal(secretary.d.getElementById('workspace-name').textContent, 'Art Society');
  secretary.d.getElementById('profile-tab').click(); const form = secretary.d.getElementById('profile-form');
  form.elements.how_to_join.value = 'Come on Thursdays. <img src=x onerror=alert(1)>';
  form.elements.membership_url.value = 'https://example.com/join';
  form.dispatchEvent(new secretary.dom.window.Event('input', { bubbles: true }));
  assert.equal(secretary.d.getElementById('profile-preview-join').children.length, 0);
  secretary.submit('profile-form');
  await until(() => secretary.d.getElementById('status').textContent.includes('details published'));
  const merged = await mergePortalCatalogue(base, env); assert.match(merged.societies[0].how_to_join, /Thursdays/);
  secretary.d.getElementById('new-event').click(); const eventForm = secretary.d.getElementById('event-form');
  eventForm.elements.title.value = 'Welcome night'; eventForm.elements.start.value = '2027-07-05T18:00'; eventForm.elements.end.value = '2027-07-05T20:00';
  secretary.submit('event-form');
  await until(() => !secretary.d.getElementById('workspace').hidden);
  let data = await mergePortalCatalogue(base, env); assert.equal(data.events.length, 1); assert.equal(data.events[0].start, '2027-07-05T17:00:00.000Z');
  secretary.d.querySelector('[data-action="duplicate"]').click();
  assert.match(secretary.d.getElementById('editor-title').textContent, /Duplicate/);
  eventForm.elements.start.value = '2027-07-12T18:00'; eventForm.elements.end.value = '2027-07-12T20:00'; secretary.submit('event-form');
  await until(() => !secretary.d.getElementById('workspace').hidden);
  data = await mergePortalCatalogue(base, env); assert.equal(data.events.length, 2); assert.notEqual(data.events[0].id, data.events[1].id);
  secretary.d.querySelector('[data-action="cancel"]').click(); secretary.d.getElementById('cancel-confirm-yes').click();
  await until(() => secretary.d.getElementById('status').textContent.includes('Event cancelled'));
  data = await mergePortalCatalogue(base, env); assert.equal(data.events.filter(e => e.status === 'cancelled').length, 1);
  secretary.d.querySelector('[data-filter="cancelled"]').click(); assert.match(secretary.d.getElementById('events-list').textContent, /Restore/);
  assert.deepEqual(admin.errors, []); assert.deepEqual(secretary.errors, []);
});

test('public cards render joining text safely and exclude cancelled events', async t => {
  const response = await worker.fetch(new Request(origin));
  const html = await response.text();
  const console = new VirtualConsole(); const errors = []; console.on('jsdomError', e => errors.push(e.message));
  const data = { ...base, societies: [{ ...base.societies[0], how_to_join: '<script>bad()</script> Meet on Thursday', membership_url: 'https://example.com/join' }], events: [{ id: 'cancelled', society_id: 'art', title: 'Cancelled session', status: 'cancelled', start: '2030-07-05T18:00:00Z', end: '2030-07-05T20:00:00Z' }, { id: 'live', society_id: 'art', title: 'Welcome', start: '2030-07-06T18:00:00Z', end: '2030-07-06T20:00:00Z' }] };
  const dom = new JSDOM(html, { url: origin, runScripts: 'dangerously', virtualConsole: console, beforeParse(w) { w.fetch = async () => Response.json(data); w.matchMedia = () => ({ matches: false }); w.scrollTo = () => {}; } });
  t.after(() => dom.window.close());
  await until(() => dom.window.document.querySelector('.society-involvement'));
  const d = dom.window.document; assert.equal(d.querySelector('.society-involvement script'), null);
  assert.match(d.querySelector('.society-involvement').textContent, /Meet on Thursday/);
  assert.equal(d.querySelector('.society-events').textContent, '1 upcoming event');
  assert.doesNotMatch(d.getElementById('event-list').textContent, /Cancelled session/);
  assert.deepEqual(errors, []);
});

test('portal pages and scripts are not cached or frameable', async () => {
  const response = await worker.fetch(new Request(origin + '/secretary'));
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const script = await worker.fetch(new Request(origin + '/assets/portal.js')); assert.match(script.headers.get('content-type'), /javascript/); assert.equal(await script.text(), PORTAL_SCRIPT);
});

test('a catalogue outage does not publish a partial subscribed feed', async t => {
  const db = testDb(); t.after(() => db.close());
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Upstream unavailable'); });
  t.mock.method(console, 'error', () => {});
  const response = await worker.fetch(new Request(origin + '/calendar.ics?societies=art'), { PORTAL_DB: db });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /BEGIN:VCALENDAR/);
});
