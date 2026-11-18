import { STUDENT_PAGE as PAGE } from "./student-page.js";
import BUNDLED_CATALOGUE from "../data/events.json" with { type: "json" };
import { UNIVERSITY_LOGO_SVG } from "./university-logo.js";
import { SECRETARY_PAGE } from "./secretary-page.js";
import { PORTAL_SCRIPT } from "./portal-client.js";
import { handlePortalApi, mergePortalCatalogue } from "./portal-api.js";

const CATALOGUE_BASE_URL = "https://raw.githubusercontent.com/marlowthijs/Hacktoberfest/";

function validateCatalogue(value) {
  if (!value || value.schema_version !== 1 || !Array.isArray(value.societies) || !Array.isArray(value.events)) {
    throw new Error("Invalid event catalogue");
  }
  const societies = value.societies.filter((society) =>
    society && typeof society.id === "string" && typeof society.name === "string",
  );
  const societyIds = new Set(societies.map((society) => society.id));
  const events = value.events.filter((event) =>
    event && typeof event.id === "string" && typeof event.title === "string"
    && societyIds.has(event.society_id) && Number.isFinite(Date.parse(event.start))
    && Number.isFinite(Date.parse(event.end)) && Date.parse(event.end) > Date.parse(event.start),
  );
  return {
    schema_version: 1,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : null,
    refresh: value.refresh || null,
    societies,
    events,
  };
}

function catalogueUrlForRequest(request, env = {}) {
  const ref = env.CATALOGUE_REF || "main";
  return CATALOGUE_BASE_URL + ref + "/data/events.json";
}

async function loadBaseCatalogue(request, env = {}, strict = false) {
  const hostname = new URL(request.url).hostname;
  if (!env.CATALOGUE_REF && (env.CATALOGUE_SOURCE === "bundled" || ["localhost", "127.0.0.1", "[::1]"].includes(hostname) || hostname.endsWith(".workers.dev"))) return validateCatalogue(BUNDLED_CATALOGUE);
  try {
    const interval = Math.floor(Date.now() / 300000);
    const response = await fetch(catalogueUrlForRequest(request, env) + "?v=" + interval, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Catalogue request failed");
    return validateCatalogue(await response.json());
  } catch (error) {
    if (strict) throw error;
    return validateCatalogue(BUNDLED_CATALOGUE);
  }
}

async function loadCatalogue(request, env) {
  // An unavailable catalogue must not publish an incomplete feed to subscribers.
  return mergePortalCatalogue(await loadBaseCatalogue(request, env, Boolean(env.PORTAL_DB)), env);
}

function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line) {
  const encoder = new TextEncoder();
  const chunks = [];
  let chunk = "";
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
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

function icsDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendar(events, origin, societyNames) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//uniflow//Campus Society Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:uniflow - " + escapeIcs(societyNames.join(", ")),
    "X-WR-TIMEZONE:Europe/London",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + encodeURIComponent(event.id) + "@society-synth",
      "DTSTAMP:" + icsDate(event.modified_at || new Date().toISOString()),
      "SEQUENCE:" + (Number.isSafeInteger(event.sequence) ? event.sequence : Number.isSafeInteger(event.version) ? event.version : 0),
      "DTSTART:" + icsDate(event.start),
      "DTEND:" + icsDate(event.end),
      "SUMMARY:" + escapeIcs((event.verification_status === "needs_confirmation" ? "[Unconfirmed] " : "") + event.title),
    );
    if (event.modified_at) lines.push("LAST-MODIFIED:" + icsDate(event.modified_at));
    if (event.status === "cancelled") lines.push("STATUS:CANCELLED");
    else if (event.verification_status === "needs_confirmation") lines.push("STATUS:TENTATIVE");
    if (event.location) lines.push("LOCATION:" + escapeIcs(event.location));
    if (event.description || event.verification_status === "needs_confirmation") lines.push("DESCRIPTION:" + escapeIcs((event.verification_status === "needs_confirmation" ? "This date has not been confirmed in the latest source check. Check with the society before attending.\n\n" : "") + (event.description || "")));
    let eventUrl = origin + "/";
    try { const source = new URL(event.source_url); if (["https:", "http:"].includes(source.protocol) && !source.username && !source.password) eventUrl = source.href; } catch {}
    lines.push("URL:" + escapeIcs(eventUrl), "END:VEVENT");
  }
  lines.push("END:VCALENDAR", "");
  return lines.map(foldIcsLine).join("\r\n");
}

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    try {
    if (url.pathname.startsWith("/api/portal/")) return await handlePortalApi(request, env, { loadBaseCatalogue: () => loadBaseCatalogue(request, env, true) });
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD", ...securityHeaders } });
    }
    if (["/secretary", "/secretary/", "/secretary/admin", "/secretary/admin/"].includes(url.pathname)) {
      return new Response(request.method === "HEAD" ? null : SECRETARY_PAGE, { headers: {
        "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...securityHeaders,
        "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' mailto:",
        "x-frame-options": "DENY",
      } });
    }
    if (url.pathname === "/assets/portal.js") {
      return new Response(request.method === "HEAD" ? null : PORTAL_SCRIPT, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store", ...securityHeaders } });
    }
    if (url.pathname === "/southampton-logo.svg") {
      return new Response(request.method === "HEAD" ? null : UNIVERSITY_LOGO_SVG, {
        headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=86400", ...securityHeaders },
      });
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(request.method === "HEAD" ? null : PAGE, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60", ...securityHeaders },
      });
    }
    if (url.pathname === "/healthz") {
      return new Response(request.method === "HEAD" ? null : "ok", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
      });
    }
    if (url.pathname === "/api/events") {
      const catalogue = await loadCatalogue(request, env);
      return new Response(request.method === "HEAD" ? null : JSON.stringify(catalogue), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=300", "access-control-allow-origin": "*", ...securityHeaders },
      });
    }
    if (url.pathname === "/calendar.ics") {
      const selected = (url.searchParams.get("societies") || "").split(",").map((id) => id.trim()).filter(Boolean);
      if (!selected.length) {
        return new Response("Choose at least one society in uniflow to create a calendar feed.", {
          status: 400,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
        });
      }
      const catalogue = await loadCatalogue(request, env);
      const societyIds = new Set(selected);
      const societies = catalogue.societies.filter((society) => societyIds.has(society.id));
      if (!societies.length) {
        return new Response("No matching society calendars were found.", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
        });
      }
      const events = catalogue.events.filter((event) => societyIds.has(event.society_id) && (event.verification_status !== "needs_confirmation" || url.searchParams.get("include_unconfirmed") === "1" || event.status === "cancelled"));
      const body = buildCalendar(events, url.origin, societies.map((society) => society.name));
      const headers = {
        "content-type": "text/calendar; charset=utf-8; method=PUBLISH",
        "cache-control": "public, max-age=300, s-maxage=300",
        "content-disposition": url.searchParams.get("download") === "1" ? "attachment; filename=\"uniflow.ics\"" : "inline",
        "access-control-allow-origin": "*",
        ...securityHeaders,
      };
      return new Response(request.method === "HEAD" ? null : body, { headers });
    }
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", ...securityHeaders } });
    } catch (error) {
      console.error("Catalogue unavailable:", error.name);
      return new Response("Society updates are temporarily unavailable. Please try again shortly.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders } });
    }
  },
};
