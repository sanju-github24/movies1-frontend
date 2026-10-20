import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Play, Share2, Check, ChevronLeft, ChevronRight, Star, Volume2 } from "lucide-react";

/* Stories, Instagram-style, for what has just come out: one card per title,
   its poster slowly drifting, the title, rating, languages and synopsis over
   it, and Watch Now to its page. Full screen on a phone; a 9:16 card on a
   wider screen, the poster blurred behind it.

   Moving: tap the right of the card (or →) for the next, the left (or ←)
   for the one before; press and hold to pause; swipe down (or Esc) to
   close. Each plays STORY_MS, and the last one closes the viewer.

   stories: [{ id, title, poster, cover, logo, badge, print, year, rating,
              genres, languages, description, at, slug, state, search }] —
   see storyFromFresh / storyFromManual. */

export const STORY_MS = 7000;
const SITE = "https://www.1anchormovies.buzz";

const ago = (ms) => {
  if (!ms) return "";
  const m = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
};

/** A title from the latest releases (backend /api/fresh), as a story. */
export const storyFromFresh = (f) => ({
  id: `fresh-${f.id}`,
  title: f.title,
  poster: f.poster,
  cover: f.cover_poster || f.poster,
  logo: f.title_logo || null,
  badge: f.content_type === "tv" ? "New Episodes" : "New Release",
  print: f.print || "",
  year: f.year || "",
  rating: f.imdb_rating || "",
  genres: (f.genres || []).slice(0, 3),
  languages: f.languages || [],
  description: f.description || "",
  at: Date.parse(f.first_seen) || 0,
  slug: f.slug,
  state: { movie: {
    tmdb_id: f.tmdb_id, imdb_id: f.imdb_id || null, title: f.title, slug: f.slug,
    poster: f.poster, cover_poster: f.cover_poster, description: f.description,
    year: f.year, imdb_rating: f.imdb_rating, content_type: f.content_type,
    genres: f.genres || [], title_logo: f.title_logo || null, episodes: [], cast: [], source: "tmdb",
  } },
});

/** A story added by hand in the admin (Supabase "stories"): no page of its
    own, so Watch Now searches for it. */
export const storyFromManual = (s) => ({
  id: s.id,
  title: s.title || "",
  poster: s.poster_url,
  cover: s.poster_url,
  logo: null,
  badge: "Featured",
  print: s.quality || "",
  year: "",
  rating: s.imdb || "",
  genres: String(s.genre || "").split(/[,/|]/).map((g) => g.trim()).filter(Boolean).slice(0, 3),
  languages: String(s.language || "").split(/[,/|+]/).map((l) => l.trim()).filter(Boolean),
  description: s.size ? `Size ${s.size}` : "",
  at: Date.parse(s.created_at) || 0,
  slug: null,
  search: s.title || "",
});

const linkOf = (s) => (s.slug ? `${SITE}/watch/${s.slug}` : `${SITE}/search?query=${encodeURIComponent(s.search || s.title)}`);

export default function StoriesViewer({ stories, startIndex = 0, onClose, onSeen }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(startIndex);
  const [elapsed, setElapsed] = useState(0);        // ms into the current story
  const [held, setHeld] = useState(false);          // pressed and held, or a tab in the background
  const [copied, setCopied] = useState(false);
  const story = stories[index];

  // Every story opened is remembered as seen, for the rail's rings.
  useEffect(() => { if (story) onSeen?.(story.id); }, [story, onSeen]);

  const go = useCallback((d) => {
    setElapsed(0);
    setCopied(false);
    setIndex((i) => {
      const n = i + d;
      if (n >= stories.length) { onClose(); return i; }
      return Math.max(0, n);
    });
  }, [stories.length, onClose]);

  // The clock: runs while the story is on screen and not held.
  useEffect(() => {
    if (held) return;
    let last = performance.now(), raf;
    const tick = (now) => {
      const dt = now - last; last = now;
      setElapsed((e) => e + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [held, index]);
  useEffect(() => { if (elapsed >= STORY_MS) go(1); }, [elapsed, go]);

  // A tab in the background pauses; the keyboard moves; the page behind stays put.
  useEffect(() => {
    const vis = () => setHeld(document.hidden);
    const key = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") { e.preventDefault(); setHeld((h) => !h); }
    };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  /* Touch and mouse: a short tap moves, a press of more than a moment
     holds, a downward swipe closes. */
  const press = useRef(null);
  const down = (e) => {
    const p = e.touches?.[0] || e;
    press.current = { x: p.clientX, y: p.clientY, t: Date.now() };
    setHeld(true);
  };
  const up = (e) => {
    const start = press.current;
    press.current = null;
    setHeld(false);
    if (!start) return;
    const p = e.changedTouches?.[0] || e;
    const dy = p.clientY - start.y, dx = p.clientX - start.x;
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { onClose(); return; }
    if (Date.now() - start.t > 250 || Math.abs(dx) > 30) return;    // a hold or a drag, not a tap
    const box = e.currentTarget.getBoundingClientRect();
    go(p.clientX - box.left < box.width * 0.33 ? -1 : 1);
  };

  const watch = () => {
    onClose();
    if (story.slug) navigate(`/watch/${story.slug}`, { state: story.state });
    else navigate(`/search?query=${encodeURIComponent(story.search || story.title)}`);
  };
  const share = async (e) => {
    e.stopPropagation();
    const url = linkOf(story);
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) await navigator.share({ title: story.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* dismissed */ }
  };

  if (!story) return null;
  const meta = [story.year, ...story.genres].filter(Boolean);
  // Stop a tap on a button from also moving the story.
  const stop = { onMouseDown: (e) => e.stopPropagation(), onMouseUp: (e) => e.stopPropagation(),
    onTouchStart: (e) => e.stopPropagation(), onTouchEnd: (e) => e.stopPropagation() };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center select-none" role="dialog" aria-modal="true" aria-label={`Story: ${story.title}`}>
      <style>{`
        @keyframes story-drift { from { transform: scale(1.02) translate3d(0,0,0); } to { transform: scale(1.14) translate3d(-1.5%,-2%,0); } }
        @keyframes story-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @keyframes story-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.35); } 50% { box-shadow: 0 0 0 10px rgba(255,255,255,0); } }
        .story-rise { animation: story-rise .55s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .story-drift, .story-rise { animation: none !important; } }
      `}</style>

      {/* Wider screens: the poster, blurred, fills the room around the card. */}
      <img src={story.cover || story.poster} alt="" aria-hidden="true"
        className="hidden sm:block absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-40" />
      <div className="hidden sm:block absolute inset-0 bg-black/50" />

      <button onClick={() => go(-1)} aria-label="Previous story" disabled={index === 0}
        className="hidden sm:flex absolute left-[calc(50%-min(46vh,260px)-4.5rem)] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-0 items-center justify-center text-white transition">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={() => go(1)} aria-label="Next story"
        className="hidden sm:flex absolute right-[calc(50%-min(46vh,260px)-4.5rem)] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition">
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* The card: the whole screen on a phone, 9:16 elsewhere. */}
      <div className="relative w-full h-full sm:w-auto sm:h-[min(92vh,920px)] sm:aspect-[9/16] sm:rounded-2xl overflow-hidden bg-neutral-900 shadow-2xl"
        onMouseDown={down} onMouseUp={up} onMouseLeave={() => { if (press.current) { press.current = null; setHeld(false); } }}
        onTouchStart={down} onTouchEnd={up}>
        <img key={story.id} src={story.poster || story.cover} alt="" draggable={false}
          className="story-drift absolute inset-0 w-full h-full object-cover"
          style={{ animation: `story-drift ${STORY_MS + 1500}ms ease-out both`, animationPlayState: held ? "paused" : "running" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent h-40" />
        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black via-black/80 to-transparent" />

        {/* Progress: one bar per story. */}
        <div className="absolute top-0 inset-x-0 pt-[max(env(safe-area-inset-top),10px)] px-2.5 flex gap-1 z-10">
          {stories.map((s, i) => (
            <div key={s.id} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
              <div className="h-full bg-white rounded-full"
                style={{ width: i < index ? "100%" : i > index ? "0%" : `${Math.min(100, (elapsed / STORY_MS) * 100)}%` }} />
            </div>
          ))}
        </div>

        {/* Who and when, and close. */}
        <div className="absolute top-0 inset-x-0 pt-[calc(max(env(safe-area-inset-top),10px)+14px)] px-3.5 flex items-center gap-2.5 z-10">
          <span className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 shrink-0">
            <img src={story.poster || story.cover} alt="" className="w-full h-full rounded-full object-cover border-2 border-black" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-white text-sm font-semibold truncate">1AnchorMovies</p>
            <p className="text-white/70 text-xs truncate">{story.badge}{story.at ? ` · ${ago(story.at)}` : ""}</p>
          </div>
          {held && <span className="text-[10px] font-bold tracking-widest text-white/80 uppercase mr-1">Paused</span>}
          <button {...stop} onClick={onClose} aria-label="Close stories" className="p-1.5 -mr-1 text-white"><X className="w-7 h-7" /></button>
        </div>

        {/* The title, and what to do about it. */}
        <div key={`t-${story.id}`} className="absolute inset-x-0 bottom-0 px-5 pb-[max(env(safe-area-inset-bottom),22px)] z-10">
          <div className="story-rise flex flex-wrap items-center gap-1.5 mb-3" style={{ animationDelay: "80ms" }}>
            <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-wider">{story.badge}</span>
            {story.print && <span className="px-2 py-1 rounded-md bg-white/15 backdrop-blur text-white text-[11px] font-bold">{story.print}</span>}
            {story.rating && Number(story.rating) > 0 && (
              <span className="px-2 py-1 rounded-md bg-white/15 backdrop-blur text-white text-[11px] font-bold flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" fill="currentColor" /> {story.rating}
              </span>
            )}
          </div>

          <div className="story-rise" style={{ animationDelay: "160ms" }}>
            {story.logo
              ? <img src={story.logo} alt={story.title} className="max-h-24 max-w-[80%] object-contain object-left drop-shadow-[0_4px_18px_rgba(0,0,0,.8)]" />
              : <h2 className="text-3xl sm:text-[34px] font-black text-white leading-[1.05] drop-shadow-lg">{story.title}</h2>}
          </div>

          {meta.length > 0 && (
            <p className="story-rise text-white/80 text-sm font-medium mt-2.5" style={{ animationDelay: "220ms" }}>{meta.join(" • ")}</p>
          )}

          {story.languages.length > 0 && (
            <div className="story-rise flex flex-wrap items-center gap-1.5 mt-2.5" style={{ animationDelay: "270ms" }}>
              <Volume2 className="w-4 h-4 text-white/70" />
              {story.languages.slice(0, 6).map((l) => (
                <span key={l} className="px-2 py-0.5 rounded-full border border-white/30 text-white text-xs font-medium">{l}</span>
              ))}
            </div>
          )}

          {story.description && (
            <p className="story-rise text-white/70 text-[13px] leading-relaxed mt-3 line-clamp-3" style={{ animationDelay: "320ms" }}>{story.description}</p>
          )}

          <div className="story-rise flex items-center gap-2.5 mt-5" style={{ animationDelay: "380ms" }}>
            <button {...stop} onClick={watch}
              className="flex-1 h-12 rounded-xl bg-white text-black font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition"
              style={{ animation: "story-glow 2.4s ease-in-out 1s infinite" }}>
              <Play className="w-5 h-5" fill="currentColor" /> Watch Now
            </button>
            <button {...stop} onClick={share} aria-label="Share link"
              className="h-12 px-4 rounded-xl bg-white/15 backdrop-blur text-white font-semibold text-sm flex items-center gap-2 active:scale-95 transition">
              {copied ? <><Check className="w-5 h-5 text-emerald-400" /> Copied</> : <><Share2 className="w-5 h-5" /> Share</>}
            </button>
          </div>
          <p className="text-white/40 text-[11px] mt-2.5 truncate">{linkOf(story).replace(/^https:\/\//, "")}</p>
        </div>
      </div>
    </div>
  );
}
