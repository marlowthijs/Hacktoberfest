export const STUDENT_SCRIPT = String.raw`(() => {
'use strict';
const $=id=>document.getElementById(id), KEY='society-synth:selected-societies:v1';
let catalogue={societies:[],events:[]}, selected=new Set(readSaved()), societyLimit=6, eventLimit=6, kind='all', onlySelected=false, activeStep=1, includeUnconfirmed=false, copiedFeed='', failedCopyFeed='', loading=false, loaded=false;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=value=>String(value||'').toLocaleLowerCase('en-GB').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function readSaved(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'):[];}catch{return [];}}
function save(){try{localStorage.setItem(KEY,JSON.stringify([...selected]));}catch{}}
function url(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function anchor(label,value){const href=url(value);return href?'<a target="_blank" rel="noopener noreferrer" href="'+esc(href)+'">'+esc(label)+' <span aria-hidden="true">↗</span></a>':'';}
const fmt=(value,options)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...options}).format(new Date(value));
const date=value=>fmt(value,{day:'numeric',month:'short',...(fmt(value,{year:'numeric'})!==fmt(Date.now(),{year:'numeric'})?{year:'numeric'}:{})});
const time=value=>fmt(value,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const upcoming=e=>e.status!=='cancelled'&&Date.parse(e.end)>=Date.now();
const uncertain=e=>e.verification_status==='needs_confirmation';
const societyFor=id=>catalogue.societies.find(s=>s.id===id);
function eventsFor(id,all=false){return catalogue.events.filter(e=>e.society_id===id&&upcoming(e)&&(all||includeUnconfirmed||!uncertain(e))).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));}
function sourceNote(s){if(s.portal_updated_at)return 'Society updated '+date(s.portal_updated_at)+(s.source_checked_at?'; SUSU profile checked '+date(s.source_checked_at):'');if(s.source_status==='unavailable')return 'Source currently unavailable';if(s.directory_status==='not_listed')return 'Not in the latest SUSU directory';return s.source_checked_at?'SUSU checked '+date(s.source_checked_at):'Source check pending';}
function contacts(s){const links=[anchor('SUSU profile',s.susu_url),anchor('Instagram',s.instagram_url),anchor('Group chat',s.community_url),anchor('Website',s.website_url)];if(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s.contact_email||''))links.push('<a href="mailto:'+esc(s.contact_email)+'">Email</a>');return links.filter(Boolean).join('');}
function score(s,q){const name=norm(s.name),id=norm(s.id);return name===q||id===q?0:name.startsWith(q)||id.startsWith(q)?1:name.includes(q)||id.includes(q)?2:3;}
function renderSocieties(){
 const q=norm($('society-search').value).trim(),tokens=q.split(/\s+/).filter(Boolean);
 let matches=catalogue.societies.filter(s=>{
   if(kind!=='all'&&(s.category==='sport'?'sport':'society')!==kind)return false;
   if(onlySelected&&!selected.has(s.id))return false;
   if(!q&&!onlySelected&&!eventsFor(s.id,true).length)return false;
   const text=norm([s.name,s.id,s.description,s.regular_schedule,s.instagram_url,s.susu_url].join(' '));
   return tokens.every(t=>text.includes(t));
 });
 matches.sort((a,b)=>q?score(a,q)-score(b,q)||a.name.localeCompare(b.name):$('society-sort').value==='name'?a.name.localeCompare(b.name):(Date.parse(eventsFor(a.id)[0]?.start)||Infinity)-(Date.parse(eventsFor(b.id)[0]?.start)||Infinity)||a.name.localeCompare(b.name));
 const visible=matches.slice(0,societyLimit);
 $('society-result-count').textContent=matches.length?'Showing '+visible.length+' of '+matches.length+(q?' matches':' societies and sports'):'No matches';
 $('society-actions').hidden=matches.length<=societyLimit;$('society-toggle').textContent='Show '+Math.min(6,matches.length-societyLimit)+' more';
 $('clear-search').hidden=!q;
 $('society-grid').innerHTML=visible.map(s=>{
   const list=eventsFor(s.id),all=eventsFor(s.id,true),next=list[0],chosen=selected.has(s.id);
   const logo=url(s.logo_url),initials=s.name.split(/\s+/).map(w=>w[0]).join('').slice(0,3);
   const details='<details class="society-involvement"><summary>About & how to join</summary><p>'+esc(s.description||'Visit the official profile for society information.')+'</p>'+(s.how_to_join?'<h4>How to get involved</h4><p>'+esc(s.how_to_join)+'</p>':'')+(s.regular_schedule?'<h4>Regular activities</h4><p>'+esc(s.regular_schedule)+'</p><p class="source-note">A published schedule is not confirmation of every individual date. Check with the society before going.</p>':'')+(s.memberships?.length?'<h4>Membership on SUSU</h4><ul class="membership-list">'+s.memberships.slice(0,3).map(m=>'<li>'+esc(m.name)+' · <strong>'+esc(m.cost)+'</strong><small>'+esc(m.valid_period)+'</small></li>').join('')+'</ul>':'')+anchor('Membership / joining page',s.membership_url)+'<div class="society-links">'+contacts(s)+'</div><p class="source-note">'+esc(sourceNote(s))+'. '+(['instagram_url','website_url','community_url','contact_email'].some(f=>s[f]&&!s.contact_sources?.[f]&&!s.portal_fields?.includes(f))?'Some previously supplied contact links have not been rechecked.':'')+'</p><a class="report-link" href="mailto:marlow.thijs@icloud.com?subject='+encodeURIComponent('UniFlow correction: '+s.name)+'">Report an update</a></details>';
   return '<article class="society-card'+(chosen?' is-selected':'')+'" data-card="'+esc(s.id)+'"><div class="society-top"><div class="society-monogram'+(logo?' has-logo':'')+'">'+(logo?'<img class="society-logo" src="'+esc(logo)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'<span class="society-monogram-fallback" '+(logo?'hidden':'')+'>'+esc(initials)+'</span></div><span class="society-type">'+(s.category==='sport'?'Sport':'Society')+'</span></div><h3>'+esc(s.name)+'</h3><p class="society-description">'+esc(s.description||'Find out how to join on the official profile.')+'</p><div class="next-event">'+(next?'<span>Next up · '+date(next.start)+' · '+time(next.start)+'</span><strong>'+esc(next.title)+'</strong>':all.length?'<span class="unconfirmed">Dates need confirmation</span>':'<span>No published upcoming dates yet</span>')+'</div>'+details+'<div class="society-bottom"><span class="society-events">'+list.length+' upcoming '+(list.length===1?'event':'events')+'</span><label class="society-check"><input type="checkbox" data-society="'+esc(s.id)+'" '+(chosen?'checked':'')+'><span>Follow society</span></label></div></article>';
 }).join('')||'<div class="empty-state"><strong>'+(onlySelected?'No selected societies match.':q?'No societies match that search.':'No published dates match these filters.')+'</strong><p>'+(q?'Try a shorter name or a different interest.':'Search by name to find every society, including those without event listings.')+'</p><button class="button button-secondary" data-reset-search>Reset filters</button></div>';
 $('society-grid').querySelectorAll('.society-logo').forEach(img=>{const fallback=()=>{img.hidden=true;img.nextElementSibling.hidden=false;};img.addEventListener('error',fallback,{once:true});if(img.complete&&!img.naturalWidth)fallback();});
 document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===kind)));
 $('selected-only').setAttribute('aria-pressed',String(onlySelected));
}
function selectedEvents(){return catalogue.events.filter(e=>selected.has(e.society_id)&&upcoming(e)&&(includeUnconfirmed||!uncertain(e))).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));}
function renderEvents(){
 const events=selectedEvents(),q=norm($('event-search').value).trim(),range=$('event-range').value,days=Number(range)||Infinity,cutoff=Date.now()+days*86400000;
 const matches=events.filter(e=>Date.parse(e.start)<cutoff&&q.split(/\s+/).every(t=>norm([e.title,societyFor(e.society_id)?.name,e.location,e.description,fmt(e.start,{weekday:'long',day:'numeric',month:'long'})].join(' ')).includes(t)));
 const visible=matches.slice(0,eventLimit),unconfirmed=catalogue.events.filter(e=>selected.has(e.society_id)&&upcoming(e)&&uncertain(e)).length;
 $('event-count').textContent=events.length+' upcoming '+(events.length===1?'event':'events');
 $('event-intro').textContent=selected.size?'From '+selected.size+' selected '+(selected.size===1?'society':'societies')+'. Dates are shown in Southampton time.':'Choose societies to see your events here.';
 $('event-result-count').textContent=matches.length?'Showing '+visible.length+' of '+matches.length+' events':'No matching dates';
 $('unconfirmed-option').hidden=!unconfirmed;$('unconfirmed-count').textContent=unconfirmed+' dates need confirmation: they come from older schedules or have conflicting source details.';
 $('event-actions').hidden=matches.length<=eventLimit;$('event-toggle').textContent='Show '+Math.min(6,matches.length-eventLimit)+' more';
 $('event-list').innerHTML=visible.map(e=>{
  const society=societyFor(e.society_id),label=uncertain(e)?'Date needs confirmation':e.source_type==='secretary'?'Published by society':e.source_checked_at?'Listed on SUSU · checked '+date(e.source_checked_at):'Previously supplied event';
  return '<article class="event-card"><div class="event-date"><span class="day">'+fmt(e.start,{day:'2-digit'})+'</span><span class="month">'+fmt(e.start,{month:'short',...(fmt(e.start,{year:'numeric'})!==fmt(Date.now(),{year:'numeric'})?{year:'numeric'}:{})})+'</span></div><div class="event-main"><div class="event-society">'+esc(society?.name)+'</div><h3>'+esc(e.title)+'</h3><p class="event-meta">'+esc(fmt(e.start,{weekday:'short'}))+' · '+time(e.start)+'–'+time(e.end)+(date(e.start)!==date(e.end)?' ('+date(e.end)+')':'')+'</p><p>'+esc(e.location||'Location to be confirmed')+'</p><span class="source-badge'+(uncertain(e)?' unconfirmed':'')+'">'+esc(label)+'</span>'+((e.description||e.verification_note)?'<details class="event-description"><summary>Event details</summary><p>'+esc([e.verification_note,e.description].filter(Boolean).join('\n\n'))+'</p></details>':'')+'<div class="society-links">'+anchor('Official event',e.source_url||society?.susu_url)+anchor('Booking information',e.booking_url)+'</div></div></article>';
 }).join('')||'<div class="empty-state"><strong>'+(events.length?'No events match these filters.':'No confirmed dates for these societies yet.')+'</strong><p>'+(events.length?'Try a longer date range or clear the event search.':'You can still follow their calendar and receive future published events. Check each society’s contact links for current plans.')+'</p>'+(events.length?'<button class="button button-secondary" id="reset-events">Show all dates</button>':'')+'</div>';
 $('reset-events')?.addEventListener('click',()=>{$('event-search').value='';$('event-range').value='all';eventLimit=6;renderEvents();});
}
function renderSelections(){
 $('selection-count').textContent=selected.size+' selected';
 $('selected-tray').hidden=!selected.size;
 $('selected-chips').innerHTML=[...selected].map(id=>'<button class="selection-chip" data-remove="'+esc(id)+'" aria-label="Remove '+esc(societyFor(id)?.name)+'">'+esc(societyFor(id)?.name)+' <span aria-hidden="true">×</span></button>').join('');
 $('selection-next-title').textContent=selected.size?selected.size+' '+(selected.size===1?'society':'societies')+' selected':'Choose your first society';
 $('selection-next-detail').textContent=selected.size?'Your choices stay saved on this device.':'Tick a society to start building your calendar.';
 $('continue-review').disabled=!selected.size;$('continue-calendar').disabled=!selected.size;
}
function isAppleMobile(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function isMobile(){return isAppleMobile()||/Android/i.test(navigator.userAgent)||!!window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;}
function renderFeed(){
 const mobile=isMobile(),provider=$('calendar-provider').value,google=provider==='google';
 $('mobile-calendar-note').hidden=!mobile||!google;$('mobile-calendar-steps').hidden=!mobile||!google;$('desktop-calendar-steps').hidden=mobile||!google;$('apple-calendar-steps').hidden=google;
 $('mobile-finish-title').textContent=isAppleMobile()?'Finish in Safari':'Finish in your browser';
 $('desktop-site-title').textContent=isAppleMobile()?'Request Desktop Website':'Turn on Desktop site';
 $('desktop-site-guidance').textContent=isAppleMobile()?'In Safari, open the Page menu beside the address bar, then choose “Request Desktop Website”. Use the same Google account as the app.':'In your browser’s menu, turn on “Desktop site”. Use the same Google account as the app.';
 const ids=[...selected].sort(),u=new URL('/calendar.ics',location.origin);u.searchParams.set('societies',ids.join(','));if(includeUnconfirmed)u.searchParams.set('include_unconfirmed','1');
 const link=ids.length?u.href:'',copied=link&&copiedFeed===link,failed=link&&failedCopyFeed===link;
 $('feed-url').value=link;$('copy-feed').disabled=!link;$('copy-feed').textContent=copied?'Copied ✓ — copy again':'Copy calendar link';
 $('feed-status').textContent=copied?'Link copied. Follow the steps to finish adding it.':ids.length?ids.length+' '+(ids.length===1?'society':'societies')+' · '+selectedEvents().length+' upcoming events':'Choose at least one society first.';
 $('copy-guidance').textContent=failed?'Automatic copying failed. Select the link above and copy it manually.':copied?(google?'Next, follow the Google Calendar steps alongside.':'Next, open your calendar subscription settings or use the Apple Calendar button.'):'Copy your link, then add it as a calendar subscription.';
 $('download-feed').href=link?link+'&download=1':'#';$('download-feed').setAttribute('aria-disabled',String(!link));
 $('apple-subscribe').href=link?link.replace(/^https?:/,'webcal:'):'#';$('apple-subscribe').setAttribute('aria-disabled',String(!link));
 $('feed-warning').hidden=!includeUnconfirmed;$('feed-heading').textContent='Your society calendar';
 $('mobile-browser-guidance').textContent=copied?'Link copied. Press and hold the website link, choose “Open in New Tab”, then switch to that tab.':'Copy your link first, then press and hold “Google Calendar website”.';
 $('calendar-selection-summary').textContent=[...selected].map(id=>societyFor(id)?.name).join(', ');
}
function render(){renderSocieties();renderEvents();renderSelections();renderFeed();}
function showStep(step,history=true){
 if(step<1||step>3)return;if(step>1&&!selected.size){$('announcement').textContent='Choose at least one society before continuing.';step=1;}
 activeStep=step;$('wizard-intro').hidden=step!==1;document.querySelectorAll('[data-wizard-page]').forEach(p=>p.hidden=Number(p.dataset.wizardPage)!==step);
 [1,2,3].forEach(n=>{const el=$('wizard-progress-'+n);el.classList.toggle('is-current',n===step);el.classList.toggle('is-complete',n<step);n===step?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current');});
 if(history)window.history.replaceState(null,'','#'+['societies','events','calendar'][step-1]);
 window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 document.querySelector('[data-wizard-page="'+step+'"] h2')?.focus({preventScroll:true});
}
async function load(){
 if(loading)return;loading=true;
 try{
  const response=await fetch('/api/events',{cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.societies)||!Array.isArray(data.events))throw new Error();catalogue=data;
  // A quiet week must never remove a student's followed society.
  selected=new Set([...selected].filter(id=>societyFor(id)));save();
  const checked=data.refresh?.checked_at||data.updated_at;
  $('updated-label').textContent=checked?'Catalogue checked '+date(checked):'Source dates shown on society profiles';
  const stale=checked&&Date.now()-Date.parse(checked)>7*86400000;
  $('catalogue-freshness').textContent=(checked?(stale?'Last source check: ':'Sources checked ')+date(checked)+'. ':'')+data.societies.length+' societies and sports. '+(stale?'Check the official listing before travelling.':'Published dates and regular schedules are labelled separately.');
  $('load-error').hidden=true;render();if(!loaded){loaded=true;if(location.hash)showStep(Math.max(1,['#societies','#events','#calendar'].indexOf(location.hash)+1),false);}
 }catch{$('load-error').hidden=false;$('load-error-text').textContent=catalogue.societies.length?'Could not refresh. Showing the last loaded listings; check the source before going.':'We couldn’t load the catalogue. Your saved choices are safe. Try again shortly.';if(!catalogue.societies.length){$('society-result-count').textContent='Catalogue unavailable';$('society-grid').innerHTML='';}}
 finally{loading=false;}
}
$('society-grid').addEventListener('change',event=>{const check=event.target.closest('[data-society]');if(!check)return;const id=check.dataset.society;check.checked?selected.add(id):selected.delete(id);save();check.closest('.society-card').classList.toggle('is-selected',check.checked);renderEvents();renderSelections();renderFeed();$('announcement').textContent=societyFor(id).name+(check.checked?' followed.':' removed.');});
$('society-grid').addEventListener('click',e=>{if(e.target.closest('[data-reset-search]')){$('society-search').value='';kind='all';onlySelected=false;societyLimit=6;renderSocieties();$('society-search').focus();}});
$('selected-chips').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;selected.delete(b.dataset.remove);save();render();$('selected-only').focus();});
$('society-search').addEventListener('input',()=>{societyLimit=6;renderSocieties();});
$('clear-search').addEventListener('click',()=>{$('society-search').value='';societyLimit=6;renderSocieties();$('society-search').focus();});
document.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>{kind=b.dataset.kind;societyLimit=6;renderSocieties();}));
$('selected-only').addEventListener('click',()=>{onlySelected=!onlySelected;societyLimit=6;renderSocieties();});
$('society-sort').addEventListener('change',renderSocieties);
$('society-toggle').addEventListener('click',()=>{societyLimit+=6;renderSocieties();});
$('event-toggle').addEventListener('click',()=>{eventLimit+=6;renderEvents();});
$('event-search').addEventListener('input',()=>{eventLimit=6;renderEvents();});
$('event-range').addEventListener('change',()=>{eventLimit=6;renderEvents();});
$('include-unconfirmed').addEventListener('change',e=>{includeUnconfirmed=e.target.checked;eventLimit=6;render();});
$('continue-review').addEventListener('click',()=>showStep(2));$('continue-calendar').addEventListener('click',()=>showStep(3));$('back-to-societies').addEventListener('click',()=>showStep(1));$('back-to-events').addEventListener('click',()=>showStep(2));
document.querySelectorAll('[data-go-step]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();showStep(Number(el.dataset.goStep));}));
window.addEventListener('hashchange',()=>showStep(Math.max(1,['#societies','#events','#calendar'].indexOf(location.hash)+1),false));
$('calendar-provider').addEventListener('change',renderFeed);
$('retry-load').addEventListener('click',load);
$('mobile-google-link').addEventListener('click',event=>{event.preventDefault();$('mobile-browser-guidance').textContent='Press and hold this link and choose “Open in New Tab”. A normal tap can open the Calendar app.';});
for(const id of ['download-feed','apple-subscribe'])$(id).addEventListener('click',e=>{if($(id).getAttribute('aria-disabled')==='true')e.preventDefault();});
$('copy-feed').addEventListener('click',async()=>{const link=$('feed-url').value;if(!link)return;$('copy-feed').disabled=true;let copied=false;try{await navigator.clipboard.writeText(link);copied=true;}catch{try{$('feed-url').focus();$('feed-url').select();copied=document.execCommand('copy');}catch{}}copiedFeed=copied?link:'';failedCopyFeed=copied?'':link;renderFeed();$('announcement').textContent=copied?'Link copied. Follow the calendar steps to finish.':'Select and copy the calendar link manually.';});
load();window.addEventListener('focus',()=>{if(!document.activeElement?.matches('input,select,textarea'))load();});setInterval(load,300000);
})();`;
