"use strict";

const STORAGE_KEY = "society-synth:local-data:v1";
const state = {
  societies: [],
  events: [],
  selectedIds: new Set(),
  view: "discover",
  filter: "all",
  query: "",
  adminEvents: []
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[char]);
}

function toast(message, type = "") {
  const node = $("#toast");
  node.textContent = message;
  node.className = "toast show" + (type ? " " + type : "");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => { node.className = "toast"; }, 3200);
}

function initials(value = "") {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function palette(value = "") {
  const colors = ["#dc795d", "#799c81", "#8b83b9", "#d1a04c", "#55999a", "#bd7183"];
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function dateParts(value) {
  const date = new Date(value);
  return {
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
    day: new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date)
  };
}

function timeRange(event) {
  const options = { hour: "numeric", minute: "2-digit" };
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const sameDay = start.toDateString() === end.toDateString();
  return new Intl.DateTimeFormat(undefined, options).format(start) +
    (sameDay ? " – " + new Intl.DateTimeFormat(undefined, options).format(end) : "");
}

function societyFor(id) {
  return state.societies.find((society) => society.id === id) || { id, name: "Society", abbreviation: "" };
}

function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      societies: state.societies,
      events: state.events,
      selectedSocietyIds: Array.from(state.selectedIds)
    }));
    return true;
  } catch {
    toast("Your browser could not save this change. Export a backup and check available storage.", "error");
    return false;
  }
}

function seedState(data) {
  state.societies = (data.societies || []).map((society) => ({
    id: String(society.id),
    name: String(society.name || society.id),
    abbreviation: String(society.abbreviation || ""),
    description: String(society.description || ""),
    accent: String(society.accent || "")
  }));
  state.events = (data.events || []).map((event) => ({
    id: String(event.id),
    society_id: String(event.society_id),
    title: String(event.title || "Untitled event"),
    start_at: event.start_at || event.start,
    end_at: event.end_at || event.end,
    location: String(event.location || ""),
    description: String(event.description || ""),
    status: ["draft", "published", "cancelled"].includes(event.status) ? event.status : "published"
  }));
}

function localEvents() {
  return state.events.filter((event) => event.status === "published" && new Date(event.end_at).getTime() >= Date.now());
}

function eventMarkup(event, index) {
  const society = societyFor(event.society_id);
  const color = palette(society.name);
  const date = dateParts(event.start_at);
  const joined = state.selectedIds.has(event.society_id);
  return "<article class=\"event-card\" style=\"animation-delay:" + Math.min(index, 8) * 35 + "ms;--society-color:" + color + "\">" +
    "<div class=\"date-tile\"><span>" + escapeHtml(date.weekday) + " · " + escapeHtml(date.month) + "</span><strong>" + escapeHtml(date.day) + "</strong></div>" +
    "<div class=\"event-main\"><div class=\"event-meta\"><span class=\"event-society\">" + escapeHtml(society.abbreviation || society.name) + "</span><span class=\"event-time\">" + escapeHtml(timeRange(event)) + "</span></div>" +
    "<h3 class=\"event-title\">" + escapeHtml(event.title) + "</h3>" +
    (event.description ? "<p class=\"event-description\">" + escapeHtml(event.description) + "</p>" : "") +
    (event.location ? "<div class=\"event-location\"><span aria-hidden=\"true\">⌖</span>" + escapeHtml(event.location) + "</div>" : "") + "</div>" +
    "<button class=\"join-button" + (joined ? " joined" : "") + "\" data-join=\"" + escapeHtml(event.society_id) + "\" aria-pressed=\"" + joined + "\">" + (joined ? "✓ Following" : "＋ Follow") + "</button></article>";
}

function renderEvents() {
  const search = state.query.toLowerCase().trim();
  const rows = localEvents().filter((event) => {
    if (state.filter === "following" && !state.selectedIds.has(event.society_id)) return false;
    if (state.view === "following" && !state.selectedIds.has(event.society_id)) return false;
    const society = societyFor(event.society_id);
    const haystack = [event.title, society.name, event.location, event.description].join(" ").toLowerCase();
    return !search || haystack.includes(search);
  });
  const node = $("#events-list");
  if (!rows.length) {
    const message = state.query ? "Try another search." :
      state.filter === "following" || state.view === "following" ? "Choose a society to see its events here." :
      "Add events in Team admin, then they’ll appear here.";
    node.innerHTML = "<div class=\"empty-state\"><div class=\"empty-symbol\">✳</div><h3>" +
      (search ? "No matches just yet" : "A little room in your week") +
      "</h3><p>" + escapeHtml(message) + "</p></div>";
    return;
  }
  node.innerHTML = rows.map(eventMarkup).join("");
}

function renderSocieties() {
  $("#society-badge").textContent = state.societies.length;
  $("#society-total").textContent = state.societies.length;
  $("#following-count").textContent = state.selectedIds.size;
  $("#filter-following-count").textContent = state.selectedIds.size;
  $("#sidebar-societies").innerHTML = state.societies.slice(0, 7).map((society) =>
    "<div class=\"side-society\"><span class=\"society-dot\" style=\"--society-color:" + palette(society.name) + "\"></span><span>" +
    escapeHtml(society.abbreviation || society.name) + "</span></div>"
  ).join("") || "<div class=\"side-society\"><span style=\"color:#91a6a2;font-size:11px\">A new circle starts here.</span></div>";

  $("#societies-list").innerHTML = state.societies.map((society) => {
    const following = state.selectedIds.has(society.id);
    const count = localEvents().filter((event) => event.society_id === society.id).length;
    return "<article class=\"society-card\"><span class=\"society-avatar\" style=\"--society-color:" + palette(society.name) + "\">" +
      escapeHtml(society.abbreviation || initials(society.name)) + "</span><div class=\"society-info\"><strong title=\"" + escapeHtml(society.name) + "\">" +
      escapeHtml(society.name) + "</strong><small>" + (following ? "In your circles" : count + " upcoming " + (count === 1 ? "event" : "events")) +
      "</small></div><button class=\"join-button" + (following ? " joined" : "") + "\" data-join=\"" + escapeHtml(society.id) +
      "\" aria-pressed=\"" + following + "\" aria-label=\"" + (following ? "Unfollow " : "Follow ") + escapeHtml(society.name) + "\">" +
      (following ? "✓" : "+") + "</button></article>";
  }).join("") || "<div class=\"empty-state\"><div class=\"empty-symbol\">✳</div><h3>Find your first circle</h3><p>Add a society in Team admin.</p></div>";
  renderEvents();
}

function renderUser() {
  $("#account-label").textContent = "Saved on this laptop";
  $("#avatar").textContent = "L";
  $("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "long", day: "numeric"
  }).format(new Date()).toUpperCase();
  $("#week-label").textContent = "Saved in this browser";
  $("#event-total").textContent = localEvents().length;
  $("#welcome-title").innerHTML = "Make room for<br /><em>good things.</em>";
}

function render() {
  renderUser();
  renderSocieties();
}

async function load() {
  try {
    const response = await fetch("/data/events.json", { cache: "no-store" });
    if (!response.ok) throw new Error("The starter event list could not be loaded.");
    const seed = await response.json();
    seedState(seed);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && saved.version === 1 && Array.isArray(saved.societies) && Array.isArray(saved.events)) {
      state.societies = saved.societies;
      state.events = saved.events;
      state.selectedIds = new Set(Array.isArray(saved.selectedSocietyIds) ? saved.selectedSocietyIds : []);
    } else {
      state.selectedIds = new Set();
      saveLocal();
    }
    render();
  } catch (error) {
    $("#events-list").innerHTML = "<div class=\"empty-state\"><div class=\"empty-symbol\">!</div><h3>We couldn’t load the campus board</h3><p>" +
      escapeHtml(error.message) + " Start the local server using the README instructions, then refresh.</p></div>";
  }
}

function toggleSociety(societyId) {
  if (state.selectedIds.has(societyId)) state.selectedIds.delete(societyId);
  else state.selectedIds.add(societyId);
  saveLocal();
  render();
  toast(state.selectedIds.has(societyId) ? "Society added to your picks. Download a calendar file when you’re ready." : "Society removed from your picks.");
}

function setFilter(filter) {
  state.filter = filter;
  $$(".filter-chip").forEach((chip) => {
    const active = chip.dataset.filter === filter;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-selected", String(active));
  });
  renderEvents();
}

function icsEscape(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function foldIcsLine(line) {
  const chunks = [];
  let chunk = "";
  let bytes = 0;
  for (const character of Array.from(line)) {
    const size = new TextEncoder().encode(character).length;
    if (bytes + size > 73) {
      chunks.push(chunk);
      chunk = " " + character;
      bytes = 1 + size;
    } else {
      chunk += character;
      bytes += size;
    }
  }
  chunks.push(chunk);
  return chunks.join("\r\n");
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadSelectedEvents() {
  if (!state.selectedIds.size) {
    toast("Pick at least one society first.");
    $("#societies-heading").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const events = localEvents().filter((event) => state.selectedIds.has(event.society_id));
  if (!events.length) {
    toast("There are no upcoming published events for your picks.");
    return;
  }
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Society Synth//Local Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Society Synth"
  ];
  for (const event of events) {
    const society = societyFor(event.society_id);
    const description = [society.name, event.description].filter(Boolean).join(" — ");
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + icsEscape(event.id) + "@society-synth.local",
      "DTSTAMP:" + icsDate(new Date().toISOString()),
      "DTSTART:" + icsDate(event.start_at),
      "DTEND:" + icsDate(event.end_at),
      "SUMMARY:" + icsEscape(event.title),
      "DESCRIPTION:" + icsEscape(description),
      "LOCATION:" + icsEscape(event.location || ""),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  const fileDate = new Intl.DateTimeFormat("en-CA").format(new Date());
  downloadBlob(lines.map(foldIcsLine).join("\r\n") + "\r\n", "text/calendar;charset=utf-8", "society-synth-" + fileDate + ".ics");
  toast(events.length + " event" + (events.length === 1 ? "" : "s") + " ready to import into Google Calendar.");
}

function openAdmin() {
  $("#admin-dialog").showModal();
  loadAdminData();
}

function loadAdminData() {
  state.adminEvents = state.events.slice().sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  $("#admin-published-count").textContent = state.adminEvents.filter((event) => event.status === "published").length;
  $("#admin-draft-count").textContent = state.adminEvents.filter((event) => event.status === "draft").length;
  $("#admin-society-count").textContent = state.societies.length;
  $("#admin-events-body").innerHTML = state.adminEvents.map((event) => {
    const society = societyFor(event.society_id);
    const label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(event.start_at));
    return "<tr><td><strong>" + escapeHtml(event.title) + "</strong><small>" + escapeHtml(society.name) +
      (event.location ? " · " + escapeHtml(event.location) : "") + "</small></td><td>" + escapeHtml(label) +
      "</td><td><span class=\"status-pill " + escapeHtml(event.status) + "\">" + escapeHtml(event.status) +
      "</span></td><td>" + (event.status !== "cancelled" ?
        "<button class=\"table-action\" data-edit-event=\"" + escapeHtml(event.id) + "\">Edit</button> <button class=\"table-action\" data-cancel-event=\"" + escapeHtml(event.id) + "\">Cancel</button>" : "") +
      "</td></tr>";
  }).join("") || "<tr><td colspan=\"4\">No events yet. Add one for this week.</td></tr>";
  $("#event-form [name=\"society_id\"]").innerHTML = state.societies.map((society) =>
    "<option value=\"" + escapeHtml(society.id) + "\">" + escapeHtml(society.name) + "</option>"
  ).join("") || "<option value=\"\">Add a society first</option>";
}

function toLocalInput(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function resetEventForm() {
  const form = $("#event-form");
  form.reset();
  form.elements.id.value = "";
  $("#event-form-title").textContent = "Add an event";
  $("#event-form-message").textContent = "";
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  form.elements.start_at.value = toLocalInput(start);
  form.elements.end_at.value = toLocalInput(new Date(start.getTime() + 60 * 60 * 1000));
  form.elements.status.value = "published";
}

function editEvent(id) {
  const event = state.adminEvents.find((item) => item.id === id);
  if (!event) return;
  resetEventForm();
  const form = $("#event-form");
  form.elements.id.value = event.id;
  form.elements.society_id.value = event.society_id;
  form.elements.title.value = event.title;
  form.elements.start_at.value = toLocalInput(event.start_at);
  form.elements.end_at.value = toLocalInput(event.end_at);
  form.elements.location.value = event.location || "";
  form.elements.description.value = event.description || "";
  form.elements.status.value = event.status === "cancelled" ? "draft" : event.status;
  $("#event-form-title").textContent = "Edit event";
  $("#event-dialog").showModal();
}

function saveEvent(form) {
  const data = new FormData(form);
  const startAt = new Date(data.get("start_at"));
  const endAt = new Date(data.get("end_at"));
  const message = $("#event-form-message");
  message.textContent = "";
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
    message.textContent = "Choose an end time after the start time.";
    return;
  }
  const id = data.get("id") || "event-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
  const updated = {
    id,
    society_id: data.get("society_id"),
    title: String(data.get("title") || "").trim(),
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    location: String(data.get("location") || "").trim(),
    description: String(data.get("description") || "").trim(),
    status: data.get("status") === "draft" ? "draft" : "published"
  };
  const exists = state.events.some((event) => event.id === id);
  state.events = exists ? state.events.map((event) => event.id === id ? updated : event) : [updated, ...state.events];
  saveLocal();
  $("#event-dialog").close();
  render();
  loadAdminData();
  toast(exists ? "Event updated." : "Event added to the board.");
}

function cancelEvent(id) {
  if (!window.confirm("Cancel this event? It will disappear from the event list and future calendar downloads.")) return;
  state.events = state.events.map((event) => event.id === id ? { ...event, status: "cancelled" } : event);
  saveLocal();
  render();
  loadAdminData();
  toast("Event cancelled.");
}

function exportBackup() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    societies: state.societies,
    events: state.events,
    selectedSocietyIds: Array.from(state.selectedIds)
  };
  downloadBlob(JSON.stringify(backup, null, 2), "application/json;charset=utf-8", "society-synth-backup.json");
  toast("Backup downloaded.");
}

async function importBackup(file) {
  try {
    const backup = JSON.parse(await file.text());
    if (backup.version !== 1 || !Array.isArray(backup.societies) || !Array.isArray(backup.events)) {
      throw new Error("That file is not a Society Synth backup.");
    }
    state.societies = backup.societies;
    state.events = backup.events;
    state.selectedIds = new Set(Array.isArray(backup.selectedSocietyIds) ? backup.selectedSocietyIds : []);
    saveLocal();
    render();
    loadAdminData();
    toast("Backup restored.");
  } catch (error) {
    toast(error.message || "Could not read that backup file.", "error");
  } finally {
    $("#import-data-input").value = "";
  }
}

async function resetToStarterData() {
  if (!window.confirm("Restore the starter list and remove all local edits and society picks? Export a backup first if you want to keep them.")) return;
  localStorage.removeItem(STORAGE_KEY);
  await load();
  loadAdminData();
  toast("Starter data restored.");
}

$("#download-calendar-button").addEventListener("click", downloadSelectedEvents);
$("#calendar-card-action").addEventListener("click", downloadSelectedEvents);
$("#open-admin").addEventListener("click", openAdmin);
$("#close-admin").addEventListener("click", () => $("#admin-dialog").close());
$("#admin-logout").addEventListener("click", () => $("#admin-dialog").close());
$("#close-event-form").addEventListener("click", () => $("#event-dialog").close());
$("#cancel-event-form").addEventListener("click", () => $("#event-dialog").close());
$("#event-search").addEventListener("input", (event) => { state.query = event.target.value; renderEvents(); });
$$(".filter-chip").forEach((chip) => chip.addEventListener("click", () => setFilter(chip.dataset.filter)));
$$(".nav-item[data-view]").forEach((button) => button.addEventListener("click", () => {
  state.view = button.dataset.view;
  $$(".nav-item[data-view]").forEach((item) => item.classList.toggle("active", item === button));
  $("#page-label").textContent = state.view === "following" ? "My societies" : "Discover";
  $("#events-heading").textContent = state.view === "following" ? "Your circles, coming up" : "Coming up";
  setFilter(state.view === "following" ? "following" : "all");
}));
document.addEventListener("click", (event) => {
  const join = event.target.closest("[data-join]");
  if (join) toggleSociety(join.dataset.join);
  const edit = event.target.closest("[data-edit-event]");
  if (edit) editEvent(edit.dataset.editEvent);
  const cancel = event.target.closest("[data-cancel-event]");
  if (cancel) cancelEvent(cancel.dataset.cancelEvent);
});

$("#society-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $("#society-form-message");
  const data = Object.fromEntries(new FormData(form).entries());
  const name = String(data.name || "").trim();
  const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  if (!name || state.societies.some((society) => society.id === slug)) {
    message.textContent = !name ? "Enter a society name." : "A society with that name already exists.";
    return;
  }
  state.societies.push({
    id: slug || "society-" + Date.now().toString(36),
    name,
    abbreviation: String(data.abbreviation || "").trim(),
    description: String(data.description || "").trim(),
    accent: ""
  });
  saveLocal();
  form.reset();
  message.textContent = "Society added.";
  message.style.color = "#568263";
  render();
  loadAdminData();
});

$("#add-event-button").addEventListener("click", () => {
  if (!state.societies.length) {
    toast("Add a society before creating an event.", "error");
    return;
  }
  resetEventForm();
  $("#event-dialog").showModal();
});
$("#event-form").addEventListener("submit", (event) => {
  event.preventDefault();
  saveEvent(event.currentTarget);
});
$("#export-data-button").addEventListener("click", exportBackup);
$("#import-data-input").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (file) importBackup(file);
});
$("#reset-data-button").addEventListener("click", resetToStarterData);

load();
