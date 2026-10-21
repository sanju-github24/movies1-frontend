/**
 * NewsReader.jsx — reads a FilmiBeat or ESPNcricinfo story on the site.
 *
 * Route: /news?url=https://www.filmibeat.com/...  (or an espncricinfo.com story)
 *
 * The article URL rides in the query string so a story is bookmarkable and
 * shareable. The backend (/api/rss/article?url=...) fetches the page and pulls
 * the whole story out as clean HTML; this page lays it out in the site's own
 * type, with more stories from the same feed alongside.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams, useNavigationType } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowLeft, Clock, BookOpen, ExternalLink, RefreshCw, Newspaper } from "lucide-react";
import { sanitizeArticle } from "../utils/sanitizeHtml";
import { useGoBack } from "./BackBar";
import { backendUrl } from "../utils/api";
import { POSTER_SHELL } from "../utils/posterGrid";

const API = backendUrl;

const FEEDS_META = {
  bollywood: { label: "Bollywood", color: "#D85A30" },
  tamil:     { label: "Tamil",     color: "#1D9E75" },
  telugu:    { label: "Telugu",    color: "#378ADD" },
  kannada:   { label: "Kannada",   color: "#BA7517" },
  malayalam: { label: "Malayalam", color: "#D4537E" },
  hollywood: { label: "Hollywood", color: "#9CA3AF" },
  tv:        { label: "TV",        color: "#639922" },
  ott:       { label: "OTT",       color: "#C0567F" },
  cricket:   { label: "Cricket",   color: "#10B981" },
};

// Which feed a story belongs to, from its address.
function detectFeed(url = "") {
  if (url.includes("cricinfo.com")) return "cricket";
  if (url.includes("/television/")) return "tv";
  for (const key of Object.keys(FEEDS_META)) {
    if (url.includes(`/${key}/`) || url.includes(`/${key}-`)) return key;
  }
  if (url.includes("/hindi/")) return "bollywood";
  if (url.includes("/english/")) return "hollywood";
  return "bollywood";
}

const sourceLabel = (url = "") => (url.includes("cricinfo.com") ? "ESPNcricinfo" : "FilmiBeat");

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (Number.isNaN(diff)) return "";
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const plainText = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ─── Pieces ──────────────────────────────────────────────────────────────────
const SourceTag = ({ meta }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-200">
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
    {meta.label}
  </span>
);

const ArticleSkeleton = () => (
  <div className="space-y-5" aria-busy="true" aria-label="Loading article">
    <div className="h-4 w-40 rounded-full shimmer" />
    <div className="h-9 w-11/12 rounded-xl shimmer" />
    <div className="h-9 w-2/3 rounded-xl shimmer" />
    <div className="aspect-video w-full rounded-2xl shimmer mt-6" />
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="h-4 rounded-full shimmer" style={{ width: `${92 - i * 6}%` }} />
    ))}
  </div>
);

// More stories from the same feed, beside the article on a wide screen and
// under it on a phone, so reading one leads to the next without going back.
const MoreStories = ({ feedKey, meta, currentUrl }) => {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let live = true;
    setItems(null);
    fetch(`${API}/api/rss?feed=${feedKey}&count=10`)
      .then((r) => r.json())
      .then((j) => { if (live) setItems((j.articles || []).filter((a) => a.link !== currentUrl).slice(0, 6)); })
      .catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [feedKey, currentUrl]);

  if (items && items.length === 0) return null;

  return (
    <section aria-label={`More ${meta.label} news`}>
      <h2 className="text-lg font-bold tracking-tight mb-4">More {meta.label} news</h2>
      <div className="space-y-3">
        {items === null
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-28 aspect-video rounded-xl shimmer shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 rounded-full shimmer" />
                  <div className="h-3 w-2/3 rounded-full shimmer" />
                </div>
              </div>
            ))
          : items.map((a) => (
              <Link
                key={a.link}
                to={`/news?url=${encodeURIComponent(a.link)}`}
                className="group flex gap-3 rounded-xl p-2 -mx-2 hover:bg-white/[0.04] transition"
              >
                <div className="w-28 aspect-video rounded-xl overflow-hidden bg-white/[0.04] shrink-0">
                  {a.thumbnail
                    ? <img src={a.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center"><Newspaper className="w-5 h-5 text-gray-700" /></div>}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-snug text-gray-200 group-hover:text-white line-clamp-3">{a.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{timeAgo(a.pubDate)}</p>
                </div>
              </Link>
            ))}
      </div>
      <Link
        to="/blogs"
        className="mt-5 inline-flex items-center justify-center w-full rounded-xl bg-white/[0.06] ring-1 ring-white/10 py-2.5 text-[11px] font-black uppercase tracking-widest text-gray-200 hover:bg-white/[0.1] hover:text-white transition"
      >
        All news
      </Link>
    </section>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────
const NewsReader = () => {
  const [params] = useSearchParams();
  const navType = useNavigationType();
  const articleUrl = params.get("url") || "";
  const feedKey = detectFeed(articleUrl);
  const meta = FEEDS_META[feedKey] || FEEDS_META.bollywood;
  const srcLabel = sourceLabel(articleUrl);
  const goBack = useGoBack();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArticle = useCallback(async () => {
    if (!articleUrl) { setError("No article was given."); setLoading(false); return; }
    setLoading(true);
    setError(null);
    setArticle(null);
    try {
      /* `v` names the extractor's version. Responses are cached for an hour,
         so a browser that read a story before the extractor improved would
         keep showing the old, shorter copy; a new version asks afresh. */
      const res = await fetch(`${API}/api/rss/article?v=3&url=${encodeURIComponent(articleUrl)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "The story could not be loaded.");
      setArticle(json.article);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [articleUrl]);

  // A new story — including one picked from "More news" — starts at the top.
  useEffect(() => {
    // …unless it is reached by Back, which keeps the viewer's place (ScrollMemory).
    if (navType !== "POP") window.scrollTo(0, 0);
    fetchArticle();
  }, [fetchArticle]);

  const words = article ? plainText(article.content).split(" ").length : 0;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  // The story usually carries its own lead picture, often under a different
  // file name or size than the header image, so the header image is only shown
  // for a story that has no pictures of its own.
  const showHero = article?.thumbnail && !/<img\s/i.test(article.content);

  return (
    <>
      {article && (
        <Helmet>
          <title>{article.title} | AnchorMovies</title>
          <meta name="description" content={plainText(article.content).slice(0, 160)} />
        </Helmet>
      )}

      <div className="min-h-dvh bg-gray-950 text-white">
        <div className={`${POSTER_SHELL} px-4 sm:px-6 lg:px-8 2xl:px-12 pt-6 sm:pt-10 pb-24`}>

          {/* Top bar */}
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <button
              type="button"
              onClick={() => goBack()}
              aria-label="Back"
              className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/10 active:scale-90 transition flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/blogs" className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition">
              News
            </Link>
            <span className="text-gray-700">/</span>
            <SourceTag meta={meta} />
          </div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-16">
            <main className="min-w-0 max-w-3xl">
              {loading && <ArticleSkeleton />}

              {!loading && error && (
                <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.07] px-6 py-14 text-center">
                  <Newspaper className="w-10 h-10 text-gray-700 mx-auto mb-4" aria-hidden="true" />
                  <p className="text-gray-300 font-black uppercase tracking-widest text-xs">Couldn't load this story</p>
                  <p className="text-gray-500 text-[13px] mt-2 max-w-sm mx-auto leading-relaxed">
                    {srcLabel} didn't answer in time. It usually works on a second try.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={fetchArticle}
                      className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition"
                    >
                      <RefreshCw className="w-4 h-4" /> Try again
                    </button>
                    {articleUrl && (
                      <a
                        href={articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white/[0.06] ring-1 ring-white/10 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-200 hover:bg-white/[0.1] transition"
                      >
                        Read on {srcLabel} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {!loading && !error && article && (
                <article>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 mb-4">
                    {article.pubDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(article.pubDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                        <span className="text-gray-600">· {timeAgo(article.pubDate)}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> {readingTime} min read
                    </span>
                    {article.author && !["FilmiBeat", "ESPNcricinfo"].includes(article.author) && (
                      <span>By {article.author}</span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-8">
                    {article.title}
                  </h1>

                  {showHero && (
                    <img
                      src={article.thumbnail}
                      alt=""
                      className="w-full aspect-video object-cover rounded-2xl ring-1 ring-white/[0.07] mb-8"
                    />
                  )}

                  <div className="article-body" dangerouslySetInnerHTML={{ __html: sanitizeArticle(article.content) }} />

                  {/* Credit where it is due — the story is theirs. */}
                  <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.07] p-5">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Originally published on <span className="text-gray-200 font-semibold">{srcLabel}</span>. All rights belong to the original authors.
                    </p>
                    <a
                      href={articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-300 hover:text-white transition"
                    >
                      View original <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              )}
            </main>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              {articleUrl && <MoreStories feedKey={feedKey} meta={meta} currentUrl={articleUrl} />}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewsReader;
