import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { cleanTitle } from "./cleanTitle";
import { useMp4Trailer } from "./useMp4Trailer";

// Re-exported: this module has long been where callers import it from.
export { cleanTitle };

/* Shared title/episode resolution for the detail overlays (mobile sheet and
   desktop card). Resolves a TMDB id for the title — by id, else by a TV-first
   title search — then pulls every season's episodes with their stills and
   attaches our own uploaded streams to the ones we host. */


// Uploaded episode rows keep season as a string ("1"), TMDB as a number — always
// compare numbers so season tabs and the position match never miss.
export const epNo = (e) => Number(e?.episodeNumberInSeason || e?.episode || 1);
export const seasonNo = (e) => Number(e?.season || e?.season_number || 1) || 1;
export const epStill = (e) => e?.thumbnail || e?.still_path || e?.still || null;
/* The newest episode held — highest number in the highest season. Distinct from
   the detail sheets' own `latestEpisode`, which is the FIRST episode of the
   latest season: right for starting a drama, wrong for a daily show where
   "latest" means last night. */
export const newestEpisode = (episodes = []) => {
  if (!episodes.length) return null;
  return [...episodes]
    .sort((a, b) => (seasonNo(a) - seasonNo(b)) || (epNo(a) - epNo(b)))
    .pop();
};

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
 * @returns {{ episodes, seasons, tmdbExtra, trailerMp4, trailerPending, loading }}
 */
export function useTitleEpisodes(movie) {
  const { backendUrl } = useContext(AppContext);
  const [episodes, setEpisodes] = useState([]);
  const [tmdbExtra, setTmdbExtra] = useState(null);
  const [loading, setLoading] = useState(false);

  const slug = movie?.slug;

  // IMDb → Netflix MP4, with TMDB's YouTube key as the callers' fallback.
  const { trailerMp4, trailerPending } = useMp4Trailer(movie, tmdbExtra);

  useEffect(() => {
    const local = numberLocal(Array.isArray(movie?.episodes) ? movie.episodes : []);
    setEpisodes(local);
    setTmdbExtra(null);
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

  const seasons = useMemo(
    () => Array.from(new Set(episodes.map(seasonNo))).sort((a, b) => a - b),
    [episodes]
  );

  return { episodes, seasons, tmdbExtra, trailerMp4, trailerPending, loading };
}
