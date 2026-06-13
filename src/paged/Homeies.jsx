import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Tv2, Trophy, ChevronRight, Activity } from "lucide-react";
import HeroSection from "./HeroSection";

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
const FIFA_API_BASE = "https://api.fifa.com/api/v3";
const FIFA_COMPETITION = "17";
const FIFA_SEASON = "285023";
const FIFA_STAGE = "289273";
const WT20_SERIES_ID = "12672";

const ICC_FLAGS = {
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", SL: "🇱🇰", AUS: "🇦🇺", IND: "🇮🇳", SA: "🇿🇦",
  PAK: "🇵🇰", NZ: "🇳🇿", WI: "🏴", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", IRE: "🇮🇪",
  BAN: "🇧🇩", NED: "🇳🇱",
};
function getFifaFlag(code) {
  return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`;
}
function fifaTeamName(t) {
  return t?.Abbreviation || t?.TeamName?.find(x => x.Locale === "en-GB")?.Description || "";
}
function fmtIST(d) {
  try {
    return new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
    });
  } catch { return ""; }
}
function getFifaStatus(m) {
  if (m.MatchStatus === 3) return "live";
  if (m.MatchStatus === 0 && m.HomeTeamScore !== null && m.HomeTeamScore !== undefined) return "finished";
  return "upcoming";
}

const _cache = {};
function getCached(k) {
  const e = _cache[k];
  return (e && Date.now() - e.ts < 600000) ? e.data : null;
}
function setCache(k, d) { _cache[k] = { data: d, ts: Date.now() }; }

function PulsingDot({ color = "#ef4444", size = 7 }) {
  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
    </span>
  );
}

function QuickMatchCard({
  sport, homeShort, awayShort, homeFlag, awayFlag,
  homeFlagImg, awayFlagImg, score, status, venue, time, tournament, link,
}) {
  const isLive = status === "live";
  const isFinished = status === "finished";
  const accent = sport === "cricket" ? "#8b5cf6" : "#1ed596";
  const accentBg = sport === "cricket" ? "rgba(139,92,246,0.08)" : "rgba(30,213,150,0.08)";
  const accentBorder = sport === "cricket" ? "rgba(139,92,246,0.2)" : "rgba(30,213,150,0.2)";

  return (
    <Link
      to={link || "/live-cricket-tv"}
      className="block rounded-2xl border transition-all duration-200 overflow-hidden active:scale-[0.98] hover:border-white/20"
      style={{
        background: isLive ? accentBg : "rgba(255,255,255,0.02)",
        borderColor: isLive ? accentBorder : "rgba(255,255,255,0.06)",
        boxShadow: isLive ? `0 0 18px ${accentBg}` : "none",
      }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest truncate max-w-[130px]">
            {tournament}
          </span>
          {isLive ? (
            <span className="flex items-center gap-1 shrink-0">
              <PulsingDot color="#ef4444" size={5} />
              <span className="text-[8px] font-black text-red-400 uppercase">Live</span>
            </span>
          ) : isFinished ? (
            <span className="text-[8px] font-black text-emerald-500 uppercase shrink-0">FT</span>
          ) : (
            <span className="text-[8px] text-gray-700 font-bold shrink-0">{time}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {homeFlagImg ? (
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5">
                <img src={homeFlagImg} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
              </div>
            ) : (
              <span style={{ fontSize: 22, lineHeight: 1 }}>{homeFlag}</span>
            )}
            <div className="min-w-0">
              <p className="text-[12px] font-black text-white uppercase tracking-tight">{homeShort}</p>
              {score?.home !== undefined && (isLive || isFinished) && (
                <p className="text-[10px] font-black" style={{ color: isFinished ? "rgba(255,255,255,0.6)" : accent }}>{score.home}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 text-center px-1">
            {(isLive || isFinished) && score?.home !== undefined
              ? <span className="text-[13px] font-black text-white/40">:</span>
              : <span className="text-[10px] font-black text-gray-700">vs</span>
            }
          </div>

          <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
            <div className="min-w-0 text-right">
              <p className="text-[12px] font-black text-white uppercase tracking-tight">{awayShort}</p>
              {score?.away !== undefined && (isLive || isFinished) && (
                <p className="text-[10px] font-black" style={{ color: isFinished ? "rgba(255,255,255,0.6)" : accent }}>{score.away}</p>
              )}
            </div>
            {awayFlagImg ? (
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5">
                <img src={awayFlagImg} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
              </div>
            ) : (
              <span style={{ fontSize: 22, lineHeight: 1 }}>{awayFlag}</span>
            )}
          </div>
        </div>

        {venue && <p className="text-[8px] text-gray-700 mt-1.5 truncate">📍 {venue}</p>}
      </div>
    </Link>
  );
}

// ─── RECENT RESULT CARD ───────────────────────────────────────────────────────
function RecentResultCard({ m }) {
  const hTeam = m.Home;
  const aTeam = m.Away;
  const hName = hTeam?.Abbreviation || fifaTeamName(hTeam);
  const aName = aTeam?.Abbreviation || fifaTeamName(aTeam);
  const hWon = m.HomeTeamScore > m.AwayTeamScore;
  const aWon = m.AwayTeamScore > m.HomeTeamScore;
  const group = m.GroupName?.find(x => x.Locale === "en-GB")?.Description || "";
  const city = m.Stadium?.CityName?.find(x => x.Locale === "en-GB")?.Description || "";

  return (
    <Link
      to="/live-cricket-tv"
      className="block rounded-2xl border transition-all overflow-hidden active:scale-[0.98] hover:border-white/15"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{group} · FIFA WC 2026</span>
          <span className="text-[8px] font-black text-emerald-500 uppercase">FT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {hTeam?.IdCountry && (
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5">
                <img src={getFifaFlag(hTeam.IdCountry)} alt="" className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = "none"; }} />
              </div>
            )}
            <span className="text-[13px] font-black uppercase tracking-tight"
              style={{ color: hWon ? "#4ade80" : "rgba(255,255,255,0.7)" }}>
              {hName}
            </span>
          </div>
          <div className="shrink-0 text-center px-2">
            <span className="text-[15px] font-black text-white">{m.HomeTeamScore} : {m.AwayTeamScore}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
            <span className="text-[13px] font-black uppercase tracking-tight"
              style={{ color: aWon ? "#4ade80" : "rgba(255,255,255,0.7)" }}>
              {aName}
            </span>
            {aTeam?.IdCountry && (
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5">
                <img src={getFifaFlag(aTeam.IdCountry)} alt="" className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = "none"; }} />
              </div>
            )}
          </div>
        </div>
        {city && <p className="text-[8px] text-gray-700 mt-1.5">📍 {city}</p>}
      </div>
    </Link>
  );
}

// ─── LIVE NOW STRIP ───────────────────────────────────────────────────────────
function LiveNowStrip() {
  const [wt20Matches, setWt20Matches] = useState([]);
  const [fifaMatches, setFifaMatches] = useState([]);
  const [recentFifaResults, setRecentFifaResults] = useState([]);

  const loadWt20 = useCallback(async () => {
    const k = "homeies_wt20";
    const cached = getCached(k);
    if (cached) { setWt20Matches(cached); return; }
    try {
      const res = await fetch(`${API_BASE}/api/wt20/schedule?series_ids=${WT20_SERIES_ID}&game_count=6`);
      if (!res.ok) return;
      const json = await res.json();
      const m = json.data?.matches || [];
      setCache(k, m);
      setWt20Matches(m);
    } catch {}
  }, []);

  const loadFifa = useCallback(async () => {
    const k = "homeies_fifa";
    const kr = "homeies_fifa_recent";
    const cached = getCached(k);
    const cachedR = getCached(kr);
    if (cached && cachedR) {
      setFifaMatches(cached);
      setRecentFifaResults(cachedR);
      return;
    }
    try {
      const url = `${FIFA_API_BASE}/calendar/matches?language=en&idCompetition=${FIFA_COMPETITION}&idSeason=${FIFA_SEASON}&idStage=${FIFA_STAGE}&count=400`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const json = await res.json();
      const all = json.Results || [];
      const todayStr = new Date().toISOString().slice(0, 10);

      // today's + live matches for the cards strip
      const relevant = all
        .filter(m =>
          new Date(m.Date).toISOString().slice(0, 10) === todayStr ||
          getFifaStatus(m) === "live"
        )
        .slice(0, 4);

      // recent finished results
      const recentFinished = all
        .filter(m => getFifaStatus(m) === "finished")
        .sort((a, b) => new Date(b.Date) - new Date(a.Date))
        .slice(0, 4);

      setCache(k, relevant);
      setCache(kr, recentFinished);
      setFifaMatches(relevant);
      setRecentFifaResults(recentFinished);
    } catch {}
  }, []);

  useEffect(() => {
    loadWt20();
    loadFifa();
    const t = setInterval(() => { loadWt20(); loadFifa(); }, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadWt20, loadFifa]);

  const liveCount = [
    ...wt20Matches.filter(m => m.live),
    ...fifaMatches.filter(m => getFifaStatus(m) === "live"),
  ].length;

  const allCards = [
    ...wt20Matches.slice(0, 3).map(m => ({
      id: `wt20-${m.match_id}`,
      sport: "cricket",
      homeShort: m.teama_short || m.teama_short_display_name || "—",
      awayShort: m.teamb_short || m.teamb_short_display_name || "—",
      homeFlag: ICC_FLAGS[m.teama_short] || "🏏",
      awayFlag: ICC_FLAGS[m.teamb_short] || "🏏",
      status: m.live ? "live" : m.upcoming ? "upcoming" : "recent",
      venue: m.venue,
      time: m.match_time_ist ? `${m.match_time_ist} IST` : "",
      tournament: "ICC WT20 WC 2026",
      score: m.scores?.[0] ? {
        home: `${m.scores[0].team_runs}/${m.scores[0].team_wickets} (${m.scores[0].team_overs})`,
        away: null,
      } : undefined,
      link: "/live-cricket-tv",
    })),
    ...fifaMatches.map(m => ({
      id: `fifa-${m.IdMatch}`,
      sport: "football",
      homeShort: m.Home?.Abbreviation || fifaTeamName(m.Home) || "—",
      awayShort: m.Away?.Abbreviation || fifaTeamName(m.Away) || "—",
      homeFlagImg: m.Home?.IdCountry ? getFifaFlag(m.Home.IdCountry) : null,
      awayFlagImg: m.Away?.IdCountry ? getFifaFlag(m.Away.IdCountry) : null,
      status: getFifaStatus(m),
      venue: m.Stadium?.CityName?.find(x => x.Locale === "en-GB")?.Description || "",
      time: fmtIST(m.Date) + " IST",
      tournament: "FIFA WC 2026",
      score: m.HomeTeamScore !== null && m.HomeTeamScore !== undefined
        ? { home: m.HomeTeamScore, away: m.AwayTeamScore }
        : undefined,
      link: "/live-cricket-tv",
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Live & Today */}
      {allCards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity size={13} className="text-red-500" />
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Live & Today</span>
              {liveCount > 0 && (
                <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/20 text-red-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                  <PulsingDot color="#ef4444" size={5} />
                  {liveCount} Live
                </span>
              )}
            </div>
            <Link to="/live-cricket-tv" className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors font-bold">
              All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allCards.slice(0, 6).map(card => (
              <QuickMatchCard key={card.id} {...card} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Results */}
      {recentFifaResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={13} className="text-amber-400" />
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Recent Results</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentFifaResults.map(m => (
              <RecentResultCard key={m.IdMatch} m={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CHANNEL SHORTCUT ─────────────────────────────────────────────────────────
function ChannelShortcut({ label, emoji, desc, color, bg, border, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border p-3.5 transition-all active:scale-[0.98] hover:border-white/20"
      style={{ background: bg, borderColor: border }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-white uppercase tracking-tight">{label}</p>
        <p className="text-[9px] text-gray-600 truncate">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Tv2 size={12} style={{ color }} />
        <span className="text-[9px] font-black uppercase" style={{ color }}>Watch</span>
      </div>
    </Link>
  );
}

// ─── TOURNAMENT BADGE ─────────────────────────────────────────────────────────
function TournamentBadge({ emoji, name, subtitle, color, bg, border, to }) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-2 rounded-2xl border p-4 transition-all active:scale-[0.97] hover:border-white/20"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 28 }}>{emoji}</span>
        <ChevronRight size={14} style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] font-black text-white uppercase tracking-tight leading-tight">{name}</p>
        <p className="text-[9px] text-gray-600 mt-0.5">{subtitle}</p>
      </div>
      <div className="h-0.5 rounded-full w-8" style={{ background: color }} />
    </Link>
  );
}

// ─── HOMEIES PAGE ─────────────────────────────────────────────────────────────
export default function Homeies({ searchTerm }) {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 70% 28% at 50% 0%, rgba(80,40,160,0.12) 0%, transparent 55%)" }} />

      <main className="relative z-10 pb-24">
        <HeroSection />

        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <div className="mt-6">
            <LiveNowStrip />
          </div>

          <div className="mt-7">
            <div className="flex items-center gap-2 mb-3">
              <Tv2 size={13} className="text-blue-400" />
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Watch Live</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChannelShortcut
                label="Cricket Live TV" emoji="🏏"
                desc="Star Sports 1 · English & Hindi · ICC WT20 WC 2026"
                color="#8b5cf6" bg="rgba(139,92,246,0.05)" border="rgba(139,92,246,0.15)"
                to="/live-cricket-tv"
              />
              <ChannelShortcut
                label="Football Live TV" emoji="⚽"
                desc="Sports18 · FIFA World Cup 2026 · English & Hindi"
                color="#1ed596" bg="rgba(30,213,150,0.05)" border="rgba(30,213,150,0.15)"
                to="/live-cricket-tv"
              />
            </div>
          </div>

          <div className="mt-7">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={13} className="text-amber-400" />
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Tournaments</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <TournamentBadge emoji="🏏" name="ICC WT20 WC 2026" subtitle="England · Jun–Jul 2026"
                color="#8b5cf6" bg="rgba(139,92,246,0.06)" border="rgba(139,92,246,0.15)" to="/live-cricket-tv" />
              <TournamentBadge emoji="⚽" name="FIFA WC 2026™" subtitle="USA · Canada · Mexico"
                color="#1ed596" bg="rgba(30,213,150,0.06)" border="rgba(30,213,150,0.15)" to="/live-cricket-tv" />
              <TournamentBadge emoji="📅" name="WT20 Schedule" subtitle="33 matches · 7 venues"
                color="#f59e0b" bg="rgba(245,158,11,0.05)" border="rgba(245,158,11,0.12)" to="/live-cricket-tv" />
              <TournamentBadge emoji="🏆" name="FIFA Fixtures" subtitle="104 matches · Group stage"
                color="#60a5fa" bg="rgba(96,165,250,0.05)" border="rgba(96,165,250,0.12)" to="/live-cricket-tv" />
            </div>
          </div>

          <div className="mt-10 pb-4">
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 flex items-center gap-3">
              <span className="text-lg">📡</span>
              <p className="text-[10px] text-gray-600 font-bold leading-relaxed">
                Streams are third-party embeds. Use Chrome and disable ad-blocker if the stream
                doesn't load. Match scores refresh every 10 minutes.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}