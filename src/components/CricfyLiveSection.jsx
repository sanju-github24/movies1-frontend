// src/components/CricfyLiveSection.jsx
// Cricfy live & scheduled matches for the /sports page. Cards use the event logo
// as the poster (cover on desktop, same art on mobile), grouped Live then
// Scheduled, with category tabs incl. "All". Tapping a card opens the AnchorHD
// player at /sports/live/:id.
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Radio, ChevronRight } from "lucide-react";
import { fetchCricfyEvents } from "../utils/cricfy";

function Poster({ ev }) {
  const art = ev.poster || ev.logoA || ev.logoB || "";
  return (
    <div className="absolute inset-0">
      {art
        ? <img src={art} alt="" loading="lazy" className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
    </div>
  );
}

function CricfyCard({ ev }) {
  const live = ev.status === "live";
  const ended = ev.status === "ended";
  return (
    <Link
      to={`/sports/live/${ev.id}`}
      className="group relative block rounded-xl overflow-hidden border border-white/[0.07] h-36 sm:h-40 bg-gray-900 transition hover:border-white/20 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
    >
      <Poster ev={ev} />
      <div className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wide ${live ? "bg-red-600 border-red-500 text-white animate-pulse motion-reduce:animate-none" : ended ? "bg-black/70 border-gray-600 text-gray-400" : "bg-black/70 border-amber-500/60 text-amber-300"}`}>
        {live ? "● Live" : ended ? "Ended" : "Soon"}
      </div>
      {/* team logos */}
      {ev.logoA && ev.logoB && ev.teamA !== ev.teamB && (
        <div className="absolute top-2 right-2 flex -space-x-2">
          <img src={ev.logoA} alt="" className="w-6 h-6 rounded-full bg-black/40 object-contain ring-1 ring-white/10" onError={(e) => (e.currentTarget.style.display = "none")} />
          <img src={ev.logoB} alt="" className="w-6 h-6 rounded-full bg-black/40 object-contain ring-1 ring-white/10" onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 p-3">
        <p className="text-[11px] text-gray-300/90 font-semibold truncate">{ev.category}</p>
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{ev.title}</h3>
        <p className="text-[11px] text-gray-300 mt-0.5 truncate">{ev.timeLabel}</p>
      </div>
    </Link>
  );
}

export default function CricfyLiveSection({ heading = "Live Sports" }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [cat, setCat] = useState("All");

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

  const rows = useMemo(
    () => events.filter((e) => cat === "All" || e.category === cat),
    [events, cat]
  );
  const live = rows.filter((e) => e.status === "live");
  const soon = rows.filter((e) => e.status === "upcoming");

  if (err) return null;                       // feed down → hide the section, don't break /sports
  if (!loading && events.length === 0) return null;

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

      {/* category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1 scrollbar-none">
        {cats.map(([c, n]) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition ${c === cat ? "bg-blue-600 border-blue-500 text-white" : "bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/10"}`}
          >
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
                {live.map((e) => <CricfyCard key={e.id} ev={e} />)}
              </div>
            </div>
          )}
          {soon.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Scheduled · {soon.length}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {soon.map((e) => <CricfyCard key={e.id} ev={e} />)}
              </div>
            </div>
          )}
          {live.length === 0 && soon.length === 0 && (
            <p className="text-gray-500 text-sm py-6 text-center">No matches in this category right now.</p>
          )}
        </>
      )}
    </div>
  );
}
