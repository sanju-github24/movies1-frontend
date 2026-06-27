import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

/**
 * BlogList.jsx — News hub page.
 *
 * Layout, top to bottom:
 *   1. Header
 *   2. Cricket hero — latest 2 stories from ESPNcricinfo, asymmetric tiles
 *   3. Language rows — Bollywood / Kannada / Tamil / Telugu, horizontal
 *      scroll-snap carousels
 *   4. Mixed feed — all sources together, with tabs + search (FilmiBeatSection)
 *   5. Footer
 *
 * The previous Supabase-backed "admin uploaded" blog list has been removed —
 * this page is now driven entirely by the live RSS proxy.
 */

const RSS_PROXY_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://movies1-backend.onrender.com";

const FEEDS = [
  { key: "all",       label: "All",       color: "#7F77DD", icon: "🎬" },
  { key: "bollywood", label: "Bollywood", color: "#D85A30", icon: "🎬" },
  { key: "tamil",     label: "Tamil",     color: "#1D9E75", icon: "🎭" },
  { key: "telugu",    label: "Telugu",    color: "#378ADD", icon: "🌟" },
  { key: "kannada",   label: "Kannada",   color: "#BA7517", icon: "🏺" },
  { key: "malayalam", label: "Malayalam", color: "#D4537E", icon: "🌴" },
  { key: "hollywood", label: "Hollywood", color: "#444441", icon: "🎥" },
  { key: "tv",        label: "TV",        color: "#639922", icon: "📺" },
  { key: "ott",       label: "OTT",       color: "#993556", icon: "🎞️" },
  { key: "cricket",   label: "Cricket",   color: "#0B6E4F", icon: "🏏" },
];

const LANGUAGE_ROWS = [
  { key: "bollywood", label: "Bollywood", color: "#D85A30", icon: "🎬" },
  { key: "kannada",   label: "Kannada",   color: "#BA7517", icon: "🏺" },
  { key: "tamil",     label: "Tamil",     color: "#1D9E75", icon: "🎭" },
  { key: "telugu",    label: "Telugu",    color: "#378ADD", icon: "🌟" },
];

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

async function fetchFeed(key, count) {
  const url = `${RSS_PROXY_BASE}/api/rss?feed=${key}&count=${count}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Feed returned success:false");
  return json.articles || [];
}

// ─── Seam divider — the page's one recurring signature mark ─────────────────
// A stitched-seam curve, like the one on a cricket ball, used sparingly as a
// section break. Ties the new cricket content into the page's identity
// without competing with the movie-news cards underneath it.
const SeamDivider = () => (
  <svg
    viewBox="0 0 1200 40"
    className="w-full h-10 my-10 opacity-70"
    preserveAspectRatio="none"
  >
    <path
      d="M0 20 Q 150 0, 300 20 T 600 20 T 900 20 T 1200 20"
      fill="none"
      stroke="#c5c107"
      strokeWidth="1.5"
      strokeDasharray="2 9"
    />
  </svg>
);

// ─── Cricket Hero ─────────────────────────────────────────────────────────────
const CricketHero = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchFeed("cricket", 2)
      .then((data) => { if (!cancelled) setStories(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (error) return null; // fail quietly — cricket feed is a bonus, not core

  return (
    <section className="relative">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-[#0B6E4F] px-2.5 py-1 rounded-full uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
          🏏 Cricket
        </span>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
          From ESPNcricinfo
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-5">
          <div className="sm:col-span-3 h-72 bg-white/5 rounded-2xl animate-pulse" />
          <div className="sm:col-span-2 h-72 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-5">
          {stories[0] && (
            <Link
              to={`/news?url=${encodeURIComponent(stories[0].link)}`}
              className="group sm:col-span-3 relative rounded-2xl overflow-hidden h-72 sm:h-80 bg-[#0d1f17] border border-[#0B6E4F]/30 hover:border-[#0B6E4F]/70 transition-all"
            >
              {stories[0].thumbnail ? (
                <img
                  src={stories[0].thumbnail}
                  alt={stories[0].title}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-20">🏏</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="text-[10px] font-bold text-[#7CF5C2] uppercase tracking-widest">
                  🕒 {timeAgo(stories[0].pubDate)}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-snug mt-2 line-clamp-3 group-hover:text-[#7CF5C2] transition">
                  {stories[0].title}
                </h3>
              </div>
            </Link>
          )}

          {stories[1] && (
            <Link
              to={`/news?url=${encodeURIComponent(stories[1].link)}`}
              className="group sm:col-span-2 relative rounded-2xl overflow-hidden h-72 sm:h-80 bg-[#0d1f17] border border-[#0B6E4F]/30 hover:border-[#0B6E4F]/70 transition-all"
            >
              {stories[1].thumbnail ? (
                <img
                  src={stories[1].thumbnail}
                  alt={stories[1].title}
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">🏏</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className="text-[10px] font-bold text-[#7CF5C2] uppercase tracking-widest">
                  🕒 {timeAgo(stories[1].pubDate)}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white leading-snug mt-2 line-clamp-4 group-hover:text-[#7CF5C2] transition">
                  {stories[1].title}
                </h3>
              </div>
            </Link>
          )}
        </div>
      )}
    </section>
  );
};

// ─── Compact carousel card (used in language rows) ───────────────────────────
const CarouselCard = ({ article, accent }) => (
  <Link
    to={`/news?url=${encodeURIComponent(article.link)}`}
    className="group shrink-0 w-64 snap-start bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:-translate-y-0.5"
  >
    <div className="relative h-36 bg-[#111] overflow-hidden">
      {article.thumbnail ? (
        <img
          src={article.thumbnail}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: `${accent}22` }} />
      )}
    </div>
    <div className="p-3.5">
      <h4 className="text-sm font-semibold text-gray-100 group-hover:text-[#c5c107] transition leading-snug line-clamp-2">
        {article.title}
      </h4>
      <p className="text-[10px] text-gray-500 mt-2">🕒 {timeAgo(article.pubDate)}</p>
    </div>
  </Link>
);

// ─── Language Row ─────────────────────────────────────────────────────────────
const LanguageRow = ({ feed }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const scrollerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchFeed(feed.key, 10)
      .then((data) => { if (!cancelled) setArticles(data); })
      .catch(() => { if (!cancelled) setArticles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [feed.key]);

  const scrollBy = (dir) => {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  if (!loading && articles.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: feed.color }}
          >
            {feed.icon} {feed.label}
          </span>
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Movie News</h3>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${feed.label} news left`}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition flex items-center justify-center"
          >
            ←
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${feed.label} news right`}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition flex items-center justify-center"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-64 h-52 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          {articles.map((a) => (
            <CarouselCard key={a.id || a.link} article={a} accent={feed.color} />
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Mixed-feed News Card (full grid section below the language rows) ────────
const NewsCard = ({ article, isNew }) => {
  const feed = FEEDS.find((f) => f.key === article.source) || FEEDS[1];

  return (
    <Link
      to={`/news?url=${encodeURIComponent(article.link)}`}
      className="group bg-[#1a1a1a] border border-white/5 rounded-2xl hover:border-[#c5c107]/40 transition-all duration-300 overflow-hidden flex flex-col hover:shadow-[0_0_30px_rgba(197,193,7,0.08)] hover:-translate-y-0.5"
    >
      <div className="relative overflow-hidden h-44 bg-[#111] flex items-center justify-center">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center text-5xl"
          style={{ display: article.thumbnail ? "none" : "flex" }}
        >
          {feed.icon}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/80 to-transparent opacity-0 group-hover:opacity-100 transition" />
        <span
          className="absolute top-2 left-2 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: feed.color }}
        >
          {feed.label}
        </span>
        {isNew && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
            NEW
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow gap-2">
        <h3 className="text-sm font-semibold text-gray-100 group-hover:text-[#c5c107] transition leading-snug line-clamp-3">
          {article.title}
        </h3>
        {article.preview && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {article.preview}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">
            {article.category}
          </span>
          <span className="text-[10px] text-gray-500">
            🕒 {timeAgo(article.pubDate)}
          </span>
        </div>
      </div>
    </Link>
  );
};

// ─── Mixed Feed Section (all sources, tabs + search) ──────────────────────────
const MixedFeedSection = () => {
  const [news, setNews]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState("all");
  const [search, setSearch]           = useState("");
  const [prevIds, setPrevIds]         = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(Date.now() + REFRESH_INTERVAL_MS);
  const [countdown, setCountdown]     = useState("");

  const fetchNews = useCallback(async (feedKey = "all", isManual = false) => {
    if (!isManual) setLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(feedKey, 30);
      setPrevIds(new Set(news.map((n) => n.id)));
      setNews(data);
      setLastUpdated(new Date());
      setNextRefresh(Date.now() + REFRESH_INTERVAL_MS);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [news]);

  // Wake up Render instance immediately on mount (free tier sleeps after 15min)
  useEffect(() => {
    fetch(`${RSS_PROXY_BASE}/api/rss?feed=bollywood&count=1`).catch(() => {});
  }, []);

  useEffect(() => {
    fetchNews("all");
    const interval = setInterval(() => fetchNews("all"), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchNews(activeTab);
  }, [activeTab]); // eslint-disable-line

  useEffect(() => {
    const tick = setInterval(() => {
      const rem = Math.max(0, nextRefresh - Date.now());
      const m   = Math.floor(rem / 60000);
      const s   = Math.floor((rem % 60000) / 1000);
      setCountdown(`${m}m ${String(s).padStart(2, "0")}s`);
    }, 1000);
    return () => clearInterval(tick);
  }, [nextRefresh]);

  const filtered = news.filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  const todayCount = news.filter(
    (a) => Date.now() - new Date(a.pubDate) < 86400000
  ).length;

  return (
    <section className="mt-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-[#c5c107] uppercase tracking-[0.2em] mb-1">Live Feed</p>
          <h2 className="text-2xl font-extrabold text-white uppercase tracking-wide">
            📡 Everything, Mixed
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {news.length} articles · {todayCount} today ·{" "}
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search news…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-[#c5c107] transition"
          />
          <button
            onClick={() => fetchNews(activeTab, true)}
            className="text-sm bg-white/5 border border-white/10 text-white px-4 py-1.5 rounded-lg hover:bg-[#c5c107] hover:text-black hover:border-[#c5c107] transition font-medium"
          >
            ↻ Refresh
          </button>
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            LIVE
          </span>
        </div>
      </div>

      {/* Source tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FEEDS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveTab(f.key)}
            className="text-xs px-3.5 py-1.5 rounded-full border transition font-semibold"
            style={
              activeTab === f.key
                ? { background: f.color, color: "#fff", borderColor: f.color }
                : { background: "transparent", color: "#888", borderColor: "rgba(255,255,255,0.1)" }
            }
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/5 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-5 text-sm space-y-3">
          <p><strong>⚠️ News feed error:</strong> {error}</p>
          <div className="text-xs text-red-400/70 space-y-1">
            <p>Backend: <code className="bg-red-500/10 px-1.5 py-0.5 rounded font-mono">{RSS_PROXY_BASE}/api/rss?feed=all</code></p>
            <p className="text-gray-500">
              Render free tier sleeps after 15 min. The wake-up ping above fires automatically,
              but it takes ~30s. Wait a moment then:
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => fetchNews(activeTab, true)}
              className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20 px-4 py-1.5 rounded-lg transition font-semibold"
            >
              ↻ Try again
            </button>
            <a
              href={`${RSS_PROXY_BASE}/api/rss?feed=bollywood&count=2`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 underline"
            >
              Check backend directly ↗
            </a>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center text-gray-600 py-10">
          No articles match your search.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <NewsCard
              key={article.id || article.link}
              article={article}
              isNew={!prevIds.has(article.id)}
            />
          ))}
        </div>
      )}

      {!loading && !error && (
        <p className="text-center text-xs text-gray-600 mt-8">
          {filtered.length} articles · refreshes in {countdown} ·{" "}
          <a href="https://www.filmibeat.com" target="_blank" rel="noopener noreferrer" className="text-[#c5c107] hover:underline">
            filmibeat.com
          </a>
          {" "}&{" "}
          <a href="https://www.espncricinfo.com" target="_blank" rel="noopener noreferrer" className="text-[#0B6E4F] hover:underline">
            espncricinfo.com
          </a>
        </p>
      )}
    </section>
  );
};

// ─── Main BlogList ────────────────────────────────────────────────────────────
const BlogList = () => {
  return (
    <>
      <Helmet>
        <title>Movie & Cricket News | 1AnchorMovies</title>
        <meta
          name="description"
          content="Live movie news from Bollywood, Tamil, Telugu, Kannada, Malayalam and Hollywood cinema, plus the latest cricket headlines — all on 1AnchorMovies."
        />
        <link rel="canonical" href="https://www.1anchormovies.live/blogs" />
      </Helmet>

      <div className="min-h-screen bg-[#0e0e0e] text-white font-['Roboto']">
        <header className="bg-black/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-[64px]">
            <Link to="/" className="flex items-center space-x-2">
              <h1 className="text-white text-xl font-bold tracking-wide uppercase">
                Anchor<span className="text-[#c5c107]">Movies</span>
              </h1>
            </Link>
            <nav className="hidden md:flex space-x-6 text-gray-400 font-medium uppercase text-xs tracking-wider">
              <Link to="/" className="hover:text-white transition">Home</Link>
              <Link to="/blogs" className="text-[#c5c107]">Blogs</Link>
              <Link to="/about" className="hover:text-white transition">About</Link>
              <Link to="/contact" className="hover:text-white transition">Contact</Link>
            </nav>
          </div>
        </header>

        <section className="relative bg-[#0e0e0e] border-b border-white/5 py-16 px-4 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#c5c107]/5 blur-[120px]" />
          </div>
          <p className="relative text-[10px] font-bold text-[#c5c107] uppercase tracking-[0.3em] mb-3">
            Entertainment · Cricket · Live Updates
          </p>
          <h2 className="relative text-4xl sm:text-6xl font-black mb-4 tracking-tight">
            Movie<span className="text-[#c5c107]">News</span>
          </h2>
          <p className="relative text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
            Reviews, industry updates, and headlines across Bollywood, Tamil, Telugu, Kannada,
            Malayalam and Hollywood cinema — plus the latest from the cricket world.
          </p>
        </section>

        <main className="max-w-7xl mx-auto py-14 px-4 sm:px-6 lg:px-8">
          <CricketHero />

          <SeamDivider />

          {LANGUAGE_ROWS.map((feed) => (
            <LanguageRow key={feed.key} feed={feed} />
          ))}

          <SeamDivider />

          <MixedFeedSection />
        </main>

        <footer className="bg-black border-t border-white/5 text-gray-500 py-12 mt-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 px-6">
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold tracking-widest text-gray-300">Join our community</h4>
              <p className="text-sm leading-relaxed">Get updates on the latest movies, blogs, and entertainment news.</p>
            </div>
            <div className="flex justify-center items-center">
              <h1 className="text-white text-5xl font-black tracking-tighter italic">ANCHOR</h1>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <Link to="/about" className="hover:text-white block transition">About Us</Link>
                <Link to="/contact" className="hover:text-white block transition">Contact</Link>
                <Link to="/blogs" className="hover:text-white block transition">Blogs</Link>
                <a href="https://t.me/AnchorMovies" target="_blank" rel="noreferrer" className="hover:text-white block transition">Telegram</a>
              </div>
              <div className="space-y-2">
                <a href="#" className="hover:text-white block transition">Privacy Policy</a>
                <a href="#" className="hover:text-white block transition">Terms of Service</a>
                <a href="#" className="hover:text-white block transition">Refund Policy</a>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-gray-600">
            <p>&copy; {new Date().getFullYear()} AnchorMovies. All Rights Reserved.</p>
            <div className="flex justify-center gap-5 mt-2 font-medium">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition">Instagram</a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition">Twitter</a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition">Facebook</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default BlogList;
