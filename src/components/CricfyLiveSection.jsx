// src/components/CricfyLiveSection.jsx
// Cricfy live & scheduled matches for the /sports page. Cards use the event logo
// as the poster, grouped Live then Scheduled, with category tabs incl. "All".
// Tapping a card opens the same LiveViewer the rest of /sports uses (AnchorHD),
// with every server offered as a switchable source (DASH ClearKey included).
import { useState, useEffect, useMemo } from "react";
import { Radio, ChevronRight } from "lucide-react";
import { fetchCricfyEvents, cricfySources } from "../utils/cricfy";
import LiveViewer from "./LiveViewer";

// External art is a mix of hosts; some come as http:// and get blocked as
// mixed content on our https site. Force https and never leak a referer
// (several of these hosts hotlink-block on Referer).
const https = (u) => (u || "").replace(/^http:\/\//i, "https://");
const IMG = { referrerPolicy: "no-referrer", loading: "lazy" };

// A poster built from the two team logos: crest — VS — crest, over a soft
// gradient. Falls back to the single event logo for events that aren't a
// two-team fixture (MotoGP, F1, a tournament).
export function TeamsPoster({ ev, size = "card" }) {
  const twoTeams = ev.logoA && ev.logoB && ev.teamA && ev.teamB && ev.teamA !== ev.teamB;
  const crest = size === "hero" ? "w-20 h-20 sm:w-28 sm:h-28" : "w-12 h-12 sm:w-14 sm:h-14";
  const vs = size === "hero" ? "text-2xl sm:text-3xl" : "text-sm";
  if (twoTeams) {
    const Crest = ({ u, name }) => (
      <div className="flex flex-col items-center gap-1 min-w-0">
        <img src={https(u)} alt="" {...IMG} className={`${crest} object-contain drop-shadow-lg`} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
        <span className="text-[10px] sm:text-xs font-bold text-white/90 truncate max-w-[8ch]">{name}</span>
      </div>
    );
    return (
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
        <div className="absolute inset-0 flex items-center justify-center gap-3 sm:gap-5 px-3 pb-6">
          <Crest u={ev.logoA} name={ev.teamA} />
          <span className={`${vs} font-black text-white/50 italic`}>VS</span>
          <Crest u={ev.logoB} name={ev.teamB} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />
      </div>
    );
  }
  const art = https(ev.poster || ev.logoA || ev.logoB || "");
  return (
    <div className="absolute inset-0">
      {art
        ? <img src={art} alt="" {...IMG} className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
    </div>
  );
}

function CricfyCard({ ev, onPlay }) {
  const live = ev.status === "live";
  const ended = ev.status === "ended";
  return (
    <button
      type="button"
      onClick={() => onPlay(ev)}
      className="group relative block w-full text-left rounded-xl overflow-hidden border border-white/[0.07] h-36 sm:h-40 bg-gray-900 transition hover:border-white/20 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
    >
      <TeamsPoster ev={ev} />
      <div className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wide ${live ? "bg-red-600 border-red-500 text-white animate-pulse motion-reduce:animate-none" : ended ? "bg-black/70 border-gray-600 text-gray-400" : "bg-black/70 border-amber-500/60 text-amber-300"}`}>
        {live ? "● Live" : ended ? "Ended" : "Soon"}
      </div>
      <div className="absolute bottom-0 inset-x-0 p-2.5">
        <p className="text-[10px] text-gray-300/90 font-semibold truncate">{ev.category}</p>
        <h3 className="text-[13px] font-bold text-white leading-tight truncate">{ev.title}</h3>
        <p className="text-[10px] text-gray-300 mt-0.5 truncate">{ev.timeLabel}</p>
      </div>
    </button>
  );
}

export default function CricfyLiveSection({ heading = "Live Sports", liveOnly = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [cat, setCat] = useState("All");
  const [viewer, setViewer] = useState(null);   // { title, sources, poster } | null

  useEffect(() => {
    let on = true;
    fetchCricfyEvents()
      .then((d) => { if (on) { setEvents(d || []); setLoading(false); } })
      .catch((e) => { if (on) { setErr(e.message); setLoading(false); } });
    return () => { on = false; };
  }, []);

  const cats = useMemo(() => {
    const c = {};
    for (const e of events) c[e.category] = (c[e.category] || 0) + 1;
    return [["All", events.length], ...Object.keys(c).sort((a, b) => c[b] - c[a]).map((k) => [k, c[k]])];
  }, [events]);

  const rows = useMemo(() => events.filter((e) => cat === "All" || e.category === cat), [events, cat]);
  const live = rows.filter((e) => e.status === "live");
  const soon = rows.filter((e) => e.status === "upcoming");

  const openEvent = (ev) => setViewer({ title: ev.title, sources: cricfySources(ev), poster: https(ev.poster || ev.logoA || "") });

  if (err) return null;                       // feed down → hide, don't break /sports
  if (!loading && events.length === 0) return null;

  const viewerEl = (
    <LiveViewer
      open={!!viewer}
      title={viewer?.title || ""}
      sources={viewer?.sources || []}
      poster={viewer?.poster || ""}
      onClose={() => setViewer(null)}
    />
  );

  // Compact "Live Now" strip — only the live matches, no tabs/scheduled.
  if (liveOnly) {
    const allLive = events.filter((e) => e.status === "live");
    if (!loading && allLive.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />
          <h2 className="text-lg sm:text-[22px] font-bold text-white tracking-tight">{heading || "Live Now"}</h2>
          <span className="text-xs font-semibold text-gray-500">{allLive.length} live</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 sm:h-40 rounded-xl bg-white/[0.04] animate-pulse" />)
            : allLive.map((e) => <CricfyCard key={e.id} ev={e} onPlay={openEvent} />)}
        </div>
        {viewerEl}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2.5 text-lg sm:text-[22px] font-bold text-white tracking-tight">
          <Radio size={20} className="text-red-500" /> {heading}
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/[0.07] px-3 py-1 text-xs sm:text-[13px] font-semibold text-gray-400">
          {live.length} live <ChevronRight size={14} />
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1 scrollbar-none">
        {cats.map(([c, n]) => (
          <button key={c} onClick={() => setCat(c)}
            className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition ${c === cat ? "bg-blue-600 border-blue-500 text-white" : "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/10"}`}>
            {c} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-36 sm:h-40 rounded-xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-black uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" /> Live now · {live.length}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {live.map((e) => <CricfyCard key={e.id} ev={e} onPlay={openEvent} />)}
              </div>
            </div>
          )}
          {soon.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Scheduled · {soon.length}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {soon.map((e) => <CricfyCard key={e.id} ev={e} onPlay={openEvent} />)}
              </div>
            </div>
          )}
          {live.length === 0 && soon.length === 0 && (
            <p className="text-gray-500 text-sm py-6 text-center">No matches in this category right now.</p>
          )}
        </>
      )}

      <LiveViewer
        open={!!viewer}
        title={viewer?.title || ""}
        sources={viewer?.sources || []}
        poster={viewer?.poster || ""}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}
