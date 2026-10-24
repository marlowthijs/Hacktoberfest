"use strict";

(function () {
  const STORAGE_KEY = "southampton-societies:selected:v1";
  const state = {
    societies: [],
    events: [],
    selectedIds: new Set(readSelection()),
    filter: "all",
    query: ""
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);

  function readSelection() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
    } catch (_) {
      return [];
    }
  }

  function dateParts(value, timezone) {
    const date = new Date(value);
    const format = (options) => new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: timezone || "Europe/London" }, options)).format(date);
    return {
      weekday: format({ weekday: "short" }),
      day: format({ day: "2-digit" }),
      month: format({ month: "short" })
    };
  }

  function timeRange(event) {
    const format = (value) => new Intl.DateTimeFormat("en-GB", {
      timeZone: event.timezone || "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(new Date(value));
    return format(event.start) + "–" + format(event.end);
  }

  function societyFor(id) {
    return state.societies.find((society) => society.id === id) || { id: id, name: id };
  }

  function upcomingEvents() {
    const now = Date.now();
    return state.events
      .filter((event) => new Date(event.end).getTime() >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  function setDownloadState() {
    const hasSelection = state.selectedIds.size > 0;
    $("#download-calendar-button").disabled = !hasSelection;
    $("#calendar-download-button").disabled = !hasSelection;
    $("#calendar-status").textContent = hasSelection
      ? "Ready to download events from " + state.selectedIds.size + " selected " + (state.selectedIds.size === 1 ? "society." : "societies.")
      : "Select societies above to prepare your calendar file.";
  }

  function renderSocieties() {
    const events = upcomingEvents();
    const grid = $("#society-grid");
    $("#society-total").textContent = state.societies.length;
    $("#selection-summary").textContent = state.selectedIds.size + " " + (state.selectedIds.size === 1 ? "society" : "societies") + " selected";
    $("#following-count").textContent = state.selectedIds.size;

    if (!state.societies.length) {
      grid.innerHTML = '<div class="empty-state">No societies have been added yet.</div>';
      return;
    }

    grid.innerHTML = state.societies.map((society) => {
      const selected = state.selectedIds.has(society.id);
      const count = events.filter((event) => event.society_id === society.id).length;
      const monogram = Array.from(society.name || society.id).slice(0, 3).join("").toUpperCase();
      const description = society.description || "Upcoming events from this society.";
      return '<label class="society-card' + (selected ? " selected" : "") + '">' +
        '<input class="society-checkbox" type="checkbox" data-society="' + escapeHtml(society.id) + '" ' + (selected ? "checked" : "") + ' aria-label="Select ' + escapeHtml(society.name) + ' for your calendar">' +
        '<span class="society-monogram" aria-hidden="true">' + escapeHtml(monogram) + '</span>' +
        '<span class="society-copy"><strong>' + escapeHtml(society.name) + '</strong><small>' + count + " upcoming " + (count === 1 ? "event" : "events") + '</small></span>' +
        '<span class="society-description">' + escapeHtml(description) + '</span>' +
        "</label>";
    }).join("");

    grid.querySelectorAll("[data-society]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedIds.add(checkbox.dataset.society);
        else state.selectedIds.delete(checkbox.dataset.society);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.selectedIds)));
        } catch (_) {}
        render();
        $("#announcement").textContent = checkbox.checked
          ? societyFor(checkbox.dataset.society).name + " selected."
          : societyFor(checkbox.dataset.society).name + " removed from your selection.";
      });
    });
  }

  function renderFeatured() {
    const event = upcomingEvents()[0];
    const node = $("#next-event");
    if (!event) {
      node.innerHTML = '<div class="next-event-copy"><p>UPCOMING</p><h2>More events coming soon</h2><span>Check back after the next society update.</span></div>';
      return;
    }
    const date = dateParts(event.start, event.timezone);
    const society = societyFor(event.society_id);
    node.innerHTML = '<div class="next-date"><span>' + escapeHtml(date.weekday) + '</span><strong>' + escapeHtml(date.day) + '</strong><small>' + escapeHtml(date.month) + '</small></div>' +
      '<div class="next-event-copy"><p>' + escapeHtml(society.name) + '</p><h2>' + escapeHtml(event.title) + '</h2><span>' + escapeHtml(timeRange(event)) + (event.location ? " · " + escapeHtml(event.location) : "") + '</span></div>';
  }

  function renderEvents() {
    const query = state.query.trim().toLowerCase();
    const allEvents = upcomingEvents();
    const events = allEvents.filter((event) => {
      if (state.filter === "following" && !state.selectedIds.has(event.society_id)) return false;
      const society = societyFor(event.society_id);
      const text = [event.title, event.description, event.location, society.name].join(" ").toLowerCase();
      return !query || text.includes(query);
    });
    const list = $("#event-list");
    $("#event-total").textContent = allEvents.length;
    $("#event-count").textContent = events.length + " upcoming " + (events.length === 1 ? "event" : "events");
    $("#event-intro").textContent = state.filter === "following"
      ? "Events from the societies you selected."
      : "Events from University of Southampton societies.";

    if (!events.length) {
      const message = query
        ? "Try another search term."
        : state.filter === "following" && !state.selectedIds.size
          ? "Choose societies above to see their events here."
          : "Society teams add events to the shared list each week.";
      list.innerHTML = '<div class="empty-state">' + escapeHtml(message) + "</div>";
      return;
    }

    list.innerHTML = events.map((event) => {
      const society = societyFor(event.society_id);
      const date = dateParts(event.start, event.timezone);
      const meta = '<span>' + escapeHtml(date.weekday) + ", " + escapeHtml(date.day) + " " + escapeHtml(date.month) + " · " + escapeHtml(timeRange(event)) + "</span>" +
        (event.location ? "<span>" + escapeHtml(event.location) + "</span>" : "");
      return '<article class="event-card"><div class="event-date"><span>' + escapeHtml(date.weekday) + '</span><strong>' + escapeHtml(date.day) + '</strong><small>' + escapeHtml(date.month) + '</small></div>' +
        '<div class="event-main"><p class="event-society">' + escapeHtml(society.name) + '</p><h3>' + escapeHtml(event.title) + '</h3>' +
        (event.description ? '<p class="event-description">' + escapeHtml(event.description) + "</p>" : "") +
        '<div class="event-meta">' + meta + "</div></div></article>";
    }).join("");
  }

  function render() {
    renderSocieties();
    renderFeatured();
    renderEvents();
    setDownloadState();
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.dataset.filter === state.filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function downloadCalendar() {
    if (!state.selectedIds.size) return;
    const params = new URLSearchParams();
    params.set("societies", Array.from(state.selectedIds).sort().join(","));
    params.set("download", "1");
    window.location.assign("/calendar.ics?" + params.toString());
  }

  async function loadCatalogue() {
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      if (!response.ok) throw new Error("The event list could not be loaded.");
      const catalogue = await response.json();
      if (!Array.isArray(catalogue.societies) || !Array.isArray(catalogue.events)) {
        throw new Error("The event list has an unexpected format.");
      }
      state.societies = catalogue.societies;
      state.events = catalogue.events;
      const knownIds = new Set(state.societies.map((society) => society.id));
      state.selectedIds = new Set(Array.from(state.selectedIds).filter((id) => knownIds.has(id)));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.selectedIds)));
      } catch (_) {}
      if (catalogue.updated_at) {
        const updated = new Date(catalogue.updated_at);
        if (!Number.isNaN(updated.getTime())) {
          $("#updated-at").textContent = "Events last updated " + new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Europe/London"
          }).format(updated);
        }
      }
      render();
      if (!upcomingEvents().length) $("#event-list").innerHTML = '<div class="empty-state">No upcoming events are listed. Check back after the next weekly update.</div>';
    } catch (error) {
      $("#society-grid").innerHTML = '<div class="empty-state">' + escapeHtml(error.message) + " Refresh the page to try again.</div>";
      $("#event-list").innerHTML = '<div class="empty-state">Events are temporarily unavailable.</div>';
    }
  }

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      renderEvents();
      document.querySelectorAll("[data-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
    });
  });

  $("#event-search").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderEvents();
  });
  $("#download-calendar-button").addEventListener("click", downloadCalendar);
  $("#calendar-download-button").addEventListener("click", downloadCalendar);
  loadCatalogue();
})();
