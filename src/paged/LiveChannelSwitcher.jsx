// LiveChannelSwitcher.jsx
// Shows: player + right-side channel switcher ONLY when live
// When finished: animated result popup + POTM card instead
// When upcoming: nothing rendered

import { useState, useRef, useEffect } from "react";
import { Tv2, Maximize2, AlertCircle, Trophy, Star } from "lucide-react";
import { CRICKET_CHANNELS, FOOTBALL_CHANNELS } from "./channels";

function PulsingDot({ color }) {
  return (
    <span className="relative flex shrink-0" style={{ width: 6, height: 6 }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
    </span>
  );
}

// ─── Result popup shown when match is finished ────────────────────────────────
function ResultPopup({ result, mom, momRuns, momWickets, momImg, sport }) {
  const [visible, setVisible] = useState(false);
  const accent = sport === "football" ? "#34d399" : "#4ade80";
  const accentBg = sport === "football" ? "rgba(52,211,153,0.08)" : "rgba(74,222,128,0.08)";
  const accentBorder = sport === "football" ? "rgba(52,211,153,0.2)" : "rgba(74,222,128,0.2)";

  // Pop in after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="space-y-3 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      {/* Result banner */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: accentBg, borderColor: accentBorder }}
      >
        {/* Trophy header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: accentBorder }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            <Trophy size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">
              Match Result
            </p>
            <p className="text-base font-black leading-tight" style={{ color: accent }}>
              {result || "Match completed"}
            </p>
          </div>
        </div>

        {/* POTM */}
        {mom && (
          <div className="px-5 py-4 flex items-center gap-4">
            {momImg && (
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                <img
                  src={momImg}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = "none"; }}
                />
              </div>
            )}
            {!momImg && (
              <div
                className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
              >
                <Star size={18} className="text-amber-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Star size={10} className="text-amber-400 shrink-0" />
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                  Player of the Match
                </span>
              </div>
              <p className="text-sm font-black text-white truncate">{mom}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {momRuns && momRuns !== "-" && (
                  <span className="text-[10px] text-gray-400 font-bold">{momRuns} runs</span>
                )}
                {momWickets && momWickets !== "-" && (
                  <span className="text-[10px] text-gray-400 font-bold">{momWickets} wkts</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live player + right-side channel switcher ────────────────────────────────
function LivePlayer({ sport }) {
  const channels = sport === "football" ? FOOTBALL_CHANNELS : CRICKET_CHANNELS;
  const [active, setActive] = useState(channels[0]);
  const [switching, setSwitching] = useState(false);
  const playerRef = useRef(null);

  const switchTo = (ch) => {
    if (ch.id === active.id) return;
    setSwitching(true);
    setTimeout(() => { setActive(ch); setSwitching(false); }, 300);
  };

  const goFullscreen = () => {
    if (!document.fullscreenElement) playerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/[0.08]"
      style={{ background: "#000" }}
    >
      <div className="flex" style={{ minHeight: 220 }}>

        {/* ── iframe player ── */}
        <div className="flex-1 relative" ref={playerRef}>
          {switching ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
              <div
                className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin mb-2"
                style={{ borderColor: `${active.color}30`, borderTopColor: active.color }}
              />
              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: active.color }}>
                Switching…
              </p>
            </div>
          ) : (
            <iframe
              key={active.id}
              src={active.url}
              className="absolute inset-0 w-full h-full border-none"
              style={{ minHeight: 220 }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              scrolling="no"
            />
          )}

          {/* live badge */}
          <div
            className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          >
            <PulsingDot color={active.color} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: active.color }}>
              Live
            </span>
          </div>

          {/* fullscreen button */}
          <button
            onClick={goFullscreen}
            className="absolute top-2 right-2 z-20 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <Maximize2 size={11} className="text-gray-400 hover:text-white" />
          </button>

          {/* disclaimer */}
          <div
            className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-1 px-2 py-1.5"
            style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}
          >
          </div>
        </div>

        {/* ── Right channel list ── */}
        <div
          className="flex flex-col border-l border-white/[0.07] overflow-y-auto shrink-0"
          style={{ width: 96, background: "rgba(255,255,255,0.02)" }}
        >
          <div className="px-2 pt-2 pb-1.5 border-b border-white/[0.06]">
            <p className="text-[7px] font-black text-gray-700 uppercase tracking-widest text-center">
              Channels
            </p>
          </div>

          <div className="flex flex-col gap-0.5 p-1.5 flex-1">
            {channels.map((ch) => {
              const isActive = active.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => switchTo(ch)}
                  className="flex flex-col items-center gap-1.5 px-1.5 py-2 rounded-xl border transition-all duration-200 active:scale-95 w-full"
                  style={{
                    background: isActive ? ch.bg : "transparent",
                    borderColor: isActive ? ch.border : "transparent",
                    boxShadow: isActive ? `0 0 10px ${ch.glow}` : "none",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                    style={{
                      background: isActive ? `${ch.color}15` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isActive ? ch.border : "rgba(255,255,255,0.07)"}`,
                    }}
                  >
                    {ch.useIcon
                      ? <Tv2 size={14} style={{ color: isActive ? ch.color : "#4b5563" }} />
                      : <img
                          src={ch.logo}
                          alt=""
                          className="w-full h-full object-contain p-0.5"
                          style={{ filter: isActive ? "none" : "grayscale(100%) brightness(0.35)" }}
                        />
                    }
                  </div>
                  <span
                    className="text-[8px] font-black uppercase leading-tight text-center"
                    style={{ color: isActive ? ch.color : "#4b5563" }}
                  >
                    {ch.sub}
                  </span>
                  {isActive && (
                    <div className="w-4 h-0.5 rounded-full" style={{ background: ch.color }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
// Props:
//   sport      — "cricket" | "football"
//   isLive     — boolean
//   isFinished — boolean
//   result     — string  e.g. "India won by 7 wickets"
//   mom        — string  Player of the Match name
//   momRuns    — string  e.g. "87"
//   momWickets — string  e.g. "3"
//   momImg     — string  image URL
export function LiveChannelSwitcher({
  sport,
  isLive = false,
  isFinished = false,
  result,
  mom,
  momRuns,
  momWickets,
  momImg,
}) {
  if (isLive) {
    return <LivePlayer sport={sport} />;
  }

  if (isFinished) {
    return (
      <ResultPopup
        result={result}
        mom={mom}
        momRuns={momRuns}
        momWickets={momWickets}
        momImg={momImg}
        sport={sport}
      />
    );
  }

  // upcoming — render nothing
  return null;
}