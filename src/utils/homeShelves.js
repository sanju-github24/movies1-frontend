/**
 * The home page's rows — "Latest uploads", "Best to watch", "Thrillers" and
 * the rest — worked out from the catalogue.
 *
 * The movies table carries languages, the release's category and its print
 * (WEB-DL, PreDVD …) but no genres or ratings; those live on watch_html, which
 * every homepage title links to by slug, by its watch URL, or failing both by
 * title. `enrichMovies` joins the two; `buildShelves` cuts the rows.
 */

const norm = (t) => String(t || "").toLowerCase().split("(")[0].replace(/[^a-z0-9]+/g, " ").trim();
const watchSlugOf = (m) => (String(m.watchUrl || "").match(/\/watch\/([^/?#]+)/) || [])[1] || null;
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// "8.0/10", "7.4", 7.4 → 7.4; anything unreadable → 0.
const ratingOf = (v) => {
  const n = parseFloat(String(v ?? "").split("/")[0]);
  return Number.isFinite(n) && n > 0 && n <= 10 ? n : 0;
};

/** movies + watch_html rows → movies with _genres, _rating, _trending, _ours. */
export function enrichMovies(movies, watchRows) {
  const bySlug = new Map(), byTitle = new Map();
  for (const w of watchRows || []) {
    if (w.slug) bySlug.set(w.slug, w);
    if (w.title && !byTitle.has(norm(w.title))) byTitle.set(norm(w.title), w);
  }
  return movies.map((m) => {
    const w = bySlug.get(m.slug) || bySlug.get(watchSlugOf(m)) || byTitle.get(norm(m.title)) || null;
    return {
      ...m,
      // A title known only from TMDB (see fetchFresh) brings its own.
      _genres: list(w?.genres ?? (m._fresh ? m.genres : null)).map((g) => (typeof g === "string" ? g : g?.name)).filter(Boolean),
      _rating: ratingOf(w?.imdb_rating ?? (m._fresh ? m.imdb_rating : null)),
      _trending: !!w?.is_trending,
      _ours: !!(w?.hls_url),
      _langs: list(m.language).map((l) => String(l).trim()).filter(Boolean),
      _print: list(m.subCategory).join(" ").toUpperCase(),
    };
  });
}

const CAM = /PRE-?DVD|PRE-?HD|HDTS|HDCAM|\bCAM\b|\bTS\b/;
const isClean = (m) => !CAM.test(m._print);
const hasGenre = (m, re) => m._genres.some((g) => re.test(g));
const hasLang = (m, lang) => m._langs.some((l) => l.toLowerCase() === lang.toLowerCase());
const cats = (m) => list(m.categories).join(" ");

const GENRE_ROWS = [
  { id: "thrillers", title: "Thrillers", subtitle: "Crime, mystery and edge-of-the-seat", re: /thriller|crime|mystery/i },
  { id: "action", title: "Action & adventure", re: /action|adventure|war/i },
  { id: "comedy", title: "Comedy", subtitle: "Something light", re: /comedy/i },
  { id: "romance", title: "Romance", re: /romance/i },
  { id: "horror", title: "Horror", subtitle: "Watch with the lights on", re: /horror/i },
  { id: "scifi", title: "Sci-fi & fantasy", re: /sci-?fi|science fiction|fantasy/i },
  { id: "family", title: "Family & animation", re: /family|animation|kids/i },
  { id: "drama", title: "Drama", re: /drama/i },
];

const LANG_ROWS = ["Kannada", "Tamil", "Telugu", "Malayalam", "Hindi"];

/**
 * Rows for the home page, best first.
 *   movies — homepage titles from enrichMovies, newest first
 *   prefLang — the viewer's audio language, if they ever chose one ("Kannada", "kan" …)
 * Returns [{ id, title, subtitle?, items }], each row at least MIN long.
 */
export function buildShelves(movies, { prefLang = "" } = {}) {
  const MIN = 6, MAX = 24;
  /* Already in upload order. Some titles were uploaded twice (two rows, one
     film); a row shows each once — the newest upload, which comes first. */
  const seenTitle = new Set();
  const newest = movies.filter((m) => {
    const k = norm(m.title);
    if (!k || seenTitle.has(k)) return !k;
    seenTitle.add(k);
    return true;
  });

  /* Variety. A good title qualifies for many rows — a highly rated Kannada
     thriller is "best", "thriller" and "Kannada" at once — and taking every
     row's top picks as they come puts the same ten posters at the front of
     each. So a row leads with titles no earlier row has put in its first
     few, and the ones already seen up front fall in behind them. */
  const upFront = new Map();   // id → how many rows show it in their first 8
  const fresh = (items) => {
    const a = [], b = [];
    for (const m of items) ((upFront.get(m.id) || 0) >= 1 ? b : a).push(m);
    const out = [...a, ...b].slice(0, MAX);
    out.slice(0, 8).forEach((m) => upFront.set(m.id, (upFront.get(m.id) || 0) + 1));
    return out;
  };

  const rows = [];
  const add = (row, items, { vary = true } = {}) => {
    if (items.length < MIN) return;
    rows.push({ ...row, items: vary ? fresh(items) : items.slice(0, MAX) });
  };

  // 1. Exactly the upload order — the hero's titles included.
  add({ id: "latest", title: "Latest uploads", subtitle: "Newest first" }, newest, { vary: false });
  newest.slice(0, 8).forEach((m) => upFront.set(m.id, 1));

  // 2. Trending: what the admin flagged, then the best-rated of the last few weeks.
  const recent = newest.slice(0, 120);
  const flagged = newest.filter((m) => m._trending);
  const hot = recent.filter((m) => !m._trending && m._rating >= 6.5 && isClean(m))
    .sort((a, b) => b._rating - a._rating);
  add({ id: "trending", title: "Trending now" }, [...flagged, ...hot]);

  /* 3. Best to watch: well rated and a clean print. A 10/10 is nearly always
     a handful of votes — there is no vote count to tell — so a near-perfect
     score is ranked as a good one rather than a great one, and a recent
     upload gets a small lift so the row does not freeze on old favourites. */
  const trusted = (r) => (r > 9.3 ? 7.5 : r);
  const best = newest
    .map((m, i) => ({ m, score: trusted(m._rating) + (i < 60 ? 0.4 : i < 150 ? 0.2 : 0) }))
    .filter(({ m }) => m._rating >= 7 && isClean(m))
    .sort((a, b) => b.score - a.score)
    .map(({ m }) => m);
  add({ id: "best", title: "Best to watch", subtitle: "Rated 7+ · clean prints" }, best);

  // 4. The viewer's own language, right after.
  const pref = LANG_ROWS.find((l) => {
    const p = String(prefLang || "").toLowerCase();
    return p && (l.toLowerCase() === p || l.toLowerCase().startsWith(p.slice(0, 3)));
  });
  if (pref) add({ id: `lang-${pref}`, title: `In ${pref}` }, newest.filter((m) => hasLang(m, pref)));

  // 5. Genres. Clean prints first — a thriller is better met in WEB-DL.
  const cleanFirst = (items) => [...items.filter(isClean), ...items.filter((m) => !isClean(m))];
  for (const g of GENRE_ROWS.slice(0, 5)) add(g, cleanFirst(newest.filter((m) => hasGenre(m, g.re))));

  // 6. Many audio languages in one file.
  add({ id: "multi", title: "Watch in your language", subtitle: "Three or more audio languages" },
    newest.filter((m) => m._langs.length >= 3 && isClean(m)));

  for (const g of GENRE_ROWS.slice(5)) add(g, cleanFirst(newest.filter((m) => hasGenre(m, g.re))));

  // 7. Languages, and Hollywood.
  for (const l of LANG_ROWS) if (l !== pref) add({ id: `lang-${l}`, title: `${l} movies` }, newest.filter((m) => hasLang(m, l)));
  add({ id: "hollywood", title: "Hollywood" },
    newest.filter((m) => /hollywood/i.test(cats(m)) || (m._langs.length === 1 && hasLang(m, "English"))));

  // 8. Theatre prints, under their own name rather than among the rest.
  add({ id: "theatre", title: "New in theatres", subtitle: "Early theatre prints" },
    newest.filter((m) => !isClean(m)), { vary: false });

  return rows;
}
