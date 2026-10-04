import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import { ArrowLeft, Play, Shuffle, Radio, Loader2, Music, BadgeCheck } from "lucide-react";
import { fetchArtistPage, fetchArtistStation } from "../utils/saavn";
import { useMusicPlayer } from "../context/MusicPlayerContext";
import PlayNextButton from "../components/PlayNextButton";
import AddToPlaylist from "../components/AddToPlaylist";

/* An artist, the way an album opens: who they are, then their songs —
   fifty at a time, best first, more as the list is scrolled — their albums,
   and the artists their listeners also play. */

const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());
const followers = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n || 0));

export default function ArtistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playQueue, playStation, currentTrack } = useMusicPlayer();

  const [artist, setArtist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [radioBusy, setRadioBusy] = useState(false);
  const paging = useRef({ page: 0, more: false, busy: false, id });

  useEffect(() => {
    let alive = true;
    paging.current = { page: 0, more: false, busy: false, id };
    setArtist(null); setSongs([]); setError("");
    window.scrollTo(0, 0);
    fetchArtistPage(id, 0)
      .then((a) => {
        if (!alive) return;
        setArtist(a); setSongs(a.songs || []);
        paging.current.more = !!a.hasMore;
      })
      .catch((e) => alive && setError(e.message || "Could not load this artist"));
    return () => { alive = false; };
  }, [id]);

  // The next fifty, once at a time, for this artist only.
  const more = useCallback(async () => {
    const st = paging.current;
    if (!st.more || st.busy) return;
    st.busy = true; setLoadingMore(true);
    try {
      const a = await fetchArtistPage(st.id, st.page + 1);
      if (paging.current !== st) return;
      st.page += 1;
      st.more = !!a.hasMore;
      setSongs((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const fresh = (a.songs || []).filter((x) => !seen.has(x.id));
        if (!fresh.length) st.more = false;
        return [...prev, ...fresh];
      });
    } catch { st.more = false; }
    finally { if (paging.current === st) { st.busy = false; setLoadingMore(false); } }
  }, []);

  // Watched afresh after each page, so it keeps loading while the end is in view.
  const sentinel = useRef(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || loadingMore || !paging.current.more) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) more(); }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [more, loadingMore, songs.length]);

  // Shuffle plays a shuffled copy, leaving the player's own shuffle setting as it was.
  const playAll = (shuffled = false) => {
    if (!songs.length) return;
    if (!shuffled) { playQueue(songs, 0); return; }
    const list = [...songs];
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    playQueue(list, 0);
  };
  const radio = async () => {
    if (!artist || radioBusy) return;
    setRadioBusy(true);
    try {
      const { stationid, songs: list } = await fetchArtistStation(artist.name, titleCase(artist.language));
      if (!list.length) throw new Error("empty");
      playStation(list, stationid);
    } catch { toast.error(`Couldn't start ${artist.name}'s radio`); }
    finally { setRadioBusy(false); }
  };

  if (error) return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Music className="w-10 h-10 text-gray-700" />
      <p className="text-gray-400">{error}</p>
      <button type="button" onClick={() => navigate(-1)} className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold hover:bg-white/20">Back</button>
    </div>
  );
  if (!artist) return (
    <div className="min-h-dvh bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white/60 animate-spin" /></div>
  );

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <Helmet><title>{`${artist.name} — songs, albums and radio`}</title></Helmet>

      {/* ── Header: the artist's photo washed across the top ── */}
      <div className="relative overflow-hidden">
        {artist.image && <img src={artist.image} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-gray-950/70 to-gray-950" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-8">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back"
            className="mb-6 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
            <span className="w-40 h-40 sm:w-56 sm:h-56 rounded-full overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 shrink-0 bg-white/5">
              {artist.image && <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />}
            </span>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80"><BadgeCheck className="w-4 h-4 text-sky-400" /> Artist</p>
              <h1 className="mt-1 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none break-words">{artist.name}</h1>
              <p className="mt-3 text-sm sm:text-base text-gray-300">
                {followers(artist.followers)} followers{artist.language ? ` · ${titleCase(artist.language)}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => playAll(false)} disabled={!songs.length}
              className="inline-flex items-center gap-2 rounded-full bg-white text-black px-7 py-3 font-bold hover:bg-gray-200 active:scale-[0.98] transition disabled:opacity-40">
              <Play className="w-5 h-5 fill-current" /> Play
            </button>
            <button type="button" onClick={() => playAll(true)} disabled={!songs.length}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-6 py-3 font-semibold hover:bg-white/20 transition disabled:opacity-40">
              <Shuffle className="w-5 h-5" /> Shuffle
            </button>
            <button type="button" onClick={radio} disabled={radioBusy}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-6 py-3 font-semibold hover:bg-white/20 transition disabled:opacity-60">
              {radioBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />} Artist radio
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pb-28">
        {/* ── Songs ── */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-4 mb-3">Songs</h2>
        <ol className="divide-y divide-white/[0.05]">
          {songs.map((s, i) => {
            const playing = currentTrack?.id === s.id;
            return (
              <li key={s.id} className="group flex items-center gap-3 sm:gap-4 py-2.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.04]">
                <span className="w-7 text-right text-xs text-gray-500 tabular-nums shrink-0">{i + 1}</span>
                <button type="button" onClick={() => playQueue(songs, i)} aria-label={`Play ${s.title}`}
                  className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden bg-white/5">
                  {s.poster && <img src={s.poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  <span className={`absolute inset-0 flex items-center justify-center bg-black/50 ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition`}>
                    <Play className="w-4 h-4 fill-white text-white" />
                  </span>
                </button>
                <button type="button" onClick={() => playQueue(songs, i)} className="flex-1 min-w-0 text-left">
                  <span className={`block text-sm font-semibold truncate ${playing ? "text-green-400" : "text-white"}`}>{s.title}</span>
                  <span className="block text-xs text-gray-500 truncate">{[s.label !== s.title && s.label, s.language && titleCase(s.language)].filter(Boolean).join(" · ")}</span>
                </button>
                <PlayNextButton track={s} />
                <span onClick={(e) => e.stopPropagation()}><AddToPlaylist compact track={s} /></span>
              </li>
            );
          })}
        </ol>
        <div ref={sentinel} className="flex justify-center py-6 text-gray-500 text-sm">
          {loadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : !paging.current.more && songs.length > 50 ? "That's every song" : ""}
        </div>

        {/* ── Albums ── */}
        {artist.albums?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-4">Albums</h2>
            <div className="home-scroll flex gap-4 overflow-x-auto pb-3">
              {artist.albums.map((a) => (
                <Link key={a.id} to={`/music/search?find=album:${a.id}`} className="group shrink-0 w-36 sm:w-44">
                  <span className="block aspect-square rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/[0.07] group-hover:ring-white/25 transition">
                    {a.poster && <img src={a.poster} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                  </span>
                  <span className="block mt-2 text-sm font-semibold truncate">{a.title}</span>
                  <span className="block text-xs text-gray-500">{a.year || "Album"}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Similar artists ── */}
        {artist.similar?.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-4">Fans also like</h2>
            <div className="home-scroll flex gap-6 overflow-x-auto pb-3">
              {artist.similar.map((a) => (
                <Link key={a.id} to={`/music/artist/${a.id}`} className="group shrink-0 w-28 sm:w-36 text-center">
                  <span className="block w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 group-hover:ring-white/40 transition">
                    {a.image && <img src={a.image} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  </span>
                  <span className="block mt-2.5 text-sm font-semibold truncate">{a.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
