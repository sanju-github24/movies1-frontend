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

  // Helper: normalize passedSrc into { src, type, title, episode }
  const normalizePassedSrc = (ps) => {
    if (!ps) return null;
    if (typeof ps === 'object') {
      return {
        src: ps.src || ps.direct_url || null,
        type: ps.type || (ps.html ? 'html' : 'video'),
        title: ps.name || ps.title || null,
        episode: ps.episode || null
      };
    }
    if (typeof ps === 'string') {
      return { src: ps, type: 'video', title: null, episode: null };
    }
    return null;
  };

  // Fetch / initialize playback source + metadata
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);

      // 1) Prefer passed state source (fast-path)
      const normalized = normalizePassedSrc(passedSrc);
      if (normalized && normalized.src) {
        if (mounted) {
          setFinalSource(normalized.src);
          setSourceType(normalized.type || 'video');
          setVideoTitle(normalized.title || (passedMovieMeta?.title) || slug);
        }
      }

      // 2) Optionally fetch DB row (if slug provided) to fill overlay fields
      let watchData = null;
      if (slug) {
        try {
          const { data, error: dbErr } = await supabase
            .from('watch_html')
            .select('slug, title, video_url, html_code, direct_url, imdb_rating, title_logo, poster, episodes')
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

      // 3) If no normalized source from state, pick fallback from DB row
      if ((!normalized || !normalized.src)) {
        if (watchData) {
          let fallbackUrl = null;
          let fallbackType = null;

          if (watchData.video_url) {
            fallbackUrl = watchData.video_url;
            fallbackType = 'video';
          } else if (watchData.direct_url) {
            fallbackUrl = watchData.direct_url;
            fallbackType = 'video';
          } else if (watchData.html_code) {
            fallbackUrl = watchData.html_code;
            fallbackType = 'html';
          }

          if (fallbackUrl) {
            if (mounted) {
              setFinalSource(fallbackUrl);
              setSourceType(fallbackType);
              setVideoTitle(watchData.title || slug);
            }
          } else {
            if (mounted) setError("No playable source found for this title.");
          }
        } else {
          // No normalized source and no DB row
          if (passedMovieMeta && passedMovieMeta.video_url) {
            if (mounted) {
              setFinalSource(passedMovieMeta.video_url);
              setSourceType('video');
              setVideoTitle(passedMovieMeta.title || slug);
            }
          } else {
            if (mounted && !finalSource) {
              setError("400 - Missing playback source. Provide a slug in the URL or pass the source via navigation state.");
            }
          }
        }
      }

      if (mounted) setLoading(false);
    };

    init();

    return () => {
      mounted = false;
    };
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

  // Render VideoPlayer only — playerOverlayData is passed so the player shows the paused overlay inside the player.
  return (
    <div className="min-h-screen bg-black flex flex-col items-center">
      <div className="w-full max-w-8xl px-9 py-9">
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
