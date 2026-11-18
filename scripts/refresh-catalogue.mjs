import { JSDOM, VirtualConsole } from 'jsdom';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const SUSU = 'https://www.susu.org';
export const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const short = (value, max = 700) => { const s = clean(value); return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'; };
const documentOf = html => new JSDOM(html, { virtualConsole: new VirtualConsole() }).window.document;
const plain = html => { const fragment = JSDOM.fragment(html || ''); fragment.querySelectorAll('script,style').forEach(el => el.remove()); return clean(fragment.textContent); };
const dateIssue = (start, end) => +new Date(end) - +new Date(start) > 7 * 86400000 ? { verification_status: 'needs_confirmation', verification_note: 'SUSU lists a duration longer than seven days. The event dates need checking with the organiser.' } : {};
const eventChanged = (prior, event) => ['title', 'start', 'end', 'location', 'description', 'status', 'verification_status', 'verification_note'].some(f => (f === 'start' || f === 'end') ? Date.parse(prior[f]) !== Date.parse(event[f]) : (prior[f] || (f === 'status' ? 'confirmed' : '')) !== (event[f] || (f === 'status' ? 'confirmed' : '')));
const canonical = value => { try { const u = new URL(value, SUSU); return u.origin + u.pathname.replace(/\/$/, ''); } catch { return ''; } };
export function publicUrl(value) {
  if (!clean(value)) return '';
  try { const u = new URL(clean(value), SUSU); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || !u.hostname.includes('.')) return ''; if (u.hostname.endsWith('.safelinks.protection.outlook.com') && /^https?:\/\//.test(u.searchParams.get('url') || '')) return publicUrl(u.searchParams.get('url')); for (const key of [...u.searchParams.keys()]) if (/^utm_|^fbclid$|^igsh(id)?$/i.test(key)) u.searchParams.delete(key); return u.href; } catch { return ''; }
}
export function parseDirectory(html) {
  const d = documentOf(html);
  return [...d.querySelectorAll('.js-name-item[href^="/groups/"]')].map(a => ({ name: clean(a.textContent), susu_url: canonical(a.getAttribute('href')) }));
}
export function parseProfile(html, url) {
  const d = documentOf(html), title = d.querySelector('h2.fw-bold.fs-1');
  if (!title || !d.querySelector('#pills-home')) throw new Error('Unrecognised society profile');
  const home = d.querySelector('#pills-home').cloneNode(true);
  // Keep public society information, excluding committee names and gallery captions.
  for (const heading of home.querySelectorAll('h3')) {
    let node = heading; while (node) { const next = node.nextSibling; node.remove(); node = next; } break;
  }
  home.querySelectorAll('script,style,iframe,img').forEach(el => el.remove());
  const intro = clean(title.parentElement.querySelector('p')?.textContent);
  const paragraphs = [...home.querySelectorAll('p,li')].filter(el => !el.querySelector('p,li')).map(el => clean(el.textContent)).filter(Boolean);
  const links = [...d.querySelectorAll('.small-social a[href]'), ...home.querySelectorAll('a[href]')];
  const urls = links.map(a => publicUrl(a.getAttribute('href'))).filter(Boolean);
  const isHost = (url, pattern) => pattern.test(new URL(url).hostname);
  const instagram = urls.find(u => isHost(u, /(^|\.)instagram\.com$/i) && !/^\/(p|reel|stories)\//.test(new URL(u).pathname));
  const community = urls.find(u => isHost(u, /(^|\.)(discord\.gg|discord\.com|chat\.whatsapp\.com)$/i));
  const website = urls.find(u => !isHost(u, /(^|\.)(susu\.org|instagram\.com|facebook\.com|twitter\.com|x\.com|discord\.gg|discord\.com|chat\.whatsapp\.com|youtube\.com|tiktok\.com)$/i));
  const email = links.map(a => a.getAttribute('href')).find(u => /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(u || ''))?.slice(7).split('?')[0];
  const logo = d.querySelector('img[src*="/groups/logos/"]')?.getAttribute('src');
  const ids = [...d.querySelectorAll('[href],[src]')].map(el => el.getAttribute('href') || el.getAttribute('src') || '').map(s => s.match(/\/groups\/(?:logos|constitution|privacy|risk)\/(\d+)_/)).filter(Boolean);
  const sentences = paragraphs.flatMap(p => [...new Intl.Segmenter('en-GB', { granularity: 'sentence' }).segment(p)].map(x => clean(x.segment)));
  const schedule = sentences.filter(p => /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekly|every week)\b/i.test(p) && /\d|weekly|every/i.test(p));
  const joining = sentences.filter(p => /\b(beginners?|first time|first session|no experience|join us|come along|membership|all abilities)\b/i.test(p));
  const memberships = [...d.querySelectorAll('#pills-fees tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => clean(td.textContent))).filter(c => c.length >= 3).map(c => ({ name: short(c[0], 150), cost: c[1], valid_period: c[2] }));
  return { name: clean(title.textContent), description: short(intro), susu_group_id: ids[0] ? Number(ids[0][1]) : null,
    logo_url: logo ? publicUrl(logo) : '', contact_email: email || '', instagram_url: instagram || '', website_url: website || '', community_url: community || '',
    regular_schedule: short(schedule.join('\n'), 700), how_to_join: short(joining.slice(0, 2).join('\n'), 700), membership_url: memberships.length ? url : '', memberships,
    event_urls: [...new Set([...d.querySelectorAll('#pills-events a[href^="/event/"]')].map(a => publicUrl(a.getAttribute('href'))))] };
}
export function parseCalendarEvent(raw, society, checkedAt) {
  const start = new Date(Number(raw.start_datetime) * 1000), end = new Date(Number(raw.end_datetime) * 1000);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || !raw.series?.title || !/^\d+$/.test(String(raw.id))) return null;
  return { id: 'susu-event-' + raw.id, society_id: society.id, title: clean(raw.series.title), start: start.toISOString(), end: end.toISOString(), timezone: 'Europe/London', location: clean(raw.location?.name), description: short(plain(raw.data?.description), 1100),
    source_url: `${SUSU}/event/${raw.id}/${encodeURIComponent(raw.url || '')}`, source_type: 'susu_event', source_checked_at: checkedAt, status: 'confirmed',
    booking_url: publicUrl(raw.data?.tickets_link || '') || undefined,
    ...dateIssue(start, end) };
}
export function parseEventPage(html, society, url, checkedAt) {
  const d = documentOf(html);
  let data;
  for (const script of d.querySelectorAll('script[type="application/ld+json"]')) { try { const candidate = JSON.parse(script.textContent); if (candidate['@type'] === 'Event') data = candidate; } catch {} }
  if (!data || !Number.isFinite(Date.parse(data.startDate)) || !Number.isFinite(Date.parse(data.endDate)) || Date.parse(data.endDate) <= Date.parse(data.startDate)) throw new Error('No complete dated event');
  const id = new URL(url).pathname.match(/^\/event\/(\d+)\//)?.[1]; if (!id) throw new Error('Missing event ID');
  const content = [...d.querySelectorAll('.container > .event__content')].find(el => !el.querySelector('h3,iframe') && clean(el.textContent));
  return { id: 'susu-event-' + id, society_id: society.id, title: clean(data.name), start: new Date(data.startDate).toISOString(), end: new Date(data.endDate).toISOString(), timezone: 'Europe/London', location: clean(data.location?.name), description: short(content?.textContent, 1100), source_url: url, source_type: 'susu_event', source_checked_at: checkedAt, status: /Cancelled/i.test(data.eventStatus || '') ? 'cancelled' : 'confirmed', booking_url: publicUrl(d.querySelector('a[itemprop="url"]')?.getAttribute('href') || '') || undefined, ...dateIssue(data.startDate, data.endDate) };
}

async function run() {
  const options = process.argv.slice(2), offline = options.includes('--cached'), resume = options.includes('--resume');
  const dateArg = options.indexOf('--date'), checkedAt = dateArg >= 0 ? new Date(options[dateArg + 1] + 'T12:00:00Z').toISOString() : new Date().toISOString();
  const today = Date.parse(checkedAt.slice(0, 10) + 'T00:00:00Z');
  const cacheDir = new URL('../.catalogue-cache/', import.meta.url); await mkdir(cacheDir, { recursive: true });
  const baselineArg = options.indexOf('--baseline');
  const base = JSON.parse(await readFile(baselineArg >= 0 ? options[baselineArg + 1] : new URL('data/events.json', ROOT), 'utf8'));
  const report = { checked_at: checkedAt, directories: [], new_societies: [], changed_profiles: [], missing_from_directories: [], failed_profiles: [], failed_events: [], unmatched_event_groups: [], date_issues: [], added_events: 0, updated_events: 0, unverified_upcoming_events: 0 };
  async function get(url) {
    if (new URL(url).origin !== SUSU) throw new Error('Only public SUSU sources are permitted');
    const file = new URL(createHash('sha256').update(url).digest('hex') + '.txt', cacheDir);
    if (offline) return readFile(file, 'utf8');
    if (resume) { try { return await readFile(file, 'utf8'); } catch {} }
    for (let attempt = 0; attempt < 3; attempt++) {
      try { const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'UniFlow-catalogue-refresh/1.0 (student society directory)' } }); if (!r.ok) { if ([429, 500, 502, 503, 504].includes(r.status) && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); continue; } throw new Error('HTTP ' + r.status); } const text = await r.text(); await writeFile(file, text); return text; }
      catch (e) { if (attempt === 2 || /HTTP 4/.test(e.message)) throw e; }
    }
  }
  async function map(items, fn) { let n = 0; await Promise.all(Array.from({ length: 4 }, async () => { while (n < items.length) { const i = n++; await fn(items[i], i); } })); }
  const directory = new Map();
  for (const [slug, category, sport_format] of [['societies', 'society', undefined], ['athletic-union', 'sport', 'club'], ['intramural-sports', 'sport', 'intramural']]) {
    const url = `${SUSU}/activities/interest/${slug}`, entries = parseDirectory(await get(url));
    if (entries.length < (category === 'society' ? 150 : 20)) throw new Error('Directory incomplete: ' + url);
    report.directories.push({ url, count: entries.length });
    for (const entry of entries) directory.set(entry.susu_url, { ...entry, category, ...(sport_format ? { sport_format } : {}) });
  }
  const byUrl = new Map(base.societies.map(s => [canonical(s.susu_url), s]));
  const ids = new Set(base.societies.map(s => s.id));
  for (const item of directory.values()) if (!byUrl.has(item.susu_url)) {
    let id = new URL(item.susu_url).pathname.split('/').pop(); if (ids.has(id)) id = 'susu-' + id;
    const entry = { id, ...item, accent: '#dceaf2' }; ids.add(id); base.societies.push(entry); byUrl.set(item.susu_url, entry); report.new_societies.push({ id, name: item.name, url: item.susu_url });
  }
  const groupById = new Map(), eventLinks = new Map();
  let complete = 0;
  await map(base.societies, async society => {
    const url = canonical(society.susu_url), item = directory.get(url);
    society.directory_status = item ? 'listed' : 'not_listed';
    if (!item) report.missing_from_directories.push({ id: society.id, name: society.name, url });
    if (item) { society.category = item.category; if (item.sport_format) society.sport_format = item.sport_format; }
    try {
      const parsed = parseProfile(await get(url), url), changed = [];
      for (const field of ['name', 'description', 'logo_url', 'susu_group_id', 'memberships']) if (parsed[field] && JSON.stringify(society[field]) !== JSON.stringify(parsed[field])) { society[field] = parsed[field]; changed.push(field); }
      // Earlier manually supplied links remain available but are not claimed as checked.
      society.contact_sources = {};
      for (const field of ['contact_email', 'instagram_url', 'website_url', 'community_url']) {
        if (parsed[field]) { if (society[field] !== parsed[field]) changed.push(field); society[field] = parsed[field]; society.contact_sources[field] = { url, checked_at: checkedAt }; }
        else if (field !== 'contact_email' && society[field]) society[field] = publicUrl(society[field]);
      }
      for (const field of ['regular_schedule', 'how_to_join', 'membership_url']) {
        if (parsed[field]) { if (society[field] !== parsed[field]) changed.push(field); society[field] = parsed[field]; society[field + '_source'] = url; society[field + '_checked_at'] = checkedAt; }
      }
      society.source_checked_at = checkedAt; society.source_status = 'checked';
      if (parsed.susu_group_id) groupById.set(parsed.susu_group_id, society);
      for (const eventUrl of parsed.event_urls) if (!eventLinks.has(eventUrl)) eventLinks.set(eventUrl, society);
      if (changed.length) report.changed_profiles.push({ id: society.id, name: society.name, fields: changed });
    } catch (error) { society.source_status = 'unavailable'; report.failed_profiles.push({ id: society.id, url, error: error.message }); }
    if (++complete % 50 === 0) console.log(`Checked ${complete}/${base.societies.length} society profiles`);
  });
  if (report.failed_profiles.length > base.societies.length * .15) throw new Error('Too many profile failures; existing catalogue was not changed.');
  const dated = new Map(), calendarMonths = [];
  for (let offset = 0; offset < 8; offset++) { const date = new Date(today); date.setUTCMonth(date.getUTCMonth() + offset, 1); calendarMonths.push(date.toISOString().slice(0, 7)); }
  await map(calendarMonths, async month => {
    const raw = JSON.parse(await get(`${SUSU}/php/ajax-whatson.php?search_date=${month}`));
    if (!Array.isArray(raw)) throw new Error('Invalid calendar response for ' + month);
    for (const row of raw) {
      const society = groupById.get(Number(row.series?.group_id));
      if (!society) { if (row.series?.group_id && Number(row.end_datetime) * 1000 >= today) report.unmatched_event_groups.push({ group_id: row.series.group_id, title: row.series.title, url: `${SUSU}/event/${row.id}/${row.url}` }); continue; }
      const event = parseCalendarEvent(row, society, checkedAt); if (event) { dated.set(event.id, event); if (event.verification_note) report.date_issues.push({ id: event.id, title: event.title, url: event.source_url, reason: event.verification_note }); }
    }
  });
  const extras = [...eventLinks].filter(([url]) => !dated.has('susu-event-' + new URL(url).pathname.split('/')[2]));
  await map(extras, async ([url, society]) => { try { const event = parseEventPage(await get(url), society, url, checkedAt); dated.set(event.id, event); if (event.verification_note) report.date_issues.push({ id: event.id, title: event.title, url, reason: event.verification_note }); } catch (error) { report.failed_events.push({ url, error: error.message }); } });
  const events = new Map(base.events.map(e => [e.id, e]));
  for (const [id, event] of dated) {
    const prior = events.get(id);
    if (!prior) report.added_events++;
    else if (eventChanged(prior, event)) report.updated_events++;
    // A fresh source timestamp alone must not churn subscribers' event versions.
    const changed = prior && eventChanged(prior, event);
    events.set(id, { ...prior, ...event, verification_status: event.verification_status, verification_note: event.verification_note, sequence: changed ? (prior.sequence || prior.version || 0) + 1 : prior?.sequence || prior?.version || 0, modified_at: changed ? checkedAt : prior?.modified_at || checkedAt });
  }
  for (const event of events.values()) if (!dated.has(event.id) && Date.parse(event.end) >= today && event.status !== 'cancelled') {
    if (event.verification_status !== 'needs_confirmation') { event.sequence = (event.sequence || event.version || 0) + 1; event.modified_at = checkedAt; }
    event.verification_status = 'needs_confirmation';
    event.source_type ||= /weekly|every|training|session|rehearsal|run club/i.test(event.title + ' ' + event.description) ? 'recurring_schedule' : 'previously_supplied';
    report.unverified_upcoming_events++;
  }
  report.unverified_upcoming_events = [...events.values()].filter(e => e.verification_status === 'needs_confirmation' && e.status !== 'cancelled' && Date.parse(e.end) >= today).length;
  base.societies.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  base.events = [...events.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.id.localeCompare(b.id));
  base.updated_at = checkedAt;
  base.refresh = { checked_at: checkedAt, source: 'SUSU public directories, profiles and published event calendar', profiles_checked: complete - report.failed_profiles.length, profiles_total: complete, failed_profiles: report.failed_profiles.length, calendar_from: calendarMonths[0], calendar_through: calendarMonths.at(-1), dated_upcoming_events: [...dated.values()].filter(e => Date.parse(e.end) >= today && e.status !== 'cancelled' && e.verification_status !== 'needs_confirmation').length, unverified_upcoming_events: report.unverified_upcoming_events };
  await writeFile(new URL('data/events.json', ROOT), JSON.stringify(base, null, 2) + '\n');
  await mkdir(new URL('reports/', ROOT), { recursive: true });
  await writeFile(new URL('reports/catalogue-refresh.json', ROOT), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...base.refresh, new_societies: report.new_societies.length, changed_profiles: report.changed_profiles.length, added_events: report.added_events, updated_events: report.updated_events, missing_from_directories: report.missing_from_directories.length, failed_events: report.failed_events.length, unmatched_event_groups: report.unmatched_event_groups.length }, null, 2));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) run().catch(error => { console.error(error.message); process.exitCode = 1; });
