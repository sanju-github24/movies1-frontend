// src/pages/LiveCricket.jsx
import React, { useState, useEffect } from "react";
import { MonitorPlay, Clock, Box, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { DateTime } from "luxon";

/* ================= NAVBAR & HERO (Unchanged) ================= */
const LivePageNavbar = () => (
  <nav className="sticky top-0 w-full bg-black/90 text-white z-[100] h-16 flex items-center px-4 sm:px-8">
    <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
      <Link to="/" className="flex items-center">
        <img src="/logo_3.png" alt="Anchor Movies" className="w-28 md:w-32" />
      </Link>
      <div className="flex gap-4 text-sm text-gray-300">
        <Link to="/" className="hover:text-white transition">Home</Link>
        <Link to="/schedule" className="hover:text-white transition">Schedule</Link>
      </div>
    </div>
  </nav>
);

const LiveHero = () => (
  <div className="relative h-[320px] sm:h-[420px] bg-cover bg-center" style={{ backgroundImage: "url('/live-cricket.png')" }}>
    <div className="absolute inset-0 bg-black/60" />
  </div>
);

/* ================= SERIES CARD ================= */
const SeriesBlock = ({ series }) => (
  <Link to={`/series/${series.series_slug}`} className="group relative rounded-xl overflow-hidden border border-gray-700 transition hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
    <div className="h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${series.cover_image_url || "/default-series-bg.jpg"})` }} />
    <div className="absolute inset-0 bg-black/50" />
    <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80">
      <h3 className="text-lg font-semibold truncate">{series.series_title}</h3>
      <p className="text-xs text-gray-400 mt-1"><Calendar className="inline w-3 h-3 mr-1" />{series.current_status}</p>
    </div>
  </Link>
);

/* ================= MATCH CARD ================= */
const MatchCard = ({ match }) => {
  const now = DateTime.now();
  const startTime = match.live_start_datetime ? DateTime.fromISO(match.live_start_datetime) : null;
  
  // Logic: Match is "Truly Live" if status is LIVE OR (SCHEDULED and Time is reached)
  const isTrulyLive = match.status === "LIVE" || (match.status === "SCHEDULED" && startTime && now >= startTime);
  
  // If it's not live yet, it's still scheduled
  const isPending = !isTrulyLive && match.status === "SCHEDULED";

  return (
    <Link
      to={`/live-cricket/player/${match.link_slug}`}
      onClick={(e) => { if (isPending) e.preventDefault(); }}
      className={`group relative rounded-lg overflow-hidden border border-gray-700 transition
        ${isPending ? "opacity-60 cursor-not-allowed" : "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"}
      `}
    >
      <div className="h-48 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${match.cover_poster_url})` }}>
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Dynamic Status Badge */}
      <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded border ${isTrulyLive ? "bg-red-600 border-red-500 animate-pulse text-white" : "bg-black/70 border-gray-600 text-gray-200"}`}>
        {isTrulyLive ? "LIVE" : "UPCOMING"}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80">
        <p className="text-xs text-gray-400">{match.sport} • {match.league}</p>

        {isPending ? (
          <div className="flex items-center gap-1 text-sm text-gray-300 mt-1">
            <Clock className="w-4 h-4" />
            Starts {startTime ? startTime.toRelative() : match.live_start_time}
          </div>
        ) : (
          <>
            <div className="flex justify-between text-white font-semibold mt-1">
              <span>{match.team_1}</span>
              <span>{match.team_1_score}</span>
            </div>
            <div className="flex justify-between text-white font-semibold">
              <span>{match.team_2}</span>
              <span>{match.team_2_score}</span>
            </div>
          </>
        )}
        <p className="text-xs text-gray-400 mt-1 truncate">{match.result_summary}</p>
      </div>
    </Link>
  );
};

/* ================= PAGE ================= */
// src/pages/LiveCricket.jsx

const LiveCricket = () => {
  const [matches, setMatches] = useState([]);
  const [ongoingSeries, setOngoingSeries] = useState([]);
  const [endedSeries, setEndedSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        // Fetch Matches (No Ended matches as per your previous request)
        const { data: matchData } = await supabase
            .from("live_matches")
            .select("*")
            .neq("status", "ENDED")
            .order("live_start_datetime", { ascending: true });
        
        setMatches(matchData || []);

        // Fetch All Series
        const { data: seriesData } = await supabase.from("series").select("*");
        
        if (seriesData) {
            // Separate Series by Status
            setOngoingSeries(seriesData.filter(s => s.current_status !== "ENDED"));
            setEndedSeries(seriesData.filter(s => s.current_status === "ENDED"));
        }
        setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <LivePageNavbar />
      <LiveHero />

      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        
        {/* SECTION 1: ONGOING TOURNAMENTS */}
        {ongoingSeries.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold tracking-wide flex items-center gap-2 mb-6 text-green-400">
              <Box className="w-5 h-5" /> Ongoing Tournaments
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {ongoingSeries.map(series => <SeriesBlock key={series.id} series={series} />)}
            </div>
          </div>
        )}

        {/* SECTION 2: LIVE MATCHES */}
        <div className="mb-12">
            <h2 className="text-xl font-semibold tracking-wide flex items-center gap-2 mb-6">
            <MonitorPlay className="w-5 h-5 text-red-500" /> Live & Upcoming Matches
            </h2>
            {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-lg bg-gray-800 animate-pulse" />)}
            </div>
            ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {matches.map(match => <MatchCard key={match.id} match={match} />)}
            </div>
            )}
        </div>

        {/* SECTION 3: COMPLETED SERIES (ARCHIVE) */}
        {endedSeries.length > 0 && (
          <div className="mt-16 opacity-80">
            <h2 className="text-xl font-semibold tracking-wide flex items-center gap-2 mb-6 text-gray-400">
              <Calendar className="w-5 h-5" /> Completed Series / Archives
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {endedSeries.map(series => <SeriesBlock key={series.id} series={series} />)}
            </div>
          </div>
        )}

      </section>
    </div>
  );
};

export default LiveCricket;