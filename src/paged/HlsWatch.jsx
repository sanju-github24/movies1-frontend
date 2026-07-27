// Our own R2 HLS watch page — in-SPA player for movies stored on our CDN.
// Reached from the watch page's "AnchorHD" server. Mints a fresh 24h signed
// URL from the backend, then plays it in the native VideoPlayer (hls.js) with
// the TMDB metadata carried over from the watch page.
import React, { useEffect, useState, useContext, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Film } from "lucide-react";
import { AppContext } from "../context/AppContext";
import VideoPlayer from "./VideoPlayer";
import axios from "axios";

export default function HlsWatch() {
  const location = useLocation();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);
  const seed = location.state || {};
  const qs = new URLSearchParams(location.search);
  const path = seed.path || qs.get("path") || "";

  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!path) { setError("Nothing to play."); setLoading(false); return; }
    (async () => {
      try {
        const r = await axios.get(`${backendUrl}/api/movie-stream`, { params: { path }, timeout: 30000 });
        if (!alive) return;
        if (r.data?.success && r.data.url) setSrc(r.data.url);
        else setError(r.data?.error || "Stream unavailable.");
      } catch {
        if (alive) setError("Couldn't load this title. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [path, backendUrl]);

  // continue-watching (mirrors the MX flow)
  const handleProgress = useCallback((time, dur) => {
    const id = seed.tmdbId || path;
    if (!id) return;
    try {
      localStorage.setItem(`video_last_time_v1:hls-${id}`, JSON.stringify({
        movie: { slug: seed.slug || null, title: seed.title, poster: seed.poster || null,
          cover_poster: seed.backdrop || seed.poster || null, source: "ourhls", hls_url: path },
        time, dur, updatedAt: Date.now(),
      }));
    } catch {}
  }, [seed, path]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="animate-spin" size={40} />
        <p className="text-white/60 text-sm">Preparing secure stream…</p>
      </div>
    );
  }
  if (error || !src) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center px-6 text-white">
        <Film size={40} className="text-white/40" />
        <p className="text-white/70 max-w-md">{error || "This title is unavailable."}</p>
        <button onClick={() => navigate(-1)} className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">Back</button>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{seed.title || "Watch"}</title></Helmet>
      <VideoPlayer
        src={src}
        title={seed.title}
        onBackClick={() => navigate(-1)}
        genres={seed.genres || []}
        logoUrl={seed.logo || ""}
        year={seed.year || ""}
        poster={seed.poster}
        backdrop={seed.backdrop}
        description={seed.description}
        onProgress={handleProgress}
      />
    </>
  );
}
