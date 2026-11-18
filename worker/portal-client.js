import { PORTAL_DRAFTS } from './portal-drafts.js';

export const PORTAL_SCRIPT = String.raw`(() => {
'use strict';
const $=id=>document.getElementById(id);
const panels=['loading','welcome','invite','owner-login','workspace','event-editor','admin'];
const profileFields=['description','how_to_join','membership_url','regular_schedule','contact_email','instagram_url','community_url','website_url'];
let session=null,workspace=null,adminData=null,chosenSociety=null,editing=null,cancelling=null,filter='upcoming',dirty=false,currentPanel='loading',saving=false,eventLimit=6,previousStart='',previousEnd='';
const fragment=new URLSearchParams(location.hash.slice(1));
let invitation=fragment.get('invite');
if(location.hash)history.replaceState(null,'',location.pathname+location.search);
const ownerRoute=location.pathname.replace(/\/$/,'')==='/secretary/admin';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function message(text,kind='success'){$('status').textContent=text;$('status').className='status '+(kind==='error'?'error':kind==='info'?'info':'');$('status').hidden=!text;}
function show(id){panels.forEach(p=>$(p).hidden=p!==id);currentPanel=id;window.scrollTo({top:0,behavior:'auto'});const h=$(id).querySelector('h1,h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
function canLeave(){if(saving){message('Please wait for publishing to finish.','info');return false;}return !dirty||persistDraft()||window.confirm('This device could not save your draft. Leave and lose the unpublished changes?');}
function setDirty(value){dirty=value;clearTimeout(draftTimer);if(value){if(!draftContext)draftContext=newDraftContext(currentPanel==='event-editor'?'event':'profile',editing);scheduleDraft();}else{draftSaved=false;draftIndicator('');}if(workspace)$('profile-save-hint').textContent=value?'Unpublished changes. Publish when you’re ready.':'Your changes become public when you publish.';}
async function api(path,method='GET',body){const headers={};if(body!==undefined)headers['content-type']='application/json';if(session?.csrf_token)headers['x-csrf-token']=session.csrf_token;let response;try{response=await fetch('/api/portal/'+path,{method,credentials:'same-origin',cache:'no-store',headers,body:body===undefined?undefined:JSON.stringify(body)});}catch{throw new Error('Could not connect. Your form is still here—check your connection and try again.');}let result;try{result=await response.json();}catch{throw new Error('The portal is temporarily unavailable. Please try again.');}if(!response.ok){const e=new Error(result.error||'Please try again.');e.status=response.status;e.code=result.code;throw e;}return result;}
function report(error){
  if(error.field&&currentPanel==='event-editor'){$('event-validation').textContent=error.message;$('event-validation').hidden=false;const field=$('event-form').elements[error.field];field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby','event-validation');field.focus();return;}
  message(error.message,'error');$('status').scrollIntoView({behavior:'smooth',block:'center'});
  if(error.status===409){persistDraft();$('reload-workspace').hidden=false;$('reload-workspace').textContent='Load latest version (keep my draft)';}
  if(error.status===401&&currentPanel!=='invite'&&currentPanel!=='owner-login'){const saved=persistDraft();message(error.message+(dirty&&saved?' Your draft is saved on this device.':' Keep this page open to copy any unpublished work.'),'error');}
}
async function busy(button,action){if(button.disabled||saving)return;saving=true;button.disabled=true;const prior=button.textContent;button.textContent='Saving…';const fields=currentPanel==='event-editor'?$('event-fields'):currentPanel==='workspace'&&!$('profile-panel').hidden?$('profile-fields'):null;if(fields)fields.disabled=true;try{await action();}catch(e){if(fields)fields.disabled=false;report(e);}finally{saving=false;if(fields)fields.disabled=false;button.disabled=false;button.textContent=prior;}}
function applySession(next){session=next;$('logout').hidden=!next.authenticated;$('environment').hidden=next.environment!=='preview';}
async function loadWorkspace(){workspace=await api('workspace');setDirty(false);loadDrafts();$('reload-workspace').hidden=true;$('workspace-name').textContent=workspace.society.name;const logo=safeUrl(workspace.society.logo_url);$('workspace-logo').hidden=!logo;if(logo)$('workspace-logo').src=logo;fillProfile();profilePreview();eventLimit=6;renderEvents();}
function fillProfile(){for(const field of profileFields)$('profile-form').elements[field].value=workspace.society[field]||'';}
async function enter(){if(session.role==='admin'){adminData=await api('admin/societies');renderAdmin();show('admin');}else{await loadWorkspace();show('workspace');}}
function rememberEvent(event){const index=workspace.events.findIndex(item=>item.id===event.id);if(index<0)workspace.events.push(event);else workspace.events[index]=event;renderEvents();}
function format(value,options){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...options}).format(new Date(value));}
function londonLocal(value){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute;}
function londonInstant(local){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw new Error('Enter both the date and time.');const guess=Date.parse(local+'Z');const candidates=[guess-3600000,guess].filter(n=>Number.isFinite(n)&&londonLocal(n)===local);if(!candidates.length)throw new Error('That time does not exist in Southampton because the clocks change. Please choose another time.');return new Date(Math.min(...candidates)).toISOString();}
function dateLabel(event){return format(event.start,{weekday:'short',day:'numeric',month:'short'})+' · '+format(event.start,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'})+'–'+format(event.end,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'})+(londonLocal(event.start).slice(0,10)!==londonLocal(event.end).slice(0,10)?' ('+format(event.end,{day:'numeric',month:'short'})+')':'');}
function renderOverview(){
  const now=Date.now(),upcoming=workspace.events.filter(e=>e.status!=='cancelled'&&Date.parse(e.end)>=now);
  $('overview-upcoming-count').textContent=upcoming.filter(e=>e.verification_status!=='needs_confirmation').length;
  $('overview-review-count').textContent=upcoming.filter(e=>e.verification_status==='needs_confirmation').length;
  $('overview-joining-status').textContent=workspace.society.how_to_join?.trim()?'Welcome ready':'Add a welcome';
}
function renderEvents(){
  if(!workspace)return;renderOverview();const query=$('event-search').value.trim().toLowerCase(),now=Date.now();
  const matches=workspace.events.filter(e=>(filter==='cancelled'?e.status==='cancelled':e.status!=='cancelled'&&(filter==='past'?Date.parse(e.end)<now:Date.parse(e.end)>=now&&(filter==='review'?e.verification_status==='needs_confirmation':e.verification_status!=='needs_confirmation')))&&[e.title,e.location,e.description].join(' ').toLowerCase().includes(query)).sort((a,b)=>filter==='past'?Date.parse(b.start)-Date.parse(a.start):Date.parse(a.start)-Date.parse(b.start));
  const visible=matches.slice(0,eventLimit);
  $('events-list').innerHTML=visible.length?visible.map(e=>'<article class="event-card" tabindex="-1"><div class="date-tile"><b>'+esc(format(e.start,{day:'2-digit'}))+'</b><span>'+esc(format(e.start,{month:'short'}))+'</span></div><div>'+(e.status==='cancelled'?'<span class="badge cancelled">Cancelled</span>':e.verification_status==='needs_confirmation'?'<span class="badge review">Needs confirmation</span>':'<span class="badge">Published</span>')+'<h3>'+esc(e.title)+'</h3><p>'+esc(dateLabel(e))+'</p><p>'+esc(e.location||'No location added')+'</p>'+(e.verification_status==='needs_confirmation'?'<p class="source-note">Check the date and venue, then publish to confirm.</p>':'')+'</div><div class="event-actions"><button class="button secondary small" data-event="'+esc(e.id)+'" data-action="edit">'+(e.status==='cancelled'?'Restore / edit':e.verification_status==='needs_confirmation'?'Review & confirm':'Edit')+'</button><button class="button secondary small" data-event="'+esc(e.id)+'" data-action="duplicate">Duplicate</button>'+(e.status!=='cancelled'?'<button class="text-button" data-event="'+esc(e.id)+'" data-action="cancel">Cancel</button>':'')+'</div></article>').join(''):'<div class="empty"><h3>'+(query?'No matching events':filter==='upcoming'?'Your next event starts here.':filter==='review'?'No dates need confirmation.':filter==='past'?'No past events yet.':'No cancelled events.')+'</h3><p>'+(query?'Try another event name or location.':filter==='upcoming'?'Add the date, place and a short description. Students can take it from there.':filter==='review'?'Any imported dates needing a check will appear here.':'Find your next event in Upcoming.')+'</p>'+(query?'<button class="button secondary" data-action="clear-search">Clear search</button>':filter==='upcoming'?'<button class="button" data-action="new">+ Add your first event</button>':'')+'</div>';
  $('leader-result-count').textContent=matches.length?'Showing '+visible.length+' of '+matches.length+' '+(filter==='review'?'dates to confirm':filter+' events'):'';
  $('more-events').hidden=matches.length<=eventLimit;$('more-events').textContent='Show '+Math.min(6,matches.length-eventLimit)+' more';
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
}
function tab(which,skipLeave=false){
  if(!skipLeave){
    if(currentPanel==='workspace'&&!$(which+'-panel').hidden&&(which!=='profile'||draftContext?.kind==='profile'))return;
    if(!canLeave())return;
    if(which==='profile'&&drafts.profile)return resumeDraft('profile');
  }
  if(dirty)setDirty(false);draftContext=null;draftConflict=false;$('draft-conflict').hidden=true;fillProfile();
  const profile=which==='profile';$('events-panel').hidden=profile;$('profile-panel').hidden=!profile;$('events-tab').setAttribute('aria-selected',String(!profile));$('profile-tab').setAttribute('aria-selected',String(profile));$('events-tab').tabIndex=profile?-1:0;$('profile-tab').tabIndex=profile?0:-1;
  if(profile)draftContext=newDraftContext('profile');profilePreview();
}
function shiftLocal(value,days=0,minutes=0){return new Date(Date.parse(value+'Z')+days*DAY+minutes*60000).toISOString().slice(0,16);}
function rememberTimes(){previousStart=$('event-form').elements.start.value;previousEnd=$('event-form').elements.end.value;}
function clearEventErrors(){const f=$('event-form');for(const field of eventFields){f.elements[field].removeAttribute('aria-invalid');f.elements[field].removeAttribute('aria-describedby');}$('event-validation').hidden=true;}
function openEditor(event,duplicate=false,restoring=false){
  if(!restoring&&!canLeave())return;
  const key='event:'+(event&&!duplicate?event.id:'new');if(!restoring&&drafts[key])return resumeDraft(key);
  editing=event&&!duplicate?event:null;const form=$('event-form');form.reset();clearEventErrors();draftConflict=false;$('draft-conflict').hidden=true;
  for(const key of ['title','location','description','source_url'])form.elements[key].value=event?.[key]||'';
  if(event){let start=londonLocal(event.start),end=londonLocal(event.end);if(duplicate){const weeks=Math.max(1,Math.floor((Date.parse(londonLocal(Date.now())+'Z')-Date.parse(start+'Z'))/(7*DAY))+1);start=shiftLocal(start,weeks*7);end=shiftLocal(end,weeks*7);}form.elements.start.value=start;form.elements.end.value=end;}
  else{const date=londonLocal(Date.now()+DAY).slice(0,10);form.elements.start.value=date+'T18:00';form.elements.end.value=date+'T20:00';}
  $('editor-title').textContent=duplicate?'Duplicate event':event?.status==='cancelled'?'Restore an event':event?.verification_status==='needs_confirmation'?'Confirm event details':event?'Edit event':'Add an event';
  $('publish-event').textContent=event&&!duplicate?'Publish changes':'Publish event';
  $('event-save-hint').textContent=duplicate?'A new date is suggested. Check it before publishing this separate event.':event?.verification_status==='needs_confirmation'?'Publishing confirms this date and makes it available in students’ calendars.':'Publishing updates your society’s public event listing.';
  draftContext=newDraftContext('event',editing);setDirty(!!duplicate);rememberTimes();eventPreview();message('');show('event-editor');
}
const DAY=86400000;
${PORTAL_DRAFTS}
function eventPreview(){const f=$('event-form');$('event-preview-society').textContent=workspace?.society.name||'';$('event-preview-title').textContent=f.elements.title.value||'Your event name';$('event-preview-location').textContent=f.elements.location.value||'Add a meeting point';$('event-preview-description').textContent=f.elements.description.value||'Explain who can come and anything they need to bring.';try{$('event-preview-time').textContent=dateLabel({start:londonInstant(f.elements.start.value),end:londonInstant(f.elements.end.value)});}catch{$('event-preview-time').textContent='Choose a start and end time';}const href=safeUrl(f.elements.source_url.value);$('event-preview-link').hidden=!href;if(href)$('event-preview-link').href=href;}
function eventError(field,text){const error=new Error(text);error.field=field;throw error;}
function eventPayload(){
  const f=$('event-form'),data={timezone:'Europe/London'};
  for(const name of ['title','location','description','source_url']){const field=f.elements[name];data[name]=field.value.trim();if(field.maxLength>0&&data[name].length>field.maxLength)eventError(name,'Shorten '+fieldLabels[name].toLowerCase()+' to '+field.maxLength+' characters.');}
  if(!data.title)eventError('title','Give your event a name.');if(data.source_url&&!safeUrl(data.source_url))eventError('source_url','Enter a full public https:// booking or event link.');
  for(const name of ['start','end'])try{data[name]=londonInstant(f.elements[name].value);}catch(error){eventError(name,error.message);}
  const duration=Date.parse(data.end)-Date.parse(data.start);if(duration<=0)eventError('end','The end must be after the start.');if(duration>7*DAY)eventError('end','An event can last up to seven days. Check the end date.');
  return data;
}
function profilePreview(){const f=$('profile-form');$('profile-preview-name').textContent=workspace?.society.name||'';$('profile-preview-description').textContent=f.elements.description.value;$('profile-preview-join').textContent=f.elements.how_to_join.value||'Your welcome and next steps will appear here.';const href=safeUrl(f.elements.membership_url.value);$('profile-preview-link').hidden=!href;if(href)$('profile-preview-link').href=href;}
function renderAdmin(){const q=$('admin-search').value.toLowerCase();const matches=adminData.societies.filter(s=>s.name.toLowerCase().includes(q));$('admin-societies').innerHTML=matches.map(s=>{const count=adminData.access.find(a=>a.society_id===s.id)?.active_sessions||0;return '<button class="society-option" data-society="'+esc(s.id)+'" aria-pressed="'+String(chosenSociety?.id===s.id)+'"><strong>'+esc(s.name)+'</strong><small>'+count+' active secretary '+(count===1?'session':'sessions')+'</small></button>';}).join('')||'<p class="note">No societies match. Try another name.</p>';if(chosenSociety)showAdminSociety(false);}
function showAdminSociety(reset=true){$('admin-placeholder').hidden=true;$('admin-selected').hidden=false;$('admin-society-name').textContent=chosenSociety.name;const susu=safeUrl(chosenSociety.susu_url),email=chosenSociety.contact_email;$('admin-contact').innerHTML=(susu?'<a target="_blank" rel="noopener noreferrer" href="'+esc(susu)+'">Official SUSU profile ↗</a>':'')+(email&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)?'<a href="mailto:'+esc(email)+'">Official contact ↗</a>':'');const count=adminData.access.find(a=>a.society_id===chosenSociety.id)?.active_sessions||0;const invites=(adminData.invitations||[]).filter(i=>i.society_id===chosenSociety.id).length;$('admin-access-info').textContent=count+' active sessions · '+invites+' unused invitations';if(reset){$('invite-result').hidden=true;$('invite-url').value='';$('invite-label').value='';$('revoke-confirm').hidden=true;}}
async function requestOptions(){try{const response=await fetch('/api/events',{cache:'no-store'});if(!response.ok)return;const data=await response.json();$('society-names').innerHTML=data.societies.map(s=>'<option value="'+esc(s.name)+'"></option>').join('');}catch{/* The email request still works when the catalogue is unavailable. */}}
$('request-form').addEventListener('submit',event=>{event.preventDefault();const society=$('request-society').value.trim(),name=$('request-name').value.trim();const body='Hi Marlow,\n\nI would like access to the UniFlow secretary portal.\n\nSociety: '+society+'\nName and role: '+name+'\nOfficial society email or SUSU profile: [please add]\n\nThanks!';location.href='mailto:marlow.thijs@icloud.com?subject='+encodeURIComponent('UniFlow secretary access · '+society)+'&body='+encodeURIComponent(body);});
$('accept-invite').addEventListener('click',()=>busy($('accept-invite'),async()=>{applySession(await api('session/invite','POST',{token:invitation}));invitation=null;await enter();message('Welcome. This is your society’s workspace.');}));
$('owner-login-form').addEventListener('submit',event=>{event.preventDefault();busy(event.submitter,async()=>{applySession(await api('session/admin','POST',{key:$('owner-key').value}));$('owner-key').value='';await enter();message('');});});
$('logout').addEventListener('click',()=>{if(!canLeave())return;busy($('logout'),async()=>{await api('logout','POST',{});setDirty(false);session=null;$('logout').hidden=true;show(ownerRoute?'owner-login':'welcome');message('Signed out. A secretary needs a new invitation to sign in again.','info');if(!ownerRoute)requestOptions();});});
$('new-event').addEventListener('click',()=>openEditor());
$('event-search').addEventListener('input',()=>{eventLimit=6;renderEvents();});
$('more-events').addEventListener('click',()=>{const old=$('events-list').querySelectorAll('.event-card').length;eventLimit+=6;renderEvents();const next=$('events-list').querySelectorAll('.event-card')[old];next?.focus({preventScroll:true});next?.scrollIntoView({block:'nearest'});});
$('overview-upcoming').addEventListener('click',()=>{if(!canLeave())return;tab('events',true);filter='upcoming';eventLimit=6;$('event-search').value='';renderEvents();});
$('overview-review').addEventListener('click',()=>{if(!canLeave())return;tab('events',true);filter='review';eventLimit=6;$('event-search').value='';renderEvents();});
$('overview-joining').addEventListener('click',()=>{tab('profile');if(!$('profile-panel').hidden)$('profile-form').elements.how_to_join.focus();});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;eventLimit=6;$('cancel-confirm').hidden=true;renderEvents();}));
$('events-list').addEventListener('click',event=>{const b=event.target.closest('button[data-action]');if(!b)return;if(b.dataset.action==='new')return openEditor();if(b.dataset.action==='clear-search'){$('event-search').value='';eventLimit=6;renderEvents();$('event-search').focus();return;}const item=workspace.events.find(e=>e.id===b.dataset.event);if(!item)return;if(b.dataset.action==='cancel'){cancelling=item;$('cancel-description').textContent=item.title+' · '+dateLabel(item);$('cancel-confirm').hidden=false;$('cancel-confirm').scrollIntoView({behavior:'smooth',block:'center'});$('cancel-confirm-no').focus();}else openEditor(item,b.dataset.action==='duplicate');});
$('cancel-confirm-no').addEventListener('click',()=>{$('cancel-confirm').hidden=true;cancelling=null;});
$('cancel-confirm-yes').addEventListener('click',()=>busy($('cancel-confirm-yes'),async()=>{if(!cancelling)return;const result=await api('events/'+encodeURIComponent(cancelling.id)+'/cancel','POST',{version:cancelling.version||0});rememberEvent(result.event);$('cancel-confirm').hidden=true;cancelling=null;message('Event cancelled. Calendar subscribers receive the cancellation when their calendar refreshes.');}));
$('event-form').addEventListener('input',event=>{
  const f=$('event-form');if(event.target===f.elements.start&&f.elements.start.value&&previousStart&&previousEnd){const duration=Date.parse(previousEnd+'Z')-Date.parse(previousStart+'Z');if(duration>0&&duration<=7*DAY&&f.elements.end.value===previousEnd)f.elements.end.value=shiftLocal(f.elements.start.value,0,duration/60000);}
  rememberTimes();clearEventErrors();setDirty(true);eventPreview();
});
$('event-form').addEventListener('submit',event=>{event.preventDefault();busy(event.submitter,async()=>{
  if(draftConflict)throw new Error('Review the published changes above before publishing your draft.');
  const data=eventPayload();if(editing)data.version=draftContext.version;else data.request_id=draftContext.requestId;
  // Keep a recoverable draft before sending a publish request.
  dirty=true;persistDraft();
  const result=await api(editing?'events/'+encodeURIComponent(editing.id):'events',editing?'PATCH':'POST',data);
  removeDraft(draftContext.key);rememberEvent(result.event);setDirty(false);draftContext=null;filter=Date.parse(result.event.end)<Date.now()?'past':'upcoming';eventLimit=6;$('event-search').value='';renderEvents();show('workspace');tab('events',true);message('Event published. It is now in your society’s feed; students’ calendar apps refresh on their own schedule.');
});});
function closeEditor(){if(!canLeave())return;const changed=dirty,saved=draftSaved;setDirty(false);draftContext=null;draftConflict=false;$('draft-conflict').hidden=true;show('workspace');tab('events',true);message(changed?(saved?'Draft saved on this device. Continue it whenever you’re ready.':'Your latest unpublished changes were not saved on this device.'):'','info');}
$('editor-back').addEventListener('click',closeEditor);$('save-event-draft').addEventListener('click',closeEditor);
$('discard-event').addEventListener('click',()=>{if(saving)return;if((dirty||drafts[draftContext?.key])&&!window.confirm('Discard this draft? Published events will stay unchanged.'))return;if(draftContext&&!removeDraft(draftContext.key)){message('Could not remove the saved draft.','error');return;}setDirty(false);closeEditor();});
$('events-tab').addEventListener('click',()=>tab('events'));$('profile-tab').addEventListener('click',()=>tab('profile'));
document.querySelector('.tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const target=event.target.id==='events-tab'?'profile':'events';tab(target);$(target+'-tab').focus();});
$('profile-form').addEventListener('input',()=>{setDirty(true);profilePreview();});
$('profile-form').addEventListener('submit',event=>{event.preventDefault();busy(event.submitter,async()=>{
  if(draftConflict)throw new Error('Review the published changes above before publishing your draft.');
  const data={version:draftContext?.version??workspace.profile_version};
  for(const field of profileFields){const value=event.target.elements[field].value;if(value!==(workspace.society[field]||''))data[field]=value;}
  dirty=true;draftContext=draftContext||newDraftContext('profile');persistDraft();
  const result=await api('profile','PATCH',data);removeDraft('profile');workspace.society=result.society;workspace.profile_version=result.profile_version;setDirty(false);draftContext=newDraftContext('profile');$('profile-save-hint').textContent='Published just now. Students can see these details.';profilePreview();renderOverview();message('Society details published. Students can now see how to get involved.');
});});
$('reload-workspace').addEventListener('click',()=>{if(!canLeave())return;busy($('reload-workspace'),async()=>{await loadWorkspace();show('workspace');message('Loaded the latest published version.','info');});});
$('admin-search').addEventListener('input',renderAdmin);
$('admin-societies').addEventListener('click',event=>{const button=event.target.closest('[data-society]');if(!button)return;chosenSociety=adminData.societies.find(s=>s.id===button.dataset.society);showAdminSociety();renderAdmin();});
$('invite-form').addEventListener('submit',event=>{event.preventDefault();busy(event.submitter,async()=>{const result=await api('admin/invitations','POST',{society_id:chosenSociety.id,label:$('invite-label').value});$('invite-url').value=result.invite_url;$('invite-expiry').textContent='Expires '+new Date(result.expires_at).toLocaleString('en-GB');$('invite-result').hidden=false;adminData=await api('admin/societies');renderAdmin();message('Invitation created. Copy the private link and send it to the verified secretary.');});});
$('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite-url').value);message('Private invitation copied.');}catch{$('invite-url').focus();$('invite-url').select();message('Select and copy the invitation link above.','info');}});
$('revoke-start').addEventListener('click',()=>{$('revoke-confirm').hidden=false;$('revoke-no').focus();});$('revoke-no').addEventListener('click',()=>{$('revoke-confirm').hidden=true;});
$('revoke-yes').addEventListener('click',()=>busy($('revoke-yes'),async()=>{await api('admin/revoke','POST',{society_id:chosenSociety.id});$('revoke-confirm').hidden=true;$('invite-result').hidden=true;$('invite-url').value='';adminData=await api('admin/societies');renderAdmin();message('Access revoked. Existing events and society details are unchanged. Create a new invitation for the next secretary.');}));
$('workspace-logo').addEventListener('error',()=>{$('workspace-logo').hidden=true;});
window.addEventListener('beforeunload',event=>{if(dirty&&!persistDraft()){event.preventDefault();event.returnValue='';}});
function connectionStatus(){$('connection-status').hidden=navigator.onLine!==false;}window.addEventListener('online',connectionStatus);window.addEventListener('offline',connectionStatus);connectionStatus();
document.querySelectorAll('a[href="/"]').forEach(link=>link.addEventListener('click',event=>{if(!canLeave())event.preventDefault();}));
(async()=>{try{applySession(await api('session'));if(!session.configured){show(ownerRoute?'owner-login':'welcome');message('This portal is not set up yet. Please contact the UniFlow team.','info');requestOptions();return;}if(invitation){show('invite');return;}if(session.authenticated&&(!ownerRoute||session.role==='admin')){await enter();return;}show(ownerRoute?'owner-login':'welcome');if(!ownerRoute)requestOptions();}catch(error){show(ownerRoute?'owner-login':'welcome');report(error);}})();
})();`;
