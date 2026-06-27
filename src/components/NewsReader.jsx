/**
 * NewsViewer.jsx
 *
 * Renders a FilmiBeat or Cricinfo article in-site instead of redirecting away.
 *
 * Route: /news?url=https://www.filmibeat.com/...  or  ?url=https://www.espncricinfo.com/...
 * Add to your router:
 *   <Route path="/news" element={<NewsViewer />} />
 *
 * The article URL is passed as a query param so it's bookmarkable/shareable.
 * Content is fetched via your Express proxy (/api/rss/article?url=...) which
 * handles CORS and content extraction server-side.
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";

const API = import.meta.env.VITE_BACKEND_URL;

const FEEDS_META = {
  bollywood: { label: "Bollywood", color: "#D85A30" },
  tamil:     { label: "Tamil",     color: "#1D9E75" },
  telugu:    { label: "Telugu",    color: "#378ADD" },
  kannada:   { label: "Kannada",   color: "#BA7517" },
  malayalam: { label: "Malayalam", color: "#D4537E" },
  hollywood: { label: "Hollywood", color: "#444441" },
  tv:        { label: "TV",        color: "#639922" },
  ott:       { label: "OTT",       color: "#993556" },
  cricket:   { label: "Cricket",   color: "#0B6E4F" },
};

// Detect source/language from the article URL's domain and path.
function detectLanguage(url = "") {
  if (url.includes("cricinfo.com")) return "cricket";
  for (const key of Object.keys(FEEDS_META)) {
    if (url.includes(`/${key}/`) || url.includes(`/${key}-`)) return key;
  }
  if (url.includes("/bollywood/") || url.includes("/hindi/")) return "bollywood";
  if (url.includes("/english/") || url.includes("/hollywood/")) return "hollywood";
  return "bollywood";
}

function sourceLabel(url = "") {
  return url.includes("cricinfo.com") ? "ESPNcricinfo" : "FilmiBeat";
}
function sourceHome(url = "") {
  return url.includes("cricinfo.com") ? "https://www.espncricinfo.com" : "https://www.filmibeat.com";
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="animate-pulse space-y-6 p-6 sm:p-10">
    <div className="h-8 bg-white/10 rounded w-3/4" />
    <div className="h-4 bg-white/10 rounded w-1/3" />
    <div className="h-64 bg-white/10 rounded-xl" />
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-4 bg-white/10 rounded" style={{ width: `${85 - i * 5}%` }} />
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const NewsViewer = () => {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate = useNavigate();

  // Read ?url= from query string
  const params     = new URLSearchParams(window.location.search);
  const articleUrl = params.get("url") || "";
  const language   = detectLanguage(articleUrl);
  const feedMeta   = FEEDS_META[language] || FEEDS_META.bollywood;
  const srcLabel   = sourceLabel(articleUrl);
  const srcHome    = sourceHome(articleUrl);

  useEffect(() => {
    if (!articleUrl) {
      setError("No article URL provided.");
      setLoading(false);
      return;
    }
    window.scrollTo(0, 0);
    fetchArticle();
  }, [articleUrl]);

  const fetchArticle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/api/rss/article?url=${encodeURIComponent(articleUrl)}`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load article");
      setArticle(json.article);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const readingTime = article
    ? Math.max(1, Math.ceil(article.content.replace(/<[^>]+>/g, "").split(/\s+/).length / 200))
    : 0;

  return (
    <>
      {article && (
        <Helmet>
          <title>{article.title} | AnchorMovies</title>
          <meta name="description" content={article.content.replace(/<[^>]+>/g, "").slice(0, 160)} />
        </Helmet>
      )}

      <div className="min-h-screen bg-[#0e0e0e] text-white font-['Roboto']">

        {/* ── Header ── */}
        <header className="bg-black/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-[64px]">
            <Link to="/" className="text-white text-xl font-bold tracking-wide uppercase">
              Anchor<span className="text-[#c5c107]">Movies</span>
            </Link>
            <nav className="hidden md:flex space-x-6 text-gray-400 font-medium uppercase text-xs tracking-wider">
              <Link to="/"      className="hover:text-white transition">Home</Link>
              <Link to="/blogs" className="hover:text-white transition">Blogs</Link>
              <Link to="/about" className="hover:text-white transition">About</Link>
              <Link to="/contact" className="hover:text-white transition">Contact</Link>
            </nav>
          </div>
        </header>

        {/* ── Back bar ── */}
        <div className="border-b border-white/5 bg-black/40">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-xs font-semibold text-[#c5c107] uppercase tracking-widest hover:text-white transition flex items-center gap-1"
            >
              ← Back
            </button>
            <span className="text-white/10">|</span>
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white"
              style={{ background: feedMeta.color }}
            >
              {feedMeta.label}
            </span>
            <span className="text-xs text-gray-500 ml-auto">
              Powered by{" "}
              <a
                href={srcHome}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c5c107] hover:underline"
              >
                {srcLabel}
              </a>
            </span>
          </div>
        </div>

        {/* ── Content ── */}
        <main className="max-w-7xl mx-auto py-10 px-4 grid grid-cols-1 lg:grid-cols-4 gap-10">

          {/* Article column */}
          <div className="lg:col-span-3">

            {loading && (
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
                <Skeleton />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-10 text-center">
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <p className="text-gray-500 text-xs mb-6">
                  Content couldn't be loaded from {srcLabel}.
                </p>
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#c5c107] text-black text-sm font-bold px-6 py-2.5 rounded-full hover:bg-yellow-400 transition"
                >
                  Read on {srcLabel} →
                </a>
              </div>
            )}

            {!loading && !error && article && (
              <article className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">

                {/* Hero image */}
                {article.thumbnail && (
                  <div className="w-full h-[260px] sm:h-[380px] overflow-hidden relative">
                    <img
                      src={article.thumbnail}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                  </div>
                )}

                <div className="p-6 sm:p-10">
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white"
                      style={{ background: feedMeta.color }}
                    >
                      {feedMeta.label}
                    </span>
                    {article.pubDate && (
                      <span className="text-xs text-gray-500">
                        🕒 {timeAgo(article.pubDate)}
                        {" · "}
                        {new Date(article.pubDate).toLocaleDateString("en-IN", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">📖 {readingTime} min read</span>
                    {article.author && article.author !== "FilmiBeat" && article.author !== "ESPNcricinfo" && (
                      <span className="text-xs text-gray-500">✍️ {article.author}</span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug mb-8">
                    {article.title}
                  </h1>

                  {/* Article body */}
                  <div
                    className="
                      prose prose-invert prose-sm sm:prose-base max-w-none
                      prose-headings:text-[#c5c107] prose-headings:font-bold
                      prose-p:text-gray-300 prose-p:leading-relaxed
                      prose-a:text-[#c5c107] prose-a:no-underline hover:prose-a:underline
                      prose-img:rounded-xl prose-img:shadow-lg prose-img:w-full
                      prose-strong:text-white
                      prose-ul:text-gray-300 prose-ol:text-gray-300
                      prose-blockquote:border-l-[#c5c107] prose-blockquote:text-gray-400
                      prose-hr:border-white/10
                    "
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />

                  {/* Source attribution */}
                  <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                    <p className="text-xs text-gray-500">
                      Content sourced from{" "}
                      <a
                        href={srcHome}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c5c107] hover:underline"
                      >
                        {srcLabel}
                      </a>
                      . All rights reserved to original authors.
                    </p>
                    <a
                      href={articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-bold border border-[#c5c107]/40 text-[#c5c107] px-4 py-2 rounded-full hover:bg-[#c5c107] hover:text-black transition"
                    >
                      View original →
                    </a>
                  </div>
                </div>
              </article>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-6 lg:col-span-1">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 sticky top-24">
              <h3 className="text-xs font-bold text-[#c5c107] uppercase tracking-[0.2em] pb-3 mb-4 border-b border-white/10">
                Browse News
              </h3>
              <div className="space-y-2">
                {Object.entries(FEEDS_META).map(([key, meta]) => (
                  <Link
                    key={key}
                    to={`/blogs`}
                    className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition py-1.5 group"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition"
                      style={{ background: meta.color }}
                    />
                    {meta.label}
                  </Link>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-white/10">
                <Link
                  to="/blogs"
                  className="block text-center text-xs font-bold bg-[#c5c107] text-black px-4 py-2.5 rounded-full hover:bg-yellow-400 transition"
                >
                  ← All Articles
                </Link>
              </div>
            </div>
          </aside>
        </main>

        {/* ── Footer ── */}
        <footer className="bg-black border-t border-white/5 text-gray-500 py-12 mt-10">
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
                <Link to="/about"   className="hover:text-white block transition">About Us</Link>
                <Link to="/contact" className="hover:text-white block transition">Contact</Link>
                <Link to="/blogs"   className="hover:text-white block transition">Blogs</Link>
                <a href="https://t.me/AnchorMovies" target="_blank" rel="noreferrer" className="hover:text-white block transition">Telegram</a>
              </div>
              <div className="space-y-2">
                <a href="#" className="hover:text-white block transition">Privacy Policy</a>
                <a href="#" className="hover:text-white block transition">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-gray-600">
            <p>&copy; {new Date().getFullYear()} AnchorMovies. All Rights Reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default NewsViewer;
