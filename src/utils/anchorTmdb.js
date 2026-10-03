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

const WORKER    = "https://jtv-proxy.sanjusanjay0444.workers.dev/";
const FILMU_REF = "https://embed.filmu.in/";

const viaWorker = (url, { ref = "", ua = "" } = {}) =>
  WORKER + "?url=" + encodeURIComponent(url)
    + (ref ? "&ref=" + encodeURIComponent(ref) : "")
    + (ua  ? "&ua="  + encodeURIComponent(ua)  : "");

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

   A definite "no" ({ error: "…" }) is final. A slow answer is waited for —
   the full thirty seconds FilmU's own page allows. A failed request (FilmU's
   backend answers 502 for some titles; connections drop) is asked once more,
   but only once: for the titles it 502s on it does so every time, and
   retrying for longer only kept the viewer waiting for the next server. */
const singularity = (o) => async () => {
  const api = o.type === "movie"
    ? `https://embed.filmu.in/api/singularity-movie?id=${encodeURIComponent(o.tmdbId)}`
    : `https://embed.filmu.in/api/singularity-tv?tmdb=${encodeURIComponent(o.tmdbId)}&s=${o.season}&e=${o.episode}`;
  let d = null;
  for (let attempt = 0; attempt < 2 && !d; attempt++) {
    if (attempt) await new Promise((res) => setTimeout(res, 1500));
    try {
      const r = await fetch(viaWorker(api, { ref: FILMU_REF }), { cache: "no-store", signal: AbortSignal.timeout(SCRAPE_TIMEOUT) });
      if (r.ok) d = await r.json().catch(() => null);
      else if (r.status < 500) return null;        // a 4xx will not change
    } catch { /* timed out or dropped — once more */ }
  }
  if (!d || d.error) return null;
  const name = "FilmU • Singularity";
  if (d.url) return { url: d.multilingual && d.multilingual_url ? d.multilingual_url : d.url, ref: FILMU_REF, name };
  const base = String(d.i || d._base || "").replace(/\/$/, "");
  const abs = (u) => (/^https?:/i.test(u) ? u : `${base}/${String(u).replace(/^\/?(downloads\/)?/, "")}`);
  const list = (d.sources || []).filter((x) => x?.url).map((x) => ({ url: abs(x.url), ref: FILMU_REF, name }));
  if (!list.length && d.m3u8_path) list.push({ url: abs(d.m3u8_path), ref: FILMU_REF, name });
  return list.length ? list : null;
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
  scrape("VidRock", o),        // Orion · Nova
  scrape("RiveStream", o),     // Vanguard · Zephyr · Citadel · PrimeVids
  scrape("MeowTV", o),         // FilmU Hindi
  // Bastion's are often a dub (Mongolian, at the moment) — last resort.
  scrape("Bastion", o),
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
const OWN_TIMEOUT = 4000;
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
      .slice(0, 8)
      .map((c) => ({ name: c.name, url: c.own ? c.url : viaWorker(c.url, { ref: c.ref, ua: c.ua }) }));
    const scored = await Promise.all(fresh.map(async (c) => ({ ...c, score: await manifestScore(c.url) })));
    for (const c of scored.filter((c) => c.score >= 0).sort((a, b) => b.score - a.score)) {
      yield { url: c.url, name: c.name };
    }
  }
}
