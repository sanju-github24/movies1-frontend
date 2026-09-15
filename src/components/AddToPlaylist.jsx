import React, { useEffect, useRef, useState } from "react";
import { ListPlus, Check, Plus, Loader2 } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { listPlaylists, createPlaylist, addTrack } from "../utils/playlists";

/* Put this song in a playlist.
 *
 * The lists are fetched when the menu opens rather than on mount: most people
 * never press it, and a track page should not query the database for something
 * nobody asked to see. */
const AddToPlaylist = ({ track, className = "" }) => {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState(null);
  const [state, setState] = useState({});      // playlist id → saving | saved | already
  const [signedIn, setSignedIn] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState(null);
  const box = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  // A click anywhere else closes it, as a menu should.
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const show = async () => {
    setOpen(true); setErr(null);
    if (lists) return;
    try { setLists(await listPlaylists()); }
    catch (e) { setErr(e.message); setLists([]); }
  };

  const save = async (pl) => {
    setState((s) => ({ ...s, [pl.id]: "saving" }));
    try {
      const { already } = await addTrack(pl.id, track);
      setState((s) => ({ ...s, [pl.id]: already ? "already" : "saved" }));
    } catch (e) {
      setErr(e.message);
      setState((s) => ({ ...s, [pl.id]: undefined }));
    }
  };

  const makeAndSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    try {
      const pl = await createPlaylist(name);
      setName("");
      setLists((l) => [pl, ...(l || [])]);
      await save(pl);
    } catch (e2) { setErr(e2.message); }
  };

  if (!track?.id && !track?.track_id) return null;

  return (
    <div className={`relative ${className}`} ref={box}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5
                   text-[11px] font-black uppercase tracking-widest text-white
                   hover:bg-white/20 transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ListPlus className="w-4 h-4" aria-hidden="true" /> Add to playlist
      </button>

      {open && (
        <div role="menu"
          className="absolute z-50 mt-2 w-64 rounded-xl bg-gray-900 ring-1 ring-white/10 shadow-2xl p-2">
          {!signedIn && (
            <p className="text-xs text-gray-400 p-3">Sign in to save songs to a playlist.</p>
          )}

          {signedIn && (
            <>
              {lists === null && (
                <p className="text-xs text-gray-500 p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…
                </p>
              )}

              {lists?.length === 0 && (
                <p className="text-xs text-gray-500 px-3 pt-2 pb-1">No playlists yet — name one below.</p>
              )}

              <ul className="max-h-56 overflow-y-auto">
                {(lists || []).map((pl) => {
                  const st = state[pl.id];
                  return (
                    <li key={pl.id}>
                      <button type="button" role="menuitem"
                        onClick={() => save(pl)}
                        disabled={st === "saving" || st === "saved" || st === "already"}
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm
                                   hover:bg-white/10 disabled:opacity-70 disabled:hover:bg-transparent">
                        <span className="flex-1 min-w-0 truncate">{pl.name}</span>
                        {st === "saving" && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
                        {st === "saved" && <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />}
                        {/* Already there is not a failure — say so plainly. */}
                        {st === "already" && <span className="text-[10px] text-gray-500 shrink-0">already in</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <form onSubmit={makeAndSave} className="flex gap-1.5 p-2 pt-2 border-t border-white/10 mt-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New playlist"
                  maxLength={80}
                  className="flex-1 min-w-0 bg-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none
                             focus:ring-1 focus:ring-white/30 placeholder:text-gray-600"
                />
                <button type="submit" disabled={!name.trim()} aria-label="Create and add"
                  className="shrink-0 rounded-lg bg-white text-black px-3 disabled:opacity-40">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </>
          )}

          {err && <p className="text-[11px] text-amber-400 px-3 pb-2">{err}</p>}
        </div>
      )}
    </div>
  );
};

export default AddToPlaylist;
