// src/pages/CricfyLivePlayer.jsx
// Plays a Cricfy match in the AnchorHD player (VideoPlayer). Pick a server;
// HLS routes through the backend hls-proxy, DASH plays direct with its ClearKey.
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Zap, Server, Clock } from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import { fetchCricfyEvents, findCricfyEvent, cricfySource } from "../utils/cricfy";

export default function CricfyLivePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [srvIdx, setSrvIdx] = useState(0);

  useEffect(() => {
    let on = true;
    fetchCricfyEvents()
      .then((events) => {
        if (!on) return;
        const found = findCricfyEvent(events, id);
        if (!found) setError("Match not found or no longer live.");
        else setEv(found);
        setLoading(false);
      })
      .catch((e) => { if (on) { setError(e.message); setLoading(false); } });
    return () => { on = false; };
  }, [id]);

  const server = ev?.servers?.[srvIdx] || null;
  const { src, drmClearKey } = useMemo(() => cricfySource(server), [server]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-950/80 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-[100]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate("/sports")} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition">
              <ArrowLeft size={20} className="text-blue-500" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-black uppercase tracking-tighter leading-none truncate">{ev?.title || "Live Stream"}</h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">{ev ? `${ev.category} • ${ev.timeLabel}` : "Sports"}</p>
            </div>
          </div>
          {ev && (
            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border flex-none ${ev.status === "live" ? "bg-red-600/10 border-red-500 text-red-500 animate-pulse" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
              {ev.status === "live" ? "Live" : ev.status === "ended" ? "Ended" : "Scheduled"}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto py-6 sm:px-6 space-y-6">
        <div className="relative w-full aspect-video sm:rounded-3xl overflow-hidden bg-black border border-white/5 ring-1 ring-white/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.3em]">Connecting</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Clock className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-400 font-bold">{error}</p>
            </div>
          ) : src ? (
            <div className="w-full h-full" key={src}>
              <VideoPlayer
                src={src}
                drmClearKey={drmClearKey}
                title={ev.title}
                isLive={ev.status === "live"}
                poster={ev.poster}
                inline
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">No playable server.</div>
          )}
        </div>

        {/* Server picker */}
        {ev?.servers?.length > 0 && (
          <div className="mx-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center"><Server size={16} /></div>
              <h2 className="text-sm font-black uppercase tracking-widest">Servers</h2>
              <span className="text-[10px] text-gray-500 font-bold">Pick another if one fails</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ev.servers.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSrvIdx(i)}
                  className={`p-4 rounded-2xl flex items-center justify-between text-left transition border ${i === srvIdx ? "bg-blue-600 border-blue-400 shadow-xl" : "bg-gray-900/50 border-white/5 hover:bg-gray-800"}`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Zap size={14} className={i === srvIdx ? "text-white" : "text-blue-500"} />
                    <span className="text-xs font-bold truncate">{s.name}</span>
                  </span>
                  <span className="flex items-center gap-1 flex-none ml-2">
                    {s.drm && <span className="text-[8px] font-black border border-current rounded px-1 opacity-70">DRM</span>}
                    <span className="text-[8px] font-black border border-current rounded px-1 opacity-70">{s.kind.toUpperCase()}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
