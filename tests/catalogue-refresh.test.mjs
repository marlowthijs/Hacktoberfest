import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDirectory, parseProfile, parseCalendarEvent, publicUrl } from '../scripts/refresh-catalogue.mjs';

test('source parser excludes committee names, footer contacts and unrelated recommendations', () => {
 const result=parseProfile(`<h2 class="fw-bold fs-1">Test Club</h2><a href=""></a><div class="small-social"><a href="mailto:club@example.com">Email</a><a href="https://instagram.com/testclub?utm_medium=tracking">Instagram</a></div><img src="/groups/logos/123_456.png"><div id="pills-home"><p>Train every Thursday at 18:00. Beginners welcome.</p><h3>The Committee</h3><p>Private Committee Name</p><a href="mailto:person@example.com">Email</a></div><div id="pills-fees"><table><tbody><tr><td>Annual membership</td><td>£10</td><td>2026–27</td></tr></tbody></table></div><div id="pills-events"><a href="/event/123/test">Event</a></div><footer><a href="mailto:hello@susu.org">Email</a></footer>`, 'https://www.susu.org/groups/test');
 assert.equal(result.contact_email,'club@example.com');assert.equal(result.instagram_url,'https://instagram.com/testclub');assert.equal(result.susu_group_id,123);
 assert.equal(result.regular_schedule,'Train every Thursday at 18:00.');assert.equal(result.how_to_join,'Beginners welcome.');
 assert.doesNotMatch(JSON.stringify(result),/Private Committee Name|person@example.com|hello@susu.org/);
 assert.equal(result.memberships[0].cost,'£10');assert.deepEqual(result.event_urls,['https://www.susu.org/event/123/test']);
});
test('directory uses listed names rather than random society suggestions',()=>{
 assert.deepEqual(parseDirectory('<a href="/groups/random">Random</a><a class="js-name-item" href="/groups/test"> Test Club </a>'),[{name:'Test Club',susu_url:'https://www.susu.org/groups/test'}]);
});
test('links reject unsafe schemes and strip identifying email wrappers',()=>{
 assert.equal(publicUrl(''),'');assert.equal(publicUrl('javascript:alert(1)'),'');assert.equal(publicUrl('https://user:password@example.com'),'');
 assert.equal(publicUrl('https://eur03.safelinks.protection.outlook.com/?url=https%3A%2F%2Fchat.whatsapp.com%2Fpublic-group&data=personal-email'), 'https://chat.whatsapp.com/public-group');
});
test('calendar uses published instants and flags implausible event duration',()=>{
 const raw={id:123,url:'test',start_datetime:Date.parse('2027-03-31T17:00:00Z')/1000,end_datetime:Date.parse('2027-03-31T19:00:00Z')/1000,series:{title:'Workshop'},data:{description:'<p>Welcome <script>bad()</script></p>'},location:{name:'Room 42'}};
 const event=parseCalendarEvent(raw,{id:'test'},'2026-11-17T12:00:00Z');assert.equal(event.start,'2027-03-31T17:00:00.000Z');assert.equal(event.id,'susu-event-123');assert.equal(event.verification_status,undefined);
 assert.equal(event.description,'Welcome');
 const invalid=parseCalendarEvent({...raw,end_datetime:raw.start_datetime-1},{id:'test'},'2026-11-17');assert.equal(invalid,null);
 const conflicting=parseCalendarEvent({...raw,end_datetime:raw.start_datetime+26*86400},{id:'test'},'2026-11-17');assert.equal(conflicting.verification_status,'needs_confirmation');
});
test('the published catalogue has unique identities, valid references and dated source evidence', async()=>{
 const catalogue=JSON.parse(await readFile(new URL('../data/events.json',import.meta.url),'utf8'));
 const societies=new Set(catalogue.societies.map(s=>s.id));
 assert.equal(societies.size,catalogue.societies.length);
 assert.equal(new Set(catalogue.events.map(e=>e.id)).size,catalogue.events.length);
 for(const event of catalogue.events){
  assert.ok(societies.has(event.society_id),event.id+' references a missing society');
  assert.ok(Date.parse(event.end)>Date.parse(event.start),event.id+' has invalid dates');
  if(event.source_type==='susu_event'){
   assert.equal(new URL(event.source_url).hostname,'www.susu.org');
   assert.ok(Number.isFinite(Date.parse(event.source_checked_at)));
  }
 }
 for(const society of catalogue.societies)for(const evidence of Object.values(society.contact_sources||{})){
  assert.equal(evidence.url,society.susu_url);assert.ok(Number.isFinite(Date.parse(evidence.checked_at)));
 }
});
