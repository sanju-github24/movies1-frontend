import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Play, ListMusic, Music, Loader2 } from "lucide-react";
import { fetchPlaylistsPage, fetchSongsPage } from "../utils/saavn";
import { useMusicPlayer } from "../context/MusicPlayerContext";
import PlayNextButton from "../components/PlayNextButton";
import AddToPlaylist from "../components/AddToPlaylist";

/* A mood or a search, as JioSaavn has it: its playlists ("Most Streamed Love
   Songs: Kannada", "Upendra Love Songs" …) and its songs, each a page at a
   time and loading more as the list is scrolled — there are a hundred and
   forty playlists for "kannada love songs" alone. */

const PAGE = 20;
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/* One growing list: the items so far, whether more exist, and a loader that
   asks for the next page — once at a time, however often it is called. */
function usePaged(fetchPage, query) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const state = useRef({ page: 0, busy: false, done: false, query });

  useEffect(() => {
    state.current = { page: 0, busy: false, done: false, query };
    setItems([]); setTotal(null); setError("");
  }, [query]);

  const more = useCallback(async () => {
    const st = state.current;
    if (!query || st.busy || st.done) return;
    st.busy = true; setLoading(true);
    try {
      const data = await fetchPage(query, st.page + 1, PAGE);
      if (state.current !== st) return;          // the query changed meanwhile
      st.page += 1;
      const got = data?.results || [];
      setTotal(data?.total ?? null);
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const next = [...prev, ...got.filter((x) => x.id && !seen.has(x.id))];
        if (!got.length || (data?.total && next.length >= data.total)) st.done = true;
        return next;
      });
    } catch (e) {
      if (state.current === st) { setError(e.message || "Could not load more"); st.done = true; }
    } finally {
      if (state.current === st) { st.busy = false; setLoading(false); }
    }
  }, [fetchPage, query]);

  return { items, total, loading, error, more, done: () => state.current.done };
}

/* Asks for more while the bottom of the list is in view.
   An observer only reports changes, and after a page arrives the bottom can
   still be in view — no change, no report, and the list stopped at twenty.
   So it is watched afresh each time a load finishes: a new observer reports
   where things stand straight away, and asks again if the end is still near. */
function LoadMore({ onVisible, loading, done }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || loading || done) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onVisible();
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible, loading, done]);
  return (
    <div ref={ref} className="flex justify-center py-8 text-gray-500 text-sm" aria-live="polite">
      {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading more" /> : done ? "That's everything" : ""}
    </div>
  );
}

export default function MusicExplorePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (params.get("q") || "").trim();
  const tab = params.get("tab") === "songs" ? "songs" : "playlists";
  const setTab = (t) => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", t); return n; }, { replace: true });

  const lists = usePaged(fetchPlaylistsPage, query);
  const songs = usePaged(fetchSongsPage, query);
  const { playQueue, currentTrack } = useMusicPlayer();

  // First page of both, so the counts on the tabs are real.
  useEffect(() => { lists.more(); songs.more(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [query]);
  // Nothing in playlists for this one: show the songs.
  useEffect(() => {
    if (lists.total === 0 && tab === "playlists" && !params.get("tab")) setTab("songs");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists.total]);

  const active = tab === "songs" ? songs : lists;
  const heading = titleCase(query);

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <Helmet><title>{`${heading} — playlists and songs`}</title></Helmet>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-28">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back"
          className="mb-5 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold text-gray-400 mb-1">Explore</p>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{heading || "Music"}</h1>

        <div className="flex gap-2 mt-6 mb-7" role="tablist">
          {[["playlists", "Playlists", lists.total], ["songs", "Songs", songs.total]].map(([id, label, n]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold border transition
                ${tab === id ? "bg-white text-black border-white" : "bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/10"}`}>
              {label}{n ? <span className={tab === id ? "text-black/50" : "text-gray-500"}> · {n.toLocaleString()}</span> : null}
            </button>
          ))}
        </div>

        {tab === "playlists" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
            {lists.items.map((pl) => (
              <Link key={pl.id} to={`/music/search?find=playlist:${pl.id}`} className="group block focus:outline-none">
                <span className="relative block aspect-square rounded-xl overflow-hidden bg-white/[0.05] ring-1 ring-white/[0.07] group-hover:ring-white/25 group-focus-visible:ring-blue-400 transition">
                  {pl.poster
                    ? <img src={pl.poster} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    : <ListMusic className="absolute inset-0 m-auto w-10 h-10 text-white/20" />}
                  <span className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </span>
                </span>
                <span className="block mt-2.5 text-sm font-semibold text-white line-clamp-2">{pl.title}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{pl.songCount ? `${pl.songCount} songs` : "Playlist"}{pl.label ? ` · ${pl.label}` : ""}</span>
              </Link>
            ))}
          </div>
        ) : (
          <ol className="divide-y divide-white/[0.05]">
            {songs.items.map((s, i) => {
              const playing = currentTrack?.id === s.id;
              return (
                <li key={s.id} className="group flex items-center gap-3 sm:gap-4 py-2.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.04]">
                  <span className="w-6 text-right text-xs text-gray-500 tabular-nums shrink-0">{i + 1}</span>
                  <button type="button" onClick={() => playQueue(songs.items, i)} aria-label={`Play ${s.title}`}
                    className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden bg-white/5">
                    {s.poster && <img src={s.poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
                    <span className={`absolute inset-0 flex items-center justify-center bg-black/50 ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition`}>
                      <Play className="w-4 h-4 fill-white text-white" />
                    </span>
                  </button>
                  <button type="button" onClick={() => playQueue(songs.items, i)} className="flex-1 min-w-0 text-left">
                    <span className={`block text-sm font-semibold truncate ${playing ? "text-green-400" : "text-white"}`}>{s.title}</span>
                    <span className="block text-xs text-gray-500 truncate">{[s.artist, s.language && titleCase(s.language)].filter(Boolean).join(" · ")}</span>
                  </button>
                  <PlayNextButton track={s} />
                  <span onClick={(e) => e.stopPropagation()}><AddToPlaylist compact track={s} /></span>
                </li>
              );
            })}
          </ol>
        )}

        {!active.loading && active.items.length === 0 && (active.total === 0 || active.error) && (
          <div className="py-20 text-center text-gray-500">
            <Music className="w-10 h-10 mx-auto mb-3 text-gray-700" />
            {active.error || `No ${tab} for “${query}”.`}
          </div>
        )}
        {(active.items.length > 0 || active.loading) && (
          <LoadMore key={tab} onVisible={active.more} loading={active.loading} done={!active.loading && active.done()} />
        )}
      </div>
    </div>
  );
}
