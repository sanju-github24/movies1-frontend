/* What it takes to play one thing, worked out before the player sees it.
 *
 * Ported from player.html, which has been playing these for weeks: the rules
 * below are its rules, and where they differ from what seems obvious it is
 * because the obvious version was tried there and failed. Each note says which
 * failure it is avoiding, so it is not undone here by someone who has not seen
 * it happen.
 *
 * The result is a source descriptor the player can act on without knowing
 * which publisher it came from:
 *
 *   { kind: "hls" | "dash", url, drm?: { keyId, key },
 *     proxy?: { base, cookie, ref, ua },   // every request goes through it
 *     jioCookie? }                          // appended to Jio CDN requests
 */

import { langCode, baseId, langName } from "./langs";

const WORKER = "https://jtv-proxy.sanjusanjay0444.workers.dev/";

/* The Mumbai function. SonyLiv and Hotstar refuse any address outside India
   and FanCode refuses one outside India that is not a home connection; this
   runs in India and, for the two that want more, borrows an Indian consumer
   address. Cross-origin from here is fine — it answers with CORS. */
export const PROXY = "https://m3u8-player-ashen.vercel.app/api/live-proxy";

const isDash = (u) => /\.mpd(\?|$)/i.test(String(u || ""));

/* Feeds are cached for ten minutes. Every source in them carries a token that
   expires in hours, and the worker never caches them, so a page left open all
   day still reads a token that works. A stream that dies anyway calls
   forgetFeeds() and is looked up again from scratch. */
const FEED_TTL = 10 * 60_000;
const cache = new Map();          // q -> { p, at }
async function feed(q) {
  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < FEED_TTL) return hit.p;
  const p = fetch(`${WORKER}${q}${q.includes("?") ? "&" : "?"}_=${Date.now()}`)
    .then((r) => { if (!r.ok) throw new Error(`feed ${r.status}`); return r.json(); })
    .catch((e) => { cache.delete(q); throw e; });
  cache.set(q, { p, at: Date.now() });
  return p;
}

export function forgetFeeds() { cache.clear(); }

/* The proxy is a different origin, and its DNS, TCP and TLS are most of the
   first request's time. Opened as soon as anything asks to play, it is ready
   by the time the feed has said what to play. */
let warmed = false;
function warmProxy() {
  if (warmed || typeof document === "undefined") return;
  warmed = true;
  const l = document.createElement("link");
  l.rel = "preconnect";
  l.href = new URL(PROXY).origin;
  l.crossOrigin = "anonymous";
  document.head.appendChild(l);
}

/* ── fixtures: SonyLiv, FanCode ─────────────────────────────────────────── */

/* A fixture from the feeds already carries its URL. It is HLS, and it goes
   through the proxy because neither CDN sends CORS headers and both refuse
   hosted addresses outside India. */
function fixtureSource(tabKey, item) {
  if (!item?.url) throw new Error("This one has not started — nothing to play yet");
  if (tabKey === "fc") {
    return { kind: "hls", url: item.url,
             proxy: { base: PROXY, ref: "https://fancode.com/", ua: item.ua || "" } };
  }
  return { kind: isDash(item.url) ? "dash" : "hls", url: item.url, proxy: { base: PROXY } };
}

/* ── Hotstar ────────────────────────────────────────────────────────────── */

/* The site links six channels by short names of its own. The playlist has no
   ids and writes "Bigboss" with one g, so these match on what the channel is
   rather than on a name that is not stable. */
const HOTSTAR_ALIASES = {
  "bb-hindi": /bigg?boss.*hindi/i, "bb-bangla": /bigg?boss.*bangla/i,
  "bb-kannada": /bigg?boss.*kannada/i, "bb-malayalam": /bigg?boss.*malayalam/i,
  "bb-telugu": /bigg?boss.*telugu/i, "bb-tamil": /bigg?boss.*tamil/i,
};

async function hotstarSource(id) {
  const body = await feed("?feed=hotstar");
  const chans = body.channels || [];
  const ch = chans.find((c) => c.id === id)
    || (HOTSTAR_ALIASES[id] && chans.find((c) => HOTSTAR_ALIASES[id].test(c.name.replace(/\s+/g, ""))));
  if (!ch) throw new Error("That channel is not in the Hotstar list right now");

  const exp = Number((/exp=(\d+)/.exec(body.token || "") || [])[1]);
  if (exp && exp * 1000 < Date.now()) {
    throw new Error("The Hotstar token has expired — every channel on it is out until the playlist refreshes");
  }

  /* Hotstar answers 403 unless Cookie, Referer and Origin arrive together,
     and a browser will not set any of them on a cross-origin request. So all
     three are the proxy's to send, on the playlist and on every segment. */
  const proxy = { base: PROXY, cookie: body.token, ref: "https://www.hotstar.com/", ua: "Virat Kohli" };
  const drm = ch.keyId && ch.key ? { keyId: ch.keyId, key: ch.key } : undefined;
  return { kind: isDash(ch.url) ? "dash" : "hls", url: ch.url, drm, proxy, title: ch.name, poster: ch.logo };
}

/* ── JioTV ──────────────────────────────────────────────────────────────── */

/* Jio's CDN does send CORS, so these play direct with no proxy. What it wants
   is the __hdnea__ token on every request — the manifest and each segment —
   which is why it is handed over separately rather than left on the URL: on
   the URL it would sign the manifest and nothing after it. */
async function jioSource(id) {
  const list = await feed("");
  const rows = Array.isArray(list) ? list : [];
  const ch = rows.find((c) => String(c.channel_id) === String(id));
  if (!ch) throw new Error("That channel is not in the list right now");
  const cookie = String(ch.cookie || "");
  return {
    kind: "dash",
    url: ch.channel_url,
    drm: ch.keyId && ch.key ? { keyId: ch.keyId, key: ch.key } : undefined,
    jioCookie: cookie.startsWith("__hdnea__=") ? cookie.slice("__hdnea__=".length) : cookie,
    title: ch.channel_name,
    poster: ch.channel_logo,
  };
}

/* ── the one entry point ────────────────────────────────────────────────── */

/* `item` is what the page already has in hand — a fixture carries its URL, a
   channel only its id. Prime is deliberately absent: its keys are decryption
   keys for a paid service's DRM, which this site does not unwrap. */
/* A fixture named only by its id — which is all a saved link carries — is
   looked up in its feed first, so a link and a card in hand end up the same. */
async function liveFixtures(tabKey) {
  const body = await feed(tabKey === "fc" ? "?feed=fancode" : "?feed=sonyliv");
  return Array.isArray(body) ? body : (body.live || []);
}

async function findFixture(tabKey, id) {
  const hit = (await liveFixtures(tabKey)).find((m) => String(m.id) === String(id));
  if (!hit) throw new Error("That match is not live any more");
  return hit;
}

/* The other commentaries of the same match. Each language is its own stream
   with its own id, the id differing only in its suffix, so siblings are the
   live fixtures that share everything before it. Worked out here rather than
   by whoever opened the player, so a hero slide, a card and a saved link all
   offer the same choice without any of them knowing there was one. */
async function siblingLanguages(tabKey, id) {
  if (!langCode(id)) return [];
  const base = baseId(id);
  const seen = new Set();
  return (await liveFixtures(tabKey))
    .filter((m) => baseId(m.id) === base && langCode(m.id))
    .map((m) => ({ code: langCode(m.id), label: langName(langCode(m.id)), id: m.id }))
    .filter((l) => (seen.has(l.code) ? false : (seen.add(l.code), true)));
}

/* The links the site already builds point at the player page with the tab
   and item in the query. Read here, so every caller that passes one plays in
   AnchorHD's own player without having to change what it passes. */
export function parseSourceLink(link) {
  try {
    const u = new URL(link);
    const tabKey = u.searchParams.get("tab");
    const id = u.searchParams.get("id");
    return tabKey ? { tabKey, id } : null;
  } catch { return null; }
}

export async function resolveSource({ tabKey, id, item }) {
  warmProxy();
  switch (tabKey) {
    case "sony":
    case "fc": {
      const fx = item?.url ? item : await findFixture(tabKey, id);
      const src = fixtureSource(tabKey, fx);
      const languages = await siblingLanguages(tabKey, fx.id).catch(() => []);
      // One language is no choice at all; the player shows nothing for it.
      return languages.length > 1 ? { ...src, lang: langCode(fx.id), languages } : src;
    }
    case "bb":
      return hotstarSource(id || item?.id);
    case "live":
      return jioSource(id || item?.id);
    case "willow":
      throw new Error("Willow lists fixtures without streams — open it where it is shown");
    default:
      throw new Error(`Nothing plays from "${tabKey}" here`);
  }
}
