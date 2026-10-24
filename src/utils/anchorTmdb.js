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

/* MoviBox, first after our own CDN: every language of a title as audio
   tracks of ONE HLS stream, built by our backend (/api/mbhls) from MoviBox's
   DASH. Each segment comes straight from MoviBox's CDN to the viewer — the
   playlists carry its CloudFront signature — so nothing heavy passes through
   our servers, and switching language does not reload. Versions cut
   differently (a shorter dub) come as their own stream, named by their
   languages so the player can still offer them. HEVC only: a browser that
   cannot decode it skips this and goes on to Singularity. */
/* Exactly the codec MoviBox's DASH carries — hev1, parameters in band.
   Safari and iPhones decode HEVC only as hvc1, so asking for either let them
   pick a stream they then failed on, and fall to a one-language source; now
   they take the per-language MP4s, every language still offered. */
const HEVC_OK = () => {
  try {
    const MS = globalThis.ManagedMediaSource || globalThis.MediaSource || null;   // iPhone has the managed one
    return !!MS && MS.isTypeSupported('video/mp4; codecs="hev1.1.6.L93.90"');
  } catch { return false; }
};
/* A dub MoviBox has only as an H.264 MP4 (The Raja Saab's Tamil, Kannada,
   Malayalam) comes as its own stream after it, offered in the language
   menu beside the stream's tracks; on a browser without HEVC every language
   comes that way. The MP4s too play straight off MoviBox's CDN. */
const moviboxHls = (o) => async () => {
  if (!o.backendUrl || !o.tmdbId) return null;
  const hevc = HEVC_OK();
  const tv = o.type === "tv";
  const qs = new URLSearchParams({ tmdb: String(o.tmdbId), type: tv ? "tv" : "movie",
    ...(tv ? { se: String(o.season), ep: String(o.episode) } : {}) });
  const d = await getJson(`${o.backendUrl}/api/mbhls/title?${qs}`, 30000);
  const out = hevc ? (d?.streams || []).map((s) => ({
    url: `${o.backendUrl}${s.url}`, own: true,
    name: `MoviBox • ${(s.languages || []).map((l) => l.name).join(", ")} ${s.height ? `${s.height}p` : ""}`.trim(),
  })) : [];
  (d?.mp4 || []).filter((m) => !hevc || !m.inStream).forEach((m, i) => out.push({
    url: m.url, own: true, file: true,
    name: `MoviBox • ${m.name} ${m.resolution ? `${m.resolution}p` : ""}`.trim(),
    score: 1 - i / 1000,   // after the multi-audio stream, which the manifest scores above 1
  }));
  return out.length ? out : null;
};

/* Bingr's direct servers, right after Singularity, in bingr's own order.
   Asked through our backend (/api/bingr/stream): bingr's API answers only
   bingr.one's origin. They match a title by its name and year as well as its
   TMDB id. Polaris and Bastion send one stream per language and quality
   ("Hindi — 1080p"), the others a single master; each is named "Polaris •
   Hindi 1080p", so the player's language menu offers them. The streams play
   through our worker with bingr.one as the Referer — their hosts refuse any
   other site. MP4 copies and foreign subbed versions ("Arabic sub") are left
   out: the player wants HLS, and the menu is for audio languages. */
const BINGR_REF = "https://bingr.one/";
const BINGR = [["s40", "Aphelion"], ["s70", "Polaris"], ["s80", "Moscow"], ["s81", "Novo"],
  ["s62", "Bastion"], ["s30", "Nova"], ["s61", "Corvus"], ["s31", "Orion"]];
const bingr = (o, srv, name) => async () => {
  if (!o.backendUrl || !o.title) return null;
  const tv = o.type === "tv";
  const qs = new URLSearchParams({ srv, t: tv ? "tv" : "movie", id: String(o.tmdbId), title: o.title, year: o.year || "",
    ...(tv ? { season: String(o.season), episode: String(o.episode) } : {}) });
  const d = await getJson(`${o.backendUrl}/api/bingr/stream?${qs}`, 45000);
  const out = (d?.sources || []).filter((x) => !x.isMP4 && !/\bsub\b/i.test(x.language || "")).map((x) => {
    // "Hindi" / "1080p", or Corvus's language "Original" with quality "720p | English"
    const [qPart, qLang] = String(x.quality || "").split("|").map((t) => t.trim());
    const lang = String(x.language || "").replace(/^original$/i, "").trim() || qLang || "";
    const q = qPart && !/^auto$/i.test(qPart) ? qPart : "";
    return { url: x.url, ref: BINGR_REF, name: `${name} • ${[lang, q].filter(Boolean).join(" ") || "Auto"}` };
  });
  return out.length ? out : null;
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

/* India4Movies, second after MoviBox: a regional film is often there, and
   many of its posts are multi-audio ("Hindi + Multi Audio", "Hindi (ORG) +
   Tamil"). Each language is otherwise its own post. Newer posts' files play
   off MultiCloudLinks' CDN (/api/i4m/play?v=); older ones (2024 and before)
   from their HubCloud copy (/api/i4m/play?url=) — both found at play time,
   since the links last hours. Only x264 + AAC (the backend marks them); the
   post's own "Watch Online" file first, then its other qualities. Named
   "India4Movies • Kannada 720p · HDTC", so the player offers each language;
   a multi-audio file offers every language inside it, through the relay
   (see mkvLanguages), and the title's own language is named "(original)".

   A series is posted a season at a time, each quality a list of episodes
   with a file each: the episode picked is taken from every quality's list
   of the post for its season. */
const I4M_CAM = /HDTC|HDTS|HDCAM|CAMRip|PreDVD|Pre-?HD|DVDScr/i;
const india4movies = (o) => async () => {
  if (!o.backendUrl || !o.title || !MKV_OK()) return null;   // MKV: not on Safari/iPhone
  const tv = o.type === "tv";
  const qs = new URLSearchParams({ q: o.title, year: o.year || "", ...(tv ? { type: "tv" } : {}) });
  // A season's lists are read one page at a time the first time it is asked.
  const d = await getJson(`${o.backendUrl}/api/i4m/files?${qs}`, tv ? 45000 : 30000);
  const ep = Number(o.episode) || 1;
  const posts = (d?.posts || []).filter((p) => !tv || (p.season || 1) === (Number(o.season) || 1))
    // Clean prints first: a WEB-DL post, then the cam print it replaced.
    .sort((a, b) => Number(I4M_CAM.test(a.print)) - Number(I4M_CAM.test(b.print)));
  const out = [], seen = new Set(), multi = [];
  const orig = MKV_LANG[String(o.original || "").toLowerCase()] || "";
  for (const p of posts) {
    const lang = String(p.lang || "").split(/\s*[+&,]\s*/)[0].replace(/\s*\(.*$/, "") || "Original";
    const isMulti = /[+&,]|multi/i.test(p.lang || "");
    let files, watch;
    if (tv) {
      watch = (p.watchEpisodes || []).find((x) => x.ep === ep)?.code || "";
      files = p.files.filter((f) => f.playable && f.code)
        .map((f) => ({ quality: f.quality, code: (f.episodes || []).find((x) => x.ep === ep)?.code || "" }))
        .filter((f) => f.code);
    } else {
      watch = p.watch;
      files = p.files.filter((f) => f.playable);
    }
    files.sort((a, b) => Number(b.code === watch) - Number(a.code === watch));
    if (watch && !files.some((f) => f.code === watch)) files.unshift({ code: watch, quality: "720p" });
    for (const f of files) {
      const id = f.code || f.hub;
      const k = `${lang}|${f.quality}`;
      if (seen.has(k) || seen.has(id)) continue;
      seen.add(k); seen.add(id);
      const url = f.code ? `${o.backendUrl}/api/i4m/play?v=${encodeURIComponent(f.code)}`
        : `${o.backendUrl}/api/i4m/play?url=${encodeURIComponent(f.hub)}`;
      const entry = { name: `India4Movies • ${lang} ${f.quality || ""}${lang === orig ? " (original)" : ""}${p.print ? ` · ${p.print}` : ""}`.replace(/\s+/g, " "),
        url, own: true, file: true, lang, print: p.print };
      // A multi-audio file is opened below, for every language in it.
      if (isMulti && RELAY && multi.length < 4) multi.push({ entry, quality: f.quality || "" });
      else out.push(entry);
    }
  }
  /* Each multi-audio file: its real tracks, a choice per language. If the
     relay cannot read one, it still plays its first language as listed. */
  const opened = await Promise.all(multi.map((m) => mkvLanguages(m.entry.url, "India4Movies", m.quality, { original: o.original, min: 1 }).catch(() => null)));
  multi.forEach((m, i) => {
    const langs = opened[i];
    if (!langs) { out.push(m.entry); return; }
    for (const c of langs) out.push({ ...c, name: `${c.name}${m.entry.print ? ` · ${m.entry.print}` : ""}`, own: true, file: true });
  });
  // The title's own language first, then the order the posts came in.
  out.sort((a, b) => Number(b.lang === orig) - Number(a.lang === orig));
  return out.length ? out : null;
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
  moviboxHls(o),               // MoviBox, all languages in one stream, straight off its CDN
  /* Then India4Movies, then HDHub4u — multi-audio MKVs, a choice per
     language. Capped, so a slow one cannot hold back every source after it
     (they are taken in this order). */
  () => withTimeout(india4movies(o)(), 25000),
  () => withTimeout(hdhub4u(o)(), 20000),
  singularity(o),
  ...BINGR.map(([srv, name]) => bingr(o, srv, name)),   // bingr's direct servers
  scrape("Bastion", o),        // FilmU's, after those
  scrape("RiveStream", o),     // Citadel · Zephyr · PrimeVids · Vanguard
  scrape("MeowTV", o),         // FilmU Hindi
  scrape("VidRock", o),        // Nova · Orion
  // When none of the above has it: 1TamilMV's language posts.
  async () => {
    if (!o.backendUrl || !MKV_OK()) return null;           // MKV: not on Safari/iPhone
    const { out } = await tamilmvFiles(o);
    return out.length ? out.map((c) => ({ ...c, own: true, file: true })) : null;
  },
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
export async function* tmdbStreams({ tmdbId, imdbId = "", type = "movie", season = 1, episode = 1, title = "", year = "", original = "", backendUrl }) {
  const seen = new Set();
  const o = { tmdbId, imdbId: /^tt\d+$/.test(imdbId || "") ? imdbId : "", type, season, episode, title, year: String(year || "").slice(0, 4), original, backendUrl };
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
      .map((c) => ({ name: c.name, file: c.file, score: c.score, url: c.own ? c.url : viaWorker(c.url, { ref: c.ref, ua: c.ua }) }));
    // A plain file has no manifest to read; it keeps its provider's order.
    // A provider may rank its own (MoviBox puts its MP4 dubs after its multi-audio stream).
    const scored = await Promise.all(fresh.map(async (c, i) => ({ ...c, score: c.score ?? (c.file ? 100 - i : await manifestScore(c.url)) })));
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
/* ── A multi-audio MKV, one choice per language ─────────────────────────
   A browser plays an MKV's first audio track and nothing else. The download
   relay can serve the same file with any one of its tracks as the only audio
   (?a=k — it edits a byte per track in the header, nothing is converted), so
   a five-language file becomes five choices in the player's language menu,
   named "<label> • Tamil 720p", and a switch carries on from the same second.
   null when the file has fewer than two named languages, or no relay is set. */
const MKV_LANG = { hi: "Hindi", hin: "Hindi", te: "Telugu", tel: "Telugu", ta: "Tamil", tam: "Tamil",
  ml: "Malayalam", mal: "Malayalam", kn: "Kannada", kan: "Kannada", en: "English", eng: "English",
  bn: "Bengali", ben: "Bengali", mr: "Marathi", mar: "Marathi", pa: "Punjabi", pan: "Punjabi",
  gu: "Gujarati", guj: "Gujarati", ur: "Urdu", urd: "Urdu", or: "Odia", ori: "Odia", ory: "Odia" };
export const isMkvLink = (u) => { try { return /\.mkv$/i.test(new URL(u).pathname); } catch { return false; } };
/* What a browser decodes. A file's Dolby (AC3 / E-AC3 / TrueHD) or DTS
   tracks play silent — 1TamilMV's Moana 1080p carries its Tamil, Telugu and
   Hindi as E-AC3 and only its English as AAC — so those are not offered; and
   HEVC video plays on few devices, so such a file is skipped altogether. */
const PLAYABLE_AUDIO = /^A_(AAC|OPUS|VORBIS|MPEG\/L3|FLAC)/i;
/* opts: quality ("720p", else read from the link), original (the title's
   ISO 639-1 language, e.g. "ta" — that track is named "(original)" and
   listed first, as MoviBox's are), min (fewest languages worth listing). */
export async function mkvLanguages(link, label = "AnchorHD", quality = "", { original = "", min = 2 } = {}) {
  if (!RELAY || !link) return null;
  const d = await getJson(`${RELAY}?u=${encodeURIComponent(link)}&play=1&tracks=1`, 20000).catch(() => null);
  if ((d?.video || []).some((c) => /HEVC|MPEGH|V_AV1/i.test(c))) return null;
  const q = quality || (decodeURIComponent(link).match(/\b(2160|1080|720|576|480)p\b/i) || [])[0] || "";
  const orig = MKV_LANG[String(original || "").toLowerCase()] || "";
  const seen = new Set();
  const out = (d?.audio || []).map((t) => {
    if (!PLAYABLE_AUDIO.test(t.codec || "")) return null;
    const lang = MKV_LANG[String(t.lang || "").toLowerCase().split("-")[0]];
    if (!lang || seen.has(lang)) return null;
    seen.add(lang);
    return { name: `${label} • ${lang}${q ? ` ${q}` : ""}${lang === orig ? " (original)" : ""}`,
      url: `${RELAY}?u=${encodeURIComponent(link)}&play=1&a=${t.a}`, lang, original: lang === orig };
  }).filter(Boolean).sort((a, b) => Number(b.original) - Number(a.original));
  return out.length >= min ? out : null;
}

/* HDHub4u's files, in AnchorHD after MoviBox: its posts are one MKV per
   quality with every language inside ("418 (2026) [Hindi-Telugu-Tamil-
   Malay-Kannada]"), so each file becomes a choice per language through the
   relay. /api/hdhub/play finds the file's current link on its file servers
   each time it is opened. x264 only — HEVC and remux labels are left out
   before anything is asked, and the track list has the last word. */
/* 720p first: half 1080p's bitrate, so it keeps ahead on a file server
   having a slow minute. 1080p is still in the quality menu. */
const HD_RANK = { "720p": 4, "1080p": 3, "540p": 2, "480p": 1 };
const hdhub4u = (o) => async () => {
  if (!o.backendUrl || !RELAY || !o.title || o.type === "tv" || !MKV_OK()) return null;
  const qs = new URLSearchParams({ q: o.title, year: o.year || "", ...(o.imdbId ? { imdb: o.imdbId } : {}) });
  const d = await getJson(`${o.backendUrl}/api/hdhub/files?${qs}`, 30000);
  const files = (d?.files || [])
    .filter((f) => !f.series && f.links?.[0]?.url && !/HEVC|x265|10\s*bit|HQ-?Rip|REMUX|\b4K\b|2160p/i.test(f.label || ""))
    .sort((a, b) => (HD_RANK[b.quality] || 0) - (HD_RANK[a.quality] || 0))
    .slice(0, 3);
  const lists = await Promise.all(files.map((f) => mkvLanguages(
    `${o.backendUrl}/api/hdhub/play?link=${encodeURIComponent(f.links[0].url)}`, "HDHub4u", f.quality || "",
    { original: o.original, min: 1 }).catch(() => null)));
  const out = lists.flatMap((l) => l || []);
  return out.length ? out.map((c) => ({ ...c, own: true, file: true })) : null;
};

const MKV_OK = () => {
  try { return !!document.createElement("video").canPlayType('video/x-matroska; codecs="avc1.64001f, mp4a.40.2"'); }
  catch { return false; }
};
export const canPlayMkv = MKV_OK;

const I4M_WAIT = 8000;
/* 1TamilMV's playable files for a title (or the one episode picked), one
   per language and quality: { out: [{ name, url, lang }], covered } —
   covered being the languages it has. Shared by AnchorTMV and AnchorHD. */
async function tamilmvFiles({ tmdbId, type = "movie", season = 1, episode = 1, title = "", year = "", original = "", backendUrl }) {
  const { releaseLabel } = await import("../components/TamilmvDownloads.jsx");
  const qs = new URLSearchParams({ tmdb: `${type === "tv" ? "tv" : "movie"}:${tmdbId}`, title: title || "", year: String(year || "") });
  const d = await getJson(`${backendUrl}/api/fresh/files?${qs}`, 60000).catch(() => null);
  const playable = (n) => /\b(x264|AVC|H\.?264)\b/i.test(n) && !/\b(HEVC|x265|H\.?265|10\s*bit)\b/i.test(n)
    && /\bAAC\b/i.test(n) && !/\bDD\+?|\bAC-?3\b|ATMOS|\bDTS\b|EAC3|E-AC-3/i.test(n);
  const CAM = /PreDVD|PreHD|HDTC|HDTS|HDCAM|DVDScr/i;
  const rank = { "2160p": 4, "1080p": 3, "720p": 2, "480p": 1 };
  /* A multi-language file's name often leaves its audio out ("[Tam + Tel +
     Hin] - HQ Clean"); its real track list is read below, so only its video
     is judged by name. */
  const videoOk = (n) => /\b(x264|AVC|H\.?264)\b/i.test(n) && !/\b(HEVC|x265|H\.?265|10\s*bit)\b/i.test(n);
  const multiName = (n) => /\[[^\]]*\+[^\]]*\]/.test(n);
  const files = (d?.files || []).filter((f) => f.direct && (playable(f.name) || (RELAY && multiName(f.name) && videoOk(f.name)))).map((f) => {
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
      url: `${backendUrl}/api/fresh/play?key=${encodeURIComponent(x.f.direct)}`, lang });
  };
  files.filter((x) => x.l.langs.length === 1).forEach((x) => take(x, x.l.langs[0]));
  /* A multi-language file: each of its languages no single file covers, as
     its own choice — the relay serves it with that track as the audio. Its
     real track list decides, not the release name. If the relay cannot read
     it, the file still plays its first language, as before. */
  const multi = files.filter((x) => x.l.langs.length > 1 && x.l.langs.some((l) => !covered.has(l))).slice(0, 4);
  const expanded = await Promise.all(multi.map((x) => mkvLanguages(
    `${backendUrl}/api/fresh/play?key=${encodeURIComponent(x.f.direct)}`, "1TamilMV", x.f.quality || "", { original, min: 1 }).catch(() => null)));
  multi.forEach((x, i) => {
    const langs = expanded[i];
    if (!langs) { if (!covered.has(x.l.langs[0]) && playable(x.f.name)) take(x, x.l.langs[0]); return; }
    for (const c of langs) {
      if (CAM.test(x.l.print) && cleanLangs.has(c.lang)) continue;
      const k = `${c.lang}|${x.f.quality || "480p"}`;
      if (seen.has(k)) continue;
      seen.add(k); covered.add(c.lang);
      out.push({ ...c, name: `${c.name}${x.l.print ? ` · ${x.l.print}` : ""}` });
    }
  });
  return { out, covered };
}

export async function* tamilmvStreams({ tmdbId, type = "movie", season = 1, episode = 1, title = "", year = "", original = "", backendUrl }) {
  if (!backendUrl || !MKV_OK()) return;
  // India4Movies' language posts are asked beside, for a language 1TamilMV lacks.
  const i4m = india4movies({ type, season, episode, backendUrl, title, year: String(year || "").slice(0, 4) })().catch(() => null);
  const { out, covered } = await tamilmvFiles({ tmdbId, type, season, episode, title, year, original, backendUrl });
  /* Then India4Movies, for a language 1TamilMV does not have at all: every
     quality of it, in the same player. Waited for (a while) before anything
     plays, so the language bar the player shows on start, and the saved
     language it starts in, include them. Later than that, they still reach
     the Audio menu when they come. */
  const extra = (c) => !covered.has(c.lang);
  const early = await withTimeout(i4m, I4M_WAIT);
  // The title's own language first (the first single-language one listed), then the rest.
  for (const c of out) yield c;
  for (const c of (early || (await i4m) || []).filter(extra)) yield { name: c.name, url: c.url };
}
