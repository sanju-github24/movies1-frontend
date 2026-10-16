import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Newspaper, ChevronRight } from "lucide-react";
import { useGoBack } from "./BackBar";
import { POSTER_SHELL } from "../utils/posterGrid";
import { Helmet } from "react-helmet-async";
import { supabase } from "../utils/supabaseClient";
import { absUrl, jsonLd } from "../utils/seo";
import { sanitizeArticle } from "../utils/sanitizeHtml";

// Blog bodies are HTML. Strip it down to a plain sentence or two for the meta
// description — Google shows this text, so tags leaking in look broken.
function excerpt(html, max = 155) {
  if (!html) return "";
  const text = String(html)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  // Cut on a word boundary rather than mid-word.
  return `${text.slice(0, text.lastIndexOf(" ", max) || max).trim()}…`;
}

// First image in the body, used as the share/preview image when nothing better.
function firstImage(html) {
  const m = String(html || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

const BlogViewer = () => {
  const { slug } = useParams();
  const goBack = useGoBack();
  const [blog, setBlog] = useState(null);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [recentBlogs, setRecentBlogs] = useState([]);
  const [nextBlog, setNextBlog] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlog();
    fetchRecentBlogs();
  }, [slug]);

  const fetchBlog = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      console.error("Blog not found:", error.message);
      setError("Blog not found.");
    } else {
      setBlog(data);
      fetchNextBlog(data.created_at);

      if (data.related_movie_ids?.length > 0) {
        fetchRelatedMovies(data.related_movie_ids);
      }
    }
  };

  const fetchRelatedMovies = async (ids) => {
    // Normalize related_movie_ids
    const movieIds = Array.isArray(ids)
      ? ids
      : ids.split(",").map((id) => id.trim()).filter(Boolean);

    if (movieIds.length === 0) return;

    const { data, error } = await supabase
      .from("watch_html")
      .select("id, title, slug, poster, cover_poster")
      .in("id", movieIds);

    if (error) {
      console.error("Error fetching related movies:", error.message);
    } else {
      // Preserve order of movieIds
      const orderedMovies = movieIds
        .map((id) => data.find((movie) => movie.id === id))
        .filter(Boolean);
      setRelatedMovies(orderedMovies);
    }
  };

  const fetchNextBlog = async (createdAt) => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, slug, title, thumbnail_url")
      .gt("created_at", createdAt)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!error && data.length > 0) setNextBlog(data[0]);
  };

  const fetchRecentBlogs = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, slug, title, thumbnail_url, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (!error) setRecentBlogs(data);
  };

  const shell = `${POSTER_SHELL} px-4 sm:px-6 lg:px-8 2xl:px-12 pt-6 sm:pt-10 pb-24`;

  if (error) return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <div className={`${shell} text-center py-24`}>
        <Newspaper className="w-10 h-10 text-gray-700 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-300 font-black uppercase tracking-widest text-xs">This post isn't here</p>
        <p className="text-gray-500 text-[13px] mt-2">It may have been moved or taken down.</p>
        <Link to="/blogs" className="inline-block mt-6 bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition">
          All news
        </Link>
      </div>
    </div>
  );

  if (!blog) return (
    <div className="min-h-dvh bg-gray-950">
      <div className={`${shell} max-w-3xl space-y-5`} aria-busy="true" aria-label="Loading post">
        <div className="h-9 w-11/12 rounded-xl shimmer" />
        <div className="h-9 w-2/3 rounded-xl shimmer" />
        <div className="aspect-video w-full rounded-2xl shimmer" />
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-4 rounded-full shimmer" style={{ width: `${92 - i * 6}%` }} />)}
      </div>
    </div>
  );

  const blogUrl  = absUrl(`/blogs/${slug}`);
  const blogDesc = excerpt(blog.content);
  const blogImg  = blog.cover_poster || blog.thumbnail_url || blog.poster || firstImage(blog.content);
  const cover    = relatedMovies[0]?.cover_poster;
  const published = blog.created_at
    ? new Date(blog.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      {/* This is original writing — the one thing here that can genuinely rank —
          but without this it inherited index.html's site-wide title, so every
          post looked like the same movie download page to Google. */}
      <Helmet prioritizeSeoTags>
        <title>{blog.title}</title>
        {blogDesc && <meta name="description" content={blogDesc} />}
        <link rel="canonical" href={blogUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={blog.title} />
        {blogDesc && <meta property="og:description" content={blogDesc} />}
        <meta property="og:url" content={blogUrl} />
        {blogImg && <meta property="og:image" content={blogImg} />}
        {blog.created_at && <meta property="article:published_time" content={new Date(blog.created_at).toISOString()} />}
        <meta name="twitter:card" content={blogImg ? 'summary_large_image' : 'summary'} />
        <script type="application/ld+json">{jsonLd({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: blog.title,
          ...(blogDesc && { description: blogDesc }),
          ...(blogImg && { image: [blogImg] }),
          ...(blog.created_at && { datePublished: new Date(blog.created_at).toISOString() }),
          ...(blog.updated_at && { dateModified: new Date(blog.updated_at).toISOString() }),
          mainEntityOfPage: { '@type': 'WebPage', '@id': blogUrl },
          ...(Array.isArray(blog.tags) && blog.tags.length && { keywords: blog.tags.join(', ') }),
        })}</script>
      </Helmet>

      <div className={shell}>
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
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Blog</span>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-16">
          <main className="min-w-0 max-w-3xl">
            <article>
              {published && (
                <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                  <Clock className="w-3.5 h-3.5" /> {published}
                </p>
              )}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-8">
                {blog.title}
              </h1>

              {cover && (
                <img src={cover} alt="" className="w-full aspect-video object-cover rounded-2xl ring-1 ring-white/[0.07] mb-8" />
              )}

              <div className="article-body" dangerouslySetInnerHTML={{ __html: sanitizeArticle(blog.content) }} />
            </article>

            {/* Tags */}
            {blog.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-white/[0.07]">
                {blog.tags.map((tag, i) => (
                  <span key={i} className="rounded-full bg-white/[0.06] ring-1 ring-white/10 px-3 py-1 text-xs font-semibold text-gray-300">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Related movies */}
            {relatedMovies.length > 0 && (
              <section className="mt-12">
                <h2 className="text-lg sm:text-[22px] font-bold tracking-tight mb-4">Related movies</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {relatedMovies.map((movie) => (
                    <Link key={movie.id} to={`/watch/${movie.slug}`} className="group">
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/[0.04] ring-1 ring-white/[0.07] group-hover:ring-white/20 transition">
                        {(movie.poster || movie.cover_poster) && (
                          <img
                            src={movie.poster || movie.cover_poster}
                            alt={movie.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                          />
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-gray-200 group-hover:text-white mt-2 line-clamp-2">{movie.title}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Next post */}
            {nextBlog && (
              <Link
                to={`/blogs/${nextBlog.slug}`}
                className="group mt-12 flex items-center gap-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.07] hover:ring-white/20 p-3 transition"
              >
                <div className="w-32 sm:w-40 aspect-video rounded-xl overflow-hidden bg-white/[0.04] shrink-0">
                  {nextBlog.thumbnail_url && <img src={nextBlog.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Next post</p>
                  <p className="text-sm sm:text-base font-bold text-gray-100 group-hover:text-white leading-snug line-clamp-2 mt-1">{nextBlog.title}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>
            )}
          </main>

          {/* Recent posts */}
          {recentBlogs.length > 0 && (
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-lg font-bold tracking-tight mb-4">Recent posts</h2>
              <div className="space-y-3">
                {recentBlogs.map((item) => (
                  <Link key={item.id} to={`/blogs/${item.slug}`} className="group flex gap-3 rounded-xl p-2 -mx-2 hover:bg-white/[0.04] transition">
                    <div className="w-28 aspect-video rounded-xl overflow-hidden bg-white/[0.04] shrink-0">
                      {item.thumbnail_url && <img src={item.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-snug text-gray-200 group-hover:text-white line-clamp-3">{item.title}</p>
                      <p className="text-[11px] text-gray-500 mt-1">{new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogViewer;
