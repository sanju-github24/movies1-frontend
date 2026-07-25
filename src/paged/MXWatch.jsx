// MX Player watch page — in-SPA detail + player for MX movies and series.
// Reached from search (source:"mxplayer"). Uses the site's native VideoPlayer
// (hls.js) so playback, audio-track selection, episodes and the Back button all
// stay inside the React app — no dead-end player.html tab.
import React, { useEffect, useState, useMemo, useContext, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Film } from "lucide-react";
import { AppContext } from "../context/AppContext";
import VideoPlayer from "./VideoPlayer";
import axios from "axios";

export default function MXWatch() {
  const location = useLocation();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);
  const seed = location.state || {};
  const qs = new URLSearchParams(location.search);
  const webUrl = seed.webUrl || qs.get("url") || "";
  const paramId = seed.mxId || qs.get("id") || "";
  const mxType = seed.mxType || qs.get("type") || "movie";

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeEp, setActiveEp] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!webUrl && !paramId) { setError("Nothing to play."); setLoading(false); return; }
    (async () => {
      setLoading(true); setError(null);
      try {
        const params = webUrl ? { url: webUrl } : { id: paramId, type: mxType };
        const r = await axios.get(`${backendUrl}/api/mx/episodes`, { params, timeout: 90000 });
        if (!alive) return;
        if (r.data?.success) setDetail(r.data);
        else setError(r.data?.error || "Couldn't load this title.");
      } catch (e) {
        if (alive) setError("Couldn't load this title. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [webUrl, paramId, mxType, backendUrl]);

  const isShow = detail?.type === "show";
  const rawEpisodes = detail?.episodes || [];

  // Map MX episodes (all seasons) to the shape VideoPlayer expects.
  const episodes = useMemo(() => rawEpisodes.map((e) => ({
    ...e,
    poster: e.poster,
    cover_poster: e.poster,
    season: e.season || 1,
    season_number: e.season || 1,
    episode: e.number,
    episodeNumberInSeason: e.number,
    title: e.title,
    description: e.description,
  })), [rawEpisodes]);

  const src = isShow ? episodes[activeEp]?.playUrl : detail?.playUrl;

  // Continue-watching: persist resume progress in the format WatchListPage reads.
  const mxId = useMemo(() => {
    if (paramId) return paramId;
    const m = /-([0-9a-f]{24,})(?:$|[/?])/i.exec(webUrl);
    return m ? m[1] : (webUrl || "mx");
  }, [webUrl, paramId]);
  const lastSaveRef = useRef(0);
  const handleProgress = useCallback((time, dur) => {
    if (!detail || !time || time < 10) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 5000) return; // throttle to every 5s
    lastSaveRef.current = now;
    try {
      const movie = {
        slug: `mx-${mxId}`,
        title: isShow ? `${detail.title}${episodes[activeEp] ? ` · ${episodes[activeEp].title}` : ""}` : detail.title,
        cover_poster: detail.backdrop || detail.poster || seed.image || null,
        poster: detail.poster || seed.image || null,
        source: "mxplayer",
        mxWebUrl: webUrl,
        runtime: dur ? Math.round(dur / 60) : null,
      };
      localStorage.setItem(`video_last_time_v1:mx-${mxId}`, JSON.stringify({ movie, time, updatedAt: now }));
    } catch (e) { /* storage full / disabled */ }
  }, [detail, isShow, episodes, activeEp, mxId, webUrl, seed.image]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-sm text-white/60">Loading from MX Player…</p>
      </div>
    );
  }
  if (error || !detail || !src) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-5 px-6 text-center">
        <Film className="text-white/30" size={44} />
        <p className="text-white/70 max-w-md">{error || "This title is unavailable."}</p>
        <button onClick={() => navigate(-1)} className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">Back to search</button>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{detail.title} | MX Player</title></Helmet>
      <VideoPlayer
        src={src}
        title={detail.title}
        onBackClick={() => navigate(-1)}
        episodes={isShow ? episodes : []}
        onEpisodeClick={(_ep, i) => setActiveEp(i)}
        currentEpisodeIndex={activeEp}
        genres={detail.genres || []}
        logoUrl={detail.logo || ""}
        year={detail.year || ""}
        onProgress={handleProgress}
      />
    </>
  );
}
