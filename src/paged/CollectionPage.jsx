import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Play, Star, ArrowLeft, Clapperboard } from "lucide-react";
import axios from "axios";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import { displayTitle } from "../utils/cleanTitle";
import { absUrl } from "../utils/seo";

/* One of TMDB's film collections, as a page.
 *
 * The parts come from TMDB, so the page is complete whether or not we hold
 * them — a collection that showed only our own copies would read as if the
 * other films did not exist. What we hold is then matched against it and said
 * plainly: the ones with a copy here get a Play button, the rest are marked as
 * not available, and nothing pretends to be playable when it is not. */

const norm = (t = "") =>
  String(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(the|a|an)\b/g, "").trim();

export default function CollectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);
  const [data, setData] = useState(null);
  const [owned, setOwned] = useState({});       // normalised title → our row
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await axios.get(`${backendUrl}/api/tmdb-collection`, { params: { id } });
        if (!alive) return;
        const col = r?.data?.data || null;
        setData(col);

        /* One query for the whole set rather than one per film: the titles are
           asked for together and matched here. */
        const parts = col?.parts || [];
        if (parts.length) {
          const filter = parts
            .slice(0, 30)
            .map((p) => `title.ilike.%${String(p.title).replace(/[%,()]/g, " ").trim()}%`)
            .join(",");
          const { data: rows } = await supabase
            .from("movies").select("slug,title,year,poster").or(filter).limit(200);
          if (!alive) return;
          const byTitle = {};
          for (const row of rows || []) {
            const key = norm(displayTitle(row.title) || row.title);
            /* Several qualities of one film share a title; the first is enough,
               since the detail page offers all of them anyway. */
            if (key && !byTitle[key]) byTitle[key] = row;
          }
          setOwned(byTitle);
        }
      } catch (e) {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, backendUrl]);

  const parts = useMemo(() => (data?.parts || []).map((p) => {
    const key = norm(p.title);
    const match = owned[key]
      || Object.entries(owned).find(([k]) => k.includes(key) || key.includes(k))?.[1]
      || null;
    return { ...p, row: match };
  }), [data, owned]);

  const haveCount = parts.filter((p) => p.row).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center text-gray-400">
        Loading collection…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] text-center text-white pt-24">
        <h2 className="text-2xl font-bold">Collection not found</h2>
        <Link to="/" className="mt-4 inline-block text-blue-400 underline">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f]">
      <Helmet>
        <title>{`${data.name} — all films | AnchorMovies`}</title>
        <meta name="description" content={(data.overview || `Every film in ${data.name}.`).slice(0, 300)} />
        <link rel="canonical" href={absUrl(`/collection/${id}`)} />
      </Helmet>

      {/* The collection's own art, not the first film's. */}
      <section className="relative h-[46vh] min-h-[320px] overflow-hidden">
        {data.backdrop && <img src={data.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] to-transparent" />

        <button onClick={() => navigate(-1)}
          className="absolute left-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/70">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col justify-end px-6 pb-10 sm:px-12">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            <Clapperboard className="h-4 w-4" /> Collection
          </div>
          <h1 className="mb-3 text-3xl font-black text-white drop-shadow-2xl sm:text-5xl">{data.name}</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-gray-300 line-clamp-3">{data.overview}</p>
          <p className="mt-3 text-xs text-gray-500">
            {parts.length} film{parts.length === 1 ? "" : "s"}
            {haveCount > 0 && <> · <span className="text-gray-300">{haveCount} available here</span></>}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-10 sm:px-12">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {parts.map((p) => {
            const body = (
              <>
                <div className="relative mb-3 aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {p.poster
                    ? <img src={p.poster} alt={p.title} loading="lazy"
                        className={`h-full w-full object-cover transition duration-300 ${p.row ? "group-hover:scale-105" : "opacity-50 grayscale"}`} />
                    : <div className="flex h-full items-center justify-center text-gray-600">No art</div>}

                  {p.row ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                        <Play className="ml-0.5 h-5 w-5 fill-black text-black" />
                      </span>
                    </span>
                  ) : (
                    <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-300">
                      Not here yet
                    </span>
                  )}

                  {p.rating && p.rating !== "0.0" && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
                      <Star className="h-3 w-3 fill-white" />{p.rating}
                    </span>
                  )}
                </div>
                <div className="truncate text-sm font-semibold text-white">{p.title}</div>
                <div className="text-xs text-gray-500">{p.year || "TBA"}</div>
              </>
            );

            return p.row ? (
              <Link key={p.tmdb_id} to={`/movie/${p.row.slug}`} className="group block">{body}</Link>
            ) : (
              <div key={p.tmdb_id} className="group block cursor-default">{body}</div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
