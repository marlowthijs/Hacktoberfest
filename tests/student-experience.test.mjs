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
async function setup(t,{saved=[],failure=false,mobile=false}={}){
 let fail=failure;const html=await(await worker.fetch(new Request(origin))).text();const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:origin,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.localStorage.setItem(KEY,JSON.stringify(saved));w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});if(mobile)Object.defineProperty(w.navigator,'userAgent',{value:'iPhone Safari'});w.fetch=async()=>{if(fail)throw new Error('offline');return Response.json(dataset());};Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{w.copied=value;}}});w.open=()=>{throw new Error('Unexpected app navigation');};}});
 t.after(()=>dom.window.close());const d=dom.window.document;await until(()=>!d.getElementById('load-error').hidden||d.querySelector('.society-card'));
 const input=(id,value)=>{d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 return {dom,d,input,errors,recover:()=>{fail=false;}};
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
 d.getElementById('continue-calendar').click();assert.equal(new URL(d.getElementById('feed-url').value).searchParams.get('include_unconfirmed'),'1');d.getElementById('copy-feed').click();await until(()=>dom.window.copied);assert.equal(dom.window.copied,d.getElementById('feed-url').value);
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
