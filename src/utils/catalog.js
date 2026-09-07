/* ===================================================================
   The catalogue, assembled once and shared.

   A title lives in two tables. `movies` is the canonical catalogue entry —
   it carries the language, the sub-categories and the download links, and
   its slug is the long release name. `watch_html` is the streaming side,
   under a short clean slug, and it carries the artwork worth showing: the
   landscape cover, the title logo, the rating, the genres.

   The two do NOT share a slug. "Kantara (2022) TRUE WEB-DL - [4K…]" in
   movies is plain "kantara" in watch_html, which is why linking a catalogue
   card straight to /watch/<movies.slug> lands on Content Not Found. They
   pair by slug first and by title second — the same order the watch page
   itself uses — and about a quarter of the catalogue is download-only with
   no streaming row at all, so `streamable` has to be checked, never assumed.
=================================================================== */
import { supabase } from "./supabaseClient";

/* PostgREST caps a request at 1000 rows by default. `movies` is already at
   978, so a plain select is one upload away from silently dropping titles
   off the end of every catalogue page. Read it in pages instead. */
const PAGE = 1000;

const fetchAll = async (table, columns) => {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
};

const norm = (s) => (s || "").trim().toLowerCase();

/* Catalogue titles are release names — "Kantara (2022) TRUE WEB-DL - [4K,
   1080p & 720p - HEVC…]". Everything from the first bracket or the first
   " - " onward is encoding detail, useless as a search term. */
export const cleanTitle = (title) => {
  const t = (title || "").split(/\s*[([]|\s+-\s+/)[0].trim();
  return t || (title || "").trim();
};

const asArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
};

/* One stored download option. `url` holds either a magnet or an http link
   depending on the upload, and `directUrl` is the mirror — so both have to be
   sniffed rather than trusted by field name. */
const normDownloads = (raw) => asArray(raw).map((d, i) => {
  const url = (d.url || "").trim();
  const isMagnet = /^magnet:/i.test(url);
  return {
    id: d.id || `dl-${i}`,
    label: (d.quality || "").trim() || `Option ${i + 1}`,
    size: (d.size || "").trim() || null,
    magnet: isMagnet ? url : null,
    direct: (d.directUrl || "").trim() || (!isMagnet && /^https?:/i.test(url) ? url : null),
    gpLink: (d.gpLink || "").trim() || null,
  };
}).filter((d) => d.magnet || d.direct || d.gpLink);

const MOVIE_COLS = "id,slug,title,poster,language,categories,subCategory,description,created_at,downloads,watchUrl,download_page_url";
const WATCH_COLS = "slug,title,poster,cover_poster,title_logo,genres,imdb_rating,content_type,created_at,episodes,download_links,hls_url,video_url,html_code";

const buildCatalog = async () => {
  const [movies, watch] = await Promise.all([
    fetchAll("movies", MOVIE_COLS),
    fetchAll("watch_html", WATCH_COLS),
  ]);

  const bySlug = new Map();
  const byTitle = new Map();
  watch.forEach((w) => {
    bySlug.set(w.slug, w);
    const t = norm(w.title);
    if (t && !byTitle.has(t)) byTitle.set(t, w);   // first (newest) wins
  });

  return movies.map((m) => {
    const w = bySlug.get(m.slug) || byTitle.get(norm(m.title)) || null;
    const createdAt = new Date(m.created_at || w?.created_at || 0);
    const streamable = !!(w && (w.hls_url || w.video_url || w.html_code ||
      (Array.isArray(w.episodes) && w.episodes.length)));
    const downloads = normDownloads(m.downloads);
    return {
      key: m.id || m.slug,
      title: m.title || w?.title || m.slug,
      cleanTitle: cleanTitle(m.title || w?.title || m.slug),
      /* Where a card should go. watchSlug is the streaming page; movieSlug is
         the download page, which is all a download-only title has. */
      watchSlug: streamable ? w.slug : null,
      movieSlug: m.slug,
      streamable,
      downloads,
      downloadPageUrl: m.download_page_url || null,
      downloadable: downloads.length > 0 || !!m.download_page_url,
      poster: w?.poster || m.poster || "/default-poster.jpg",
      cover: w?.cover_poster || w?.poster || m.poster || "/default-cover.jpg",
      titleLogo: w?.title_logo || null,
      language: asArray(m.language),
      categories: asArray(m.categories),
      subCategory: asArray(m.subCategory),
      genres: asArray(w?.genres || m.categories),
      imdbRating: w?.imdb_rating != null ? Number(w.imdb_rating).toFixed(1) : null,
      contentType: w?.content_type || "movie",
      description: m.description || "",
      createdAt,
      createdAtMs: createdAt.getTime(),
    };
  }).sort((a, b) => b.createdAtMs - a.createdAtMs);
};

/* One in-flight fetch shared by every page that asks, so moving between
   Latest and a language page doesn't re-read ~1700 rows. Short-lived: a page
   opened a few minutes later picks up anything uploaded since. */
const TTL_MS = 3 * 60 * 1000;
let cached = null;      // { at, promise }

export const loadCatalog = ({ force = false } = {}) => {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.promise;
  const promise = buildCatalog().catch((err) => {
    cached = null;      // a failed load must not be served to the next caller
    throw err;
  });
  cached = { at: Date.now(), promise };
  return promise;
};

export const invalidateCatalog = () => { cached = null; };

/* ── Grouping helper for the Latest page ── */
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export const groupByDay = (entries, now = new Date()) => {
  const today = dayKey(now);
  const yest = dayKey(new Date(now.getTime() - 86400000));
  const groups = [];
  const index = new Map();
  entries.forEach((e) => {
    const k = dayKey(e.createdAt);
    let label;
    if (k === today) label = "Today";
    else if (k === yest) label = "Yesterday";
    else label = e.createdAt.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    if (!index.has(k)) { index.set(k, { key: k, label, items: [] }); groups.push(index.get(k)); }
    index.get(k).items.push(e);
  });
  return groups;
};
