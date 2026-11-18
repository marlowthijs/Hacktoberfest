import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import worker from '../worker/index.js';
import { testDb } from './helpers/d1.mjs';
import { mergePortalCatalogue } from '../worker/portal-api.js';

const origin='https://uniflow.test',KEY='society-synth:selected-societies:v1',now=Date.now();
const iso=days=>new Date(now+days*86400000).toISOString();
const dataset=()=>({schema_version:1,updated_at:new Date(now).toISOString(),societies:[...Array.from({length:15},(_,i)=>({id:'s'+i,name:'Society '+i,category:i%2?'sport':'society'})),{id:'quiet',name:'Quiet Club',description:'Chess and board games'}],events:[...Array.from({length:15},(_,i)=>({id:'e'+i,society_id:'s'+i,title:'Event '+i,start:iso(i+1),end:iso(i+1.1),timezone:'Europe/London',source_type:'susu_event',source_checked_at:iso(0)})),{id:'uncertain',society_id:'s0',title:'Unconfirmed session',start:iso(1),end:iso(1.1),verification_status:'needs_confirmation'}]});
async function until(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5));}assert.ok(check(),'Expected UI state was not reached');}
async function setup(t,{saved=[],failure=false,mobile=false,preferences={},copyFails=false,hash=''}={}){
 let fail=failure,source=dataset(),requests=0;const html=await(await worker.fetch(new Request(origin))).text();const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:origin+hash,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.localStorage.setItem(KEY,JSON.stringify(saved));w.localStorage.setItem('uniflow:calendar-preferences:v1',JSON.stringify(preferences));w.scrollTo=({top})=>{w.scrollY=top;};w.matchMedia=()=>({matches:false});if(mobile)Object.defineProperty(w.navigator,'userAgent',{value:'iPhone Safari'});w.fetch=async()=>{requests++;if(fail)throw new Error('offline');return Response.json(source);};Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{if(copyFails)throw new Error('Copy denied');w.copied=value;}}});w.open=()=>{throw new Error('Unexpected app navigation');};}});
 t.after(()=>dom.window.close());const d=dom.window.document;await until(()=>!d.getElementById('load-error').hidden||d.querySelector('.society-card'));
 const input=(id,value)=>{d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 return {dom,d,input,errors,recover:()=>{fail=false;},setSource:value=>{source=value;},requests:()=>requests};
}
test('student discovery shows six more at a time and keeps contact-only groups in search',async t=>{
 const {d,input,errors}=await setup(t);assert.equal(d.querySelectorAll('.society-card').length,6);assert.doesNotMatch(d.getElementById('society-grid').textContent,/Quiet Club/);
 d.getElementById('society-toggle').click();assert.equal(d.querySelectorAll('.society-card').length,12);
 input('society-search','board games');assert.match(d.getElementById('society-grid').textContent,/Quiet Club/);assert.equal(d.querySelectorAll('.society-card').length,1);assert.deepEqual(errors,[]);
});
test('following a quiet society survives reload and produces a future-event subscription',async t=>{
 const {dom,d}=await setup(t,{saved:['quiet']});assert.equal(d.getElementById('selection-count').textContent,'1 selected');assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(KEY)),['quiet']);
 d.getElementById('continue-review').click();assert.equal(d.getElementById('events').hidden,false);assert.match(d.getElementById('event-list').textContent,/No confirmed dates/);
 d.getElementById('continue-calendar').click();assert.equal(d.getElementById('calendar').hidden,false);assert.equal(new URL(d.getElementById('feed-url').value).searchParams.get('societies'),'quiet');
});
test('unconfirmed dates require opt-in and mobile copy never redirects to an app',async t=>{
 const {dom,d}=await setup(t,{saved:['s0'],mobile:true});d.getElementById('continue-review').click();assert.doesNotMatch(d.getElementById('event-list').textContent,/Unconfirmed session/);
 d.getElementById('include-unconfirmed').checked=true;d.getElementById('include-unconfirmed').dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert.match(d.getElementById('event-list').textContent,/Unconfirmed session/);
 d.getElementById('continue-calendar').click();assert.equal(new URL(d.getElementById('feed-url').value).searchParams.get('include_unconfirmed'),'1');d.getElementById('copy-feed').click();await until(()=>d.getElementById('copy-feed').textContent.startsWith('Copied'));assert.equal(dom.window.copied,d.getElementById('feed-url').value);
 assert.equal(d.getElementById('mobile-calendar-steps').hidden,false);d.getElementById('calendar-provider').value='apple';d.getElementById('calendar-provider').dispatchEvent(new dom.window.Event('change'));assert.match(d.getElementById('apple-subscribe').href,/^webcal:/);assert.equal(d.getElementById('apple-calendar-steps').hidden,false);
});
test('a failed refresh preserves choices and retry recovers',async t=>{
 const {dom,d,recover}=await setup(t,{saved:['quiet'],failure:true});assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(KEY)),['quiet']);assert.equal(d.getElementById('load-error').hidden,false);recover();d.getElementById('retry-load').click();await until(()=>d.getElementById('load-error').hidden);assert.equal(d.getElementById('selection-count').textContent,'1 selected');
});
test('feed excludes unconfirmed dates by default and labels opt-in events tentative',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json(dataset()));
 const request=path=>worker.fetch(new Request(origin+path));
 const normal=await(await request('/calendar.ics?societies=s0')).text();assert.match(normal,/UID:e0@society-synth/);assert.doesNotMatch(normal,/UID:uncertain/);
 const opted=await(await request('/calendar.ics?societies=s0&include_unconfirmed=1')).text();assert.match(opted,/STATUS:TENTATIVE/);assert.match(opted,/SUMMARY:\[Unconfirmed\] Unconfirmed session/);
});
test('source sequence survives the D1 overlay and secretaries retain editable base versions',async t=>{
 const db=testDb();t.after(()=>db.close());const base=dataset();base.events[0].sequence=4;const merged=await mergePortalCatalogue(base,{PORTAL_DB:db});assert.equal(merged.events[0].version,0);assert.equal(merged.events[0].sequence,4);
});

test('browser back and forward follow the wizard and restore the browsing position',async t=>{
 const {dom,d,errors}=await setup(t,{saved:['s0']});const w=dom.window;
 assert.equal(d.getElementById('journey-bar').hidden,false);
 w.scrollY=540;d.getElementById('continue-review').click();assert.equal(w.location.hash,'#events');assert.equal(w.scrollY,0);
 w.scrollY=180;d.getElementById('continue-calendar').click();assert.equal(w.location.hash,'#calendar');assert.equal(d.getElementById('journey-bar').hidden,true);
 w.history.back();await until(()=>!d.getElementById('events').hidden);assert.equal(w.scrollY,180);
 w.history.back();await until(()=>!d.getElementById('societies').hidden);assert.equal(w.scrollY,540);
 w.history.forward();await until(()=>!d.getElementById('events').hidden);assert.equal(w.scrollY,180);
 assert.deepEqual(errors,[]);
});

test('selection removal can be undone, including the last followed society',async t=>{
 const {dom,d}=await setup(t,{saved:['s0']});d.getElementById('selected-only').click();
 d.querySelector('[data-society="s0"]').click();assert.equal(d.querySelectorAll('.society-card').length,0);assert.equal(d.getElementById('journey-bar').hidden,true);assert.equal(d.getElementById('undo-message').hidden,false);
 d.getElementById('undo-remove').click();assert.equal(d.querySelector('[data-society="s0"]').checked,true);assert.equal(d.getElementById('journey-bar').hidden,false);assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(KEY)),['s0']);assert.equal(d.activeElement.id,'follow-s0');
});

test('loading more results retains open information and focuses the new results',async t=>{
 const {d}=await setup(t);const details=d.querySelector('.society-involvement');details.open=true;const id=details.dataset.detail;
 d.getElementById('society-toggle').click();assert.equal(d.querySelectorAll('.society-card').length,12);assert.equal(d.querySelector('[data-detail="'+id+'"]').open,true);assert.equal(d.activeElement,d.querySelectorAll('.society-card')[6]);
});

test('background updates retain open details and focused controls',async t=>{
 const {dom,d,setSource,requests}=await setup(t);const details=d.querySelector('.society-involvement');details.open=true;const id=details.dataset.detail;const summary=details.querySelector('summary');summary.focus();
 const count=requests();dom.window.dispatchEvent(new dom.window.Event('focus'));assert.equal(requests(),count);d.getElementById('retry-load').click();await until(()=>requests()>count);await new Promise(r=>setTimeout(r,0));assert.equal(d.querySelector('[data-detail="'+id+'"]'),details);assert.equal(d.activeElement,summary);
 const updated=dataset();updated.societies[0].description='New committee details';setSource(updated);d.getElementById('retry-load').click();await until(()=>d.getElementById('society-grid').textContent.includes('New committee details'));assert.equal(d.querySelector('[data-detail="'+id+'"]').open,true);assert.equal(d.activeElement.id,summary.id);
});

test('copy failure has a manual recovery path and never claims success',async t=>{
 const {d,errors}=await setup(t,{saved:['s0'],copyFails:true});d.getElementById('continue-calendar').click();assert.equal(d.getElementById('desktop-calendar-steps').hidden,true);
 d.getElementById('copy-feed').click();await until(()=>d.getElementById('copy-guidance').textContent.includes('manually'));assert.equal(d.getElementById('desktop-calendar-steps').hidden,true);assert.equal(d.getElementById('feed-url').selectionStart,0);assert.equal(d.getElementById('feed-url').selectionEnd,d.getElementById('feed-url').value.length);
 d.getElementById('manual-copy-done').click();assert.equal(d.getElementById('desktop-calendar-steps').hidden,false);assert.deepEqual(errors,[]);
});

test('calendar preferences persist and changing a copied selection explains the new link',async t=>{
 const {dom,d}=await setup(t,{saved:['s0'],preferences:{provider:'other',includeUnconfirmed:true},hash:'#calendar'});
 assert.equal(d.getElementById('calendar').hidden,false);assert.equal(d.getElementById('calendar-provider').value,'other');assert.equal(d.getElementById('include-unconfirmed').checked,true);assert.match(d.getElementById('feed-url').value,/include_unconfirmed=1/);
 d.getElementById('copy-feed').click();await until(()=>!d.getElementById('other-calendar-steps').hidden);assert.equal(d.getElementById('selection-change-note').hidden,true);
 d.querySelector('[data-go-step="1"]').click();d.querySelector('[data-society="s1"]').click();d.getElementById('return-calendar').click();assert.equal(d.getElementById('selection-change-note').hidden,false);assert.equal(d.getElementById('calendar-waiting').hidden,false);
 d.getElementById('calendar-provider').value='apple';d.getElementById('calendar-provider').dispatchEvent(new dom.window.Event('change'));const prefs=JSON.parse(dom.window.localStorage.getItem('uniflow:calendar-preferences:v1'));assert.equal(prefs.provider,'apple');assert.equal(prefs.includeUnconfirmed,true);assert.equal(d.getElementById('apple-calendar-steps').hidden,false);
});

test('the mobile keyboard can hide the bottom bar and Enter restores it without losing search',async t=>{
 const {dom,d,input}=await setup(t,{saved:['s0'],mobile:true});const w=dom.window;
 w.innerWidth=390;const viewport=new w.EventTarget();viewport.height=w.innerHeight;Object.defineProperty(w,'visualViewport',{value:viewport});
 input('society-search','Society');d.getElementById('society-search').focus();viewport.height=w.innerHeight-300;w.dispatchEvent(new w.Event('resize'));
 assert.equal(d.body.classList.contains('keyboard-open'),true);d.getElementById('society-search').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await until(()=>!d.body.classList.contains('keyboard-open'));assert.equal(d.getElementById('society-search').value,'Society');
});
