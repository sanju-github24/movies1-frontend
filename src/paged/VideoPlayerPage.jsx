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

  // Helper: pick best source from an episodes array (preferring html -> video_url -> direct_url)
  const pickFromEpisodes = (episodes) => {
    if (!Array.isArray(episodes)) return null;
    for (const ep of episodes) {
      if (!ep) continue;
      if (ep.html_code) return { src: ep.html_code, type: 'html' };
      if (ep.video_url) return { src: ep.video_url, type: 'video' };
      if (ep.direct_url) return { src: ep.direct_url, type: 'video' };
    }
    return null;
  };

  // Helper: normalize DB row into preferred source sequence (includes episodes)
  const pickSourceFromRow = (row) => {
    if (!row) return null;

    // 1) episode-level sources (if present)
    if (row.episodes) {
      const epPick = pickFromEpisodes(row.episodes);
      if (epPick) return epPick;
    }

    // 2) prefer embed fields on row first
    if (row.html_code) return { src: row.html_code, type: 'html' };
    if (row.html_code2) return { src: row.html_code2, type: 'html' };

    // 3) row-level video/direct
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

      // Local chosen source (avoid reading/updating state mid-effect)
      let chosen = null;
      let chosenType = null;
      let chosenTitle = null;

      // 1) Normalize passed state first (fast-path)
      const normalized = normalizePassedSrc(passedSrc);

      // If normalized passedSrc is embed HTML, choose it immediately
      if (normalized && (normalized.type === 'html' || normalized.html)) {
        chosen = normalized.html || normalized.src;
        chosenType = 'html';
        chosenTitle = normalized.title || (passedMovieMeta?.title) || slug;
      }

      // 2) Fetch DB row (if slug provided) to fill overlay & fallback
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

      // 3) If not already chosen from passed embed, prefer passedMovieMeta embeds / video
      if (!chosen) {
        if (passedMovieMeta) {
          if (passedMovieMeta.html_code) {
            chosen = passedMovieMeta.html_code;
            chosenType = 'html';
            chosenTitle = passedMovieMeta.title || slug;
          } else if (passedMovieMeta.html_code2) {
            chosen = passedMovieMeta.html_code2;
            chosenType = 'html';
            chosenTitle = passedMovieMeta.title || slug;
          } else if (passedMovieMeta.video_url) {
            chosen = passedMovieMeta.video_url;
            chosenType = 'video';
            chosenTitle = passedMovieMeta.title || slug;
          }
        }
      }

      // 4) If still not chosen, inspect DB row (episodes then row-level)
      if (!chosen && watchData) {
        const picked = pickSourceFromRow(watchData);
        if (picked) {
          chosen = picked.src;
          chosenType = picked.type;
          chosenTitle = watchData.title || slug;
        } else {
          // nothing playable in row
          // set an error later if nothing else
        }
      }

      // 5) If normalized passedSrc is a video (not html) and has a src string, prefer it (over DB row)
      if (normalized && !chosen && normalized.src && normalized.type === 'video') {
        chosen = normalized.src;
        chosenType = 'video';
        chosenTitle = normalized.title || (passedMovieMeta?.title) || slug;
      }

      // 6) Edge case: passedSrc is plain string (already covered by normalized), but keep fallback
      if (!chosen && passedSrc && typeof passedSrc === 'string') {
        chosen = passedSrc;
        chosenType = 'video';
        chosenTitle = passedMovieMeta?.title || slug;
      }

      // 7) If nothing chosen at all, set error
      if (!chosen) {
        if (mounted) {
          setError("No playable source found for this title.");
          setLoading(false);
        }
        return;
      }

      // Commit chosen source to state once
      if (mounted) {
        setFinalSource(chosen);
        setSourceType(chosenType);
        setVideoTitle(chosenTitle || (watchData?.title) || slug);
        setLoading(false);
      }
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

    let genresArray = null;
    if (fromTmdb.genres && Array.isArray(fromTmdb.genres)) genresArray = fromTmdb.genres;
    else if (fromRow.genres && typeof fromRow.genres === 'string') genresArray = fromRow.genres.split(',').map(g => g.trim());
    else if (fromState.genres && Array.isArray(fromState.genres)) genresArray = fromState.genres;

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

          {/* Responsive embed wrapper */}
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
