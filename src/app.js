(function () {
  "use strict";

  var storageKey = "society-synth.following.v1";
  var catalogue = {};
  var toastTimer = 0;
  var initial = document.getElementById("initial-catalogue");
  try { catalogue = JSON.parse(initial.textContent || "{}"); } catch (_) { catalogue = {}; }

  function validSocietyIds() {
    return (catalogue.societies || []).map(function (society) { return society.id; });
  }

  function loadFollowing() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter(function (id, index, all) { return validSocietyIds().indexOf(id) !== -1 && all.indexOf(id) === index; });
    } catch (_) { return []; }
  }

  var following = loadFollowing();

  function saveFollowing() {
    try { localStorage.setItem(storageKey, JSON.stringify(following)); } catch (_) {}
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char];
    });
  }

  function societyFor(id) {
    return (catalogue.societies || []).find(function (society) { return society.id === id; }) || { id: id, name: id.toUpperCase(), shortName: id };
  }

  function formatDateParts(dateValue, timeZone) {
    var date = new Date(dateValue);
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: timeZone || "Europe/London", weekday: "short", day: "2-digit", month: "short" }).formatToParts(date);
    var values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return { weekday: values.weekday || "", day: values.day || "", month: values.month || "" };
  }

  function formatTime(dateValue, timeZone) {
    return new Intl.DateTimeFormat("en-GB", { timeZone: timeZone || "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(dateValue));
  }

  function formatZone(dateValue, timeZone) {
    var part = new Intl.DateTimeFormat("en-GB", { timeZone: timeZone || "Europe/London", timeZoneName: "short" }).formatToParts(new Date(dateValue)).find(function (item) { return item.type === "timeZoneName"; });
    return part ? part.value : "";
  }

  function upcomingEvents() {
    var now = Date.now();
    var allowed = following;
    return (catalogue.events || []).filter(function (event) {
      return allowed.indexOf(event.societyId) !== -1 && event.status !== "cancelled" && Date.parse(event.end) >= now;
    }).sort(function (a, b) { return Date.parse(a.start) - Date.parse(b.start); });
  }

  function feedUrl(download) {
    var url = new URL("/calendar.ics", window.location.origin);
    url.searchParams.set("societies", following.join(","));
    if (download) url.searchParams.set("download", "1");
    return url.toString();
  }

  function renderSocieties() {
    var root = document.getElementById("societies-list");
    var societies = catalogue.societies || [];
    var events = catalogue.events || [];
    root.innerHTML = societies.map(function (society) {
      var count = events.filter(function (event) { return event.societyId === society.id && event.status !== "cancelled" && Date.parse(event.end) >= Date.now(); }).length;
      var joined = following.indexOf(society.id) !== -1;
      return '<div class="society-row' + (joined ? ' is-joined' : '') + '">' +
        '<div class="society-info"><span class="society-monogram" aria-hidden="true">' + escapeHtml(society.shortName || society.name.slice(0, 2)) + '</span>' +
        '<span><span class="society-name">' + escapeHtml(society.name) + '</span><span class="society-events">' + count + (count === 1 ? ' upcoming event' : ' upcoming events') + '</span></span></div>' +
        '<button class="join-button" type="button" data-join="' + escapeHtml(society.id) + '" aria-pressed="' + joined + '">' + (joined ? 'Following ✓' : 'Join +') + '</button></div>';
    }).join("");

    root.querySelectorAll("[data-join]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-join");
        var index = following.indexOf(id);
        if (index === -1) {
          following.push(id);
          showToast("You’re following " + societyFor(id).name + ". Its events are ready for your calendar feed.");
        } else {
          following.splice(index, 1);
          showToast("Removed " + societyFor(id).name + " from your calendar feed.");
        }
        saveFollowing();
        render();
      });
    });
  }

  function renderEvents() {
    var root = document.getElementById("events-list");
    var events = upcomingEvents();
    document.getElementById("event-count").innerHTML = events.length + ' <span>' + (events.length === 1 ? 'EVENT' : 'EVENTS') + '</span>';

    if (following.length === 0) {
      root.innerHTML = '<div class="empty-state"><span class="empty-symbol" aria-hidden="true">✳</span><h3>Your week starts with a society.</h3><p>Choose a society on the right and its upcoming events will appear here.</p><a href="#societies">Choose a society <span aria-hidden="true">↘</span></a></div>';
      return;
    }

    if (events.length === 0) {
      root.innerHTML = '<div class="empty-state"><span class="empty-symbol" aria-hidden="true">◷</span><h3>No upcoming events yet.</h3><p>You’re following ' + following.length + (following.length === 1 ? ' society' : ' societies') + '. Check back when the next weekly update lands.</p><a href="#societies">Manage societies <span aria-hidden="true">↘</span></a></div>';
      return;
    }

    root.innerHTML = events.map(function (event) {
      var society = societyFor(event.societyId);
      var timeZone = event.timeZone || catalogue.timezone || "Europe/London";
      var date = formatDateParts(event.start, timeZone);
      var zone = formatZone(event.start, timeZone);
      var happening = Date.parse(event.start) <= Date.now();
      return '<article class="event-card">' +
        '<div class="event-date"><span>' + escapeHtml(date.weekday.toUpperCase()) + '</span><strong>' + escapeHtml(date.day) + '</strong><small>' + escapeHtml(date.month.toUpperCase()) + '</small></div>' +
        '<div class="event-content"><p class="event-category">' + escapeHtml(event.category || society.name) + ' <span aria-hidden="true">·</span> <span class="event-society">' + escapeHtml(society.name) + '</span></p>' +
        '<h3 class="event-title">' + escapeHtml(event.title) + '</h3>' +
        '<div class="event-meta-row"><span><span class="meta-icon" aria-hidden="true">◷</span>' + escapeHtml(formatTime(event.start, timeZone)) + '–' + escapeHtml(formatTime(event.end, timeZone)) + ' ' + escapeHtml(zone) + '</span>' +
        (event.location ? '<span><span class="meta-icon" aria-hidden="true">⌖</span>' + escapeHtml(event.location) + '</span>' : '') + '</div>' +
        (event.description ? '<p class="event-description">' + escapeHtml(event.description) + '</p>' : '') + '</div>' +
        '<span class="event-status" title="' + (happening ? 'Happening now' : 'Upcoming') + '" aria-label="' + (happening ? 'Happening now' : 'Upcoming') + '">' + (happening ? '•' : '↗') + '</span></article>';
    }).join("");
  }

  function renderCalendar() {
    var copy = document.getElementById("copy-feed");
    var download = document.getElementById("download-feed");
    var urlLabel = document.getElementById("feed-url");
    var hasFollowing = following.length > 0;
    copy.disabled = !hasFollowing;
    download.setAttribute("aria-disabled", hasFollowing ? "false" : "true");
    if (!hasFollowing) {
      urlLabel.textContent = "Choose a society to create your link";
      download.setAttribute("href", "#");
      document.getElementById("hero-summary").textContent = "Pick a society to get started";
      document.getElementById("society-count").textContent = "0 SELECTED";
      return;
    }
    var names = following.map(function (id) { return societyFor(id).name; });
    var url = feedUrl(false);
    urlLabel.textContent = url;
    download.setAttribute("href", feedUrl(true));
    document.getElementById("hero-summary").textContent = names.length + (names.length === 1 ? " society followed" : " societies followed");
    document.getElementById("society-count").textContent = names.length + (names.length === 1 ? " SELECTED" : " SELECTED");
  }

  function showToast(message) {
    var node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { node.classList.remove("is-visible"); }, 2800);
  }

  function render() {
    renderSocieties();
    renderEvents();
    renderCalendar();
  }

  document.getElementById("copy-feed").addEventListener("click", async function () {
    if (following.length === 0) return;
    var url = feedUrl(false);
    try {
      await navigator.clipboard.writeText(url);
      showToast("Calendar feed link copied. Add it in Google Calendar → Other calendars → From URL.");
    } catch (_) {
      var input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      showToast("Calendar feed link copied. Add it in Google Calendar → Other calendars → From URL.");
    }
  });

  document.getElementById("download-feed").addEventListener("click", function (event) {
    if (following.length === 0) event.preventDefault();
  });

  render();
  fetch("/api/events", { cache: "no-store" }).then(function (response) {
    if (!response.ok) throw new Error("Could not refresh events");
    return response.json();
  }).then(function (payload) {
    if (!payload || !payload.catalogue || !Array.isArray(payload.catalogue.societies) || !Array.isArray(payload.catalogue.events)) return;
    catalogue = payload.catalogue;
    following = loadFollowing();
    render();
  }).catch(function () {
    /* The bundled catalogue keeps the page useful during a source refresh outage. */
  });
})();
