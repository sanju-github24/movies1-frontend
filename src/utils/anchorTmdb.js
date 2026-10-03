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

const getJson = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
};

/* Each provider returns a candidate, a list of them, or null. Asked in order,
   and only when the one before has nothing to give. */
const providers = ({ tmdbId, type, season, episode, title, backendUrl }) => [
  // Ours. A title can be on our CDN without this page's row knowing it.
  async () => {
    const qs = new URLSearchParams({ tmdbId: String(tmdbId), type, season: String(season), episode: String(episode) });
    const d = await getJson(`${backendUrl}/api/own-stream?${qs}`);
    return d?.success && d.url ? { url: d.url, name: "AnchorHD • our CDN", own: true } : null;
  },
  async () => {
    const d = await getJson(`${WORKER}?feed=tmdb&id=${encodeURIComponent(tmdbId)}&type=${type}`
      + `&season=${season}&episode=${episode}&title=${encodeURIComponent(title || "")}`);
    return d?.streamUrl ? { url: d.streamUrl, ref: d.ref || FILMU_REF, ua: d.ua || "", name: "FilmU • Feed" } : null;
  },
  async () => {
    const sing = type === "movie"
      ? `https://embed.filmu.in/api/singularity-movie?id=${encodeURIComponent(tmdbId)}`
      : `https://embed.filmu.in/api/singularity-tv?tmdb=${encodeURIComponent(tmdbId)}&s=${season}&e=${episode}`;
    const d = await getJson(viaWorker(sing, { ref: FILMU_REF }));
    if (!d) return null;
    if (d.sources?.length) return d.sources.map((x) => ({ url: x.url, ref: FILMU_REF, name: "FilmU • Singularity" }));
    const base = d._base || d.i || "";
    if (d.m3u8_path) return { url: base ? `${base}/${d.m3u8_path.replace(/^\//, "")}` : d.m3u8_path, ref: FILMU_REF, name: "FilmU • Singularity" };
    return null;
  },
  async () => {
    const path = `/scrape/VidRock/${type}/tmdb${tmdbId}?tmdbId=${tmdbId}&title=${encodeURIComponent(title || "Stream")}`
      + `&season=${season}&episode=${episode}`;
    const d = await getJson(viaWorker(`https://embed.filmu.in/api/proxy?path=${encodeURIComponent(path)}`, { ref: FILMU_REF }));
    if (!d?.sources?.length) return null;
    // Each scraped source is served by whoever it came from, with their Referer.
    const hls = d.sources.filter((x) => x.type === "m3u8" || x.url?.includes(".m3u8"));
    return (hls.length ? hls : d.sources).map((x) => ({
      url: x.url,
      ref: x.headers?.Referer || x.headers?.referer || FILMU_REF,
      ua: x.headers?.["User-Agent"] || x.headers?.["user-agent"] || "",
      name: x.name || "FilmU • VidRock",
    }));
  },
];

/* "It answered" and "it plays" are different things — a provider will hand
   back a URL on a host that no longer resolves, or its sample clip: a single
   ≤720p tiles.m3u8 with no audio or subtitle tracks beside it, the same clip
   for every title. A real master carries the languages. So the master is
   read before the player is given it. */
const manifestOk = async (url) => {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return false;
    const m = await r.text();
    if (!m.trimStart().startsWith("#EXTM3U")) return false;
    const variants = m.match(/#EXT-X-STREAM-INF[^\n]*\n[^\n]+/g) || [];
    if (variants.length === 1 && !/#EXT-X-MEDIA:/.test(m)) {
      const h = Number((variants[0].match(/RESOLUTION=\d+x(\d+)/) || [])[1]) || 0;
      if (/tiles\.m3u8/.test(variants[0]) && h && h <= 720) return false;
    }
    return true;
  } catch { return false; }
};

// Our backend sleeps on Render; past this a cold start is not worth waiting for.
const OWN_TIMEOUT = 4000;
const withTimeout = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res(null), ms))]);

/**
 * Yields playable HLS URLs for a TMDB title, best first. Every provider is
 * asked up front; each answer's manifest is only checked when it is reached.
 *   { url, name } — url is ready for hls.js (worker-wrapped where needed)
 */
export async function* tmdbStreams({ tmdbId, type = "movie", season = 1, episode = 1, title = "", backendUrl }) {
  const seen = new Set();
  /* All asked at once, taken in order. One after another, their round trips
     added up before the player had anything; now the wait is only as long as
     the slowest provider ahead of the one that answers. */
  const asked = providers({ tmdbId, type, season, episode, title, backendUrl })
    .map((ask, i) => {
      const p = Promise.resolve().then(ask).catch(() => null);
      return i === 0 ? withTimeout(p, OWN_TIMEOUT) : p;
    });
  for (const pending of asked) {
    const got = await pending;
    for (const c of (Array.isArray(got) ? got : [got])) {
      if (!c?.url || seen.has(c.url)) continue;
      seen.add(c.url);
      const url = c.own ? c.url : viaWorker(c.url, { ref: c.ref, ua: c.ua });
      if (await manifestOk(url)) yield { url, name: c.name };
    }
  }
}
