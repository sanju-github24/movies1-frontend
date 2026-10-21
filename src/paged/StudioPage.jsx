import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useNavigationType } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Loader2, Star } from "lucide-react";
import { backendUrl } from "../utils/api";
import { studioBySlug } from "../utils/studios";

/* One streaming brand's shows + movies, from TMDB (/api/tmdb-network). Clicking a
   card opens it on the watch page exactly like a TMDB search result, so our
   AnchorHD resolver and metadata take over from there. */
const toMovie = (t) => ({
  id: `tmdb_${t.tmdb_id}`,
  slug: t.slug,
  title: t.title,
  source: "tmdb",
  content_type: t.content_type,
  tmdb_id: t.tmdb_id,
  poster: t.poster_url || "/default-poster.jpg",
  cover_poster: t.cover_poster_url || null,
  description: t.description || "",
  year: t.year || null,
  imdbRating: t.imdb_rating || null,
  genres: t.genres || [],
  tmdbPayload: {
    tmdb_id: t.tmdb_id,
    title: t.title,
    slug: t.slug,
    poster: t.poster_url || "/default-poster.jpg",
    cover_poster: t.cover_poster_url || null,
    description: t.description || "",
    year: t.year || null,
    imdb_rating: t.imdb_rating || null,
    content_type: t.content_type,
    genres: t.genres || [],
  },
});

export default function StudioPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const firstLoadRef = useRef(true);   // the first load of this page, as against a later tab change
  const studio = studioBySlug(slug);

  const [tab, setTab] = useState("all");   // all | movie | tv
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p, type) => {
    if (!studio) return;
    setLoading(true);
    try {
      const r = await axios.get(`${backendUrl}/api/tmdb-network`, {
        params: { network: studio.network, provider: studio.provider, providerIn: studio.providerIn, region: studio.region, page: p,
          ...(type && type !== "all" ? { type } : {}) },
        timeout: 20000,
      });
      const list = r.data?.data || [];
      setTotalPages(r.data?.total_pages || 1);
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.tmdb_id));
        return [...prev, ...list.filter((x) => x.tmdb_id && !seen.has(x.tmdb_id))];
      });
    } catch {
      /* leave what we have */
    } finally {
      setLoading(false);
    }
  }, [studio]);

  // New studio or tab → reset and load page 1 of that type.
  useEffect(() => {
    setItems([]); setPage(1); setTotalPages(1);
    if (studio) load(1, tab);
    // A tab change starts at the top; arriving by Back keeps the viewer's place.
    if (!(firstLoadRef.current && navType === "POP")) window.scrollTo(0, 0);
    firstLoadRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, tab]);

  const TABS = [["all", "All"], ["movie", "Movies"], ["tv", "Series"]];

  if (!studio) {
    return (
      <div className="min-h-[100dvh] bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">That studio isn’t on the list.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 text-white">
      {/* Header band tinted by the studio's colour. */}
      <div className="relative px-4 sm:px-8 pt-6 pb-5 border-b border-white/10"
        style={{ background: `linear-gradient(180deg, ${studio.color}22, transparent)` }}>
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} aria-label="Back"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 transition-all active:scale-90"><ChevronLeft size={24} /></button>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Studio</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: studio.color }}>{studio.name}</h1>
          </div>
        </div>

        {/* Movies / Series tabs */}
        <div className="max-w-[1600px] mx-auto mt-4 flex items-center gap-2">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                tab === key ? "bg-white text-black" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6">
        {items.length === 0 && loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-white/50" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-white/50 py-24">No {tab === "movie" ? "movies" : tab === "tv" ? "series" : "titles"} found for {studio.name} right now.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-5">
              {items.map((t) => (
                <button key={t.tmdb_id} onClick={() => navigate(`/watch/${t.slug}`, { state: { movie: toMovie(t) } })}
                  title={t.title}
                  className="group relative rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-white/40 transition-all hover:-translate-y-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  <span className="block aspect-[2/3] bg-white/5">
                    <img src={t.poster_url || "/default-poster.jpg"} alt="" loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => { e.currentTarget.src = "/default-poster.jpg"; }} />
                    <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/70 to-transparent" />
                    {t.imdb_rating && Number(t.imdb_rating) > 0 && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-black bg-black/70 text-amber-300 px-1.5 py-0.5 rounded-md border border-white/10">
                        <Star className="w-2.5 h-2.5 fill-current" />{t.imdb_rating}
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 p-2">
                      <span className="block text-[11px] sm:text-xs font-bold text-white leading-snug line-clamp-2">{t.title}</span>
                      <span className="block mt-0.5 text-[10px] text-white/50">{[t.year, t.content_type === "tv" ? "Series" : "Movie"].filter(Boolean).join(" · ")}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {page < totalPages && (
              <div className="flex justify-center mt-8">
                <button onClick={() => { const n = page + 1; setPage(n); load(n, tab); }} disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
