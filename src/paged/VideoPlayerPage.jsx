// src/pages/VideoPlayerPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "../utils/supabaseClient";
import { Loader2 } from "lucide-react";
import VideoPlayer from './VideoPlayer'; // adjust path if required

const VideoPlayerPage = () => {
  const { slug } = useParams();             // may be undefined if route is /player (no slug)
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [movieRow, setMovieRow] = useState(null); // DB row fallback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [finalSource, setFinalSource] = useState(null); // string URL or HTML
  const [sourceType, setSourceType] = useState(null);   // 'video' | 'html'
  const [videoTitle, setVideoTitle] = useState(null);

  // Read navigation state (if any)
  // WatchHtmlPage uses: navigate('/player', { state: { src: activeSrc, movieMeta, tmdbMeta } })
  const passedState = location.state || {};
  const passedSrc = passedState.src || null;           // could be object or string
  const passedMovieMeta = passedState.movieMeta || null;
  const passedTmdbMeta = passedState.tmdbMeta || null;

  // Helper: normalize passedSrc into { src, type, html, title, episode }
  const normalizePassedSrc = (ps) => {
    if (!ps) return null;
    if (typeof ps === 'object') {
      return {
        src: ps.src || ps.direct_url || null,
        type: ps.type || (ps.html ? 'html' : (ps.src && String(ps.src).toLowerCase().includes('.m3u8') ? 'video' : 'video')),
        html: ps.html || ps.embed || null,
        title: ps.name || ps.title || null,
        episode: ps.episode || null
      };
    }
    if (typeof ps === 'string') {
      return { src: ps, type: 'video', html: null, title: null, episode: null };
    }
    return null;
  };

  // Helper: normalize DB row into preferred source sequence
  const pickSourceFromRow = (row) => {
    if (!row) return null;
    // prefer embed fields first
    if (row.html_code) return { src: row.html_code, type: 'html' };
    if (row.html_code2) return { src: row.html_code2, type: 'html' };
    if (row.video_url) return { src: row.video_url, type: 'video' };
    if (row.direct_url) return { src: row.direct_url, type: 'video' };
    return null;
  };

  // Fetch / initialize playback source + metadata
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);

      // 1) Normalize passed state first (fast-path)
      const normalized = normalizePassedSrc(passedSrc);

      // If normalized passedSrc is embed HTML, use it immediately
      if (normalized && (normalized.type === 'html' || normalized.html)) {
        if (mounted) {
          setFinalSource(normalized.html || normalized.src);
          setSourceType('html');
          setVideoTitle(normalized.title || (passedMovieMeta?.title) || slug);
        }
      }

      // 2) Optionally fetch DB row (if slug provided) to fill overlay fields and fallback
      let watchData = null;
      if (slug) {
        try {
          const { data, error: dbErr } = await supabase
            .from('watch_html')
            .select('slug, title, video_url, html_code, html_code2, direct_url, imdb_rating, title_logo, poster, episodes, genres, overview, year, language')
            .eq('slug', slug)
            .single();

          if (!dbErr && data) {
            watchData = data;
            if (mounted) setMovieRow(data);
          }
        } catch (err) {
          console.error("VideoPlayerPage DB fetch error:", err);
          // continue — we may have passed state
        }
      }

      // 3) If we don't already have an embed chosen from passed state,
      //    try to pick from DB row (embed preferred), otherwise video sources.
      if (!(normalized && (normalized.type === 'html' || normalized.html))) {
        // prefer a source from passedMovieMeta (if it contains html_code/html_code2 or video_url)
        if (passedMovieMeta) {
          if (passedMovieMeta.html_code) {
            if (mounted) {
              setFinalSource(passedMovieMeta.html_code);
              setSourceType('html');
              setVideoTitle(passedMovieMeta.title || slug);
            }
          } else if (passedMovieMeta.html_code2) {
            if (mounted) {
              setFinalSource(passedMovieMeta.html_code2);
              setSourceType('html');
              setVideoTitle(passedMovieMeta.title || slug);
            }
          } else if (passedMovieMeta.video_url) {
            if (mounted) {
              setFinalSource(passedMovieMeta.video_url);
              setSourceType('video');
              setVideoTitle(passedMovieMeta.title || slug);
            }
          }
        }

        // if still nothing, try watchData
        if (!finalSource && watchData) {
          const picked = pickSourceFromRow(watchData);
          if (picked) {
            if (mounted) {
              setFinalSource(picked.src);
              setSourceType(picked.type);
              setVideoTitle(watchData.title || slug);
            }
          } else {
            if (mounted) setError("No playable source found for this title.");
          }
        }
      } else {
        // If normalized passedSrc was video (not html) and has a src string, use it
        if (normalized && normalized.src && normalized.type === 'video') {
          if (mounted) {
            setFinalSource(normalized.src);
            setSourceType('video');
            setVideoTitle(normalized.title || (passedMovieMeta?.title) || slug);
          }
        }
      }

      // Edge case: if nothing chosen yet but passedState.src is a plain string
      if (!finalSource && passedSrc && typeof passedSrc === 'string') {
        if (mounted) {
          setFinalSource(passedSrc);
          setSourceType('video');
          setVideoTitle(passedMovieMeta?.title || slug);
        }
      }

      if (mounted) setLoading(false);
    };

    init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, passedSrc, passedMovieMeta]);

  // Decide back target: prefer movie slug if known, otherwise go back to home
  const handleBack = () => {
    const backSlug = playerOverlayData?.slug || passedMovieMeta?.slug || slug;
    if (backSlug) navigate(`/watch/${backSlug}`);
    else navigate('/');
  };

  // Helper: derive download link if direct_url provided (passed state or DB row)
  const getDownloadUrl = () => {
    // prefer passed state
    if (passedState?.src && typeof passedState.src === 'object' && passedState.src.direct_url) {
      return passedState.src.direct_url;
    }
    if (movieRow?.direct_url) return movieRow.direct_url;
    if (movieRow?.video_url) return movieRow.video_url;
    if (passedMovieMeta?.video_url) return passedMovieMeta.video_url;
    return null;
  };

  // Build the playerOverlayData (ensure genres is an array)
  const playerOverlayData = useMemo(() => {
    const fromState = passedMovieMeta || {};
    const fromTmdb = passedTmdbMeta || {};
    const fromRow = movieRow || {};

    // prefer genres array from TMDB; fallback to comma string from DB row
    let genresArray = null;
    if (fromTmdb.genres && Array.isArray(fromTmdb.genres)) genresArray = fromTmdb.genres;
    else if (fromRow.genres && typeof fromRow.genres === 'string') genresArray = fromRow.genres.split(',').map(g => g.trim());
    else if (fromState.genres && Array.isArray(fromState.genres)) genresArray = fromState.genres;

    // activeEpisode if passedSrc was an episode object
    const activeEpisode = (passedSrc && typeof passedSrc === 'object' && passedSrc.isEpisode) ? passedSrc.episode : undefined;

    return {
      logoUrl: fromState.titleLogoUrl || fromRow.title_logo || null,
      title: fromState.title || fromRow.title || (slug || 'Unknown Title'),
      slug: fromState.slug || fromRow.slug || slug,
      imdbRating: fromState.imdbRating || fromRow.imdb_rating || null,
      year: fromTmdb.year || fromRow.year || null,
      overview: fromTmdb.description || fromRow.overview || fromState.overview || null,
      genres: genresArray || null,
      language: fromTmdb.original_language || fromRow.language || fromState.language || null,
      activeEpisode,
      downloadUrl: getDownloadUrl()
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passedMovieMeta, passedTmdbMeta, movieRow, passedSrc, slug]);

  // --- Conditional UI ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white pt-20 text-center">
        <h1 className="text-3xl text-red-500">Playback Error</h1>
        <p className="text-gray-400 mt-2">{error}</p>
        <button
          onClick={handleBack}
          className="text-blue-400 hover:text-blue-300 mt-4 block mx-auto"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!finalSource || !sourceType) {
    return (
      <div className="min-h-screen bg-gray-950 text-white pt-20 text-center">
        <h1 className="text-3xl text-yellow-500">Source Not Found</h1>
        <p className="text-gray-400 mt-2">Could not determine the playback source.</p>
        <button
          onClick={handleBack}
          className="text-blue-400 hover:text-blue-300 mt-4 block mx-auto"
        >
          Go Back
        </button>
      </div>
    );
  }

  // If sourceType is 'html' — render embed HTML directly (responsive container)
  if (sourceType === 'html') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-6xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-white text-xl font-semibold">{playerOverlayData.title || playerOverlayData.slug}</h1>
              {playerOverlayData.year && <div className="text-sm text-gray-400">{playerOverlayData.year}</div>}
            </div>
            <div>
              <button
                onClick={handleBack}
                className="text-blue-400 hover:text-blue-300"
              >
                Back
              </button>
            </div>
          </div>

          {/* Responsive embed wrapper: preserves aspect ratio but allows embedded code to size itself */}
          <div className="relative w-full rounded-lg overflow-hidden bg-black border border-gray-800" style={{ paddingTop: '56.25%' }}>
            <div
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              // NOTE: We are trusting the embed HTML stored in DB / passed state.
              // If you are concerned about unsafe HTML, sanitize with DOMPurify before inserting.
              dangerouslySetInnerHTML={{ __html: finalSource }}
            />
          </div>

          {/* Optional: show metadata/description below embed */}
          {playerOverlayData.overview && (
            <div className="mt-4 text-gray-300">
              <p>{playerOverlayData.overview}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render VideoPlayer only — playerOverlayData is passed so the player shows the paused overlay inside the player.
  return (
    <div className="min-h-screen bg-black flex flex-col items-center">
      <div className="w-full max-w-8xl px-4 py-8">
        <VideoPlayer
          src={finalSource}
          title={videoTitle || (playerOverlayData.title || playerOverlayData.slug)}
          onBackClick={handleBack}
          playerOverlayData={playerOverlayData}
          language={playerOverlayData.language}
        />
      </div>
    </div>
  );
};

export default VideoPlayerPage;
