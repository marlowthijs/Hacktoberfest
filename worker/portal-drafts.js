export const PORTAL_DRAFTS = String.raw`
const eventFields=['title','start','end','location','description','source_url'];
const fieldLabels={title:'Event name',start:'Starts',end:'Ends',location:'Location',description:'Introduction / description',source_url:'Event link',how_to_join:'How to get involved',membership_url:'Join or book link',regular_schedule:'Regular activities',contact_email:'Contact email',instagram_url:'Instagram',community_url:'Group chat',website_url:'Website'};
let drafts={},draftContext=null,draftTimer=null,draftSaved=false,draftConflict=false;
const draftStore=()=> 'uniflow:leader-drafts:v1:'+workspace.society.id;
function formValues(kind){const f=$(kind==='event'?'event-form':'profile-form');return Object.fromEntries((kind==='event'?eventFields:profileFields).map(k=>[k,f.elements[k].value]));}
function publishedValues(kind,event){return Object.fromEntries((kind==='event'?eventFields:profileFields).map(k=>[k,kind==='event'&&(k==='start'||k==='end')?londonLocal(event[k]):(kind==='event'?event:workspace.society)?.[k]||'']));}
function newDraftContext(kind,event){return {key:kind==='profile'?'profile':'event:'+(event?.id||'new'),kind,eventId:event?.id||null,version:kind==='profile'?workspace.profile_version:event?.version||0,base:kind==='profile'||event?publishedValues(kind,event):null,requestId:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')};}
function loadDrafts(){
  drafts={};draftContext=null;draftConflict=false;$('draft-conflict').hidden=true;
  try{const data=JSON.parse(localStorage.getItem(draftStore())||'{}');for(const [key,value] of Object.entries(data||{})){
    const fields=value?.kind==='event'?eventFields:value?.kind==='profile'?profileFields:null;
    if(!fields||key!==(value.kind==='profile'?'profile':'event:'+(value.eventId||'new'))||!Number.isInteger(value.version)||value.version<0||!Number.isFinite(value.savedAt)||!value.values||fields.some(k=>typeof value.values[k]!=='string'||value.values[k].length>50000))continue;
    if(value.base!==null&&(!value.base||fields.some(k=>typeof value.base[k]!=='string')))continue;
    drafts[key]=value;
  }}catch{}
  renderDrafts();
}
function writeDrafts(){try{localStorage.setItem(draftStore(),JSON.stringify(drafts));return true;}catch{return false;}}
function draftIndicator(text,error=false){for(const id of ['event-draft-state','profile-draft-state']){$(id).textContent=text;$(id).classList.toggle('error',error);}}
function persistDraft(){
  clearTimeout(draftTimer);if(!dirty||!draftContext||!workspace)return true;
  const key=draftContext.key,prior=drafts[key];
  drafts[key]={...draftContext,values:formValues(draftContext.kind),savedAt:Date.now()};
  if(!writeDrafts()){if(prior)drafts[key]=prior;else delete drafts[key];draftSaved=false;draftIndicator('Could not save a draft on this device. Keep this page open or publish your changes.',true);return false;}
  draftSaved=true;draftIndicator('Draft saved on this device · not published');renderDrafts();return true;
}
function scheduleDraft(){draftSaved=false;draftIndicator('Saving draft on this device…');clearTimeout(draftTimer);draftTimer=setTimeout(persistDraft,350);}
function removeDraft(key){if(!key)return;const prior=drafts[key];delete drafts[key];if(!writeDrafts()){if(prior)drafts[key]=prior;return false;}renderDrafts();return true;}
function renderDrafts(){
  const list=Object.entries(drafts).sort((a,b)=>b[1].savedAt-a[1].savedAt);$('draft-tray').hidden=!list.length;
  $('draft-list').innerHTML=list.map(([key,d])=>'<div class="draft-row"><div><strong>'+esc(d.kind==='profile'?'Society details':d.values.title||'Untitled event')+'</strong><small>Saved '+esc(new Date(d.savedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))+'</small></div><button class="button secondary small" data-resume-draft="'+esc(key)+'">Continue draft</button><button class="text-button" data-discard-draft="'+esc(key)+'">Discard</button></div>').join('');
}
function latestDraftContext(){const event=draftContext?.eventId?workspace.events.find(e=>e.id===draftContext.eventId):null;return newDraftContext(draftContext.kind,event);}
function showDraftConflict(){
  const latest=latestDraftContext();draftConflict=draftContext.version!==latest.version||JSON.stringify(draftContext.base)!==JSON.stringify(latest.base);
  $('draft-conflict').hidden=!draftConflict;
  if(!draftConflict)return;
  const values=formValues(draftContext.kind),current=latest.base||{};
  $('draft-comparison').innerHTML=Object.keys(values).filter(k=>values[k]!==current[k]).map(k=>'<div class="comparison-row"><h3>'+esc(fieldLabels[k]||k)+'</h3><div class="comparison-values"><div><strong>Published now</strong><p>'+esc(current[k]||'Not added')+'</p></div><div><strong>Your draft</strong><p>'+esc(values[k]||'Not added')+'</p></div></div></div>').join('')||'<p>Your text matches the latest published version. Review it before continuing.</p>';
  $('draft-conflict').scrollIntoView({block:'start',behavior:'auto'});
}
function resumeDraft(key){
  if(!canLeave())return;let draft=drafts[key];if(!draft)return;
  if(draft.kind==='event'&&!draft.eventId&&draft.requestId){
    const published=workspace.events.find(e=>e.id===workspace.society.id+'-'+draft.requestId);
    if(published){delete drafts[key];key='event:'+published.id;draft={...draft,key,eventId:published.id};drafts[key]=draft;writeDrafts();renderDrafts();}
  }
  if(draft.kind==='event'){
    const event=draft.eventId?workspace.events.find(e=>e.id===draft.eventId):null;
    if(draft.eventId&&!event){message('This event is no longer listed. Its draft is still saved on this device. Contact UniFlow for help.','error');return;}
    openEditor(event,false,true);
  }else{show('workspace');tab('profile',true);}
  const f=$(draft.kind==='event'?'event-form':'profile-form');for(const [k,v] of Object.entries(draft.values))if((draft.kind==='event'?eventFields:profileFields).includes(k))f.elements[k].value=v;
  draftContext={key,kind:draft.kind,eventId:draft.eventId,version:draft.version,base:draft.base,requestId:/^[a-f0-9]{32}$/.test(draft.requestId||'')?draft.requestId:draftContext.requestId};
  dirty=true;draftSaved=true;clearTimeout(draftTimer);draftIndicator('Draft restored · not published');
  if(draft.kind==='event'){rememberTimes();eventPreview();}else profilePreview();
  showDraftConflict();message('Your draft is ready to review. Nothing has been published.','info');
}
$('draft-list').addEventListener('click',event=>{
  const resume=event.target.closest('[data-resume-draft]');if(resume)return resumeDraft(resume.dataset.resumeDraft);
  const discard=event.target.closest('[data-discard-draft]');if(discard&&window.confirm('Discard this saved draft? Published details will stay unchanged.')){
    if(removeDraft(discard.dataset.discardDraft))message('Draft discarded. Published details are unchanged.','info');else message('Could not remove the draft from this device.','error');
  }
});
$('keep-draft').addEventListener('click',()=>{if(!draftContext||saving)return;draftContext=latestDraftContext();draftConflict=false;$('draft-conflict').hidden=true;setDirty(true);persistDraft();message('Review your draft, then publish when you’re ready.','info');});
$('use-published').addEventListener('click',()=>{
  if(!draftContext||saving||!window.confirm('Replace this draft with the published version?'))return;
  const {key,kind,eventId}=draftContext;if(!removeDraft(key)){message('Could not remove the draft. Keep this page open.','error');return;}
  setDirty(false);draftConflict=false;$('draft-conflict').hidden=true;
  if(kind==='event')openEditor(eventId?workspace.events.find(e=>e.id===eventId):null,false,true);else tab('profile',true);
  message('Loaded the published version.','info');
});
`;
