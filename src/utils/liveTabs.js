/* The player's tabs, as the site sees them.
 *
 * A bundle URL carries its streams inside it, so it stops working the moment
 * the tokens behind them rotate — hourly, for these feeds. A tab URL names a
 * tab instead (?tab=sony), and whoever opens it reads the feed fresh. That
 * makes it the right thing for an admin to save once and leave alone.
 *
 * This module is what turns such a URL into something to draw: the fixtures
 * on air now, and the ones still to come. */

/* The same worker the player reads. It normalizes three publishers' feeds
   into one shape, so nothing here has to know about any of them. */
const WORKER = "https://jtv-proxy.sanjusanjay0444.workers.dev/";

export const TAB_DEFS = {
  sony: { key: "sony", label: "SonyLiv",   feed: `${WORKER}?feed=sonyliv` },
  fc:   { key: "fc",   label: "FanCode",   feed: `${WORKER}?feed=fancode` },
  live: { key: "live", label: "Live TV",   feed: null },
  bb:   { key: "bb",   label: "Bigg Boss", feed: null },
};

/* A tab URL looks like https://player/?tab=sony — anything else (a bundle,
   a bare link) is not ours and returns null so the caller can skip it. */
export function parseTabUrl(url) {
  try {
    const u = new URL(url);
    const key = u.searchParams.get("tab");
    if (!key || !TAB_DEFS[key]) return null;
    return { key, base: `${u.origin}${u.pathname}`, def: TAB_DEFS[key] };
  } catch {
    return null;
  }
}

/* Where a viewer goes when they pick a fixture: the player, on that tab, with
   that item already chosen. */
export function tabItemUrl(base, key, id, solo = false) {
  return `${base}?tab=${encodeURIComponent(key)}`
    + (id ? `&id=${encodeURIComponent(id)}` : "")
    + (solo ? "&solo=1" : "");
}

/* Live and upcoming for one tab.
 *
 * Tabs with no feed of their own (Live TV's channel list, the fixed Bigg Boss
 * feeds) have nothing to schedule, so they report empty rather than being
 * treated as a failure. */
export async function fetchTabFeed(key) {
  const def = TAB_DEFS[key];
  if (!def || !def.feed) return { live: [], upcoming: [] };

  const res = await fetch(`${def.feed}&_=${Date.now()}`);
  if (!res.ok) throw new Error(`${def.label} feed: ${res.status}`);

  const body = await res.json();
  // The feed used to be a bare array of live rows before it learned about
  // upcoming ones; read either.
  if (Array.isArray(body)) return { live: body, upcoming: [] };
  return { live: body.live || [], upcoming: body.upcoming || [] };
}

/* The picture for a card.
 *
 * The feeds disagree about what the field is called and some rows have
 * nothing at all, so the bundle's own thumbnail is the last resort — better a
 * generic picture for the competition than an empty frame. */
export function posterFor(item, fallback) {
  return item.poster || item.logo || item.src || fallback || null;
}

/* "06:30:00 PM 13-09-2026" and "13 Sep 2026" both appear; neither parses with
   Date. Rather than guess wrong, show what the feed said. */
export function startLabel(item) {
  const raw = String(item.start || "").trim();
  if (!raw) return "";
  const m = raw.match(/^(\d{1,2}:\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  return m ? `${m[1]}${m[2] ? " " + m[2].toUpperCase() : ""}` : raw;
}
