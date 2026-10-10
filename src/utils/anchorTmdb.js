/**
 * AnchorHD for titles we do not host.
 *
 * The StreamX player (m3u8-player) has long resolved a TMDB id into an HLS
 * stream: our own CDN first, then FilmU's sources. This is that same chain,
 * ported here so the result plays in OUR VideoPlayer — which reads the audio
 * languages, qualities and subtitles straight out of the master playlist —
 * instead of inside someone else's iframe.
 *
 * Third-party CDNs answer by Referer, which a browser cannot set, so their
 * streams go through the StreamX worker: it fetches with the right Referer,
 * rewrites every playlist URI (variants, audio tracks, subtitles, segments)
 * back through itself, and sends CORS — which is what hls.js needs.
 */

const WORKER = "https://jtv-proxy.sanjusanjay0444.workers.dev/";
const FILMU_REF = "https://embed.filmu.in/";

const viaWorker = (url, { ref = "", ua = "" } = {}) =>
  WORKER + "?url=" + encodeURIComponent(url)
  + (ref ? "&ref=" + encodeURIComponent(ref) : "")
  + (ua ? "&ua=" + encodeURIComponent(ua) : "");

const getJson = async (url, ms) => {
  const r = await fetch(url, { cache: "no-store", ...(ms ? { signal: AbortSignal.timeout(ms) } : {}) });
  if (!r.ok) return null;
  return r.json();
};

/* FilmU's scrapers take their time — a cold scrape can run well past ten
   seconds, and FilmU's own page gives each one thirty. Cutting them short is
   how a title FilmU plays came back as "nothing found" here. */
const SCRAPE_TIMEOUT = 30000;

/* One of FilmU's extractors: /scrape/<Extractor>/<movie|tv>/<imdb id or
   tmdb<id>>, asked exactly as FilmU's page asks it. The real title and year
   matter — sent as "Stream" with no year, VidRock found nothing for titles it
   does have. Each source names the Referer its own CDN wants. */
const scrape = (extractor, { tmdbId, imdbId, type, season, episode, title, year }, keep = () => true) => async () => {
  const q = new URLSearchParams({ tmdbId: String(tmdbId) });
  if (title) q.set("title", title);
  if (year) q.set("year", String(year));
  if (type === "tv") { q.set("season", String(season)); q.set("episode", String(episode)); }
  const path = `/scrape/${extractor}/${type === "tv" ? "tv" : "movie"}/${imdbId || `tmdb${tmdbId}`}?${q}`;
  const d = await getJson(viaWorker(`https://embed.filmu.in/api/proxy?path=${encodeURIComponent(path)}`, { ref: FILMU_REF }), SCRAPE_TIMEOUT);
  const hls = (d?.sources || []).filter((x) => x.url && (x.type === "m3u8" || x.url.includes(".m3u8")) && keep(x));
  return hls.map((x) => ({
    url: x.url,
    ref: x.headers?.Referer || x.headers?.referer || FILMU_REF,
    ua: x.headers?.["User-Agent"] || x.headers?.["user-agent"] || "",
    name: `FilmU • ${x.name || extractor}`,
  }));
};

/* Singularity first, and given the most patience: its masters carry the
   most audio languages of anything FilmU has, which is why FilmU's own page
   tries it first too.

   It is read the way FilmU reads it. Episodes can come back as { url,
   multilingual_url } — the multilingual one is the master with every
   language, and the one to play. Sources can be paths relative to the `i`
   base, with a "downloads/" prefix that the CDN does not serve.

   It is given a window before anyone else is used: a lot of titles are on
   FilmU and nowhere better, and a Singularity that has not answered yet —
   a 502, a dropped connection, an error while it is still getting a title
   ready — is asked again every few seconds until SINGULARITY_PATIENCE has
   passed. Only NO_MATCH ends that early: FilmU could not match the title at
   all, and waiting does not change it. A slow answer is waited for in full,
   the thirty seconds FilmU's own page allows. */
const SINGULARITY_PATIENCE = 10000;
const SINGULARITY_POLL = 2500;
const singularity = (o) => async () => {
  const api = o.type === "movie"
    ? `https://embed.filmu.in/api/singularity-movie?id=${encodeURIComponent(o.tmdbId)}`
    : `https://embed.filmu.in/api/singularity-tv?tmdb=${encodeURIComponent(o.tmdbId)}&s=${o.season}&e=${o.episode}`;
  const until = Date.now() + SINGULARITY_PATIENCE;
  let d = null;
  for (; ;) {
    try {
      const r = await fetch(viaWorker(api, { ref: FILMU_REF }), { cache: "no-store", signal: AbortSignal.timeout(SCRAPE_TIMEOUT) });
      d = r.ok ? await r.json().catch(() => null) : null;
      if (!r.ok && r.status < 500) return null;    // a 4xx will not change
    } catch { d = null; }                           // timed out or dropped
    if (d && !d.error) break;                       // an answer with a stream
    if (/NO_MATCH/i.test(d?.error || "")) return null;
    if (Date.now() + SINGULARITY_POLL > until) return null;
    await new Promise((res) => setTimeout(res, SINGULARITY_POLL));
  }
  const name = "FilmU • Singularity";
  if (d.url) return { url: d.multilingual && d.multilingual_url ? d.multilingual_url : d.url, ref: FILMU_REF, name };
  const base = String(d.i || d._base || "").replace(/\/$/, "");
  const abs = (u) => (/^https?:/i.test(u) ? u : `${base}/${String(u).replace(/^\/?(downloads\/)?/, "")}`);
  const list = (d.sources || []).filter((x) => x?.url).map((x) => ({ url: abs(x.url), ref: FILMU_REF, name }));
  if (!list.length && d.m3u8_path) list.push({ url: abs(d.m3u8_path), ref: FILMU_REF, name });
  return list.length ? list : null;
};

/* MoviBox posts each language of a film as its own title, each with h264
   MP4s (and an HEVC DASH manifest, which hls.js cannot play and most
   browsers cannot decode, so it is left to anchor-ingest). Our backend finds
   them all by TMDB id (/api/movibox). Its CDN wants movibox.net as the
   Referer, which only a relay can send — the download relay, asked to serve
   for playing. Named "MoviBox • Tamil 1080p", the player reads the language
   from the name and offers each as a choice in its language menu. */
const RELAY = import.meta.env.VITE_DL_RELAY || "";
const LANG_NAME = { ta: "Tamil", te: "Telugu", hi: "Hindi", kn: "Kannada", ml: "Malayalam", en: "English",
  bn: "Bengali", mr: "Marathi", pa: "Punjabi", gu: "Gujarati", ur: "Urdu", or: "Odia" };
const moviBox = (o) => async () => {
  if (!RELAY || !o.backendUrl) return null;
  const qs = new URLSearchParams({ tmdb: String(o.tmdbId), type: o.type, ...(o.type === "tv" ? { se: String(o.season), ep: String(o.episode) } : {}) });
  const d = await getJson(`${o.backendUrl}/api/movibox?${qs}`, 40000);
  const out = [];
  for (const l of d?.languages || []) {
    const lang = LANG_NAME[l.code] || String(l.language || "").replace(/\s*dub$/i, "");
    for (const f of l.mp4 || []) {
      out.push({
        name: `MoviBox • ${lang} ${f.resolution}${l.original ? " (original)" : ""}`,
        url: `${RELAY}?u=${encodeURIComponent(f.url)}&play=1&n=${encodeURIComponent(`${o.title || "video"} ${lang} ${f.resolution}.mp4`)}`,
        own: true, file: true,
      });
    }
  }
  // The original language first, then the rest; best quality first within each.
  return out.length ? out.sort((a, b) => Number(/original/.test(b.name)) - Number(/original/.test(a.name))) : null;
};

/* Each provider returns a candidate, a list of them, or null. In FilmU's own
   order of preference: Singularity's masters carry the most languages; the
   extractors behind it are what FilmU's page falls back to. */
const providers = (o) => [
  // Ours. A title can be on our CDN without this page's row knowing it.
  async () => {
    const qs = new URLSearchParams({ tmdbId: String(o.tmdbId), type: o.type, season: String(o.season), episode: String(o.episode) });
    const d = await getJson(`${o.backendUrl}/api/own-stream?${qs}`);
    return d?.success && d.url ? { url: d.url, name: "AnchorHD • our CDN", own: true } : null;
  },
  singularity(o),
  scrape("Bastion", o),        // right after Singularity, as FilmU's page does
  scrape("RiveStream", o),     // Citadel · Zephyr · PrimeVids · Vanguard
  scrape("MeowTV", o),         // FilmU Hindi
  scrape("VidRock", o),        // Nova · Orion
];


/* "It answered" and "it plays" are different things — a provider will hand
   back a URL on a host that no longer resolves, or its sample clip: a single
   ≤720p tiles.m3u8 with no audio or subtitle tracks beside it, the same clip
   for every title. A real master carries the languages. So the master is
   read before the player is given it, and scored: more audio languages and
   more qualities is what our menus are for. Returns -1 for unplayable. */
const manifestScore = async (url) => {
  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!r.ok) return -1;
    const m = await r.text();
    if (!m.trimStart().startsWith("#EXTM3U")) return -1;
    const variants = m.match(/#EXT-X-STREAM-INF[^\n]*\n[^\n]+/g) || [];
    const audio = (m.match(/#EXT-X-MEDIA:TYPE=AUDIO/g) || []).length;
    if (variants.length === 1 && !/#EXT-X-MEDIA:/.test(m)) {
      const h = Number((variants[0].match(/RESOLUTION=\d+x(\d+)/) || [])[1]) || 0;
      if (/tiles\.m3u8/.test(variants[0]) && h && h <= 720) return -1;
    }
    return audio * 10 + variants.length;
  } catch { return -1; }
};

// Our backend sleeps on Render; past this a cold start is not worth waiting for.
const OWN_TIMEOUT = 2500;
const withTimeout = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res(null), ms))]);

/**
 * Yields playable HLS URLs for a TMDB title, best first. Every provider is
 * asked up front and taken in order; within one provider its sources are
 * checked together and the richest master goes first.
 *   { url, name } — url is ready for hls.js (worker-wrapped where needed)
 */
export async function* tmdbStreams({ tmdbId, imdbId = "", type = "movie", season = 1, episode = 1, title = "", year = "", backendUrl }) {
  const seen = new Set();
  const o = { tmdbId, imdbId: /^tt\d+$/.test(imdbId || "") ? imdbId : "", type, season, episode, title, year: String(year || "").slice(0, 4), backendUrl };
  /* All asked at once, taken in order. One after another, their round trips
     added up before the player had anything; now the wait is only as long as
     the slowest provider ahead of the one that answers. */
  const asked = providers(o).map((ask, i) => {
    const p = Promise.resolve().then(ask).catch(() => null);
    return i === 0 ? withTimeout(p, OWN_TIMEOUT) : p;
  });
  for (const pending of asked) {
    const got = await pending;
    const fresh = (Array.isArray(got) ? got : [got])
      .filter((c) => c?.url && !seen.has(c.url) && seen.add(c.url))
      .slice(0, 16)
      .map((c) => ({ name: c.name, file: c.file, url: c.own ? c.url : viaWorker(c.url, { ref: c.ref, ua: c.ua }) }));
    // A plain file has no manifest to read; it keeps its provider's order.
    const scored = await Promise.all(fresh.map(async (c, i) => ({ ...c, score: c.file ? 100 - i : await manifestScore(c.url) })));
    for (const c of scored.filter((c) => c.score >= 0).sort((a, b) => b.score - a.score)) {
      yield { url: c.url, name: c.name };
    }
  }
}

/**
 * MoviBox's languages for a TMDB title, as its own server: the same player,
 * fed only these — one MP4 per language and quality, the original first.
 *   { url, name } — name "MoviBox • Tamil 1080p"; url plays through the relay
 */
export async function* moviboxStreams({ tmdbId, type = "movie", season = 1, episode = 1, title = "", backendUrl }) {
  const list = await moviBox({ tmdbId, type, season, episode, title, backendUrl })().catch(() => null);
  for (const c of list || []) yield { url: c.url, name: c.name };
}

/* ── 1TamilMV, as its own server ─────────────────────────────────────────
   A film there is posted once per language, each language's files on a
   direct link (an MKV the viewer's browser streams from 1TamilMV's CDN —
   nothing passes through us). Only what a browser can play: x264 video and
   AAC audio — DD+/AC3/Atmos play silent, HEVC on few devices. Single-language
   files first; a multi-language one is used only for a language no single
   file covers, since a browser plays a file's first audio track only.
   Named "1TamilMV • Tamil 720p", so the player's language menu offers them,
   and a switch carries on from the same second. The link behind each is
   found when it plays (/api/fresh/play redirects to it): they last hours. */
const MKV_OK = () => {
  try { return !!document.createElement("video").canPlayType('video/x-matroska; codecs="avc1.64001f, mp4a.40.2"'); }
  catch { return false; }
};
export const canPlayMkv = MKV_OK;

export async function* tamilmvStreams({ tmdbId, type = "movie", season = 1, episode = 1, title = "", year = "", backendUrl }) {
  if (!backendUrl || !MKV_OK()) return;
  const { releaseLabel } = await import("../components/TamilmvDownloads.jsx");
  const qs = new URLSearchParams({ tmdb: `${type === "tv" ? "tv" : "movie"}:${tmdbId}`, title: title || "", year: String(year || "") });
  const d = await getJson(`${backendUrl}/api/fresh/files?${qs}`, 60000).catch(() => null);
  const playable = (n) => /\b(x264|AVC|H\.?264)\b/i.test(n) && !/\b(HEVC|x265|H\.?265|10\s*bit)\b/i.test(n)
    && /\bAAC\b/i.test(n) && !/\bDD\+?|\bAC-?3\b|ATMOS|\bDTS\b|EAC3|E-AC-3/i.test(n);
  const CAM = /PreDVD|PreHD|HDTC|HDTS|HDCAM|DVDScr/i;
  const rank = { "2160p": 4, "1080p": 3, "720p": 2, "480p": 1 };
  const files = (d?.files || []).filter((f) => f.direct && playable(f.name)).map((f) => {
    const l = releaseLabel(f.name);
    const m = l.episode.match(/^S(\d+) EP(\d+)$/);   // a single episode, not a range
    return { f, l, se: m ? Number(m[1]) : 0, ep: m ? Number(m[2]) : 0 };
  }).filter((x) => (type === "tv" ? x.se === Number(season) && x.ep === Number(episode) : !x.l.episode))
    // Clean prints first, then the best quality.
    .sort((a, b) => Number(CAM.test(a.l.print)) - Number(CAM.test(b.l.print)) || (rank[b.f.quality] || 0) - (rank[a.f.quality] || 0));
  const seen = new Set(), covered = new Set();
  const out = [];
  /* A language with a clean print (WEB-DL, HDRip, BluRay…) never offers its
     PreDVD: the camera copy is only for a language that has nothing better. */
  const cleanLangs = new Set(files.filter((x) => !CAM.test(x.l.print)).flatMap((x) => x.l.langs.slice(0, 1)));
  const take = (x, lang) => {
    if (CAM.test(x.l.print) && cleanLangs.has(lang)) return;
    const q = x.f.quality || "480p";
    const k = `${lang}|${q}`;
    if (seen.has(k)) return;
    seen.add(k); covered.add(lang);
    out.push({ name: `1TamilMV • ${lang} ${q}${x.l.print ? ` · ${x.l.print}` : ""}`,
      url: `${backendUrl}/api/fresh/play?key=${encodeURIComponent(x.f.direct)}` });
  };
  files.filter((x) => x.l.langs.length === 1).forEach((x) => take(x, x.l.langs[0]));
  files.filter((x) => x.l.langs.length > 1 && !covered.has(x.l.langs[0])).forEach((x) => take(x, x.l.langs[0]));
  // The title's own language first (the first single-language one listed), then the rest.
  for (const c of out) yield c;
}
