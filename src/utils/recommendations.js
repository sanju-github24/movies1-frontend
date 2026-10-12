import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { readContinueList, isFinished } from "./continueWatching";

/* Slugs the viewer has already finished — never recommend one of those back.
   Read once per call rather than per candidate. */
const finishedSlugs = () => {
  try { return new Set(readContinueList().filter(isFinished).map((r) => r.slug)); }
  catch { return new Set(); }
};
const ratingOf = (m) => parseFloat(m?.imdbRating ?? m?.imdb_rating ?? 0) || 0;

/* Recommendations for the detail overlays.
   Two sources, one list:
     1. OUR library (Supabase) — scored on shared genres, plus language and
        content-type affinity. These come first: they're the titles we can
        actually stream from our own CDN.
     2. TMDB — its own recommendations/similar for the title, topped up by a
        genre discover pass, so a title is never left with an empty row. */

const LANG_CODE = {
  hindi: "hi", tamil: "ta", telugu: "te", kannada: "kn", malayalam: "ml",
  bengali: "bn", marathi: "mr", punjabi: "pa", gujarati: "gu", urdu: "ur", english: "en",
};

const asList = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [String(v)] : []);
const norm = (s) => String(s || "").trim().toLowerCase();

/** Every genre name we know for a title, from our row and from TMDB. */
export const genresOf = (m, tmdbExtra) => {
  const all = [
    ...asList(m?.tmdb_genres),
    ...asList(m?.genres),
    ...asList(m?.categories),
    ...asList(tmdbExtra?.genres),
  ].map((g) => (typeof g === "object" ? g.name : g)).filter(Boolean);
  return Array.from(new Set(all.map((g) => String(g).trim())));
};

/**
 * Rank titles from our own library against `movie`.
 * Shared genres dominate; language and type break ties. Anything with no
 * overlap at all is dropped, so the row stays relevant.
 */
export function localRecommendations(movie, pool = [], tmdbExtra = null, limit = 12) {
  if (!movie) return [];
  const wantGenres = new Set(genresOf(movie, tmdbExtra).map(norm));
  const wantLangs = new Set(asList(movie.language).map(norm));
  const wantType = movie.content_type || null;
  const done = finishedSlugs();

  return pool
    .filter((m) => m && m.slug !== movie.slug && m.id !== movie.id && !done.has(m.slug))
    .map((m) => {
      const shared = genresOf(m).filter((g) => wantGenres.has(norm(g))).length;
      const sameLang = asList(m.language).some((l) => wantLangs.has(norm(l)));
      const sameType = wantType && m.content_type === wantType;
      /* Shared genre is the signal that matters most. Language is nearly as
         strong — someone watching a Kannada film mostly wants more Kannada —
         so it is weighted like a genre. Type is a light nudge, and the IMDb
         rating only breaks ties between otherwise equal titles (a 9.0 adds
         ~1.3, less than a single shared genre), so the better of two similar
         titles surfaces without rating alone deciding the row. */
      const score = shared * 3 + (sameLang ? 3 : 0) + (sameType ? 1 : 0) + ratingOf(m) * 0.15;
      return { m, score, shared };
    })
    .filter((r) => r.shared > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({ ...r.m, recSource: "library" }));
}

/** A TMDB list item → the movie shape the overlays and WatchPage expect. */
const fromTmdb = (t) => {
  const title = t.title || t.name || "";
  const genres = (t.genres || []).map((g) => (typeof g === "object" ? g.name : g));
  return {
    id: `tmdb_${t.tmdb_id || t.id}`,
    tmdb_id: t.tmdb_id || t.id,
    slug: t.slug || String(t.tmdb_id || t.id),
    title,
    source: "tmdb",
    recSource: "tmdb",
    content_type: t.content_type || "movie",
    poster: t.poster_url || "/default-poster.jpg",
    cover_poster: t.cover_poster_url || t.poster_url || "",
    title_logo: t.title_logo || null,
    description: t.description || "",
    year: t.year || null,
    imdbRating: t.imdb_rating || null,
    language: [t.language_display || t.original_language || ""].filter(Boolean),
    genres,
    tmdb_genres: genres,
    trailer_key: t.trailer_key || null,
  };
};

/**
 * Merged recommendations for a title.
 * @param movie      the title being shown
 * @param pool       our library (Supabase rows) to rank against
 * @param tmdbExtra  the TMDB detail already resolved by useTitleEpisodes
 */
export function useRecommendations(movie, pool = [], tmdbExtra = null, limit = 18) {
  const { backendUrl } = useContext(AppContext);
  const [tmdbRecs, setTmdbRecs] = useState([]);

  const local = useMemo(
    () => localRecommendations(movie, pool, tmdbExtra, Math.ceil(limit / 2)),
    [movie, pool, tmdbExtra, limit]
  );

  const tmdbId = movie?.tmdb_id || tmdbExtra?.tmdb_id || null;
  const genreKey = useMemo(() => genresOf(movie, tmdbExtra).join(","), [movie, tmdbExtra]);
  const contentType = movie?.content_type || tmdbExtra?.content_type || "movie";

  useEffect(() => {
    setTmdbRecs([]);
    if (!backendUrl || (!tmdbId && !genreKey)) return;
    let alive = true;

    const langName = norm(asList(movie?.language)[0]);
    axios.get(`${backendUrl}/api/tmdb-recommendations`, {
      params: {
        ...(tmdbId ? { tmdbId: String(tmdbId) } : {}),
        contentType,
        ...(genreKey ? { genres: genreKey } : {}),
        ...(LANG_CODE[langName] ? { lang: LANG_CODE[langName] } : {}),
        limit,
      },
    })
      .then((r) => { if (alive && r.data?.success) setTmdbRecs((r.data.results || []).map(fromTmdb)); })
      .catch(() => { /* the library row still renders on its own */ });

    return () => { alive = false; };
  }, [backendUrl, tmdbId, genreKey, contentType, limit]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Ours first (streamable), then TMDB — skipping anything already in the
  // library row and anything the viewer has already finished.
  return useMemo(() => {
    const done = finishedSlugs();
    const seen = new Set(local.map((m) => String(m.tmdb_id || m.slug)));
    const extra = tmdbRecs.filter((m) => {
      const key = String(m.tmdb_id || m.slug);
      if (seen.has(key) || done.has(m.slug)) return false;
      seen.add(key);
      return true;
    });
    return [...local, ...extra].slice(0, limit);
  }, [local, tmdbRecs, limit]);
}
