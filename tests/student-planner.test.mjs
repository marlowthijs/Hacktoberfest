import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import worker from '../worker/index.js';

const origin = 'https://uniflow.test', KEY = 'uniflow:saved-events:v1', NOW = '2026-11-19T12:00:00Z';
const event = (id, start, end, extra = {}) => ({ id, title:id, society_id:'art', start, end, timezone:'Europe/London', ...extra });
function catalogue() {
  return { schema_version:1, updated_at:NOW, societies:[
    {id:'art',name:'Art Society',how_to_join:'Beginners welcome. Meet by Building 42.',instagram_url:'https://instagram.com/art',contact_email:'art@example.com'},
    {id:'sport',name:'Sport Society',category:'sport'},
  ], events:[
    event('painting','2026-11-19T18:00:00Z','2026-11-19T20:00:00Z'),
    event('training','2026-11-19T19:00:00Z','2026-11-19T20:30:00Z',{society_id:'sport'}),
    event('late-social','2026-11-19T20:30:00Z','2026-11-19T21:30:00Z'),
    event('overnight','2026-11-19T23:00:00Z','2026-11-20T01:00:00Z'),
    event('friday','2026-11-20T18:00:00Z','2026-11-20T20:00:00Z'),
    event('saturday','2026-11-21T18:00:00Z','2026-11-21T20:00:00Z'),
    event('sunday','2026-11-22T18:00:00Z','2026-11-22T20:00:00Z'),
    event('uncertain','2026-11-22T17:00:00Z','2026-11-22T18:00:00Z',{verification_status:'needs_confirmation'}),
    event('cancelled','2026-11-19T18:00:00Z','2026-11-19T20:00:00Z',{status:'cancelled'}),
    event('past','2026-11-18T18:00:00Z','2026-11-18T20:00:00Z'),
  ] };
}
async function until(check) { for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5));}assert.ok(check(),'Expected student view'); }
async function setup(t,{plan=[],saved=[],source=catalogue(),now=NOW,storageFails=false,hash=''}={}) {
  const html=await(await worker.fetch(new Request(origin))).text(),errors=[];
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:origin+hash,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
    const RealDate=w.Date;w.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[now]));}static now(){return RealDate.parse(now);}};
    w.localStorage.setItem(KEY,JSON.stringify(plan));w.localStorage.setItem('society-synth:selected-societies:v1',JSON.stringify(saved));
    if(storageFails){const set=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(key,value){if(key===KEY)throw new Error('Storage blocked');return set.call(this,key,value);};}
    w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false});w.fetch=async()=>Response.json(source);
  }});
  t.after(()=>dom.window.close());const d=dom.window.document;await until(()=>d.getElementById('society-grid').getAttribute('aria-busy')==='false');
  const change=(id,value)=>{const el=d.getElementById(id);el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
  const ids=()=>[...d.querySelectorAll('[data-event-card]')].map(el=>el.dataset.eventCard);
  return {dom,d,change,ids,errors,source};
}

test('students can discover events before following societies and filter by Southampton date and group',async t=>{
  const ui=await setup(t),{d,change,ids}=ui;
  assert.equal(d.querySelector('#wizard-progress-2 button').disabled,false);d.getElementById('explore-events').click();
  assert.equal(d.getElementById('events').hidden,false);assert.equal(d.getElementById('calendar').hidden,true);assert.equal(d.getElementById('continue-calendar').disabled,true);
  assert.equal(ids().length,6);d.getElementById('event-toggle').click();assert.equal(ids().length,7);
  change('event-range','today');assert.deepEqual(ids(),['painting','training','late-social','overnight']);
  change('event-kind','sport');assert.deepEqual(ids(),['training']);change('event-kind','all');
  change('event-range','tomorrow');assert.deepEqual(ids(),['overnight','friday']);
  change('event-range','weekend');assert.deepEqual(ids(),['saturday','sunday']);
  assert.deepEqual(JSON.parse(ui.dom.window.localStorage.getItem('society-synth:selected-societies:v1')),[]);assert.deepEqual(ui.errors,[]);
});

test('today and weekend filters handle British Summer Time and the Sunday clock change',async t=>{
  const source=catalogue();source.events=[
    event('saturday-night','2027-03-27T23:45:00Z','2027-03-28T00:00:00Z'),
    event('clocks-change','2027-03-28T00:30:00Z','2027-03-28T02:30:00Z'),
    event('late-sunday','2027-03-28T22:00:00Z','2027-03-28T23:00:00Z'),
    event('monday-local','2027-03-28T23:30:00Z','2027-03-29T00:30:00Z'),
  ];
  const ui=await setup(t,{source,now:'2027-03-27T23:30:00Z',hash:'#events'});
  ui.change('event-range','tomorrow');assert.deepEqual(ui.ids(),['clocks-change','late-sunday']);
  ui.change('event-range','weekend');assert.deepEqual(ui.ids(),['saturday-night','clocks-change','late-sunday']);
  const sunday=await setup(t,{source,now:'2027-03-28T22:30:00Z',hash:'#events'});sunday.change('event-range','today');assert.deepEqual(sunday.ids(),['late-sunday']);
  sunday.change('event-range','tomorrow');assert.deepEqual(sunday.ids(),['monday-local']);
});

test('an event plan persists separately from followed societies and flags only real overlaps',async t=>{
  const ui=await setup(t,{saved:['art']}),{d}=ui;d.getElementById('explore-events').click();
  for(const id of ['painting','training','late-social'])d.getElementById('save-event-'+id).click();
  assert.deepEqual(JSON.parse(ui.dom.window.localStorage.getItem(KEY)),['painting','training','late-social']);
  assert.deepEqual(JSON.parse(ui.dom.window.localStorage.getItem('society-synth:selected-societies:v1')),['art']);
  d.getElementById('back-to-societies').click();assert.equal(d.getElementById('selection-next-title').textContent,'1 society selected');d.getElementById('continue-review').click();
  d.getElementById('event-scope-plan').click();assert.deepEqual(ui.ids(),['painting','training','late-social']);assert.equal(d.getElementById('journey-bar').hidden,true);
  assert.equal(d.querySelectorAll('.event-clash').length,2);assert.doesNotMatch(d.querySelector('[data-event-card="late-social"]').textContent,/Overlaps/);
  const link=new URL(d.getElementById('plan-download').href);assert.equal(link.pathname,'/events.ics');assert.equal(link.searchParams.get('events'),'late-social,painting,training');
  const reload=await setup(t,{plan:JSON.parse(ui.dom.window.localStorage.getItem(KEY)),saved:['art'],hash:'#events'});reload.d.getElementById('event-scope-plan').click();assert.deepEqual(reload.ids(),ui.ids());
  reload.d.getElementById('save-event-painting').click();assert.equal(reload.d.activeElement.id,'event-scope-plan');assert.equal(reload.d.querySelectorAll('.event-clash').length,0);assert.deepEqual(reload.errors,[]);
});

test('the today view refreshes after Southampton midnight even when the catalogue has not changed',async t=>{
  const source=catalogue();source.events=source.events.filter(e=>['friday','saturday'].includes(e.id));
  const ui=await setup(t,{source,now:'2026-11-19T23:58:00Z',hash:'#events'});ui.change('event-range','today');assert.deepEqual(ui.ids(),[]);
  ui.dom.window.Date.now=()=>Date.parse('2026-11-20T00:01:00Z');ui.dom.window.dispatchEvent(new ui.dom.window.Event('focus'));
  await until(()=>ui.ids().includes('friday'));assert.deepEqual(ui.ids(),['friday']);
});

test('saved cancellations, past dates and unavailable events remain visible but cannot enter a download',async t=>{
  const {d,ids}=await setup(t,{plan:['painting','cancelled','past','missing','uncertain'],hash:'#events'});d.getElementById('event-scope-plan').click();
  assert.equal(ids().length,4);assert.match(d.getElementById('event-list').textContent,/Cancelled — do not attend/);assert.match(d.getElementById('event-list').textContent,/Finished/);
  assert.equal(new URL(d.getElementById('plan-download').href).searchParams.get('events'),'painting');assert.equal(d.getElementById('plan-unavailable').hidden,false);
  assert.equal(d.querySelectorAll('.event-clash').length,0);assert.equal(d.querySelector('[data-event-card="uncertain"] .event-download'),null);
  d.getElementById('clear-unavailable-plan').click();assert.equal(d.getElementById('plan-unavailable').hidden,true);assert.equal(d.getElementById('plan-count').textContent,'4');
});

test('blocked browser storage is disclosed instead of claiming a persistent plan',async t=>{
  const {d,dom}=await setup(t,{storageFails:true,hash:'#events'});d.getElementById('save-event-painting').click();
  assert.equal(d.getElementById('plan-storage-warning').hidden,false);assert.match(d.getElementById('planner-status').textContent,/this visit only/);
  assert.equal(d.getElementById('journey-bar').hidden,false);assert.equal(d.getElementById('view-event-plan').hidden,false);assert.equal(d.getElementById('continue-calendar').hidden,true);
  d.getElementById('view-event-plan').click();assert.equal(d.getElementById('events-title').textContent,'Your event plan');assert.equal(d.getElementById('journey-bar').hidden,true);assert.equal(d.getElementById('plan-download').hidden,false);assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(KEY)),[]);
});

test('event details expose joining help safely and can follow a society for future updates',async t=>{
  const source=catalogue();source.events[0].title='<img src=x onerror=alert(1)>';source.events[0].description='<script>alert(1)</script>';source.events[0].booking_url='javascript:alert(1)';
  const {d,dom,errors}=await setup(t,{source,hash:'#events'});d.querySelector('[data-detail="painting"]').open=true;
  const card=d.querySelector('[data-event-card="painting"]');assert.match(card.textContent,/Beginners welcome/);assert.match(card.textContent,/Instagram/);assert.equal(card.querySelector('img,script,[href^="javascript:"]'),null);
  d.getElementById('event-follow-painting').click();assert.equal(d.activeElement.id,'event-follow-painting');assert.equal(d.getElementById('event-follow-painting').getAttribute('aria-pressed'),'true');
  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem('society-synth:selected-societies:v1')),['art']);assert.equal(d.getElementById('continue-calendar').disabled,false);assert.deepEqual(errors,[]);
});

test('plan download includes only requested live events, keeps calendar identity and never opts in silently',async t=>{
  t.mock.method(Date,'now',()=>Date.parse(NOW));t.mock.method(globalThis,'fetch',async()=>Response.json(catalogue()));
  const get=(query,method='GET')=>worker.fetch(new Request(origin+'/events.ics'+query,{method}));
  const response=await get('?events=painting,painting,training,cancelled,past,missing,uncertain');const text=await response.text();
  assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/attachment/);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,2);assert.match(text,/UID:painting@society-synth/);assert.match(text,/DESCRIPTION:Art Society/);assert.doesNotMatch(text,/UID:(uncertain|cancelled|past|friday)/);
  const tentative=await(await get('?events=uncertain&include_unconfirmed=1')).text();assert.match(tentative,/STATUS:TENTATIVE/);assert.match(tentative,/SUMMARY:\[Unconfirmed\]/);
  assert.equal((await get('')).status,400);assert.equal((await get('?events='+Array(201).fill('painting').join(','))).status,400);assert.equal((await get('?events=missing,cancelled,past')).status,404);
  const head=await get('?events=painting','HEAD');assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal((await get('?events=painting','POST')).status,405);
});
