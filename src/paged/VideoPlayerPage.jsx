// src/pages/VideoPlayerPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "../utils/supabaseClient";
import { Loader2, ShieldCheck, AlertCircle, PlayCircle, ArrowLeft } from "lucide-react"; 
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

  /**
   * AD-BLOCKING LOGIC: Injecting sandbox into iframes
   * This restricts the iframe's ability to trigger pop-ups or top-level redirects.
   */
  const getSanitizedEmbed = (html) => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const iframes = doc.querySelectorAll('iframe');

    iframes.forEach((iframe) => {
      // allow-scripts and allow-same-origin are necessary for the video to play.
      // We EXCLUDE 'allow-popups' to block 18+ ads and 'allow-top-navigation' to prevent redirects.
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
      let chosen = null, chosenType = null;

      const normalized = normalizePassedSrc(passedSrc);
      if (normalized && (normalized.type === 'html' || normalized.html)) {
        chosen = normalized.html || normalized.src;
        chosenType = 'html';
      }

      if (slug) {
        try {
          const { data, error: dbErr } = await supabase
            .from('watch_html')
            .select('*')
            .eq('slug', slug)
            .single();
          if (!dbErr && data) {
            if (mounted) {
              setMovieRow(data);
              if (!chosen) {
                const picked = pickSourceFromRow(data);
                chosen = picked.src; chosenType = picked.type;
              }
            }
          }
        } catch (err) { console.error(err); }
      }

      if (mounted) {
        setFinalSource(chosen);
        setSourceType(chosenType);
        setVideoTitle(movieRow?.title || slug);
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

  // --- HTML/IFRAME RENDERER WITH MOBILE-FIT NOTICE ---
  if (sourceType === 'html') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center">
        {/* Responsive Header Bar */}
        <div className="w-full flex items-center justify-between p-4 bg-gray-950/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-20">
          <button 
            onClick={handleBack} 
            className="text-gray-400 hover:text-white flex items-center gap-2 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 h-5" /> Back
          </button>
          <div className="flex items-center gap-1.5 text-yellow-500 text-[10px] sm:text-xs font-bold bg-yellow-500/10 px-2 sm:px-3 py-1 rounded-full border border-yellow-500/20">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 h-4" /> AD-SHIELD ACTIVE
          </div>
        </div>

        <div className="w-full max-w-6xl flex-1 flex flex-col justify-start sm:justify-center px-0 sm:px-4 py-4 sm:py-8">
          
          {/* Responsive aspect ratio container */}
          <div className="relative w-full aspect-video bg-black shadow-2xl overflow-hidden sm:rounded-2xl border-y sm:border border-gray-800">
            
            {/* BRAVE BROWSER NOTICE OVERLAY - Fully Mobile Optimized */}
            {showNotice && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6 text-center">
                <div className="w-full max-w-sm sm:max-w-md bg-gray-900 border border-gray-800 p-5 sm:p-8 rounded-2xl shadow-2xl mx-2">
                  <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
                  <h2 className="text-white text-lg sm:text-xl font-bold mb-2">Important Notice</h2>
                  <p className="text-gray-400 text-xs sm:text-sm mb-5 sm:mb-6 leading-relaxed">
                    Some external servers play 18+ ads. Use 
                    <span className="text-orange-500 font-bold mx-1">Brave Browser</span> 
                    on mobile to block these ads completely. Sorry for the inconvenience.
                  </p>
                  <button 
                    onClick={() => setShowNotice(false)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-bold py-2.5 sm:py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <PlayCircle className="w-4 h-4 sm:w-5 h-5" /> I Understand, Play
                  </button>
                </div>
              </div>
            )}

            {/* The Sanitzed Embed Player */}
            <div
              className="absolute inset-0 w-full h-full"
              dangerouslySetInnerHTML={{ __html: getSanitizedEmbed(finalSource) }}
            />
          </div>

          {/* Video Title Section */}
          <div className="mt-4 sm:mt-6 px-4 text-center sm:text-left">
            <h1 className="text-white text-lg sm:text-2xl font-bold line-clamp-2">
              {videoTitle}
            </h1>
            <p className="text-gray-500 text-[10px] sm:text-xs mt-1 uppercase tracking-widest">
              Secure Stream Mode
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Native Video Player fallback
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
       <VideoPlayer src={finalSource} title={videoTitle} onBackClick={handleBack} />
    </div>
  );
};

export default VideoPlayerPage;