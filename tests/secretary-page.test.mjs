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
function app(t, env, url, options = {}) {
  let cookie = options.cookie || ''; const errors = [], requests = []; const source = options.source || base;
  const console = new VirtualConsole(); console.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(SECRETARY_PAGE, { url, runScripts: 'outside-only', virtualConsole: console, beforeParse(w) {
    w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.confirm = () => true;
    for (const [key,value] of Object.entries(options.storage || {})) w.localStorage.setItem(key,value);
    if (options.storageFails) w.Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
    w.fetch = async (path, init = {}) => {
      requests.push({ path, init, hash: w.location.hash });
      if (options.failRequest?.(path,init)) throw new Error('Network unavailable');
      if (path === '/api/events') return Response.json(source);
      const headers = { ...init.headers, origin }; if (cookie) headers.cookie = cookie;
      if (options.waitRequest) await options.waitRequest(path,init);
      const response = await handlePortalApi(new Request(new URL(path, origin), { ...init, headers }), env, { loadBaseCatalogue: async () => structuredClone(source) });
      if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      if (options.loseResponse?.(path,init)) throw new Error('Response lost after publishing');
      return response;
    };
  } });
  dom.window.eval(PORTAL_SCRIPT); t.after(() => dom.window.close());
  const d = dom.window.document;
  const submit = id => { const form = d.getElementById(id); form.dispatchEvent(new dom.window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: form.querySelector('button[type="submit"],button:not([type])') })); };
  return { dom, d, submit, requests, errors, cookie:()=>cookie, storage:()=>Object.fromEntries(Object.entries(dom.window.localStorage)) };
}

async function leader(t, options = {}) {
 const db=testDb();t.after(()=>db.close());const env={PORTAL_DB:db,PORTAL_ADMIN_KEY:'a'.repeat(64),PORTAL_ENVIRONMENT:'preview'};
 const admin=app(t,env,origin+'/secretary/admin',options);await until(()=>!admin.d.getElementById('owner-login').hidden);admin.d.getElementById('owner-key').value=env.PORTAL_ADMIN_KEY;admin.submit('owner-login-form');await until(()=>!admin.d.getElementById('admin').hidden);
 admin.d.querySelector('[data-society="art"]').click();admin.d.getElementById('invite-label').value='Leader preview';admin.submit('invite-form');await until(()=>!admin.d.getElementById('invite-result').hidden);
 const ui=app(t,env,admin.d.getElementById('invite-url').value,options);await until(()=>!ui.d.getElementById('invite').hidden);ui.d.getElementById('accept-invite').click();await until(()=>!ui.d.getElementById('workspace').hidden);
 const input=(form,key,value)=>{const field=ui.d.getElementById(form).elements[key];field.value=value;field.dispatchEvent(new ui.dom.window.Event('input',{bubbles:true}));};
 return {...ui,env,db,input,source:options.source||base};
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

const draftKey='uniflow:leader-drafts:v1:art';
const futureEvent=(id,extra={})=>({id,society_id:'art',title:'Session '+id,start:'2027-03-26T18:00:00Z',end:'2027-03-26T20:00:00Z',timezone:'Europe/London',location:'Building 42',...extra});
test('leaders see six events at a time and a separate queue for dates needing confirmation',async t=>{
 const source={...base,events:[...Array.from({length:15},(_,i)=>futureEvent('e'+i)),futureEvent('tentative',{verification_status:'needs_confirmation'}),futureEvent('cancelled',{status:'cancelled'})]};
 const ui=await leader(t,{source});assert.equal(ui.d.querySelectorAll('.event-card').length,6);assert.equal(ui.d.getElementById('overview-upcoming-count').textContent,'15');assert.equal(ui.d.getElementById('overview-review-count').textContent,'1');assert.doesNotMatch(ui.d.getElementById('events-list').textContent,/tentative/);
 ui.d.getElementById('more-events').click();assert.equal(ui.d.querySelectorAll('.event-card').length,12);assert.equal(ui.d.activeElement,ui.d.querySelectorAll('.event-card')[6]);
 const search=ui.d.getElementById('event-search');search.value='e14';search.dispatchEvent(new ui.dom.window.Event('input'));assert.equal(ui.d.querySelectorAll('.event-card').length,1);
 ui.d.getElementById('overview-review').click();assert.match(ui.d.getElementById('events-list').textContent,/Needs confirmation/);assert.equal(search.value,'');ui.d.querySelector('[data-action="edit"]').click();assert.match(ui.d.getElementById('editor-title').textContent,/Confirm/);
 ui.submit('event-form');await until(()=>!ui.d.getElementById('workspace').hidden);assert.equal(ui.d.getElementById('overview-review-count').textContent,'0');assert.equal(ui.d.getElementById('overview-upcoming-count').textContent,'16');assert.deepEqual(ui.errors,[]);
});

test('event drafts survive leaving and reloading, without publishing until requested',async t=>{
 const ui=await leader(t);ui.d.getElementById('new-event').click();ui.input('event-form','title','Welcome evening');ui.input('event-form','description','Bring a friend. <img src=x onerror=alert(1)>');ui.d.getElementById('save-event-draft').click();
 assert.equal(ui.d.getElementById('workspace').hidden,false);assert.equal(ui.d.getElementById('draft-tray').hidden,false);assert.equal((await mergePortalCatalogue(base,ui.env)).events.length,0);
 const restored=app(t,ui.env,origin+'/secretary',{cookie:ui.cookie(),storage:ui.storage()});await until(()=>!restored.d.getElementById('workspace').hidden);restored.d.querySelector('[data-resume-draft]').click();
 assert.equal(restored.d.getElementById('event-form').elements.title.value,'Welcome evening');assert.equal(restored.d.getElementById('event-preview-description').children.length,0);assert.match(restored.d.getElementById('event-preview-description').textContent,/<img/);
 restored.submit('event-form');await until(()=>!restored.d.getElementById('workspace').hidden);assert.equal((await mergePortalCatalogue(base,ui.env)).events.length,1);assert.equal(restored.d.getElementById('draft-tray').hidden,true);assert.deepEqual(restored.errors,[]);
});

test('a lost publish response can be retried without creating duplicate events',async t=>{
 let lose=true;const ui=await leader(t,{loseResponse:(path,init)=>{if(lose&&path==='/api/portal/events'&&init.method==='POST'){lose=false;return true;}return false;}});
 ui.d.getElementById('new-event').click();ui.input('event-form','title','One event only');ui.submit('event-form');await until(()=>ui.d.getElementById('status').textContent.includes('Could not connect'));
 assert.equal((await mergePortalCatalogue(base,ui.env)).events.length,1);assert.equal(ui.d.getElementById('event-editor').hidden,false);assert.ok(JSON.parse(ui.storage()[draftKey])['event:new']);
 ui.submit('event-form');await until(()=>!ui.d.getElementById('workspace').hidden);assert.equal((await mergePortalCatalogue(base,ui.env)).events.length,1);assert.equal(ui.d.getElementById('draft-tray').hidden,true);
 const posts=ui.requests.filter(r=>r.path==='/api/portal/events');assert.equal(JSON.parse(posts[0].init.body).request_id,JSON.parse(posts[1].init.body).request_id);assert.deepEqual(ui.errors,[]);
});

test('an old draft requires reviewing newer published details before it can replace them',async t=>{
 const source={...base,events:[futureEvent('original')]},ui=await leader(t,{source});ui.d.querySelector('[data-action="edit"]').click();ui.input('event-form','title','My draft title');ui.d.getElementById('save-event-draft').click();
 source.events[0]={...source.events[0],title:'Newer published title'};
 const restored=app(t,ui.env,origin+'/secretary',{cookie:ui.cookie(),storage:ui.storage(),source});await until(()=>!restored.d.getElementById('workspace').hidden);restored.d.querySelector('[data-resume-draft]').click();
 assert.equal(restored.d.getElementById('draft-conflict').hidden,false);assert.match(restored.d.getElementById('draft-comparison').textContent,/Newer published title/);assert.match(restored.d.getElementById('draft-comparison').textContent,/My draft title/);
 restored.submit('event-form');await until(()=>restored.d.getElementById('status').textContent.includes('Review the published changes'));assert.equal(restored.requests.filter(r=>r.init.method==='PATCH').length,0);
 restored.d.getElementById('keep-draft').click();restored.submit('event-form');await until(()=>!restored.d.getElementById('workspace').hidden);assert.equal((await mergePortalCatalogue(source,ui.env)).events[0].title,'My draft title');assert.deepEqual(restored.errors,[]);
});

test('a recovered draft finds an event that was published before the connection dropped',async t=>{
 let lose=true;const ui=await leader(t,{loseResponse:(path,init)=>{if(lose&&path==='/api/portal/events'&&init.method==='POST'){lose=false;return true;}return false;}});
 ui.d.getElementById('new-event').click();ui.input('event-form','title','Original submitted title');ui.submit('event-form');await until(()=>ui.d.getElementById('status').textContent.includes('Could not connect'));
 ui.input('event-form','title','My remaining change');ui.d.getElementById('save-event-draft').click();
 const restored=app(t,ui.env,origin+'/secretary',{cookie:ui.cookie(),storage:ui.storage()});await until(()=>!restored.d.getElementById('workspace').hidden);restored.d.querySelector('[data-resume-draft]').click();
 assert.equal(restored.d.getElementById('draft-conflict').hidden,false);assert.match(restored.d.getElementById('draft-comparison').textContent,/Original submitted title/);restored.d.getElementById('keep-draft').click();restored.submit('event-form');await until(()=>!restored.d.getElementById('workspace').hidden);
 const events=(await mergePortalCatalogue(base,ui.env)).events;assert.equal(events.length,1);assert.equal(events[0].title,'My remaining change');assert.equal(events[0].version,2);assert.equal(restored.d.getElementById('draft-tray').hidden,true);assert.deepEqual(restored.errors,[]);
});

test('moving a start time keeps the duration and duplication keeps Southampton time across daylight saving',async t=>{
 const source={...base,events:[futureEvent('original')]},ui=await leader(t,{source});ui.d.querySelector('[data-action="duplicate"]').click();const f=ui.d.getElementById('event-form');
 assert.equal(f.elements.start.value,'2027-04-02T18:00');assert.equal(f.elements.end.value,'2027-04-02T20:00');ui.input('event-form','start','2027-04-03T19:00');assert.equal(f.elements.end.value,'2027-04-03T21:00');
 ui.submit('event-form');await until(()=>!ui.d.getElementById('workspace').hidden);const created=(await mergePortalCatalogue(source,ui.env)).events.find(e=>e.id!=='original');assert.equal(created.start,'2027-04-03T18:00:00.000Z');assert.equal(created.end,'2027-04-03T20:00:00.000Z');
});

test('event validation focuses the problem and does not send an invalid update',async t=>{
 const ui=await leader(t);ui.d.getElementById('new-event').click();ui.input('event-form','title','Check the time');ui.input('event-form','start','2027-04-03T19:00');ui.input('event-form','end','2027-04-03T18:00');ui.submit('event-form');
 await until(()=>!ui.d.getElementById('event-validation').hidden);assert.equal(ui.d.activeElement,ui.d.getElementById('event-form').elements.end);assert.equal(ui.requests.filter(r=>r.path==='/api/portal/events').length,0);assert.match(ui.d.getElementById('event-validation').textContent,/after the start/);
 ui.input('event-form','start','2027-03-28T01:30');ui.input('event-form','end','2027-03-28T03:00');ui.submit('event-form');await until(()=>ui.d.getElementById('event-validation').textContent.includes('clocks change'));assert.equal(ui.d.activeElement,ui.d.getElementById('event-form').elements.start);
});

test('joining details resume their draft when returning to the tab or reloading',async t=>{
 const ui=await leader(t);ui.d.getElementById('profile-tab').click();ui.input('profile-form','how_to_join','Meet us outside Building 42.');
 ui.d.getElementById('profile-tab').click();assert.equal(ui.d.getElementById('profile-form').elements.how_to_join.value,'Meet us outside Building 42.');
 ui.d.getElementById('events-tab').click();ui.d.getElementById('profile-tab').click();assert.equal(ui.d.getElementById('profile-form').elements.how_to_join.value,'Meet us outside Building 42.');
 const restored=app(t,ui.env,origin+'/secretary',{cookie:ui.cookie(),storage:ui.storage()});await until(()=>!restored.d.getElementById('workspace').hidden);restored.d.getElementById('profile-tab').click();
 assert.equal(restored.d.getElementById('profile-form').elements.how_to_join.value,'Meet us outside Building 42.');assert.match(restored.d.getElementById('profile-draft-state').textContent,/Draft restored/);
 assert.equal((await mergePortalCatalogue(base,ui.env)).societies[0].how_to_join,undefined);assert.deepEqual(restored.errors,[]);
});

test('publishing joining instructions preserves an unchanged long catalogue description',async t=>{
 const source={...base,societies:[{...base.societies[0],description:'Original catalogue introduction. '.repeat(40)}]},ui=await leader(t,{source});
 ui.d.getElementById('profile-tab').click();ui.input('profile-form','how_to_join','Come on Thursdays. Beginners welcome.');ui.d.getElementById('events-tab').click();assert.ok(JSON.parse(ui.storage()[draftKey]).profile);
 ui.d.querySelector('[data-resume-draft="profile"]').click();ui.submit('profile-form');await until(()=>ui.d.getElementById('status').textContent.includes('details published'));
 const payload=JSON.parse(ui.requests.find(r=>r.path==='/api/portal/profile').init.body);assert.equal('description' in payload,false);const published=(await mergePortalCatalogue(source,ui.env)).societies[0];assert.equal(published.description,source.societies[0].description);assert.match(published.how_to_join,/Beginners/);assert.equal(ui.d.getElementById('overview-joining-status').textContent,'Welcome ready');
});

test('unavailable draft storage warns instead of silently losing unpublished work',async t=>{
 const ui=await leader(t,{storageFails:true});ui.dom.window.confirm=()=>false;ui.d.getElementById('new-event').click();ui.input('event-form','title','Keep this work');ui.d.getElementById('editor-back').click();
 assert.equal(ui.d.getElementById('event-editor').hidden,false);assert.match(ui.d.getElementById('event-draft-state').textContent,/Could not save/);const leave=new ui.dom.window.Event('beforeunload',{cancelable:true});ui.dom.window.dispatchEvent(leave);assert.equal(leave.defaultPrevented,true);assert.equal(ui.d.getElementById('event-form').elements.title.value,'Keep this work');
 ui.dom.window.confirm=()=>true;ui.d.getElementById('editor-back').click();assert.equal(ui.d.getElementById('workspace').hidden,false);assert.match(ui.d.getElementById('status').textContent,/were not saved/);assert.doesNotMatch(ui.d.getElementById('status').textContent,/Draft saved/);
});

test('publishing locks the editor until the result arrives',async t=>{
 let release;const pause=new Promise(resolve=>{release=resolve;});const ui=await leader(t,{waitRequest:(path,init)=>path==='/api/portal/events'&&init.method==='POST'?pause:undefined});
 ui.d.getElementById('new-event').click();ui.input('event-form','title','Wait for publishing');ui.submit('event-form');assert.equal(ui.d.getElementById('event-fields').disabled,true);ui.d.getElementById('editor-back').click();assert.equal(ui.d.getElementById('event-editor').hidden,false);
 release();await until(()=>!ui.d.getElementById('workspace').hidden);assert.equal(ui.d.getElementById('event-fields').disabled,false);assert.equal((await mergePortalCatalogue(base,ui.env)).events.length,1);
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
