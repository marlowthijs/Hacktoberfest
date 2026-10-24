const CATALOGUE_URL = "https://raw.githubusercontent.com/marlowthijs/Hacktoberfest/society-synth/data/events.json";
const FALLBACK_CATALOGUE = __FALLBACK_CATALOGUE_JSON__;
const APP_HTML = __APP_HTML__;

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }, headers || {})
  });
}

function isCatalogue(value) {
  return value && Array.isArray(value.societies) && Array.isArray(value.events) &&
    value.societies.every(function (item) { return item && typeof item.id === "string" && typeof item.name === "string"; }) &&
    value.events.every(function (item) { return item && typeof item.id === "string" && typeof item.societyId === "string" && typeof item.title === "string" && !Number.isNaN(Date.parse(item.start)) && !Number.isNaN(Date.parse(item.end)); });
}

async function loadCatalogue() {
  try {
    const url = CATALOGUE_URL + "?refresh=" + Math.floor(Date.now() / 60000);
    const response = await fetch(url, { headers: { "accept": "application/json", "cache-control": "no-cache" } });
    if (!response.ok) throw new Error("The event source is unavailable.");
    const fresh = await response.json();
    if (!isCatalogue(fresh)) throw new Error("The event source has an invalid shape.");
    return { catalogue: fresh, source: "github" };
  } catch (_) {
    return { catalogue: FALLBACK_CATALOGUE, source: "bundled-fallback" };
  }
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function escapeIcs(value) {
  return String(value == null ? "" : value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldIcsLine(line) {
  const encoder = new TextEncoder();
  const output = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 73) {
      output.push(current);
      current = " " + char;
      bytes = 1 + size;
    } else {
      current += char;
      bytes += size;
    }
  }
  output.push(current);
  return output.join("\r\n");
}

function formatIcsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function calendarFeed(catalogue, selectedIds, origin) {
  const societies = catalogue.societies.filter(function (society) { return selectedIds.indexOf(society.id) !== -1; });
  const events = catalogue.events.filter(function (event) { return selectedIds.indexOf(event.societyId) !== -1; });
  const names = societies.map(function (society) { return society.name; });
  const calendarName = names.length ? "Society Synth — " + names.join(" + ") : "Society Synth";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Society Synth//Campus Society Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + escapeIcs(calendarName),
    "X-WR-TIMEZONE:" + (catalogue.timezone || "Europe/London")
  ];

  events.forEach(function (event) {
    const society = catalogue.societies.find(function (item) { return item.id === event.societyId; });
    const eventName = event.title + (society ? " · " + society.name : "");
    const description = (society ? society.name + "\n" : "") + (event.description || "");
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + event.id + "@society-synth");
    lines.push("DTSTAMP:" + formatIcsDate(catalogue.updatedAt || new Date().toISOString()));
    lines.push("DTSTART:" + formatIcsDate(event.start));
    lines.push("DTEND:" + formatIcsDate(event.end));
    lines.push("SUMMARY:" + escapeIcs(eventName));
    if (description) lines.push("DESCRIPTION:" + escapeIcs(description));
    if (event.location) lines.push("LOCATION:" + escapeIcs(event.location));
    if (event.status === "cancelled") lines.push("STATUS:CANCELLED");
    else lines.push("STATUS:CONFIRMED");
    lines.push("URL:" + origin + "/");
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

function responseHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()"
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { "allow": "GET, HEAD" } });
    }

    const result = await loadCatalogue();
    const catalogue = result.catalogue;

    if (path === "/") {
      const html = APP_HTML.replace("__EVENT_DATA__", safeJson(catalogue));
      return new Response(html, {
        headers: Object.assign(responseHeaders(), {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
        })
      });
    }

    if (path === "/api/events") {
      return jsonResponse({ catalogue: catalogue, source: result.source }, 200, { "cache-control": "no-store" });
    }

    if (path === "/calendar.ics") {
      const requested = (url.searchParams.get("societies") || "").split(",").filter(Boolean);
      const unique = Array.from(new Set(requested));
      const valid = unique.filter(function (id) { return catalogue.societies.some(function (society) { return society.id === id; }); });
      if (valid.length === 0) {
        return new Response("Choose at least one society before subscribing to a calendar feed.", {
          status: 400,
          headers: Object.assign(responseHeaders(), { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" })
        });
      }
      const body = calendarFeed(catalogue, valid, url.origin);
      const headers = Object.assign(responseHeaders(), {
        "content-type": "text/calendar; charset=utf-8; method=PUBLISH",
        "cache-control": "public, max-age=0, s-maxage=60, must-revalidate",
        "access-control-allow-origin": "*"
      });
      if (url.searchParams.get("download") === "1") headers["content-disposition"] = 'attachment; filename="society-synth.ics"';
      return new Response(body, { headers: headers });
    }

    if (path === "/healthz") {
      return jsonResponse({ ok: true, catalogueSource: result.source, eventCount: catalogue.events.length });
    }

    return new Response("Not found", { status: 404, headers: Object.assign(responseHeaders(), { "content-type": "text/plain; charset=utf-8" }) });
  }
};
