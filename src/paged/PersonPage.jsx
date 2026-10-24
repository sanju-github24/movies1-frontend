import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Star } from "lucide-react";
import { backendUrl } from "../utils/api";

/* An actor's page (/person/:key — a TMDB person id, or a name to look up).
 * Who they are, then everything they are credited in, by department (Acting
 * first for an actor) and Movies / Series. A card opens the title on the
 * watch page exactly as a TMDB search result does. Data: /api/tmdb-person. */

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

const cache = new Map();   // key -> response, for going back to a page just seen

const born = (p) => {
  if (!p.birthday) return null;
  const d = new Date(`${p.birthday}T00:00:00`);
  const text = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return p.deathday ? `${text} – ${new Date(`${p.deathday}T00:00:00`).getFullYear()}` : `Born ${text}`;
};

function Card({ t, kind, onOpen }) {
  const rating = Number(t.imdb_rating) > 0 ? t.imdb_rating : null;
  const role = t.roles?.filter(Boolean).join(", ");
  return (
    <button type="button" onClick={() => onOpen(t)} title={role ? `${t.title} — ${role}` : t.title}
      className="group min-w-0 text-left focus:outline-none">
      <span className="block aspect-[2/3] rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10 group-hover:ring-white/40 group-focus-visible:ring-2 group-focus-visible:ring-white transition-all">
        {t.poster_url
          ? <img src={t.poster_url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { e.currentTarget.src = "/default-poster.jpg"; }} />
          : <span className="w-full h-full flex items-center justify-center p-3 text-center text-sm font-bold text-white/40">{t.title}</span>}
      </span>
      <span className="block mt-2.5 text-[15px] font-semibold text-white truncate">{t.title}</span>
      <span className="flex items-center gap-1.5 mt-0.5 text-[13px] text-white/50">
        {rating && <><Star className="w-3 h-3 fill-current" />{rating}<span>·</span></>}
        {t.year && <>{t.year}<span>·</span></>}
        {kind === "series" ? "Series" : "Movie"}
      </span>
      {role && <span className="block mt-0.5 text-[12px] text-white/35 truncate">{role}</span>}
    </button>
  );
}

export default function PersonPage() {
  const { key = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(() => cache.get(key) || null);
  const [error, setError] = useState("");
  const [dept, setDept] = useState(null);
  const [kind, setKind] = useState("movies");
  const [bioOpen, setBioOpen] = useState(false);

  useEffect(() => {
    let dead = false;
    setError(""); setBioOpen(false); setDept(null);
    if (cache.has(key)) { setData(cache.get(key)); return; }
    setData(null);
    const params = /^\d+$/.test(key) ? { id: key } : { name: decodeURIComponent(key) };
    axios.get(`${backendUrl}/api/tmdb-person`, { params })
      .then((r) => { if (dead) return; cache.set(key, r.data); setData(r.data); })
      .catch((e) => { if (!dead) setError(e.response?.data?.message || "Could not load this person."); });
    window.scrollTo(0, 0);
    return () => { dead = true; };
  }, [key]);

  const p = data?.person;
  const departments = data?.departments || [];
  const current = departments.find((d) => d.department === dept) || departments[0];
  // Movies first unless there are none; a series-only actor lands on Series.
  useEffect(() => {
    if (current) setKind(current.movies.length ? "movies" : "series");
  }, [current?.department]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = current ? current[kind] : [];

  const meta = useMemo(() => (p ? [p.known_for_department, born(p), p.place_of_birth].filter(Boolean) : []), [p]);
  const open = (t) => navigate(`/watch/${t.slug}`, { state: { movie: toMovie(t) } });

  useEffect(() => { if (p?.name) document.title = `${p.name} — movies & series`; }, [p?.name]);

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-gray-950 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-white/70">{error}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden text-white"
      style={{ background: "radial-gradient(120% 70% at 20% 0%, #3a2618 0%, #1c130d 45%, #0b0908 100%)" }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-10 lg:px-16 pt-6 sm:pt-16 pb-16">
        <button onClick={() => navigate(-1)} aria-label="Back"
          className="mb-6 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 transition-all active:scale-90">
          <ChevronLeft size={22} />
        </button>

        {/* Who */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
          <div className="w-40 sm:w-[290px] shrink-0 aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 mx-auto sm:mx-0">
            {p?.profile_url
              ? <img src={p.profile_url} alt={p.name} className="w-full h-full object-cover" />
              : <div className={`w-full h-full flex items-center justify-center text-6xl font-black text-white/20 ${p ? "" : "animate-pulse"}`}>{p?.name?.charAt(0) || ""}</div>}
          </div>
          <div className="min-w-0 flex-1 sm:pt-4 text-center sm:text-left">
            {p ? (
              <>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{p.name}</h1>
                {meta.length > 0 && (
                  <p className="mt-3 sm:mt-5 text-[15px] text-white/50 flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1">
                    {meta.map((m, i) => <span key={i} className="flex items-center gap-3">{i > 0 && <span>·</span>}{m}</span>)}
                  </p>
                )}
                {p.biography && (
                  <div className="mt-5 max-w-4xl text-left">
                    <p className={`text-[15px] sm:text-[17px] leading-[1.85] text-white/75 whitespace-pre-line ${bioOpen ? "" : "line-clamp-6"}`}>{p.biography}</p>
                    {p.biography.length > 420 && (
                      <button onClick={() => setBioOpen((o) => !o)} className="mt-2 text-sm font-semibold text-white/60 hover:text-white">
                        {bioOpen ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4 animate-pulse">
                <div className="h-12 w-72 rounded-lg bg-white/10" />
                <div className="h-4 w-96 max-w-full rounded bg-white/5" />
                <div className="h-24 w-[40rem] max-w-full rounded bg-white/5" />
              </div>
            )}
          </div>
        </div>

        {/* Their work */}
        {current && (
          <div className="mt-12 sm:mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10">
              <div className="flex min-w-0 max-w-full gap-6 overflow-x-auto scrollbar-hide">
                {departments.map((d) => (
                  <button key={d.department} onClick={() => setDept(d.department)}
                    className={`pb-3 text-lg font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                      d.department === current.department ? "border-white text-white" : "border-transparent text-white/45 hover:text-white/80"}`}>
                    {d.department}
                  </button>
                ))}
              </div>
              <div className="flex gap-6">
                {[["movies", "Movies"], ["series", "Series"]].map(([k, label]) => (
                  <button key={k} onClick={() => setKind(k)} disabled={!current[k].length}
                    className={`pb-3 text-[17px] font-bold border-b-2 -mb-px transition-colors disabled:opacity-30 disabled:cursor-default ${
                      kind === k ? "border-white text-white" : "border-transparent text-white/45 hover:text-white/80"}`}>
                    {label} <span className="text-sm font-semibold text-white/35">{current[k].length}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid min-w-0 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-x-4 gap-y-7">
              {list.map((t) => <Card key={`${t.tmdb_id}-${kind}`} t={t} kind={kind} onOpen={open} />)}
            </div>
            {!list.length && <p className="mt-8 text-white/40">Nothing here.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
