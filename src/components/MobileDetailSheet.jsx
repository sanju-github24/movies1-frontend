import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Play, Info, Volume2, VolumeX, Plus, Check, Share2, Star } from "lucide-react";
import { inMyList, toggleMyList, getRating, setRating } from "../utils/myList";
import { useTitleEpisodes, cleanTitle, epNo, seasonNo, epStill, airDate, langLabel } from "../utils/titleEpisodes";
import { useRecommendations } from "../utils/recommendations";

// Full-screen mobile detail sheet — the single mobile overlay used by the homepage
// grid AND the /watch browse page. Shows the trailer/backdrop hero, the title
// treatment, a Hotstar-style meta line, the primary Watch action, quick actions,
// the season/episode list for series and a "More Like This" grid.
//
// Tapping Watch (or an episode) never lands on the watch PAGE on mobile: we go
// straight to /watch/:slug with `autoPlay`, which makes WatchPage resolve the
// servers and open the player overlay immediately.

export default function MobileDetailSheet({ movie, onClose, relatedMovies = [], onNavigate, onSelectMovie }) {
  const navigate = useNavigate();
  const { episodes, seasons, tmdbExtra, trailerMp4, loading: epsLoading } = useTitleEpisodes(movie);
  // Our library first (same genres), then TMDB's own recommendations.
  const recommendations = useRecommendations(movie, relatedMovies, tmdbExtra, 12);

  const [isMuted, setIsMuted] = useState(true);   // autoplay requires muted start
  const [activeSeason, setActiveSeason] = useState(null);
  const [saved, setSaved] = useState(false);
  const [rating, setStars] = useState(0);
  const [showRate, setShowRate] = useState(false);
  const [shared, setShared] = useState(false);

  const slug = movie?.slug;

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!movie) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [movie]);

  useEffect(() => {
    setSaved(inMyList(slug));
    setStars(getRating(slug));
    setShowRate(false);
    setShared(false);
    setActiveSeason(null);      // a new title opens on its newest season
  }, [slug]);

  // Hotstar opens on the newest season.
  const currentSeason = activeSeason ?? (seasons.length ? seasons[seasons.length - 1] : null);
  const seasonEpisodes = useMemo(
    () => episodes.filter(e => seasonNo(e) === currentSeason)
      .sort((a, b) => epNo(a) - epNo(b)),
    [episodes, currentSeason]
  );

  // The episode the big button plays: first of the latest season.
  const latestEpisode = seasonEpisodes[0] || episodes[0] || null;

  if (!movie) return null;

  // Whatever the row is missing comes from the TMDB detail we resolved above.
  const x = tmdbExtra || {};
  const tmdbId = movie.tmdb_id || x.tmdb_id || null;
  const imdbId = movie.imdb_id || x.imdb_id || null;
  const isTV = movie.content_type === "tv" || episodes.length > 0 || x.content_type === "tv";
  const cover = movie.cover_poster || x.cover_poster_url || movie.poster || movie.poster_url || "/default-poster.jpg";
  const ownGenres = movie.tmdb_genres || movie.genres || movie.categories || [];
  const genres = ownGenres.length ? ownGenres : (x.genres || []);
  const ratingImdb = movie.imdbRating || movie.imdb_rating || movie.imdb || x.imdb_rating;
  const logo = movie.title_logo || x.title_logo || "";
  const trailerKey = movie.trailer_key || x.trailer_key || null;
  const description = movie.description || x.description || "";
  const year = movie.year || x.year;
  const certification = movie.certification || x.certification;
  const displayTitle = cleanTitle(movie.title) || movie.slug;

  /* ── Watch → straight into the player (servers), never the watch page. ── */
  const goWatch = (ep = null) => {
    const episode = ep ? { season: seasonNo(ep), episode: epNo(ep) } : null;

    if (onNavigate) {                       // page owns the navigation (WatchListPage)
      onNavigate(movie, { autoPlay: true, episode });
      return;
    }

    // Homepage rows: prefer our own player when the title is resolvable, and only
    // fall back to the admin-supplied external embed when it is not.
    const canPlayInternally = !!(tmdbId || imdbId || movie.has_watch_html);
    if (!canPlayInternally && movie.watchUrl) {
      window.location.href = movie.watchUrl;
      return;
    }

    const state = { autoPlay: true, autoPlayEpisode: episode };
    if (tmdbId || imdbId) {
      state.movie = {
        tmdb_id: tmdbId,
        imdb_id: imdbId,
        title: movie.title,
        slug: movie.watch_slug || movie.slug,
        poster: movie.poster || movie.poster_url || x.poster_url,
        cover_poster: cover,
        description,
        year,
        content_type: movie.content_type || (isTV ? "tv" : "movie"),
        genres,
        title_logo: logo || null,
      };
    }
    // watch_html can live under a different slug than the movies row (matched by
    // title) — use that one when the sheet was enriched from an upload.
    navigate(`/watch/${movie.watch_slug || movie.slug}`, { state });
    onClose();
  };

  const onShare = async () => {
    const url = `${window.location.origin}/movie/${movie.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: displayTitle, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1500); }
    } catch { /* user dismissed the share sheet */ }
  };

  const metaBits = [
    year,
    certification,
    seasons.length ? `${seasons.length} Season${seasons.length > 1 ? "s" : ""}` : null,
    langLabel(movie.language),
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[2147483000] bg-gray-950 flex flex-col animate-in fade-in slide-in-from-bottom duration-500">
      {/* ── Top bar: title + close ── */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 shrink-0 border-b border-white/5 bg-gray-950">
        <h2 className="text-xl font-bold text-white truncate">{displayTitle}</h2>
        <button onClick={onClose} aria-label="Close"
          className="p-2 -mr-2 rounded-full text-white active:scale-90 transition-transform">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-28 scrollbar-hide">
        {/* ── Hero: trailer if we have one, else the backdrop ── */}
        <div className="relative aspect-video w-full shadow-2xl bg-black overflow-hidden flex items-center justify-center">
          {!trailerKey && trailerMp4 ? (
            <>
              {/* No YouTube trailer for this title — fall back to a plain MP4,
                  which plays with no player chrome at all. */}
              <video
                key={trailerMp4}
                src={trailerMp4}
                autoPlay muted={isMuted} loop playsInline preload="auto"
                className="w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute top-4 left-4 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm shadow-lg pointer-events-none">
                <span className="text-[8px] font-bold text-white/90 uppercase tracking-[0.2em]">Trailer</span>
              </div>
              <button onClick={e => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-10 right-6 z-[220] p-3 bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-2xl active:scale-90">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </>
          ) : trailerKey ? (
            <>
              <div className="relative w-full h-full scale-[1.3] pointer-events-none">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=${window.location.origin}`}
                  title="Trailer" className="w-full h-full" frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
              <div className="absolute top-4 left-4 z-30 px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-sm shadow-lg pointer-events-none">
                <span className="text-[8px] font-bold text-white/90 uppercase tracking-[0.2em]">Trailer</span>
              </div>
              <button onClick={e => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute bottom-10 right-6 z-[220] p-3 bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-2xl active:scale-90">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </>
          ) : (
            <img src={cover} className="w-full h-full object-cover opacity-80" alt=""
              onError={e => { e.target.src = "/default-poster.jpg"; }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* ── Title treatment + meta ── */}
        <div className="px-5 flex flex-col items-center text-center gap-4 -mt-10 relative z-10">
          {logo ? (
            <img src={logo} className="h-16 w-auto object-contain drop-shadow-2xl" alt="" />
          ) : (
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl leading-none line-clamp-2 max-w-xs">{displayTitle}</h3>
          )}

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] font-medium text-gray-400">
            {ratingImdb && (
              <span className="flex items-center gap-1.5 mr-1">
                <span className="bg-[#f5c518] text-black px-1.5 py-0.5 rounded-[3px] font-black text-[9px]">IMDb</span>
                <span className="text-white font-bold">{ratingImdb}</span>
              </span>
            )}
            {metaBits.map((bit, i) => (
              <React.Fragment key={`${bit}-${i}`}>
                {i > 0 && <span className="text-gray-700">•</span>}
                {bit === certification
                  ? <span className="px-1.5 py-0.5 bg-white/10 rounded text-gray-200 text-[11px]">{bit}</span>
                  : <span>{bit}</span>}
              </React.Fragment>
            ))}
            {isTV && !seasons.length && (
              <span className="px-2 py-0.5 bg-purple-600/80 text-white text-[9px] font-black uppercase tracking-widest rounded">Series</span>
            )}
          </div>

          {/* ── Primary action ── */}
          <button onClick={() => goWatch(isTV ? latestEpisode : null)}
            className="w-full bg-gray-100 text-black py-4 rounded-lg font-bold text-base flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg">
            <Play className="w-5 h-5 fill-current" />
            {isTV && latestEpisode
              ? <>Watch Latest Season <span className="text-gray-600 font-semibold">S{seasonNo(latestEpisode)} E{epNo(latestEpisode)}</span></>
              : isTV ? "Stream Series" : "Watch Now"}
          </button>

          {genres.length > 0 && (
            <div className="w-full flex items-center gap-2 overflow-x-auto scrollbar-hide text-[13px] font-semibold text-white/90">
              {genres.map((g, i) => (
                <React.Fragment key={g}>
                  {i > 0 && <span className="text-gray-700">|</span>}
                  <span className="whitespace-nowrap">{g}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          {description && (
            <p className="w-full text-left text-gray-400 text-sm leading-relaxed">{description}</p>
          )}

          {/* ── Quick actions ── */}
          <div className="w-full flex items-start gap-9 pt-2 pb-1">
            <button onClick={() => setSaved(toggleMyList(movie))}
              className="flex flex-col items-center gap-1.5 text-white active:scale-90 transition-transform">
              {saved ? <Check className="w-6 h-6 text-blue-400" /> : <Plus className="w-6 h-6" />}
              <span className="text-[11px] text-gray-300">Watchlist</span>
            </button>
            <button onClick={onShare}
              className="flex flex-col items-center gap-1.5 text-white active:scale-90 transition-transform">
              <Share2 className="w-6 h-6" />
              <span className="text-[11px] text-gray-300">{shared ? "Copied" : "Share"}</span>
            </button>
            <button onClick={() => setShowRate(v => !v)}
              className="flex flex-col items-center gap-1.5 text-white active:scale-90 transition-transform">
              <Star className={`w-6 h-6 ${rating ? "fill-yellow-400 text-yellow-400" : ""}`} />
              <span className="text-[11px] text-gray-300">{rating ? `${rating}/5` : "Rate"}</span>
            </button>
          </div>

          {showRate && (
            <div className="w-full flex items-center gap-3 -mt-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setStars(setRating(slug, n))} aria-label={`Rate ${n}`}>
                  <Star className={`w-7 h-7 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Seasons + episodes ── */}
        {episodes.length > 0 && (
          <div className="mt-6">
            {seasons.length > 1 && (
              <div className="flex items-center gap-6 px-5 overflow-x-auto scrollbar-hide border-b border-white/10">
                {seasons.map(s => (
                  <button key={s} onClick={() => setActiveSeason(s)}
                    className={`whitespace-nowrap pb-3 text-base transition-colors border-b-2 -mb-px ${
                      s === currentSeason ? "text-white font-bold border-white" : "text-gray-400 font-medium border-transparent"}`}>
                    Season {s}
                  </button>
                ))}
              </div>
            )}

            <div className="divide-y divide-white/5">
              {seasonEpisodes.map(ep => (
                <button key={`${seasonNo(ep)}-${epNo(ep)}`} onClick={() => goWatch(ep)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left active:bg-white/5 transition-colors">
                  <div className="relative w-28 shrink-0 aspect-video rounded-md overflow-hidden bg-gray-900">
                    <img
                      src={epStill(ep) || cover}
                      className={`w-full h-full object-cover ${epStill(ep) ? "" : "opacity-60"}`}
                      alt="" loading="lazy"
                      onError={e => { e.target.src = cover; }} />
                    <Play className="absolute bottom-1 left-1 w-4 h-4 text-white fill-white drop-shadow" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[15px] font-medium truncate">{ep.title || ep.name || `Episode ${epNo(ep)}`}</p>
                    <p className="text-gray-500 text-xs mt-1 truncate flex items-center gap-1.5">
                      {ep.hasStream && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[9px] font-black uppercase tracking-wider">HD</span>
                      )}
                      {`S${seasonNo(ep)} E${epNo(ep)}`}
                      {airDate(ep.air_date) && ` • ${airDate(ep.air_date)}`}
                      {ep.runtime ? ` • ${ep.runtime}m` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {epsLoading && episodes.length === 0 && (
          <p className="px-5 mt-6 text-[11px] font-black uppercase tracking-widest text-gray-600">Loading episodes…</p>
        )}

        {/* ── More Like This ── */}
        {recommendations.length > 0 && (
          <div className="px-5 mt-10">
            <h4 className="text-base font-bold text-white mb-3">More Like This</h4>
            <div className="grid grid-cols-3 gap-3">
              {recommendations.map(m => (
                <button key={m.id || m.slug} className="flex flex-col gap-2 text-left active:scale-95 transition-transform"
                  onClick={() => {
                    if (onSelectMovie) { onSelectMovie(m); document.querySelector(".overscroll-contain")?.scrollTo({ top: 0, behavior: "smooth" }); }
                    else { onClose(); navigate(`/movie/${m.slug}`); }
                  }}>
                  <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/5 bg-gray-900">
                    <img src={m.poster || m.poster_url || "/default-poster.jpg"} className="w-full h-full object-cover" alt="" loading="lazy" />
                  </div>
                  <span className="text-[11px] text-gray-400 truncate">{cleanTitle(m.title) || m.slug}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Full details page ── */}
        <div className="px-5 mt-8">
          <Link to={`/movie/${movie.slug}`} onClick={onClose}
            className="w-full bg-white/10 border border-white/15 text-white py-3.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
            <Info className="w-4 h-4" /> More Details
          </Link>
        </div>
      </div>
    </div>
  );
}
