import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { cleanTitle } from "./cleanTitle";

/* Resolves the chrome-free MP4 trailer for a title — what every trailer surface
   plays when it can get one, because it runs in a bare <video> with no player
   chrome at all: no YouTube branding, end screens or hover controls.

   Two sources publish one: IMDb (nearly every title, via its public GraphQL
   endpoint) and Netflix (its own originals only), so IMDb is asked first and
   Netflix fills what it misses. Both URLs carry an expiry token, so they're
   resolved on demand. TMDB's YouTube trailer_key is the fallback for the titles
   neither of them has.

   `trailerPending` is what keeps that fallback from jumping the queue: while the
   lookup is out, callers hold YouTube back rather than starting it and swapping
   a second later.

   Works off whatever ids the title carries — our own rows, a TMDB search result
   and a TMDB recommendation all resolve the same way, and a bare tmdb_id is
   enough (the backend derives the IMDb id from it).

   @param movie  the title being shown
   @param extra  the TMDB detail, when the caller has already resolved one
   @returns {{ trailerMp4, trailerPending }} */
export function useMp4Trailer(movie, extra = null) {
  const { backendUrl } = useContext(AppContext);
  const [trailerMp4, setTrailerMp4] = useState(null);
  const [trailerPending, setTrailerPending] = useState(true);
  const triedRef = useRef("");

  /* Stable per title: ids often arrive after the first render (a TMDB detail
     landing, a row being enriched), and that must not read as a new title. */
  const titleKey = movie ? String(movie.slug || movie.id || movie.tmdb_id || movie.imdb_id || "") : "";

  /* A new title starts from nothing — without this, clicking through to a
     recommendation leaves the previous title's trailer playing under the new
     one's artwork whenever the new one resolves nothing. */
  useEffect(() => {
    setTrailerMp4(null);
    setTrailerPending(true);
    triedRef.current = "";
  }, [titleKey]);

  const nfId   = movie?.netflix_id || movie?.netflixId || null;
  const tmdbId = movie?.tmdb_id || extra?.tmdb_id || null;
  const imdbId = movie?.imdb_id || extra?.imdb_id || null;
  const title  = cleanTitle(movie?.title || "") || "";
  const kind   = movie?.content_type === "tv" ? "tv" : "movie";

  useEffect(() => {
    if (!movie || !backendUrl || !titleKey) return;
    // Nothing to look one up with — don't leave the YouTube fallback waiting.
    if (!nfId && !tmdbId && !imdbId) { setTrailerPending(false); return; }
    // One attempt per title, however many times the ids re-render.
    if (triedRef.current === titleKey) return;
    triedRef.current = titleKey;
    setTrailerMp4(null);
    setTrailerPending(true);
    let alive = true;

    /* Callers hold the YouTube fallback back while this is pending, so it can't
       be allowed to hang. A cold lookup is two network hops (TMDB's external
       ids, then IMDb) and runs to about 3.5s, so the wait has to cover that or
       the fallback wins the race on nearly every first open.

       Once the fallback has been released, a late MP4 is dropped rather than
       swapped in: yanking a trailer out from under itself mid-play looks worse
       than finishing on YouTube, and the backend has the URL cached by then, so
       the next open of that title plays IMDb instantly. */
    let released = false;
    const grace = setTimeout(() => {
      if (!alive) return;
      released = true;
      setTrailerPending(false);
    }, 4000);

    const ask = (path, params) =>
      axios.get(`${backendUrl}/api/${path}`, { params: { ...params, title }, timeout: 8000 })
        .then(r => (r.data?.success && r.data.url ? r.data.url : null))
        .catch(() => null);   // network hiccup → try the next source

    (async () => {
      // IMDb first — it covers almost every title, needs one call and no
      // Wikidata round trip.
      let url = null;
      if (imdbId || tmdbId) {
        url = await ask("imdb/trailer", imdbId ? { imdbId } : { tmdbId, contentType: kind });
      }
      // Netflix fills the gap for titles IMDb has no trailer for.
      if (!url && alive && (nfId || tmdbId)) {
        url = await ask("netflix/trailer", nfId ? { netflixId: nfId } : { tmdbId, contentType: kind });
      }
      if (!alive) return;
      if (url && !released) setTrailerMp4(url);
      setTrailerPending(false);
    })();

    return () => { alive = false; clearTimeout(grace); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleKey, nfId, tmdbId, imdbId, kind, backendUrl]);

  return { trailerMp4, trailerPending };
}
