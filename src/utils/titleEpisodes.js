import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";

/* Shared title/episode resolution for the detail overlays (mobile sheet and
   desktop card). Resolves a TMDB id for the title — by id, else by a TV-first
   title search — then pulls every season's episodes with their stills and
   attaches our own uploaded streams to the ones we host. */

// Turn a raw release name into a clean display title, e.g.
// "MUSAFIR CAFE (2026) S01 EP (01-08) TRUE WEB-DL - [1080P...] - ESUB" → "Musafir Cafe".
export const cleanTitle = (t = "") => {
  if (!t) return "";
  let s = t.split(/\s*[([]?\s*(?:19|20)\d{2}/)[0];
  s = s.split(/\s+(?:S\d{1,2}|Season|EP\d|Complete|WEB[\s-]?DL|HDRip|BluRay|1080p|720p|480p|2160p)/i)[0];
  s = s.replace(/[\s\-_.|]+$/g, "").trim();
  return s || t;
};

// Uploaded episode rows keep season as a string ("1"), TMDB as a number — always
// compare numbers so season tabs and the position match never miss.
export const epNo = (e) => Number(e?.episodeNumberInSeason || e?.episode || 1);
export const seasonNo = (e) => Number(e?.season || e?.season_number || 1) || 1;
export const epStill = (e) => e?.thumbnail || e?.still_path || e?.still || null;
export const hasStream = (e) => !!(e?.html || e?.html_code || e?.direct_url || e?.hls_url);

export const langList = (l) => (Array.isArray(l) ? l.filter(Boolean) : l ? [String(l)] : []);
export const langLabel = (l) => {
  const list = langList(l);
  if (!list.length) return "";
  return list.length > 1 ? `${list.length} Languages` : list[0];
};

export const airDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const normalize = (s = "") => s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");

/* Uploaded rows carry a season but usually no episode number, and the same
   episode can appear twice in an upload — number them by position inside their
   season and drop repeats so the list never shows "S3 E1" four times. */
function numberLocal(eps) {
  const pos = {}, seen = new Set(), out = [];
  eps.forEach(ep => {
    const s = seasonNo(ep);
    const explicit = ep.episodeNumberInSeason ?? ep.episode ?? null;
    pos[s] = (pos[s] || 0) + 1;
    const n = Number(explicit) || pos[s];
    const key = `${s}__${n}__${normalize(ep.title || "")}`;
    if (seen.has(key)) { pos[s] -= 1; return; }
    seen.add(key);
    out.push({ ...ep, season: s, episodeNumberInSeason: n });
  });
  return out;
}

/** Drop repeats of the same season+episode (keeps the first, richest entry). */
function dedupe(eps) {
  const seen = new Set();
  return eps.filter(e => {
    const key = `${seasonNo(e)}__${epNo(e)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* Every season/episode TMDB knows about is listed. Where one of our uploads
   matches — by position inside the season first, then by normalized title — its
   stream is attached so that episode plays from our own HLS; the rest play
   through the servers. */
function attachLocal(tmdbEps, local) {
  const byPos = {}, byTitle = {}, pos = {};
  local.forEach(ep => {
    const s = seasonNo(ep);
    const explicit = ep.episodeNumberInSeason ?? ep.episode ?? null;
    pos[s] = (pos[s] || 0) + 1;
    byPos[`${s}__${Number(explicit) || pos[s]}`] = ep;
    if (ep.title) byTitle[`${s}__${normalize(ep.title)}`] = ep;
  });

  return tmdbEps.map(t => {
    const m = byPos[`${seasonNo(t)}__${epNo(t)}`]
      || byTitle[`${seasonNo(t)}__${normalize(t.title || t.name)}`] || null;
    if (!m) return t;
    return {
      ...t,
      html:       m.html || m.html_code || null,
      html_code:  m.html || m.html_code || null,
      direct_url: m.direct_url || null,
      hls_url:    m.hls_url || null,
      hasStream:  hasStream(m),
    };
  });
}

/**
 * Resolve a title's TMDB detail + full episode list.
 * @returns {{ episodes, seasons, tmdbExtra, loading }}
 */
export function useTitleEpisodes(movie) {
  const { backendUrl } = useContext(AppContext);
  const [episodes, setEpisodes] = useState([]);
  const [tmdbExtra, setTmdbExtra] = useState(null);
  const [trailerMp4, setTrailerMp4] = useState(null);   // clean, chrome-free trailer
  const [loading, setLoading] = useState(false);

  const slug = movie?.slug;
  const nfTriedRef = useRef("");     // one Netflix lookup per title

  useEffect(() => {
    const local = numberLocal(Array.isArray(movie?.episodes) ? movie.episodes : []);
    setEpisodes(local);
    setTmdbExtra(null);
    nfTriedRef.current = "";        // new title → allow one trailer lookup again
    if (!movie || !backendUrl) return;

    const looksTV = movie.content_type === "tv" || local.length > 0;
    let alive = true;

    (async () => {
      let tmdbId = movie.tmdb_id || null;
      let imdbId = movie.imdb_id || null;
      const title = cleanTitle(movie.title) || movie.slug;
      setLoading(looksTV);

      const get = async (path, params) => {
        try {
          const { data } = await axios.get(`${backendUrl}/api/${path}`, { params });
          return data?.success ? data : null;
        } catch { return null; }
      };

      try {
        /* 1 ── Make sure we have an id, and for a series make sure it's a TV id:
              a multi-search can hand back a same-named film, whose id then has
              no seasons at all. */
        if (!tmdbId && !imdbId && title) {
          if (looksTV) {
            const s = await get("tmdb-search", { query: title, type: "tv" });
            const hits = s?.results || [];
            const pick = (movie.year && hits.find(h => String(h.year) === String(movie.year))) || hits[0];
            if (pick) tmdbId = pick.tmdb_id || pick.id;
          }
          if (!tmdbId) {
            const d = await get("tmdb-details", { title });
            if (d?.data) { tmdbId = d.data.tmdb_id || null; imdbId = d.data.imdb_id || null; }
          }
        }
        if (!alive || (!tmdbId && !imdbId)) return;

        /* 2 ── Full detail — IMDb rating, certification, genres, logo, backdrop,
              trailer, plus a season-by-season episode list. */
        const detail = await get("tmdb-details", {
          ...(tmdbId ? { tmdbId: String(tmdbId) } : { imdbId }),
          ...(looksTV ? { contentType: "tv" } : {}),
        });
        if (!alive) return;
        if (detail?.data) {
          setTmdbExtra(detail.data);
          tmdbId = tmdbId || detail.data.tmdb_id;
          imdbId = imdbId || detail.data.imdb_id;
        }

        if (!looksTV && detail?.data?.content_type !== "tv") return;

        /* 3 ── Episode list with the per-episode stills. */
        const epsRes = await get("tmdb-episodes", tmdbId ? { tmdbId: String(tmdbId) } : { imdbId });
        if (!alive) return;

        const tmdbEps = (epsRes?.episodes?.length ? epsRes.episodes : detail?.data?.episodes || [])
          .map(e => ({ ...e, season: seasonNo(e), episodeNumberInSeason: epNo(e), thumbnail: epStill(e) }));
        if (!tmdbEps.length) return;

        setEpisodes(dedupe(attachLocal(tmdbEps, local)));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
    // Re-runs only when the title (or its ids) change — not on every enrichment
    // re-render of the same movie object.
  }, [slug, movie?.tmdb_id, movie?.imdb_id, movie?.content_type, backendUrl]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* A bare MP4 trailer plays in a <video> with no player chrome at all — no
     YouTube branding, end screens or hover controls. Netflix publishes one on
     each public title page; we resolve it on demand because the URL carries a
     ~12h token. The id comes from netflix_id on the row when present, otherwise
     the backend derives it (TMDB imdb_id → Wikidata P1874). YouTube comes first
     whenever TMDB has a trailer_key — this only fills the gap for titles with no
     YouTube trailer, so nothing ever waits on the lookup. */
  useEffect(() => {
    // `movie` is null whenever the overlay is closed, and tmdbExtra can still
    // hold the previous title for a render — so check the movie itself, not just
    // the ids derived from it.
    if (!movie || !backendUrl) return;
    // A YouTube trailer wins: it's permanent, needs no lookup and no token — so
    // don't even ask about Netflix. The MP4 only fills the gap when YouTube has
    // nothing for this title.
    if (movie.trailer_key || tmdbExtra?.trailer_key) return;
    const nfId = movie.netflix_id || movie.netflixId || null;
    const tmdbId = movie.tmdb_id || tmdbExtra?.tmdb_id || null;
    if (!nfId && !tmdbId) return;

    // One attempt per title. The effect re-runs when the TMDB detail lands (and
    // twice more under StrictMode), and this stops that becoming 3 requests.
    const key = String(nfId || tmdbId);
    if (nfTriedRef.current === key) return;
    nfTriedRef.current = key;
    setTrailerMp4(null);
    let alive = true;

    axios.get(`${backendUrl}/api/netflix/trailer`, {
      params: {
        ...(nfId ? { netflixId: nfId } : { tmdbId, contentType: movie.content_type === "tv" ? "tv" : "movie" }),
        title: cleanTitle(movie.title || "") || "",
      },
      timeout: 8000,
    })
      .then(r => { if (alive && r.data?.success && r.data.url) setTrailerMp4(r.data.url); })
      .catch(() => { /* network hiccup → the YouTube trailer plays instead */ })
      ;
    return () => { alive = false; };
  }, [movie?.netflix_id, movie?.netflixId, movie?.tmdb_id, movie?.trailer_key,
      tmdbExtra?.tmdb_id, tmdbExtra?.trailer_key, slug, backendUrl]);   // eslint-disable-line react-hooks/exhaustive-deps

  const seasons = useMemo(
    () => Array.from(new Set(episodes.map(seasonNo))).sort((a, b) => a - b),
    [episodes]
  );

  return { episodes, seasons, tmdbExtra, trailerMp4, loading };
}
