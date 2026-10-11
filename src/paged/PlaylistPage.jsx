import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Play, Shuffle, Trash2, Pencil, Check, X, Loader2, Music } from "lucide-react";
import { toast } from "react-toastify";
import { useMusicPlayer } from "../context/MusicPlayerContext";
import { getPlaylist, getTracks, removeTrack, renamePlaylist, deletePlaylist, toTrack } from "../utils/playlists";
import PlaylistCover from "../components/PlaylistCover";

/* One of your playlists, the way an album opens: its cover, its name, Play
   and Shuffle, and its songs — each can be played from, or taken out. */
export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playQueue, currentTrack } = useMusicPlayer();
  const [pl, setPl] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    let alive = true;
    setPl(null); setRows(null); setError("");
    Promise.all([getPlaylist(id), getTracks(id)])
      .then(([p, t]) => {
        if (!alive) return;
        if (!p) { setError("That playlist isn't yours or no longer exists."); return; }
        setPl(p); setName(p.name); setRows(t);
      })
      .catch((e) => alive && setError(e.message || "Could not open this playlist"));
    return () => { alive = false; };
  }, [id]);

  const source = pl ? { title: pl.name, link: `/music/playlist/${pl.id}` } : null;
  const tracks = (rows || []).map(toTrack);
  const playAll = (shuffled = false) => {
    if (!tracks.length) return;
    if (!shuffled) { playQueue(tracks, 0, source); return; }
    const list = [...tracks];
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    playQueue(list, 0, source);
  };

  const remove = async (row) => {
    setRows((r) => r.filter((x) => x.id !== row.id));
    try { await removeTrack(row.id); }
    catch (e) { toast.error(e.message); setRows((r) => [...r, row].sort((a, b) => a.position - b.position)); }
  };
  const rename = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try { await renamePlaylist(pl.id, name); setPl({ ...pl, name: name.trim() }); setEditing(false); }
    catch (e2) { toast.error(e2.message); }
  };
  const drop = async () => {
    if (!window.confirm(`Delete "${pl.name}"? Its songs go with it.`)) return;
    try { await deletePlaylist(pl.id); navigate("/music/library", { replace: true }); }
    catch (e) { toast.error(e.message); }
  };

  if (error) return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Music className="w-10 h-10 text-gray-700" />
      <p className="text-gray-400">{error}</p>
      <Link to="/music/library" className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold hover:bg-white/20">Your library</Link>
    </div>
  );
  if (!pl) return <div className="min-h-dvh bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white/60 animate-spin" /></div>;

  const covers = (rows || []).map((r) => r.poster).filter(Boolean);
  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <Helmet><title>{`${pl.name} — Your playlist`}</title></Helmet>
      <div className="relative overflow-hidden">
        {covers[0] && <img src={covers[0]} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-35" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-gray-950/70 to-gray-950" />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-8">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back"
            className="mb-6 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
            <PlaylistCover covers={covers} className="w-44 sm:w-56 shadow-2xl shadow-black/60 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/80">Playlist</p>
              {editing ? (
                <form onSubmit={rename} className="mt-2 flex items-center gap-2 max-w-xl">
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                    className="flex-1 min-w-0 bg-white/10 rounded-xl px-4 py-2.5 text-2xl font-black outline-none focus:ring-1 focus:ring-white/40" />
                  <button type="submit" aria-label="Save name" className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center"><Check className="w-5 h-5" /></button>
                  <button type="button" onClick={() => { setEditing(false); setName(pl.name); }} aria-label="Cancel" className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"><X className="w-5 h-5" /></button>
                </form>
              ) : (
                <h1 className="mt-1 text-4xl sm:text-6xl font-black tracking-tight leading-none break-words">{pl.name}</h1>
              )}
              <p className="mt-3 text-sm text-gray-300">{tracks.length} song{tracks.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => playAll(false)} disabled={!tracks.length}
              className="inline-flex items-center gap-2 rounded-full bg-white text-black px-7 py-3 font-bold hover:bg-gray-200 disabled:opacity-40">
              <Play className="w-5 h-5 fill-current" /> Play
            </button>
            <button type="button" onClick={() => playAll(true)} disabled={!tracks.length}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-6 py-3 font-semibold hover:bg-white/20 disabled:opacity-40">
              <Shuffle className="w-5 h-5" /> Shuffle
            </button>
            <button type="button" onClick={() => setEditing(true)} aria-label="Rename"
              className="w-12 h-12 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 flex items-center justify-center"><Pencil className="w-5 h-5" /></button>
            <button type="button" onClick={drop} aria-label="Delete playlist"
              className="w-12 h-12 rounded-full bg-white/10 border border-white/15 hover:bg-red-500/30 flex items-center justify-center"><Trash2 className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pb-28">
        {!tracks.length ? (
          <div className="py-16 text-center text-gray-400">
            <p>No songs here yet.</p>
            <p className="text-sm text-gray-500 mt-1">Use <b>+</b> on any song to add it.</p>
            <Link to="/music" className="inline-block mt-5 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold hover:bg-white/20">Find music</Link>
          </div>
        ) : (
          <ol className="divide-y divide-white/[0.05]">
            {rows.map((r, i) => {
              const playing = currentTrack?.id === r.track_id;
              return (
                <li key={r.id} className="group flex items-center gap-3 sm:gap-4 py-2.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.04]">
                  <span className="w-7 text-right text-xs text-gray-500 tabular-nums shrink-0">{i + 1}</span>
                  <button type="button" onClick={() => playQueue(tracks, i, source)} aria-label={`Play ${r.title}`}
                    className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden bg-white/5">
                    {r.poster && <img src={r.poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
                    <span className={`absolute inset-0 flex items-center justify-center bg-black/50 ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition`}>
                      <Play className="w-4 h-4 fill-white text-white" />
                    </span>
                  </button>
                  <button type="button" onClick={() => playQueue(tracks, i, source)} className="flex-1 min-w-0 text-left">
                    <span className={`block text-sm font-semibold truncate ${playing ? "text-green-400" : "text-white"}`}>{r.title}</span>
                    <span className="block text-xs text-gray-500 truncate">{r.artist}</span>
                  </button>
                  <button type="button" onClick={() => remove(r)} aria-label={`Remove ${r.title}`}
                    className="w-9 h-9 rounded-full text-gray-500 hover:text-white hover:bg-white/10 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
