const FALLBACK_CATALOGUE = {
  schema_version: 1,
  updated_at: "2026-10-24T12:00:00Z",
  societies: [
    {
      id: "ecss",
      name: "ECSS",
      description: "Society events, collected in one easy-to-follow calendar.",
      accent: "#b7ef72",
    },
    {
      id: "mma",
      name: "MMA",
      description: "Striking, grappling and full MMA sessions.",
      accent: "#f6b6c8",
    },
    {
      id: "cyber-security",
      name: "Cyber Security",
      description: "Weekly cyber sessions, CTFs and practical workshops.",
      accent: "#b9d8ff",
    },
    {
      id: "boxing",
      name: "Boxing",
      description: "Training, sparring, socials and hill sprints.",
      accent: "#ffd1b9",
    },
  ],
  events: [
    {
      id: "hacktoberfest-2026",
      society_id: "ecss",
      title: "Hacktoberfest",
      start: "2026-10-24T09:45:00+01:00",
      end: "2026-10-24T20:00:00+01:00",
      timezone: "Europe/London",
      location: "Building 60 West",
      description: "hackathon",
    },
    {
      id: "ecss-chatgpt-workshop-2026-10-26",
      society_id: "ecss",
      title: "ChatGPT workshop",
      start: "2026-10-26T18:00:00+00:00",
      end: "2026-10-26T20:00:00+00:00",
      timezone: "Europe/London",
      location: "Building 100, Room 4013",
      description: "An ECSS workshop on using ChatGPT.",
    },
    {
      id: "ecss-halloween-pub-crawl-2026-10-29",
      society_id: "ecss",
      title: "Halloween pub crawl",
      start: "2026-10-29T19:15:00+00:00",
      end: "2026-10-29T22:15:00+00:00",
      timezone: "Europe/London",
      location: "The Stag's",
      description: "Costumes encouraged.",
    },
    {
      id: "mma-training-2026-10-31",
      society_id: "mma",
      title: "MMA training",
      start: "2026-10-31T11:30:00+00:00",
      end: "2026-10-31T13:30:00+00:00",
      timezone: "Europe/London",
      location: "Jubilee Sports Centre",
      description: "Weekly MMA training session.",
    },
    {
      id: "cyber-security-weekly-2026-10-28",
      society_id: "cyber-security",
      title: "Weekly Cyber Security session",
      start: "2026-10-28T18:00:00+00:00",
      end: "2026-10-28T20:00:00+00:00",
      timezone: "Europe/London",
      location: "To be announced",
      description: "Regular weekly session; venue details are to be announced.",
    },
    {
      id: "boxing-general-training-2026-10-26",
      society_id: "boxing",
      title: "General training",
      start: "2026-10-26T20:00:00+00:00",
      end: "2026-10-26T21:30:00+00:00",
      timezone: "Europe/London",
      location: "Glen Eyre Hall",
      description: "All abilities welcome.",
    },
  ],
};

const CATALOGUE_URL = "https://raw.githubusercontent.com/marlowthijs/Hacktoberfest/main/data/events.json";



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
    societies,
    events,
  };
}

async function loadCatalogue() {
  try {
    const interval = Math.floor(Date.now() / 300000);
    const response = await fetch(CATALOGUE_URL + "?v=" + interval, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Catalogue request failed");
    return validateCatalogue(await response.json());
  } catch (_) {
    return FALLBACK_CATALOGUE;
  }
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

function buildCalendar(events, origin, societyNames) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//University of Southampton//Student Society Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Southampton Societies - " + escapeIcs(societyNames.join(", ")),
    "X-WR-TIMEZONE:Europe/London",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + encodeURIComponent(event.id) + "@southampton-societies",
      "DTSTAMP:" + icsDate(new Date().toISOString()),
      "DTSTART:" + icsDate(event.start),
      "DTEND:" + icsDate(event.end),
      "SUMMARY:" + escapeIcs(event.title),
    );
    if (event.location) lines.push("LOCATION:" + escapeIcs(event.location));
    if (event.description) lines.push("DESCRIPTION:" + escapeIcs(event.description));
    lines.push("URL:" + origin + "/", "END:VEVENT");
  }
  lines.push("END:VCALENDAR", "");
  return lines.map(foldIcsLine).join("\r\n");
}

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD", ...securityHeaders } });
    }
    if (url.pathname === "/healthz") {
      return new Response(request.method === "HEAD" ? null : "ok", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
      });
    }
    if (url.pathname === "/api/events") {
      const catalogue = await loadCatalogue();
      return new Response(request.method === "HEAD" ? null : JSON.stringify(catalogue), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=300", "access-control-allow-origin": "*", ...securityHeaders },
      });
    }
    if (url.pathname === "/calendar.ics") {
      const selected = (url.searchParams.get("societies") || "").split(",").map((id) => id.trim()).filter(Boolean);
      if (!selected.length) {
        return new Response("Choose at least one society in Southampton Societies to create a calendar file.", {
          status: 400,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
        });
      }
      const catalogue = await loadCatalogue();
      const societyIds = new Set(selected);
      const societies = catalogue.societies.filter((society) => societyIds.has(society.id));
      if (!societies.length) {
        return new Response("No matching society calendars were found.", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...securityHeaders },
        });
      }
      const events = catalogue.events.filter((event) => societyIds.has(event.society_id) && Date.parse(event.end) >= Date.now());
      const body = buildCalendar(events, url.origin, societies.map((society) => society.name));
      const headers = {
        "content-type": "text/calendar; charset=utf-8; method=PUBLISH",
        "cache-control": "public, max-age=300, s-maxage=300",
        "content-disposition": url.searchParams.get("download") === "1" ? "attachment; filename=\"southampton-societies.ics\"" : "inline",
        "access-control-allow-origin": "*",
        ...securityHeaders,
      };
      return new Response(request.method === "HEAD" ? null : body, { headers });
    }
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", ...securityHeaders } });
  },
};
