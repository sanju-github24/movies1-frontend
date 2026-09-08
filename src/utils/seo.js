// ─────────────────────────────────────────────────────────────────────────
// SEO helpers
// ─────────────────────────────────────────────────────────────────────────

// Absolute origin for canonicals, og:url and JSON-LD @id values.
//
// These have to be absolute, and they have to name the domain the site is really
// served from: public/sitemap.xml and index.html's og:url still point at
// 1anchormovies.live while the site answers on .buzz, which tells Google the
// canonical copy of every page lives somewhere else. Set VITE_SITE_ORIGIN to
// whichever domain is meant to be the real one; until then, trust the address
// the page was actually loaded from rather than a hardcoded guess.
export const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_ORIGIN ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

/** Absolute URL for a route path, e.g. absUrl('/sports'). */
export function absUrl(path = '/') {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Render a JSON-LD object as a <script> payload for Helmet. */
export function jsonLd(obj) {
  // Escaping "<" keeps a stray tag in scraped data from closing the script early.
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/* ─────────────────────────────────────────────────────────────────────
   Stored titles are release names: "Bigg Boss Kannada (2026) S13 - TRUE
   WEB-DL - 1080p - Kannada". Nobody searches for that. This recovers the
   part a person would actually type, for the <title>, og:title and JSON-LD.

   The year is the divider. Everything after "(2026)" in a release name is
   technical — language, source, resolution, codec — so it goes, except a
   season number, which people do search for ("bigg boss kannada 13").
   Everything BEFORE the year is the name and is kept whole, so
   "Court - State vs A Nobody" survives intact.

   With no year to divide on, the first technical token is the cut instead.
   ───────────────────────────────────────────────────────────────────── */
const TECH = /\b(TRUE\s+)?(WEB[\s-]?DL|WEB[\s-]?RIP|HDRip|BluRay|BDRip|HDTC|PreDVD|HDTV|DVDRip|2160p|1440p|1080p|720p|480p|4K|HEVC|AVC|x26[45]|H\.?26[45]|DD[\s+]?5\.1|DDP|DTS|AAC|AC3|EAC3|Atmos|ESubs?|MSubs?)\b/i;

export function titleForSearch(raw = "") {
  const s = String(raw).trim();
  const yr = /\((19|20)\d{2}\)/.exec(s);

  let name, tail;
  if (yr) {
    name = s.slice(0, yr.index);
    tail = s.slice(yr.index + yr[0].length);
  } else {
    const t = TECH.exec(s);
    name = t ? s.slice(0, t.index) : s;
    tail = t ? s.slice(t.index) : "";
  }

  // A season in the tail is worth keeping — it is part of what people search.
  const season = /^\s*[-\s]*(?:S(?:eason)?\s*(\d{1,3}))\b/i.exec(tail)?.[1] || "";

  name = name
    .replace(/[[(][^\])]*$/, "")            // an unclosed bracket left by the cut
    .replace(/\s*[-–—:,]\s*$/, "")          // a separator now dangling at the end
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    name: name || s,
    year: yr ? yr[0].replace(/[()]/g, "") : "",
    season,
  };
}
