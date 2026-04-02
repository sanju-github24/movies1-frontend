import React, { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { Bar, Pie } from "react-chartjs-2";
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { backendUrl } from "../utils/api";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement,
} from "chart.js";
import {
  Users, Film, Hash, MonitorPlay, Search,
  ChevronDown, ChevronUp, TrendingUp, Globe,
  BarChart3, Crown, Clock, ArrowLeft,
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

/* ─── styles ─────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Geist+Mono:wght@300;400;500&display=swap');

  :root {
    --bg:        #080a10;
    --surface:   #0d0f18;
    --panel:     #121520;
    --card:      #171a26;
    --card-hover:#1d2030;
    --border:    rgba(255,255,255,0.06);
    --border-hi: rgba(255,255,255,0.14);
    --violet:    #7c6af7;
    --violet-d:  rgba(124,106,247,0.15);
    --teal:      #2de2c8;
    --teal-d:    rgba(45,226,200,0.12);
    --amber:     #f7b731;
    --amber-d:   rgba(247,183,49,0.13);
    --rose:      #f75c7c;
    --rose-d:    rgba(247,92,124,0.13);
    --sky:       #38bdf8;
    --sky-d:     rgba(56,189,248,0.12);
    --text:      #dde1f0;
    --muted:     #5a6080;
    --font:      'Bricolage Grotesque', sans-serif;
    --mono:      'Geist Mono', monospace;
  }

  .db-root { font-family: var(--font); background: var(--bg); color: var(--text); min-height: 100vh; }
  .db-root * { box-sizing: border-box; }
  .db-wrap  { max-width: 1440px; margin: 0 auto; padding: 36px 28px 64px; }

  /* ── header ── */
  .db-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 48px; padding-bottom: 28px;
    border-bottom: 1px solid var(--border);
  }
  .db-header-left { display: flex; align-items: center; gap: 16px; }
  .db-crown {
    width: 52px; height: 52px; border-radius: 16px;
    background: linear-gradient(135deg, var(--amber), #c47c00);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 32px rgba(247,183,49,0.35);
    flex-shrink: 0;
  }
  .db-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; }
  .db-title em { font-style: normal; color: var(--amber); }
  .db-subtitle { font-size: 12px; color: var(--muted); margin-top: 3px; font-family: var(--mono); letter-spacing: 0.3px; }
  .db-back-btn {
    display: flex; align-items: center; gap: 8px;
    background: var(--card); border: 1px solid var(--border);
    color: var(--muted); padding: 11px 20px; border-radius: 12px;
    text-decoration: none; font-size: 13px; font-weight: 600;
    transition: all .2s;
  }
  .db-back-btn:hover { border-color: var(--border-hi); color: var(--text); }

  /* ── stat cards ── */
  .db-stats-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 18px; margin-bottom: 32px;
  }
  @media (max-width: 1024px) { .db-stats-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px)  { .db-stats-grid { grid-template-columns: 1fr; } }

  .db-stat-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 18px; padding: 24px; cursor: pointer;
    transition: all .25s; position: relative; overflow: hidden;
  }
  .db-stat-card::before {
    content: ''; position: absolute; inset: 0; opacity: 0;
    transition: opacity .25s;
  }
  .db-stat-card:hover { border-color: var(--border-hi); transform: translateY(-2px); background: var(--card-hover); }
  .db-stat-card:hover::before { opacity: 1; }

  .db-stat-icon-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .db-stat-icon {
    width: 42px; height: 42px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
  }
  .db-stat-badge {
    font-family: var(--mono); font-size: 10px; font-weight: 500;
    padding: 4px 10px; border-radius: 20px;
  }
  .db-stat-val { font-size: 44px; font-weight: 800; line-height: 1; letter-spacing: -2px; margin-bottom: 6px; }
  .db-stat-title { font-size: 13px; font-weight: 600; color: var(--muted); letter-spacing: 0.2px; margin-bottom: 4px; }
  .db-stat-sub { font-size: 11px; color: var(--muted); opacity: .7; }

  /* color variants */
  .sv-violet .db-stat-icon { background: var(--violet-d); color: var(--violet); }
  .sv-violet .db-stat-val  { color: var(--violet); }
  .sv-violet .db-stat-badge{ background: var(--violet-d); color: var(--violet); }

  .sv-teal .db-stat-icon { background: var(--teal-d); color: var(--teal); }
  .sv-teal .db-stat-val  { color: var(--teal); }
  .sv-teal .db-stat-badge{ background: var(--teal-d); color: var(--teal); }

  .sv-amber .db-stat-icon { background: var(--amber-d); color: var(--amber); }
  .sv-amber .db-stat-val  { color: var(--amber); }
  .sv-amber .db-stat-badge{ background: var(--amber-d); color: var(--amber); }

  .sv-rose .db-stat-icon { background: var(--rose-d); color: var(--rose); }
  .sv-rose .db-stat-val  { color: var(--rose); }
  .sv-rose .db-stat-badge{ background: var(--rose-d); color: var(--rose); }

  /* ── expanded panels ── */
  .db-panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 28px; margin-bottom: 24px;
    animation: slideDown .3s ease;
  }
  .db-panel-head {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
  }
  .db-panel-title {
    display: flex; align-items: center; gap: 10px;
    font-size: 16px; font-weight: 700;
  }
  .db-panel-count {
    font-family: var(--mono); font-size: 11px;
    padding: 3px 10px; border-radius: 20px; margin-left: 6px;
  }

  /* search */
  .db-search-wrap { position: relative; margin-bottom: 18px; }
  .db-search-wrap .si { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); width: 15px; }
  .db-search-input {
    width: 100%; background: var(--card); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 16px 12px 40px;
    color: var(--text); font-size: 13px; outline: none; transition: border-color .2s;
  }
  .db-search-input::placeholder { color: var(--muted); }
  .db-search-input:focus { border-color: var(--border-hi); }

  /* table */
  .db-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
  .db-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .db-table thead tr { background: var(--card); }
  .db-table th { padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--border); }
  .db-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
  .db-table tbody tr:last-child td { border-bottom: none; }
  .db-table tbody tr:hover { background: var(--card); }
  .db-table .email-cell { color: var(--sky); font-family: var(--mono); font-size: 12px; }
  .db-table .num-cell { color: var(--muted); font-family: var(--mono); }
  .db-table .date-cell { color: var(--muted); font-family: var(--mono); font-size: 11px; }

  /* watch list */
  .db-watch-scroll { max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 4px; }
  .db-watch-scroll::-webkit-scrollbar { width: 4px; }
  .db-watch-scroll::-webkit-scrollbar-track { background: transparent; }
  .db-watch-scroll::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 4px; }
  .db-watch-item {
    display: flex; align-items: center; justify-content: space-between;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 18px; text-decoration: none;
    transition: all .2s;
  }
  .db-watch-item:hover { border-color: var(--sky-d); background: var(--card-hover); }
  .db-watch-item-title { font-weight: 700; font-size: 14px; color: var(--text); margin-bottom: 4px; }
  .db-watch-item-meta { font-size: 11px; color: var(--muted); display: flex; gap: 14px; }
  .db-watch-arrow { color: var(--muted); flex-shrink: 0; }

  /* ── charts grid ── */
  .db-charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }
  @media (max-width: 900px) { .db-charts-grid { grid-template-columns: 1fr; } }

  .db-chart-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; overflow: hidden; transition: border-color .2s;
  }
  .db-chart-card:hover { border-color: var(--border-hi); }
  .db-chart-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; cursor: pointer; user-select: none;
  }
  .db-chart-title-row { display: flex; align-items: center; gap: 10px; }
  .db-chart-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  .db-chart-label { font-size: 14px; font-weight: 700; }
  .db-chart-toggle { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); }
  .db-chart-body { padding: 0 24px 24px; border-top: 1px solid var(--border); padding-top: 20px; }
  .db-chart-full { grid-column: 1 / -1; }

  /* ── language list ── */
  .db-lang-section {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; margin-bottom: 24px;
  }
  .db-lang-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 24px 28px; cursor: pointer; user-select: none;
  }
  .db-lang-body { padding: 0 28px 24px; display: flex; flex-direction: column; gap: 12px; max-height: 600px; overflow-y: auto; }
  .db-lang-body::-webkit-scrollbar { width: 4px; }
  .db-lang-body::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 4px; }
  .db-lang-group {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
  }
  .db-lang-group-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; cursor: pointer; transition: background .2s;
  }
  .db-lang-group-head:hover { background: var(--card-hover); }
  .db-lang-group-title { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; }
  .db-lang-count {
    font-family: var(--mono); font-size: 11px;
    background: var(--sky-d); color: var(--sky);
    padding: 2px 9px; border-radius: 20px;
  }
  .db-lang-movies { padding: 14px 18px; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 8px; }
  .db-movie-tag {
    background: var(--panel); border: 1px solid var(--border);
    color: var(--text); padding: 5px 13px; border-radius: 20px;
    font-size: 12px; text-decoration: none; transition: all .2s;
  }
  .db-movie-tag:hover { background: var(--violet-d); border-color: rgba(124,106,247,0.3); color: var(--violet); }

  /* ── footer ── */
  .db-footer {
    text-align: center; padding-top: 28px;
    border-top: 1px solid var(--border); margin-top: 8px;
  }
  .db-footer-time { font-family: var(--mono); font-size: 11px; color: var(--muted); }

  /* ── utils ── */
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .db-empty { text-align: center; padding: 40px 0; color: var(--muted); font-size: 14px; }
  .db-loading { text-align: center; padding: 40px 0; color: var(--muted); font-size: 13px; font-style: italic; }
`;

/* ─── chart theme ─────────────────────────────────────────── */
const BAR_OPTS = {
  responsive: true,
  plugins: {
    legend: { position: "top", labels: { color: "rgba(220,225,240,0.7)", font: { size: 12 }, boxWidth: 14 } },
    tooltip: { backgroundColor: "#1d2030", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, titleColor: "#dde1f0", bodyColor: "#8890b0" },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: "rgba(220,225,240,0.5)", font: { size: 11 } } },
    y: { ticks: { color: "rgba(220,225,240,0.5)", font: { size: 11 }, precision: 0 }, grid: { color: "rgba(255,255,255,0.05)" } },
  },
};

const PIE_OPTS = {
  responsive: true,
  plugins: {
    legend: { position: "right", labels: { color: "rgba(220,225,240,0.7)", font: { size: 12 }, boxWidth: 14, padding: 16 } },
    tooltip: { backgroundColor: "#1d2030", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1 },
  },
};

const PALETTE = ["#7c6af7","#2de2c8","#f7b731","#f75c7c","#38bdf8","#4ade80","#fb923c"];

/* ─── sub-components ──────────────────────────────────────── */

const StatCard = ({ title, value, variant, Icon, onClick, badge }) => (
  <div className={`db-stat-card ${variant}`} onClick={onClick}>
    <div className="db-stat-icon-row">
      <div className="db-stat-icon"><Icon style={{ width: 20, height: 20 }} /></div>
      {badge && <span className="db-stat-badge">{badge}</span>}
    </div>
    <div className="db-stat-val">{value ?? "—"}</div>
    <div className="db-stat-title">{title}</div>
    {onClick && <div className="db-stat-sub">Click to {badge ? "collapse" : "expand"}</div>}
  </div>
);

const ChartCard = ({ title, icon, iconClass, show, onToggle, children, fullWidth }) => (
  <div className={`db-chart-card${fullWidth ? " db-chart-full" : ""}`}>
    <div className="db-chart-header" onClick={onToggle}>
      <div className="db-chart-title-row">
        <div className={`db-chart-icon ${iconClass}`}>{icon}</div>
        <span className="db-chart-label">{title}</span>
      </div>
      <div className="db-chart-toggle">
        {show ? "Collapse" : "Expand"}
        {show ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
      </div>
    </div>
    {show && <div className="db-chart-body" onClick={(e) => e.stopPropagation()}>{children}</div>}
  </div>
);

/* ─── main ────────────────────────────────────────────────── */
const AdminDashboard = () => {
  const { movies, fetchMovies, allUsersCount } = useContext(AppContext);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingWatch, setLoadingWatch] = useState(false);
  const [watchMovies, setWatchMovies] = useState([]);

  const [showUsers, setShowUsers] = useState(false);
  const [showWatch, setShowWatch] = useState(false);
  const [showWeekly, setShowWeekly] = useState(true);
  const [showLangPie, setShowLangPie] = useState(false);
  const [showByLang, setShowByLang] = useState(false);
  const [showLangList, setShowLangList] = useState(false);
  const [expandedLangs, setExpandedLangs] = useState({});
  const [userSearch, setUserSearch] = useState("");

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`${backendUrl}/api/user/all`);
      const data = await res.json();
      if (data.success) setAllUsers(data.users.filter((u) => u.email !== "sanjusanjay0444@gmail.com"));
    } catch (e) { console.error(e); }
    finally { setLoadingUsers(false); }
  }, []);

  const fetchWatchMovies = useCallback(async () => {
    setLoadingWatch(true);
    const { data, error } = await supabase.from("watch_html").select("*, movie:movie_id(id,title,language,categories,description,slug)");
    if (!error && data) setWatchMovies(data.filter((i) => i.movie));
    setLoadingWatch(false);
  }, []);

  useEffect(() => { fetchMovies(); fetchWatchMovies(); }, [fetchMovies, fetchWatchMovies]);

  const toggleUsers = () => {
    if (!showUsers) fetchAllUsers();
    setShowUsers(!showUsers);
  };

  /* memos */
  const filteredUsers = useMemo(() =>
    allUsers.filter((u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    ), [allUsers, userSearch]);

  const { chartData } = useMemo(() => {
    const counts = {};
    movies.forEach((m) => {
      const d = new Date(m.created_at);
      const week = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
      counts[week] = (counts[week] || 0) + 1;
    });
    const stats = Object.entries(counts).sort((a, b) => a[0] > b[0] ? 1 : -1).slice(-6);
    return {
      weeklyStats: stats,
      chartData: {
        labels: stats.map(([w]) => w),
        datasets: [{ label: "Uploads", data: stats.map(([, c]) => c), backgroundColor: "rgba(124,106,247,0.75)", borderColor: "#7c6af7", borderWidth: 1, borderRadius: 8 }],
      },
    };
  }, [movies]);

  const { languageChartData } = useMemo(() => {
    const counts = {};
    movies.forEach((m) => (m.language || []).forEach((l) => { counts[l] = (counts[l] || 0) + 1; }));
    return {
      languageCounts: counts,
      languageChartData: {
        labels: Object.keys(counts),
        datasets: [{ data: Object.values(counts), backgroundColor: Object.keys(counts).map((_, i) => PALETTE[i % PALETTE.length]), borderColor: "#0d0f18", borderWidth: 2 }],
      },
    };
  }, [movies]);

  const weeklyByLang = useMemo(() => {
    const data = {};
    movies.forEach((m) => {
      const d = new Date(m.created_at);
      const week = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
      (m.language || []).forEach((l) => { if (!data[week]) data[week] = {}; data[week][l] = (data[week][l] || 0) + 1; });
    });
    const weeks = Object.keys(data).sort().slice(-6);
    const langs = [...new Set(movies.flatMap((m) => m.language || []))];
    return {
      labels: weeks,
      datasets: langs.map((lang, i) => ({
        label: lang, data: weeks.map((w) => data[w]?.[lang] || 0),
        backgroundColor: PALETTE[i % PALETTE.length] + "bb", borderRadius: 5,
      })),
    };
  }, [movies]);

  const moviesByLanguage = useMemo(() => {
    const g = {};
    movies.forEach((m) => (m.language || []).forEach((l) => { if (!g[l]) g[l] = []; g[l].push(m); }));
    return Object.fromEntries(Object.entries(g).sort(([, a], [, b]) => b.length - a.length));
  }, [movies]);

  const totalCategories = useMemo(() => [...new Set(movies.flatMap((m) => m.categories || []))].length, [movies]);

  const getJoinDate = (u) => {
    if (u.createdAt) return new Date(u.createdAt).toLocaleDateString();
    if (u._id) return new Date(parseInt(u._id.substring(0, 8), 16) * 1000).toLocaleDateString();
    return "N/A";
  };

  return (
    <AdminLayout>
      <style>{STYLES}</style>
      <div className="db-root">
        <div className="db-wrap">

          {/* HEADER */}
          <div className="db-header">
            <div className="db-header-left">
              <div className="db-crown">
                <Crown style={{ width: 24, height: 24, color: "#0a0b0f" }} />
              </div>
              <div>
                <div className="db-title">AnchorMovies <em>Admin</em></div>
                <div className="db-subtitle">Control panel · {new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" })}</div>
              </div>
            </div>
            <Link to="/" className="db-back-btn">
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Site
            </Link>
          </div>

          {/* STAT CARDS */}
          <div className="db-stats-grid">
            <StatCard title="Total Movies" value={movies.length} variant="sv-violet" Icon={Film} badge="Library" />
            <StatCard title="Categories" value={totalCategories} variant="sv-teal" Icon={Hash} badge="Unique" />
            <StatCard title="Registered Users" value={allUsersCount} variant="sv-amber" Icon={Users} onClick={toggleUsers} badge={showUsers ? "Open ▴" : undefined} />
            <StatCard title="Watchable Movies" value={watchMovies.length} variant="sv-rose" Icon={MonitorPlay} onClick={() => setShowWatch(!showWatch)} badge={showWatch ? "Open ▴" : undefined} />
          </div>

          {/* USERS PANEL */}
          {showUsers && (
            <div className="db-panel" style={{ borderColor: "rgba(247,183,49,0.2)" }}>
              <div className="db-panel-head">
                <div className="db-panel-title" style={{ color: "var(--amber)" }}>
                  <Users style={{ width: 18, height: 18 }} />
                  User Registry
                  <span className="db-panel-count" style={{ background:"var(--amber-d)",color:"var(--amber)" }}>{filteredUsers.length} users</span>
                </div>
              </div>
              <div className="db-search-wrap">
                <Search className="si" />
                <input type="text" className="db-search-input" placeholder="Search by name or email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              </div>
              {loadingUsers ? (
                <div className="db-loading">Loading users…</div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Name</th><th>Email</th><th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? filteredUsers.map((u, i) => (
                        <tr key={u._id || i}>
                          <td className="num-cell">{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{u.name || "—"}</td>
                          <td className="email-cell">{u.email}</td>
                          <td className="date-cell">{getJoinDate(u)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" className="db-empty">No users match your search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* WATCH PANEL */}
          {showWatch && (
            <div className="db-panel" style={{ borderColor: "rgba(247,92,124,0.2)" }}>
              <div className="db-panel-head">
                <div className="db-panel-title" style={{ color: "var(--rose)" }}>
                  <MonitorPlay style={{ width: 18, height: 18 }} />
                  Watchable Movies
                  <span className="db-panel-count" style={{ background:"var(--rose-d)",color:"var(--rose)" }}>{watchMovies.length} titles</span>
                </div>
              </div>
              {loadingWatch ? (
                <div className="db-loading">Loading…</div>
              ) : watchMovies.length === 0 ? (
                <div className="db-empty">No watchable movies in database.</div>
              ) : (
                <div className="db-watch-scroll">
                  {watchMovies.map((wm) => (
                    <Link to={`/movie/${wm.movie.slug}`} key={wm.id} className="db-watch-item">
                      <div>
                        <div className="db-watch-item-title">{wm.movie.title}</div>
                        <div className="db-watch-item-meta">
                          <span>🎬 {wm.movie.language?.join(", ") || "Unknown"}</span>
                          <span># {wm.movie.categories?.join(", ") || "—"}</span>
                        </div>
                      </div>
                      <ChevronDown className="db-watch-arrow" style={{ transform:"rotate(-90deg)", width:16, height:16 }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CHARTS */}
          <div className="db-charts-grid">
            <ChartCard
              title="Weekly Upload Trend"
              icon={<TrendingUp style={{ width: 16, height: 16 }} />}
              iconClass="db-ci-violet"
              show={showWeekly}
              onToggle={() => setShowWeekly(!showWeekly)}
              style={{ background:"var(--violet-d)", color:"var(--violet)" }}
            >
              <div style={{ height: 280 }}>
                {movies.length > 0
                  ? <Bar data={chartData} options={BAR_OPTS} />
                  : <div className="db-empty">No data.</div>}
              </div>
            </ChartCard>

            <ChartCard
              title="Language Distribution"
              icon={<Globe style={{ width: 16, height: 16 }} />}
              iconClass="db-ci-teal"
              show={showLangPie}
              onToggle={() => setShowLangPie(!showLangPie)}
            >
              <div style={{ height: 280, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {movies.length > 0
                  ? <Pie data={languageChartData} options={PIE_OPTS} />
                  : <div className="db-empty">No data.</div>}
              </div>
            </ChartCard>

            <ChartCard
              title="Weekly Uploads by Language"
              icon={<BarChart3 style={{ width: 16, height: 16 }} />}
              iconClass="db-ci-amber"
              show={showByLang}
              onToggle={() => setShowByLang(!showByLang)}
              fullWidth
            >
              <div style={{ height: 320 }}>
                {movies.length > 0
                  ? <Bar data={weeklyByLang} options={{ ...BAR_OPTS, scales: { ...BAR_OPTS.scales, x: { ...BAR_OPTS.scales.x, stacked: true }, y: { ...BAR_OPTS.scales.y, stacked: true } } }} />
                  : <div className="db-empty">No data.</div>}
              </div>
            </ChartCard>
          </div>

          {/* LANGUAGE LIST */}
          <div className="db-lang-section">
            <div className="db-lang-header" onClick={() => setShowLangList(!showLangList)}>
              <div className="db-panel-title" style={{ color: "var(--teal)" }}>
                <Film style={{ width: 18, height: 18 }} />
                Movies by Language
                <span className="db-panel-count" style={{ background:"var(--teal-d)",color:"var(--teal)" }}>
                  {Object.keys(moviesByLanguage).length} langs
                </span>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--muted)" }}>
                {showLangList ? "Collapse" : "Expand"}
                {showLangList ? <ChevronUp style={{ width:14,height:14 }} /> : <ChevronDown style={{ width:14,height:14 }} />}
              </div>
            </div>
            {showLangList && (
              <div className="db-lang-body">
                {Object.entries(moviesByLanguage).map(([lang, list]) => (
                  <div key={lang} className="db-lang-group">
                    <div className="db-lang-group-head" onClick={() => setExpandedLangs((p) => ({ ...p, [lang]: !p[lang] }))}>
                      <div className="db-lang-group-title">
                        {lang}
                        <span className="db-lang-count">{list.length}</span>
                      </div>
                      {expandedLangs[lang] ? <ChevronUp style={{ width:14,height:14,color:"var(--muted)" }} /> : <ChevronDown style={{ width:14,height:14,color:"var(--muted)" }} />}
                    </div>
                    {expandedLangs[lang] && (
                      <div className="db-lang-movies">
                        {list.map((m) => (
                          <Link to={`/movie/${m.slug}`} key={m.id} className="db-movie-tag">{m.title}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="db-footer">
            <div className="db-footer-time">
              <Clock style={{ width:11,height:11,display:"inline",marginRight:5,verticalAlign:"middle" }} />
              Rendered at {new Date().toLocaleTimeString()}
            </div>
          </div>

        </div>
      </div>

      {/* chart icon colors injected inline since we can't use dynamic class names */}
      <style>{`
        .db-ci-violet { background: var(--violet-d); color: var(--violet); }
        .db-ci-teal   { background: var(--teal-d);   color: var(--teal);   }
        .db-ci-amber  { background: var(--amber-d);  color: var(--amber);  }
      `}</style>
    </AdminLayout>
  );
};

export default AdminDashboard;