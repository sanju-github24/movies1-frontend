// src/pages/VideoPlayerPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "../utils/supabaseClient";
import { Loader2, ShieldCheck, AlertCircle, PlayCircle } from "lucide-react"; // Added Icons
import VideoPlayer from './VideoPlayer';

const VideoPlayerPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [movieRow, setMovieRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finalSource, setFinalSource] = useState(null);
  const [sourceType, setSourceType] = useState(null);
  const [videoTitle, setVideoTitle] = useState(null);
  
  // State for the Brave Browser / Ad Notice Overlay
  const [showNotice, setShowNotice] = useState(true);

  const passedState = location.state || {};
  const passedSrc = passedState.src || null;
  const passedMovieMeta = passedState.movieMeta || null;
  const passedTmdbMeta = passedState.tmdbMeta || null;

  /**
   * AD-BLOCKING LOGIC: Injecting sandbox into iframes
   * This prevents the iframe from opening pop-ups or redirecting your site.
   */
  const getSanitizedEmbed = (html) => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const iframes = doc.querySelectorAll('iframe');

    iframes.forEach((iframe) => {
      // allow-scripts and allow-same-origin are necessary for the video to play.
      // We EXCLUDE 'allow-popups' and 'allow-top-navigation' to block most ads.
      iframe.setAttribute(
        'sandbox', 
        'allow-forms allow-scripts allow-same-origin allow-presentation'
      );
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    });

    return doc.body.innerHTML;
  };

  // ... (normalizePassedSrc, pickFromEpisodes, pickSourceFromRow logic remains same)
  const normalizePassedSrc = (ps) => {
    if (!ps) return null;
    if (typeof ps === 'object') {
      return {
        src: ps.src || ps.direct_url || null,
        type: ps.type || (ps.html ? 'html' : 'video'),
        html: ps.html || ps.embed || null,
        title: ps.name || ps.title || null,
      };
    }
    return typeof ps === 'string' ? { src: ps, type: 'video' } : null;
  };

  const pickSourceFromRow = (row) => {
    if (!row) return null;
    if (row.html_code) return { src: row.html_code, type: 'html' };
    if (row.video_url) return { src: row.video_url, type: 'video' };
    return null;
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      setError(null);
      let chosen = null, chosenType = null, chosenTitle = null;

      const normalized = normalizePassedSrc(passedSrc);
      if (normalized && (normalized.type === 'html' || normalized.html)) {
        chosen = normalized.html || normalized.src;
        chosenType = 'html';
        chosenTitle = normalized.title || (passedMovieMeta?.title) || slug;
      }

      if (slug) {
        try {
          const { data, error: dbErr } = await supabase
            .from('watch_html')
            .select('*')
            .eq('slug', slug)
            .single();
          if (!dbErr && data) {
            if (mounted) setMovieRow(data);
            if (!chosen) {
                const picked = pickSourceFromRow(data);
                chosen = picked.src; chosenType = picked.type;
            }
          }
        } catch (err) { console.error(err); }
      }

      if (mounted) {
        setFinalSource(chosen);
        setSourceType(chosenType);
        setVideoTitle(chosenTitle || movieRow?.title || slug);
        setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [slug, passedSrc]);

  const handleBack = () => navigate(-1);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
    </div>
  );

  // --- HTML/IFRAME RENDERER WITH NOTICE ---
  if (sourceType === 'html') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-6xl">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={handleBack} className="text-gray-400 hover:text-white flex items-center gap-2">
               <ShieldCheck className="w-5 h-5" /> Back
            </button>
            <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
              <ShieldCheck className="w-4 h-4" /> AD-SHIELD ACTIVE
            </div>
          </div>

          <div className="relative w-full rounded-xl overflow-hidden bg-black border border-gray-800 shadow-2xl" style={{ paddingTop: '56.25%' }}>
            
            {/* BRAVE BROWSER NOTICE OVERLAY */}
            {showNotice && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-6 text-center">
                <div className="max-w-md bg-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-white text-xl font-bold mb-2">Important Notice</h2>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Some external servers may play 18+ ads. We recommend using 
                    <span className="text-orange-500 font-bold mx-1">Brave Browser</span> 
                    to block these ads completely. We are sorry for the inconvenience.
                  </p>
                  <button 
                    onClick={() => setShowNotice(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-5 h-5" /> I Understand, Play Video
                  </button>
                </div>
              </div>
            )}

            <div
              className="absolute top-0 left-0 right-0 bottom-0"
              dangerouslySetInnerHTML={{ __html: getSanitizedEmbed(finalSource) }}
            />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-white text-2xl font-bold">{videoTitle}</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
       <VideoPlayer src={finalSource} title={videoTitle} onBackClick={handleBack} />
    </div>
  );
};

export default VideoPlayerPage;