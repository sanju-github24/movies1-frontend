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
