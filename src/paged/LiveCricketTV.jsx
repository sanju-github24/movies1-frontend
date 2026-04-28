import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Radio, Tv2, Signal, Volume2, Maximize2, AlertCircle } from "lucide-react";

const CHANNELS = [
  {
    id: "sky",
    name: "Sky Sports",
    sub: "Cricket",
    badge: "LIVE",
    color: "#00a8e1",
    glow: "rgba(0,168,225,0.3)",
    border: "rgba(0,168,225,0.25)",
    bg: "rgba(0,168,225,0.06)",
    logo: "🔵",
    tag: "SKY",
    url: "https://livetv.moviebite.cc/tv/cricketsky",
    desc: "Sky Sports Cricket — Live matches, commentary & analysis",
  },
  {
    id: "willow",
    name: "Willow",
    sub: "Cricket HD",
    badge: "LIVE",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.3)",
    border: "rgba(34,197,94,0.25)",
    bg: "rgba(34,197,94,0.06)",
    logo: "🟢",
    tag: "WILLOW",
    url: "https://livetv.moviebite.cc/tv/willow",
    desc: "Willow Cricket HD — International cricket coverage",
  },
];

function PulsingDot({ color }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: color }}
      />
    </span>
  );
}

function ChannelCard({ ch, active, onClick }) {
  return (
    <button
      onClick={() => onClick(ch)}
      className="relative w-full text-left rounded-2xl border transition-all duration-300 active:scale-[0.98] overflow-hidden group"
      style={{
        background: active ? ch.bg : "rgba(255,255,255,0.02)",
        borderColor: active ? ch.border : "rgba(255,255,255,0.06)",
        boxShadow: active ? `0 0 30px ${ch.glow}` : "none",
      }}
    >
      {/* Shimmer on active */}
      {active && (
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${ch.color}44 0%, transparent 60%)`,
          }}
        />
      )}

      <div className="relative p-4 flex items-center gap-4">
        {/* Channel icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border"
          style={{
            background: active ? `${ch.color}15` : "rgba(255,255,255,0.04)",
            borderColor: active ? ch.border : "rgba(255,255,255,0.06)",
          }}
        >
          <Tv2 size={20} style={{ color: active ? ch.color : "#4b5563" }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded"
              style={{
                background: `${ch.color}20`,
                color: ch.color,
              }}
            >
              {ch.tag}
            </span>
            <div className="flex items-center gap-1.5">
              <PulsingDot color={ch.color} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: ch.color }}>
                Live
              </span>
            </div>
          </div>
          <p className="text-sm font-black text-white uppercase tracking-tight leading-none">
            {ch.name} <span className="font-bold" style={{ color: ch.color }}>{ch.sub}</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-1 truncate">{ch.desc}</p>
        </div>

        {/* Active indicator */}
        <div
          className="shrink-0 w-2 h-8 rounded-full transition-all duration-300"
          style={{ background: active ? ch.color : "transparent" }}
        />
      </div>
    </button>
  );
}

export default function LiveCricketTV() {
  const [active, setActive] = useState(CHANNELS[0]);
  const [switching, setSwitching] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  const handleSwitch = (ch) => {
    if (ch.id === active.id) return;
    setSwitching(true);
    setTimeout(() => {
      setActive(ch);
      setSwitching(false);
    }, 350);
  };

  const handleFullscreen = () => {
    if (playerRef.current) {
      if (!document.fullscreenElement) {
        playerRef.current.requestFullscreen?.();
        setFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">

      {/* Subtle bg glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${active.glow} 0%, transparent 70%)`,
        }}
      />

      {/* ── Navbar ── */}
      <header className="relative z-10 h-16 flex items-center px-4 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/watch" className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft size={18} className="text-gray-400" />
            </Link>
            <Link to="/"><img src="/logo_39.png" className="h-7" alt="logo" /></Link>
          </div>
          <div
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border"
            style={{
              color: active.color,
              borderColor: active.border,
              background: active.bg,
            }}
          >
            <Signal size={9} />
            Live Cricket
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 pb-24">

        {/* ── Page title ── */}
        <div className="mb-6">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-1">Live Streaming</p>
          <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">
            Cricket <span style={{ color: active.color }}>Live TV</span>
          </h1>
        </div>

        {/* ── Channel selector ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {CHANNELS.map(ch => (
            <ChannelCard
              key={ch.id}
              ch={ch}
              active={active.id === ch.id}
              onClick={handleSwitch}
            />
          ))}
        </div>

        {/* ── Player ── */}
        <div
          ref={playerRef}
          className="relative rounded-3xl overflow-hidden border shadow-2xl"
          style={{
            borderColor: active.border,
            boxShadow: `0 0 60px ${active.glow}`,
            background: "#000",
          }}
        >
          {/* Player top bar */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: active.border,
              background: `linear-gradient(90deg, ${active.bg}, transparent)`,
            }}
          >
            <div className="flex items-center gap-3">
              <PulsingDot color={active.color} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: active.color }}>
                {active.name} {active.sub}
              </span>
              <span
                className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: `${active.color}20`, color: active.color }}
              >
                Live
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Volume2 size={14} className="text-gray-600" />
              <button
                onClick={handleFullscreen}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Fullscreen"
              >
                <Maximize2 size={14} className="text-gray-500 hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Iframe */}
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            {switching && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                <div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-3"
                  style={{ borderColor: `${active.color}44`, borderTopColor: active.color }}
                />
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: active.color }}>
                  Switching channel…
                </p>
              </div>
            )}
            <iframe
              ref={iframeRef}
              key={active.id}
              src={active.url}
              className="absolute inset-0 w-full h-full border-none"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              scrolling="no"
              style={{ opacity: switching ? 0 : 1, transition: "opacity 0.35s ease" }}
            />
          </div>

          {/* Disclaimer */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-t"
            style={{ borderColor: active.border, background: "rgba(0,0,0,0.4)" }}
          >
            <AlertCircle size={11} className="text-gray-700 shrink-0" />
            <p className="text-[9px] text-gray-700 font-bold uppercase tracking-wider">
              Stream via third-party provider · For best experience use Chrome · Disable ad-blocker if stream doesn't load
            </p>
          </div>
        </div>

        {/* ── Both channels quick-switch strip ── */}
        <div className="mt-6 flex items-center gap-3">
          <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest shrink-0">Quick Switch</span>
          <div className="flex gap-2">
            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                onClick={() => handleSwitch(ch)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                style={{
                  background: active.id === ch.id ? ch.bg : "rgba(255,255,255,0.02)",
                  borderColor: active.id === ch.id ? ch.border : "rgba(255,255,255,0.06)",
                  color: active.id === ch.id ? ch.color : "#4b5563",
                }}
              >
                <PulsingDot color={active.id === ch.id ? ch.color : "#374151"} />
                {ch.tag}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}