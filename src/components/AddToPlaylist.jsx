import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ListPlus, Check, Plus, Loader2, X } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { listPlaylistsWithCovers, createPlaylist, addTrack } from "../utils/playlists";
import PlaylistCover from "./PlaylistCover";

/* Put this song in a playlist.

   A sheet rather than a dropdown: a bottom sheet on a phone, a centred box on
   a wider screen — the song at the top, each playlist with its cover and how
   many songs it holds, and a new one made in place. Adding says so, with a
   way to open the playlist, and closes the sheet: the old menu only ticked a
   row, so it was never clear the song had gone anywhere.

   The lists are fetched when it opens, not on mount: most people never press
   it, and a song row should not query the database for it. */
const AddToPlaylist = ({ track, className = "", compact = false }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState(null);
  const [busy, setBusy] = useState("");          // playlist id being saved to, or "new"
  const [signedIn, setSignedIn] = useState(null);
  const [making, setMaking] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState(null);
  const input = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  // Esc closes; the page behind stays put.
  useEffect(() => {
    if (!open) return;
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => { if (making) setTimeout(() => input.current?.focus(), 50); }, [making]);

  const show = async (e) => {
    e?.stopPropagation();
    setOpen(true); setErr(null); setMaking(false);
    if (!signedIn) return;
    try { setLists(await listPlaylistsWithCovers()); }
    catch (e2) { setErr(e2.message); setLists([]); }
  };

  const done = (pl, already) => {
    setOpen(false);
    const view = () => navigate(`/music/playlist/${pl.id}`);
    const body = (
      <span className="text-sm">
        {already ? "Already in " : "Added to "}<b>{pl.name}</b>
        <button type="button" onClick={view} className="ml-2 underline font-semibold">View</button>
      </span>
    );
    (already ? toast.info : toast.success)(body, { autoClose: 3500 });
  };

  const save = async (pl) => {
    if (busy) return;
    setBusy(pl.id); setErr(null);
    try {
      const { already } = await addTrack(pl.id, track);
      done(pl, already);
    } catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  };

  const makeAndSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy("new"); setErr(null);
    try {
      const pl = await createPlaylist(name);
      await addTrack(pl.id, track);
      setName(""); setMaking(false);
      done(pl, false);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(""); }
  };

  if (!track?.id && !track?.track_id) return null;

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-label="Add to playlist"
        title="Add to playlist"
        className={compact
          ? `w-8 h-8 rounded-full bg-white/[0.12] ring-1 ring-white/20 text-white
             flex items-center justify-center hover:bg-white/25 transition-colors
             focus:outline-none focus-visible:ring-2 focus-visible:ring-white`
          : `inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5
             text-[11px] font-black uppercase tracking-widest text-white
             hover:bg-white/20 transition-colors
             focus:outline-none focus-visible:ring-2 focus-visible:ring-white`}
      >
        {compact
          ? <Plus className="w-4 h-4" aria-hidden="true" />
          : <><ListPlus className="w-4 h-4" aria-hidden="true" /> Add to playlist</>}
      </button>

      {open && createPortal((
        <div className="fixed inset-0 z-[2147483000] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Add to playlist">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-sm max-h-[80dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#121218] ring-1 ring-white/10 shadow-2xl
                          animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95 duration-200">
            <span className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-white/15" aria-hidden="true" />

            {/* The song */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-3 border-b border-white/[0.06]">
              {track.poster
                ? <img src={track.poster} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                : <div className="w-12 h-12 rounded-lg bg-white/10 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Add to playlist</p>
                <p className="text-sm font-bold text-white truncate">{track.title}</p>
                {track.artist && <p className="text-xs text-gray-500 truncate">{track.artist}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/15 flex items-center justify-center text-gray-300 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {signedIn === false ? (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-400">Sign in to save songs to your playlists.</p>
                <button type="button" onClick={() => { setOpen(false); navigate("/auth"); }}
                  className="mt-4 rounded-full bg-white text-black px-6 py-2.5 text-sm font-bold">Sign in</button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2">
                {/* A new one, made here and the song put in it */}
                {making ? (
                  <form onSubmit={makeAndSave} className="flex gap-2 p-2">
                    <input ref={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" maxLength={80}
                      className="flex-1 min-w-0 bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-white/30 placeholder:text-gray-600" />
                    <button type="submit" disabled={!name.trim() || !!busy}
                      className="shrink-0 rounded-xl bg-white text-black px-4 text-sm font-bold disabled:opacity-40 flex items-center gap-1.5">
                      {busy === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create
                    </button>
                  </form>
                ) : (
                  <button type="button" onClick={() => setMaking(true)}
                    className="w-full flex items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[0.06]">
                    <span className="w-12 h-12 rounded-lg bg-white text-black flex items-center justify-center shrink-0"><Plus className="w-6 h-6" /></span>
                    <span className="text-sm font-bold text-white">New playlist</span>
                  </button>
                )}

                {lists === null && (
                  <p className="flex items-center gap-2 text-xs text-gray-500 px-3 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading your playlists…</p>
                )}
                {lists?.map((pl) => (
                  <button key={pl.id} type="button" onClick={() => save(pl)} disabled={!!busy}
                    className="w-full flex items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[0.06] disabled:opacity-60">
                    <PlaylistCover covers={pl.covers} className="w-12 shrink-0" rounded="rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white truncate">{pl.name}</span>
                      <span className="block text-xs text-gray-500">{pl.count} song{pl.count === 1 ? "" : "s"}</span>
                    </span>
                    {busy === pl.id && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
                  </button>
                ))}
                {lists?.length === 0 && !making && (
                  <p className="text-xs text-gray-500 px-3 py-3">No playlists yet — make the first one above.</p>
                )}
              </div>
            )}

            {err && <p className="text-xs text-amber-400 px-4 pb-3">{err}</p>}
            <div className="pb-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default AddToPlaylist;
