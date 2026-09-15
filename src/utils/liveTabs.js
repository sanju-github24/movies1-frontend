import { supabase } from "./supabaseClient";

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
  sony:   { key: "sony",   label: "SonyLiv",       feed: `${WORKER}?feed=sonyliv` },
  fc:     { key: "fc",     label: "FanCode",       feed: `${WORKER}?feed=fancode` },
  /* Schedule only — the feed behind it carries no streams, so its cards link
     to where a fixture can be watched instead of playing one. */
  willow: { key: "willow", label: "Willow Cricket", feed: `${WORKER}?feed=willow` },
  live:   { key: "live",   label: "Live TV",       feed: null },
  bb:     { key: "bb",     label: "Hotstar",       feed: null },
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

/* ─────────────────────────────────────────────────────────────────────────
   Fixtures for the heroes

   The heroes used to read a publisher's JSON straight off GitHub. That meant
   the site had its own idea of what FanCode was showing, separate from the
   player's, and the two drifted: different shapes, different fields, and a
   second place to fix whenever a publisher changed something. These read the
   same worker the player reads, so there is one answer to "what is on".
   ───────────────────────────────────────────────────────────────────────── */

/* Where the heroes send a viewer to watch. The admin can save any player URL
   for the listings; a hero has no row to read one from, so it uses this. */
export const PLAYER_BASE = "https://m3u8-player-ashen.vercel.app/";

/* India, as a feed spells it — "India", "IND", "India Women", "Team India".
   Deliberately word-bounded: "Indians" is a Mumbai Indians match, not India,
   and "Indies" is the West Indies. */
const INDIA = /\b(india|ind)\b/i;
const NOT_INDIA = /\b(indians|indies|indiana)\b/i;

export function isIndiaFixture(item) {
  const hay = `${item?.name || ""} ${item?.event || ""}`;
  if (NOT_INDIA.test(hay)) return false;
  return INDIA.test(hay);
}

/* "Ludhiana Lions vs Amritsar Soormas" → the two sides, for a hero that shows
   them apart. A fixture the feed names any other way keeps its whole title. */
export function splitTeams(name) {
  const m = String(name || "").split(/\s+vs\.?\s+/i);
  return m.length === 2 ? { home: m[0].trim(), away: m[1].trim() } : null;
}

/* Live and upcoming across both fixture tabs, each row tagged with where it
   came from so a hero can link back into the right one.

   A failing feed is not allowed to take the other down with it: one source
   being unreachable should cost that source's fixtures, nothing more. */
export async function fetchHeroFixtures({ upcomingPerSource = 2 } = {}) {
  const keys = ["fc", "sony"];
  const settled = await Promise.allSettled(keys.map((k) => fetchTabFeed(k)));

  const live = [];
  const upcoming = [];

  settled.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const key = keys[i];
    const tag = (m) => ({ ...m, tabKey: key, source: TAB_DEFS[key].label });

    live.push(...(r.value.live || []).map(tag));

    /* India first, then the feed's own order — which is roughly by start time.
       Two per source rather than two overall, so one busy publisher cannot
       crowd the other out of the hero entirely. */
    const soon = (r.value.upcoming || []).map(tag);
    soon.sort((a, b) => Number(isIndiaFixture(b)) - Number(isIndiaFixture(a)));
    upcoming.push(...soon.slice(0, upcomingPerSource));
  });

  live.sort((a, b) => Number(isIndiaFixture(b)) - Number(isIndiaFixture(a)));
  return { live, upcoming };
}

/* The address that plays one fixture, with the player's own chrome kept out
   of the way — see solo in the player. */
export function heroPlayUrl(item) {
  return tabItemUrl(PLAYER_BASE, item.tabKey, item.id, true);
}

/* ─────────────────────────────────────────────────────────────────────────
   Bigg Boss Kannada, running 24/7

   A fixture comes and goes; this one is always on, so it is named here rather
   than discovered from a feed. One definition because three places show it —
   the home hero, the watch page hero and the watch page itself — and they must
   not disagree about its artwork or where it plays.

   Shaped like a title, because to every hero on this site it is one: the same
   poster, cover and language fields a film would carry.
   ───────────────────────────────────────────────────────────────────────── */
/* The show already exists on the site, so its artwork is already decided.
   Taking a picture off Hotstar instead would put a different cover on the
   hero than the one the same show carries everywhere else. */
export const BB_KANNADA_SLUG = "bigg-boss-kannada-13";

export const BIGG_BOSS_KANNADA = {
  id: "bigg-boss-kannada-live",
  slug: BB_KANNADA_SLUG,
  title: "Bigg Boss Kannada 24/7",
  /* What the row held when this was written, so the hero paints correctly on
     the first frame rather than flashing an empty card while the row loads.
     withBiggBossArt replaces them with whatever the row says now. */
  poster: "https://i.postimg.cc/YC7FmbJ7/1788701176331-v.avif",
  cover_poster: "https://i.postimg.cc/MZjfPCw1/1788701208098-i.avif",
  title_logo: "https://i.postimg.cc/sxFxC2zQ/eb-Xd7J1-removebg-preview.png",
  language: ["Kannada"],
  genres: ["Reality", "Live"],
  description: "The Kannada house, streaming live around the clock.",
  content_type: "tv",
  isLiveStream: true,
  /* bb is the player's Hotstar tab and bb-kannada the channel inside it; solo
     keeps the player's own chrome out of the way, since this opens framed. */
  playSrc: tabItemUrl(PLAYER_BASE, "bb", "bb-kannada", true),
  playTitle: "Bigg Boss Kannada 24/7",
};

/* The same card, with the artwork the show currently carries.
   Read rather than copied, so changing the cover in one place changes it in
   the heroes too — otherwise the two drift and only one of them is noticed. */
export async function withBiggBossArt() {
  try {
    const { data } = await supabase
      .from("watch_html")
      .select("poster,cover_poster,title_logo")
      .eq("slug", BB_KANNADA_SLUG)
      .limit(1);
    const row = data && data[0];
    if (!row) return BIGG_BOSS_KANNADA;
    return {
      ...BIGG_BOSS_KANNADA,
      poster: row.poster || BIGG_BOSS_KANNADA.poster,
      cover_poster: row.cover_poster || BIGG_BOSS_KANNADA.cover_poster,
      title_logo: row.title_logo || BIGG_BOSS_KANNADA.title_logo,
    };
  } catch {
    // The card is still worth showing with the artwork we shipped with.
    return BIGG_BOSS_KANNADA;
  }
}
