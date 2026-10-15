import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Radio, Play, Pause, Loader2 } from "lucide-react";
import { useMusicPlayer } from "../context/MusicPlayerContext";
import { RADIO_LANGS, fetchStations, countPlay } from "../utils/radio";

/* Live radio: the stations for a language, most listened first. Picking one
   plays it in the music player with the rest of the list queued behind it,
   so Next moves to the next station. The language last picked is kept. */
const LANG_KEY = "radio_lang";
const initialLang = () => {
  try {
    const kept = localStorage.getItem(LANG_KEY);
    if (kept !== null && RADIO_LANGS.some((l) => l.key === kept)) return kept;
    const profile = JSON.parse(localStorage.getItem("profile_langs") || "[]")[0];
    const match = RADIO_LANGS.find((l) => l.key && l.label.toLowerCase() === String(profile || "").toLowerCase());
    if (match) return match.key;
  } catch { /* storage blocked */ }
  return "kannada";
};

function Cover({ s, size = "w-full" }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`${size} aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-amber-500/20 ring-1 ring-white/[0.07] flex items-center justify-center`}>
      {s.poster && !broken
        ? <img src={s.poster} alt="" loading="lazy" onError={() => setBroken(true)} className="w-full h-full object-contain bg-white/[0.03] p-3" />
        : <span className="text-3xl font-black text-white/80">{s.title.slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

export default function RadioPage() {
  const navigate = useNavigate();
  // Opened from the mini player, whose sheet has just grown over the screen.
  const fromMini = !!useLocation().state?.fromMini;
  const player = useMusicPlayer();
  const [lang, setLang] = useState(initialLang);
  const [stations, setStations] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    setStations(null); setErr("");
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* fine */ }
    fetchStations(lang).then((list) => { if (live) setStations(list); },
      (e) => { if (live) { setErr(e.message || "Could not load stations"); setStations([]); } });
    return () => { live = false; };
  }, [lang]);

  const label = RADIO_LANGS.find((l) => l.key === lang)?.label || "";
  const playingId = player?.currentTrack?.id;

  const play = (i) => {
    const s = stations[i];
    if (playingId === s.id) { player.togglePlay(); return; }
    player.playQueue(stations, i, { title: `${label} radio`, link: "/music/radio" });
    countPlay(s.stationuuid);
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <Helmet><title>Live Radio — Music</title></Helmet>
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-28${fromMini ? " mp-page-in" : ""}`}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Back"
          className="mb-6 w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/15 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <Radio className="w-7 h-7 text-red-400" />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Live Radio</h1>
          <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-red-500/15 text-red-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> On air
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-400">FM and online stations from across India, playing now.</p>

        <div className="mt-6 mb-8 flex gap-2 overflow-x-auto home-scroll pb-1">
          {RADIO_LANGS.map((l) => (
            <button key={l.key || "all"} type="button" onClick={() => setLang(l.key)} aria-pressed={lang === l.key}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors
                ${lang === l.key ? "bg-white text-black" : "bg-white/[0.06] text-gray-300 hover:bg-white/15"}`}>
              {l.label}
            </button>
          ))}
        </div>

        {stations === null ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-white/50" /></div>
        ) : stations.length === 0 ? (
          <p className="py-16 text-center text-gray-400">{err ? `Couldn't reach the station list (${err}).` : `No ${label} stations playable here right now.`}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {stations.map((s, i) => {
              const on = playingId === s.id;
              const busy = on && player.isLoading;
              return (
                <button key={s.id} type="button" onClick={() => play(i)} className="group text-left">
                  <div className="relative">
                    <Cover s={s} />
                    <span className={`absolute right-2 bottom-2 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition
                      ${on ? "bg-red-500 text-white opacity-100" : "bg-white text-black opacity-0 group-hover:opacity-100 sm:translate-y-1 group-hover:translate-y-0"}`}>
                      {busy ? <Loader2 className="w-5 h-5 animate-spin" />
                        : on && player.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </span>
                    {on && player.isPlaying && (
                      <span className="absolute left-2 top-2 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">Live</span>
                    )}
                  </div>
                  <p className={`mt-2.5 text-sm font-bold truncate ${on ? "text-red-300" : ""}`}>{s.title}</p>
                  <p className="text-xs text-gray-500 truncate">{[s.place, s.tags].filter(Boolean).join(" · ") || "Live"}</p>
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-10 text-[11px] text-gray-600">Station list from radio-browser.info. Streams come straight from each station.</p>
      </div>
    </div>
  );
}
