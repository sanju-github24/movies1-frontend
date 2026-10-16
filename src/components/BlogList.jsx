import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Newspaper, Clock } from "lucide-react";
import { absUrl } from "../utils/seo";
import { backendUrl } from "../utils/api";
import { POSTER_SHELL } from "../utils/posterGrid";

/**
 * BlogList.jsx — the News page (/blogs).
 *
 * Top to bottom: the two latest cricket stories, a row per film industry, and
 * a "Latest" feed of everything with source chips and search. Every card opens
 * the story on the site (/news?url=…), where it is read in full.
 *
 * Drawn in the site's own look — the dark page, the heavy italic page title,
 * neutral chips that go white when chosen, quiet rounded cards. It used to
 * carry its own yellow theme, emoji labels, a different font and a second
 * footer under the site's.
 */

const API = backendUrl;

// Each source keeps a colour, but only as a small dot beside its name.
const FEEDS = [
  { key: "all",       label: "All",       color: "#9CA3AF" },
  { key: "bollywood", label: "Bollywood", color: "#D85A30" },
  { key: "tamil",     label: "Tamil",     color: "#1D9E75" },
  { key: "telugu",    label: "Telugu",    color: "#378ADD" },
  { key: "kannada",   label: "Kannada",   color: "#BA7517" },
  { key: "malayalam", label: "Malayalam", color: "#D4537E" },
  { key: "hollywood", label: "Hollywood", color: "#9CA3AF" },
  { key: "tv",        label: "TV",        color: "#639922" },
  { key: "ott",       label: "OTT",       color: "#C0567F" },
  { key: "cricket",   label: "Cricket",   color: "#10B981" },
];
const feedOf = (key) => FEEDS.find((f) => f.key === key) || FEEDS[1];

const LANGUAGE_ROWS = ["bollywood", "kannada", "tamil", "telugu"].map(feedOf);

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (Number.isNaN(diff)) return "";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

async function fetchFeed(key, count) {
  const res = await fetch(`${API}/api/rss?feed=${key}&count=${count}`);
  if (!res.ok) throw new Error(`The news service answered ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "The news service sent nothing back");
  return json.articles || [];
}

const storyLink = (a) => `/news?url=${encodeURIComponent(a.link)}`;

// ─── Small pieces ────────────────────────────────────────────────────────────
const SourceDot = ({ feed, className = "" }) => (
  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 ${className}`}>
    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: feed.color }} />
    {feed.label}
  </span>
);

// Positioned by the caller: `relative` with an aspect ratio in a card, or
// `absolute inset-0` to fill a tile. Both on one element, the first wins and
// a tile's picture collapses to nothing.
const Thumb = ({ src, alt, className = "relative" }) => {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`overflow-hidden bg-white/[0.04] ${className}`}>
      {src && !broken ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Newspaper className="w-7 h-7 text-gray-700" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ children, right }) => (
  <div className="flex items-end justify-between gap-4 mb-4">
    <h2 className="text-lg sm:text-[22px] font-bold text-white tracking-tight">{children}</h2>
    {right}
  </div>
);

// ─── Cricket: the two latest stories, one large, one beside it ───────────────
const CricketHero = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchFeed("cricket", 2)
      .then((d) => { if (live) setStories(d); })
      .catch(() => { if (live) setFailed(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  // The cricket feed is a bonus; if it is down the page simply starts lower.
  if (failed || (!loading && stories.length === 0)) return null;

  return (
    <section className="mb-12">
      <SectionTitle
        right={<span className="text-[11px] text-gray-500 font-semibold">From ESPNcricinfo</span>}
      >
        Cricket
      </SectionTitle>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-3 h-64 sm:h-80 rounded-2xl shimmer" />
          <div className="md:col-span-2 h-64 sm:h-80 rounded-2xl shimmer" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5">
          {stories.map((s, i) => (
            <Link
              key={s.link}
              to={storyLink(s)}
              className={`group relative rounded-2xl overflow-hidden h-64 sm:h-80 ring-1 ring-white/[0.07] hover:ring-white/20 transition ${i === 0 ? "md:col-span-3" : "md:col-span-2"}`}
            >
              <Thumb src={s.thumbnail} alt={s.title} className="absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Cricket · {timeAgo(s.pubDate)}
                </span>
                <h3 className={`font-black tracking-tight text-white leading-snug mt-2 ${i === 0 ? "text-xl sm:text-2xl line-clamp-3" : "text-lg line-clamp-4"}`}>
                  {s.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

// ─── One row per film industry ───────────────────────────────────────────────
const RowCard = ({ article }) => (
  <Link to={storyLink(article)} className="group shrink-0 w-60 sm:w-64 snap-start">
    <Thumb src={article.thumbnail} alt={article.title} className="relative aspect-video rounded-xl ring-1 ring-white/[0.07] group-hover:ring-white/20 transition" />
    <h3 className="text-[13px] sm:text-sm font-semibold text-gray-200 group-hover:text-white leading-snug line-clamp-2 mt-3">
      {article.title}
    </h3>
    <p className="text-[11px] text-gray-500 mt-1">{timeAgo(article.pubDate)}</p>
  </Link>
);

const LanguageRow = ({ feed }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const scroller = useRef(null);

  useEffect(() => {
    let live = true;
    fetchFeed(feed.key, 12)
      .then((d) => { if (live) setArticles(d); })
      .catch(() => { if (live) setArticles([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [feed.key]);

  if (!loading && articles.length === 0) return null;

  const nudge = (dir) => scroller.current?.scrollBy({ left: dir * 540, behavior: "smooth" });
  const arrow = "w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white flex items-center justify-center transition";

  return (
    <section className="mb-10">
      <SectionTitle
        right={
          <div className="hidden sm:flex items-center gap-2">
            <button type="button" onClick={() => nudge(-1)} aria-label={`Earlier ${feed.label} stories`} className={arrow}><ChevronLeft className="w-5 h-5" /></button>
            <button type="button" onClick={() => nudge(1)} aria-label={`More ${feed.label} stories`} className={arrow}><ChevronRight className="w-5 h-5" /></button>
          </div>
        }
      >
        <span className="inline-flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full" style={{ background: feed.color }} />
          {feed.label}
        </span>
      </SectionTitle>

      <div ref={scroller} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="shrink-0 w-60 sm:w-64">
                <div className="aspect-video rounded-xl shimmer" />
                <div className="h-3 rounded-full shimmer mt-3" />
                <div className="h-3 w-2/3 rounded-full shimmer mt-2" />
              </div>
            ))
          : articles.map((a) => <RowCard key={a.id || a.link} article={a} />)}
      </div>
    </section>
  );
};

// ─── Latest: everything, with source chips and search ────────────────────────
const NewsCard = ({ article, isNew }) => {
  const feed = feedOf(article.source);
  return (
    <Link
      to={storyLink(article)}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white/[0.03] ring-1 ring-white/[0.07] hover:ring-white/20 hover:bg-white/[0.05] transition"
    >
      <div className="relative">
        <Thumb src={article.thumbnail} alt={article.title} className="relative aspect-video" />
        {isNew && (
          <span className="absolute top-3 right-3 rounded-full bg-red-500 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
            New
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-3">
          <SourceDot feed={feed} />
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <Clock className="w-3 h-3" /> {timeAgo(article.pubDate)}
          </span>
        </div>
        <h3 className="text-[15px] font-bold text-gray-100 group-hover:text-white leading-snug line-clamp-3">
          {article.title}
        </h3>
        {article.preview && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{article.preview}</p>
        )}
      </div>
    </Link>
  );
};

const LatestSection = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [prevIds, setPrevIds] = useState(() => new Set());
  const [lastUpdated, setLastUpdated] = useState(null);
  const newsRef = useRef([]);

  const load = useCallback(async (feedKey, { quiet = false } = {}) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(feedKey, 30);
      setPrevIds(new Set(newsRef.current.map((n) => n.id)));
      newsRef.current = data;
      setNews(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Changing the source loads it; the page also refreshes itself every hour.
  useEffect(() => {
    load(activeTab);
    const t = setInterval(() => load(activeTab, { quiet: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [activeTab, load]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? news.filter((a) => a.title.toLowerCase().includes(q) || (a.category || "").toLowerCase().includes(q))
    : news;
  const todayCount = news.filter((a) => Date.now() - new Date(a.pubDate) < 86400000).length;

  return (
    <section>
      <SectionTitle
        right={
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 text-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live
          </span>
        }
      >
        Latest
      </SectionTitle>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <label className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Search news…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-white/10 focus:ring-white/30 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => load(activeTab, { quiet: true })}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] ring-1 ring-white/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-gray-200 hover:bg-white/[0.1] hover:text-white disabled:opacity-60 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <span className="text-[11px] text-gray-500">
            {news.length} stories · {todayCount} today
            {lastUpdated && <> · updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</>}
          </span>
        </div>
      </div>

      {/* One neutral chip per source, white when chosen — as on the music page. */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6" role="group" aria-label="Filter by source">
        {FEEDS.map((f) => {
          const active = activeTab === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveTab(f.key)}
              aria-pressed={active}
              className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                active ? "bg-white text-black border-white" : "bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden ring-1 ring-white/[0.07]">
              <div className="aspect-video shimmer" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-24 rounded-full shimmer" />
                <div className="h-4 rounded-full shimmer" />
                <div className="h-4 w-2/3 rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-20 text-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.07]">
          <Newspaper className="w-10 h-10 text-gray-700 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-300 font-black uppercase tracking-widest text-xs">Could not load the news</p>
          <p className="text-gray-500 text-[12px] mt-2 max-w-sm mx-auto leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => load(activeTab)}
            className="mt-6 bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">No stories match “{search}”.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((a) => (
            <NewsCard key={a.id || a.link} article={a} isNew={prevIds.size > 0 && !prevIds.has(a.id)} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <p className="text-center text-[11px] text-gray-600 mt-10">
          Stories from{" "}
          <a href="https://www.filmibeat.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">FilmiBeat</a>
          {" "}and{" "}
          <a href="https://www.espncricinfo.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">ESPNcricinfo</a>
        </p>
      )}
    </section>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const BlogList = () => {
  // The news service can be asleep; knock once on arrival so the rows below
  // are not the ones that wait for it to wake.
  useEffect(() => { fetch(`${API}/api/rss?feed=bollywood&count=1`).catch(() => {}); }, []);

  return (
    <>
      <Helmet>
        <title>Movie & Cricket News | 1AnchorMovies</title>
        <meta
          name="description"
          content="Live movie news from Bollywood, Tamil, Telugu, Kannada, Malayalam and Hollywood cinema, plus the latest cricket headlines — all on 1AnchorMovies."
        />
        <link rel="canonical" href={absUrl("/blogs")} />
      </Helmet>

      <div className="min-h-dvh bg-gray-950 text-white">
        <div className={`${POSTER_SHELL} px-4 sm:px-6 lg:px-8 2xl:px-12 pb-24 pt-8 sm:pt-10`}>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tighter italic">
            News
          </h1>
          <p className="text-sm text-gray-400 mt-2 mb-8 sm:mb-10 max-w-2xl">
            Film news from Bollywood, Kannada, Tamil, Telugu, Malayalam and Hollywood, and the latest from cricket. Tap any story to read it in full here.
          </p>

          <CricketHero />

          {LANGUAGE_ROWS.map((feed) => <LanguageRow key={feed.key} feed={feed} />)}

          <div className="h-px bg-white/[0.07] my-10" />

          <LatestSection />
        </div>
      </div>
    </>
  );
};

export default BlogList;
