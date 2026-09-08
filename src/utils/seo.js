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

/* ─────────────────────────────────────────────────────────────────────
   What a page actually offers, in the words people search with.

   Somebody looking for a file types "kantara 1080p download" or "our universe
   tamil 720p", and a page that never says "1080p" or "720p" cannot answer
   them — ours said "(HD)" on all 979 download pages because it read a column
   that does not exist. These facets come from the download entries themselves,
   so the page describes what is really there and nothing else.
   ───────────────────────────────────────────────────────────────────── */
const RES_ORDER = ['2160p', '4K', '1440p', '1080p', '720p', '480p', '360p'];
const SRC_ORDER = ['WEB-DL', 'WEBRip', 'BluRay', 'BDRip', 'HDRip', 'HDTV', 'HDTC', 'PreDVD', 'DVDRip'];

/* Releases name languages both ways — "Tamil" and "Tam", "Kan" and "Kannada" —
   and a search is as likely to be "our universe tamil download" as anything
   about resolution, so both spellings have to resolve to the same word. */
const LANGS = [
  ['Tamil', /\b(Tamil|Tam)\b/i], ['Telugu', /\b(Telugu|Tel)\b/i],
  ['Hindi', /\b(Hindi|Hin)\b/i], ['Malayalam', /\b(Malayalam|Mal)\b/i],
  ['Kannada', /\b(Kannada|Kan)\b/i], ['English', /\b(English|Eng)\b/i],
  ['Korean', /\b(Korean|Kor)\b/i], ['Bengali', /\b(Bengali|Ben)\b/i],
  ['Marathi', /\b(Marathi|Mar)\b/i], ['Punjabi', /\b(Punjabi|Pun)\b/i],
];

/** Languages named anywhere in a set of release strings, in a stable order. */
export function languagesFrom(labels = []) {
  const text = labels.filter(Boolean).join(' · ');
  return LANGS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** { resolutions, sources } found across a set of release/quality strings. */
export function downloadFacets(labels = []) {
  const text = labels.filter(Boolean).join(' · ');
  const found = (list, re) => {
    const hits = new Set((text.match(re) || []).map((x) => x.replace(/[\s-]/g, '').toLowerCase()));
    return list.filter((v) => hits.has(v.replace(/[\s-]/g, '').toLowerCase()));
  };
  return {
    resolutions: found(RES_ORDER, /\b(2160p|4K|1440p|1080p|720p|480p|360p)\b/gi),
    sources: found(SRC_ORDER, /\b(WEB[\s-]?DL|WEB[\s-]?Rip|BluRay|BDRip|HDRip|HDTV|HDTC|PreDVD|DVDRip)\b/gi),
  };
}

/** "a, b and c" — an English list, because a description is read by people. */
export const humanList = (xs = []) => (xs.length > 2
  ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
  : xs.join(' and '));

/** "1080p, 720p and 480p WEB-DL" — the phrase, or "" when nothing is known. */
export function facetPhrase(facets = {}) {
  const res = humanList(facets.resolutions || []);
  const src = (facets.sources || [])[0] || '';
  return [res, src].filter(Boolean).join(' ');
}

/* ─────────────────────────────────────────────────────────────────────
   A stored link that names a domain we no longer own, brought home.

   The site ran on 1anchormovies.live until that domain expired, and 646 rows
   still carry watch links pointing at it. Those are real "Watch" buttons on
   the home page and the mobile sheet: a visitor who clicked one left for a
   domain that stopped resolving in July and never came back.

   The data is being corrected, but code that trusts a stored absolute URL
   should not be able to strand a visitor again — so anything naming an old
   domain of ours is rewritten to the origin actually being served.
   ───────────────────────────────────────────────────────────────────── */
const LEGACY_HOSTS = /^(www\.)?1anchormovies\.(live|com|net|org)$/i;

export function ownUrl(raw = '') {
  const s = String(raw).trim();
  if (!s) return s;
  try {
    const u = new URL(s, SITE_ORIGIN || 'https://www.1anchormovies.buzz');
    if (LEGACY_HOSTS.test(u.hostname)) return `${SITE_ORIGIN}${u.pathname}${u.search}${u.hash}`;
    return s;
  } catch {
    return s;                       // not a URL at all — leave it alone
  }
}
