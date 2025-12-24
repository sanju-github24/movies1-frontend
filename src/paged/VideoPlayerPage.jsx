// src/pages/VideoPlayerPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { Loader2, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

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

  const passedState = location.state || {};
  const passedSrc = passedState.src || null;
  const passedMovieMeta = passedState.movieMeta || null;

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);

      let chosen = null;
      let chosenType = null;
      let chosenTitle = null;

      /* ---------- 1️⃣ PASSED SOURCE (WATCHLIST CLICK) ---------- */
      if (passedSrc) {
        if (typeof passedSrc === "object") {
          if (passedSrc.html || passedSrc.type === "html") {
            chosen = passedSrc.html || passedSrc.src;
            chosenType = "html";
          } else {
            chosen = passedSrc.direct_url || passedSrc.src;
            chosenType = "video";
          }
          chosenTitle = passedSrc.name || passedSrc.title;
        } else if (typeof passedSrc === "string") {
          chosen = passedSrc;
          chosenType = "video";
        }
      }

      /* ---------- 2️⃣ DATABASE FALLBACK ---------- */
      let watchData = null;
      if (!chosen && slug) {
        const { data, error: dbErr } = await supabase
          .from("watch_html")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!dbErr && data) {
          watchData = data;
          if (mounted) setMovieRow(data);
        }
      }

      if (!chosen && watchData) {
        if (watchData.video_url) {
          chosen = watchData.video_url;
          chosenType = "video";
        } else if (watchData.html_code) {
          chosen = watchData.html_code;
          chosenType = "html";
        }
        chosenTitle = watchData.title;
      }

      /* ---------- 3️⃣ FINAL ---------- */
      if (!mounted) return;

      if (!chosen) {
        setError("No playable source found.");
      } else {
        setFinalSource(chosen);
        setSourceType(chosenType);
        setVideoTitle(chosenTitle || slug || "Streaming");
      }

      setLoading(false);
    };

    init();
    return () => { mounted = false; };
  }, [slug, passedSrc]);

  const handleBack = () => {
    const backSlug =
      movieRow?.slug || passedMovieMeta?.slug || slug;
    backSlug ? navigate(`/watch/${backSlug}`) : navigate("/");
  };

  const playerOverlayData = useMemo(() => ({
    title: videoTitle,
    slug: slug || movieRow?.slug,
    year: movieRow?.year,
    logoUrl: movieRow?.title_logo || passedMovieMeta?.titleLogoUrl
  }), [videoTitle, slug, movieRow, passedMovieMeta]);

  /* ---------- LOADING ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  /* ---------- ERROR ---------- */
  if (error || !finalSource) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2 uppercase italic">
          Playback Error
        </h2>
        <p className="text-gray-500 text-sm mb-8">{error}</p>
        <button
          onClick={handleBack}
          className="px-10 py-3 bg-white text-black font-black rounded-full text-[10px] tracking-widest uppercase"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* HEADER */}
      <div className="w-full px-4 py-3 flex items-center justify-between bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-300 hover:text-white transition group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase text-xs tracking-widest">
            Back
          </span>
        </button>

        <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          CINEMATIC PLAYER
        </div>
      </div>

      {/* PLAYER */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-6 lg:p-10">
        {sourceType === "html" ? (
          <div className="w-full max-w-7xl">
            <div
              className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden"
              dangerouslySetInnerHTML={{ __html: finalSource }}
            />
          </div>
        ) : (
          <div className="w-full max-w-7xl">
            <VideoPlayer
              src={finalSource}
              title={videoTitle}
              onBackClick={handleBack}
              playerOverlayData={playerOverlayData}
              language={movieRow?.language}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayerPage;
