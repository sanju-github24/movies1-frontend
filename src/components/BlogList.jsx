import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { Helmet } from "react-helmet";

// ─── Config ───────────────────────────────────────────────────────────────────
// Use relative path so it works in dev (via Vite proxy) and production.
// In dev: add  server: { proxy: { '/api': 'http://localhost:4000' } }  to vite.config.js
// In prod: your Express server should serve both the frontend and /api routes.
const RSS_PROXY_BASE =
  import.meta.env.VITE_BACKEND_URL + "/api";

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
];

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getTextPreview = (html, maxLength = 150) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = div.textContent || div.innerText || "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/**
 * Generate a stable hash from any string (blog id or slug).
 * Returns a 6-char alphanumeric string, e.g. "a3f9k2".
 */
const generateHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6).padStart(6, "0");
};

// ─── Blog Detail View (hash-routed) ──────────────────────────────────────────
const BlogDetail = ({ blog, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const readingTime = Math.max(
    1,
    Math.ceil((blog.content?.replace(/<[^>]+>/g, "").split(/\s+/).length || 0) / 200)
  );

  return (
    <>
      <Helmet>
        <title>{blog.title} | AnchorMovies</title>
        <meta name="description" content={getTextPreview(blog.content, 160)} />
        <link rel="canonical" href={`https://www.1anchormovies.live/blogs#${generateHash(blog.id || blog.slug)}`} />
      </Helmet>

      <article className="min-h-screen bg-[#0e0e0e] text-white">
        {/* Hero */}
        <div className="relative h-[60vh] min-h-[360px] overflow-hidden">
          <img
            src={blog.poster_image || blog.thumbnail_url || "https://via.placeholder.com/1200x600"}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 max-w-4xl mx-auto">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#c5c107] uppercase tracking-widest mb-4 hover:text-white transition"
            >
              ← Back to Blogs
            </button>
            <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight text-white mb-3">
              {blog.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <span>🕒 {new Date(blog.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
              <span>📖 {readingTime} min read</span>
              <span className="bg-[#c5c107]/20 text-[#c5c107] px-2 py-0.5 rounded-full font-semibold">
                #{generateHash(blog.id || blog.slug)}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
          <div
            className="prose prose-invert prose-sm sm:prose-base max-w-none
              prose-headings:text-[#c5c107] prose-headings:font-bold
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-[#c5c107] prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-lg prose-img:shadow-lg
              prose-blockquote:border-l-[#c5c107] prose-blockquote:text-gray-400"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Back CTA */}
          <div className="mt-14 pt-8 border-t border-white/10 flex justify-center">
            <button
              onClick={onBack}
              className="bg-[#c5c107] text-black text-sm font-bold px-8 py-3 rounded-full hover:bg-yellow-400 transition"
            >
              ← Back to all articles
            </button>
          </div>
        </div>
      </article>
    </>
  );
};

// ─── FilmiBeat News Card ──────────────────────────────────────────────────────
const NewsCard = ({ article, isNew }) => {
  const feed = FEEDS.find((f) => f.key === article.source) || FEEDS[1];

  return (
    <Link
  to={`/news?url=${encodeURIComponent(article.link)}`}
  className="group bg-[#1a1a1a] border border-white/5 rounded-2xl hover:border-[#c5c107]/40 transition-all duration-300 overflow-hidden flex flex-col hover:shadow-[0_0_30px_rgba(197,193,7,0.08)] hover:-translate-y-0.5"
>
      {/* Thumbnail */}
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

        {/* Language pill */}
        <span
          className="absolute top-2 left-2 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: feed.color }}
        >
          {feed.label}
        </span>

        {/* NEW badge */}
        {isNew && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
            NEW
          </span>
        )}
      </div>

      {/* Body */}
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

// ─── FilmiBeat Section ────────────────────────────────────────────────────────
const FilmiBeatSection = () => {
  const [news, setNews]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [prevIds, setPrevIds]     = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(Date.now() + REFRESH_INTERVAL_MS);
  const [countdown, setCountdown] = useState("");

  const fetchNews = useCallback(async (feedKey = "all", isManual = false) => {
    if (!isManual) setLoading(true);
    setError(null);
    try {
      const url = `${API}/api/rss?feed=${feedKey}&count=30`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Feed error");

      setPrevIds(new Set(news.map((n) => n.id)));
      setNews(json.articles || []);
      setLastUpdated(new Date());
      setNextRefresh(Date.now() + REFRESH_INTERVAL_MS);
    } catch (err) {
      setError(`Could not load news: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [news]);

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
      const m = Math.floor(rem / 60000);
      const s = Math.floor((rem % 60000) / 1000);
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
    <section className="mt-20">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-[#c5c107] uppercase tracking-[0.2em] mb-1">Live Feed</p>
          <h2 className="text-2xl font-extrabold text-white uppercase tracking-wide">
            🎬 FilmiBeat News
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

      {/* Language tabs */}
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
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">
          <strong>Error:</strong> {error}
          <br />
          <span className="text-xs text-red-500/70">
            Make sure your backend is running at{" "}
            <code className="bg-red-500/10 px-1 rounded">{RSS_PROXY_BASE}</code>.
          </span>
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
          <a
            href="https://www.filmibeat.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c5c107] hover:underline"
          >
            filmibeat.com
          </a>
        </p>
      )}
    </section>
  );
};

// ─── Blog Card ────────────────────────────────────────────────────────────────
const BlogCard = ({ blog, onClick, index }) => {
  const isFeatured = index === 0;
  const hash = generateHash(blog.id || blog.slug);

  if (isFeatured) {
    return (
      <button
        onClick={() => onClick(blog, hash)}
        className="group col-span-full bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden flex flex-col sm:flex-row hover:border-[#c5c107]/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(197,193,7,0.1)] text-left"
      >
        <div className="sm:w-1/2 relative overflow-hidden h-60 sm:h-auto bg-black">
          <img
            src={blog.poster_image || blog.thumbnail_url || "https://via.placeholder.com/800x500"}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1a1a1a]/80 hidden sm:block" />
          <span className="absolute top-3 left-3 bg-[#c5c107] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Featured
          </span>
        </div>
        <div className="sm:w-1/2 p-7 flex flex-col justify-center gap-3">
          <p className="text-[10px] font-bold text-[#c5c107] uppercase tracking-[0.2em]">#{hash}</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-[#c5c107] transition leading-snug">
            {blog.title}
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            {getTextPreview(blog.content, 200)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500">
              🕒 {new Date(blog.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="ml-auto text-xs font-bold text-[#c5c107] group-hover:gap-2 transition">
              Read more →
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick(blog, hash)}
      className="group bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden flex flex-col hover:border-[#c5c107]/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,193,7,0.08)] hover:-translate-y-0.5 text-left"
    >
      <div className="relative overflow-hidden h-48 bg-black">
        <img
          src={blog.poster_image || blog.thumbnail_url || "https://via.placeholder.com/600x400"}
          alt={blog.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/90 to-transparent" />
        <span className="absolute bottom-3 left-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          #{hash}
        </span>
      </div>
      <div className="p-5 flex flex-col flex-grow gap-2">
        <h3 className="text-base font-bold text-gray-100 group-hover:text-[#c5c107] transition leading-snug line-clamp-2">
          {blog.title}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-grow">
          {getTextPreview(blog.content)}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className="text-[10px] text-gray-600">
            🕒 {new Date(blog.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
          <span className="text-[10px] font-bold text-[#c5c107]">Read →</span>
        </div>
      </div>
    </button>
  );
};

// ─── Main BlogList Component ──────────────────────────────────────────────────
const BlogList = () => {
  const [blogs, setBlogs]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeBlog, setActiveBlog] = useState(null); // { blog, hash }

  // ── Hash routing: read on mount, write on navigation ──
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash && blogs.length > 0) {
        const match = blogs.find(
          (b) => generateHash(b.id || b.slug) === hash
        );
        if (match) {
          setActiveBlog({ blog: match, hash });
          return;
        }
      }
      setActiveBlog(null);
    };

    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, [blogs]);

  const openBlog = (blog, hash) => {
    window.location.hash = hash;
    setActiveBlog({ blog, hash });
    window.scrollTo(0, 0);
  };

  const closeBlog = () => {
    history.pushState("", document.title, window.location.pathname + window.location.search);
    setActiveBlog(null);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data: blogsData, error: blogsError } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });

      if (blogsError) throw blogsError;

      const blogsWithPoster = await Promise.all(
        (blogsData || []).map(async (blog) => {
          if (blog.related_movie_ids?.length > 0) {
            const movieIds = Array.isArray(blog.related_movie_ids)
              ? blog.related_movie_ids
              : blog.related_movie_ids
                  .split(",")
                  .map((id) => id.trim())
                  .filter(Boolean);

            if (movieIds.length > 0) {
              const { data: moviesData } = await supabase
                .from("watch_html")
                .select("id, poster, cover_poster")
                .in("id", [movieIds[0]])
                .limit(1);

              if (moviesData?.length > 0) {
                blog.poster_image =
                  moviesData[0].cover_poster || moviesData[0].poster;
              }
            }
          }
          return blog;
        })
      );

      setBlogs(blogsWithPoster || []);
    } catch (err) {
      console.error("Failed to fetch blogs:", err.message);
      setError("Failed to load blogs.");
    }
    setLoading(false);
  };

  // ── Show blog detail view ──
  if (activeBlog) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] font-['Roboto']">
        <header className="bg-black/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-[60px]">
            <Link to="/" className="text-white text-xl font-bold tracking-wide uppercase">
              Anchor<span className="text-[#c5c107]">Movies</span>
            </Link>
            <button
              onClick={closeBlog}
              className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              ← All Blogs
            </button>
          </div>
        </header>
        <BlogDetail blog={activeBlog.blog} onBack={closeBlog} />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Movie Blogs & Reviews | 1AnchorMovies</title>
        <meta
          name="description"
          content="Explore the latest movie blogs, reviews, and updates from Tamil, Telugu, Kannada, and Malayalam cinema on 1AnchorMovies."
        />
        <link rel="canonical" href="https://www.1anchormovies.live/blogs" />
      </Helmet>

      <div className="min-h-screen bg-[#0e0e0e] text-white font-['Roboto']">
        {/* ── Header ── */}
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

        {/* ── Hero ── */}
        <section className="relative bg-[#0e0e0e] border-b border-white/5 py-20 px-4 text-center overflow-hidden">
          {/* ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#c5c107]/5 blur-[120px]" />
          </div>
          <p className="relative text-[10px] font-bold text-[#c5c107] uppercase tracking-[0.3em] mb-3">
            Entertainment · Reviews · Insights
          </p>
          <h2 className="relative text-4xl sm:text-6xl font-black mb-4 tracking-tight">
            Movie<span className="text-[#c5c107]">Blogs</span>
          </h2>
          <p className="relative text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
            Reviews, industry insights, and latest updates across South Indian cinema — Tamil, Telugu, Kannada, and Malayalam.
          </p>
        </section>

        <main className="max-w-7xl mx-auto py-14 px-4 sm:px-6 lg:px-8">

          {/* ── Blog Articles Grid ── */}
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#c5c107] uppercase tracking-[0.2em] mb-1">Original Articles</p>
              <h2 className="text-2xl font-extrabold text-white uppercase tracking-wide">
                📚 Latest Posts
              </h2>
            </div>
            {!loading && (
              <span className="text-xs text-gray-600">{blogs.length} articles</span>
            )}
          </div>

          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white/5 rounded-2xl h-72 animate-pulse" />
              ))}
            </div>
          )}
          {error && (
            <div className="text-red-400 text-center py-10 bg-red-500/5 rounded-xl border border-red-500/10">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog, index) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  index={index}
                  onClick={openBlog}
                />
              ))}
              {blogs.length === 0 && (
                <div className="col-span-full text-center text-gray-600 py-16">
                  No articles yet — check back soon.
                </div>
              )}
            </div>
          )}

          {/* ── FilmiBeat Live News ── */}
          <FilmiBeatSection />
        </main>

        {/* ── Footer ── */}
        <footer className="bg-black border-t border-white/5 text-gray-500 py-12 mt-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 px-6">
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold tracking-widest text-gray-300">
                Join our community
              </h4>
              <p className="text-sm leading-relaxed">
                Get updates on the latest movies, blogs, and entertainment news.
              </p>
            </div>
            <div className="flex justify-center items-center">
              <h1 className="text-white text-5xl font-black tracking-tighter italic">
                ANCHOR
              </h1>
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
