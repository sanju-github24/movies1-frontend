import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ListPlus, Check, Plus, Loader2 } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { listPlaylists, createPlaylist, addTrack } from "../utils/playlists";

/* Put this song in a playlist.
 *
 * The lists are fetched when the menu opens rather than on mount: most people
 * never press it, and a track page should not query the database for something
 * nobody asked to see. */
const AddToPlaylist = ({ track, className = "", compact = false }) => {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState(null);
  const [state, setState] = useState({});      // playlist id → saving | saved | already
  const [signedIn, setSignedIn] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState(null);
  const [at, setAt] = useState(null);      // where on screen to draw the menu
  const box = useRef(null);
  const menu = useRef(null);

  /* A card sits in a row that scrolls sideways, and a scrolling box clips what
     grows out of it — which is why the menu appeared as a grey sliver above
     the card with the list cut off. Drawn on the body instead and positioned
     to the button, it is clipped by nothing.
   
     Measured from the button each time rather than remembered: the row it sits
     in moves. */
  const place = () => {
    const b = box.current?.getBoundingClientRect();
    if (!b) return;
    const W = 256, GAP = 8, H = 300;
    const below = window.innerHeight - b.bottom;
    setAt({
      // Above the button when there is no room beneath it.
      top: below > H + GAP ? b.bottom + GAP : Math.max(GAP, b.top - H - GAP),
      // Kept on screen at both edges, wherever the card has scrolled to.
      left: Math.min(Math.max(GAP, b.right - W), window.innerWidth - W - GAP),
      width: W,
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  // A click anywhere else closes it, as a menu should.
  useEffect(() => {
    if (!open) return;
    const away = (e) => {
      if (box.current?.contains(e.target)) return;
      if (menu.current?.contains(e.target)) return;   // it lives elsewhere in the DOM now
      setOpen(false);
    };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    /* Fixed to the viewport, so it would otherwise sit still while the row
       scrolls out from under it. Re-placed on both, and true on the scroll
       listener so a scrolling row reports too, not just the page. */
    const follow = () => place();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  const show = async () => {
    place();
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
      {/* On a card there is room for a circle and nothing else, so the label
          moves to the tooltip. Same menu underneath either way. */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        aria-haspopup="menu"
        aria-expanded={open}
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

      {open && at && createPortal((
        <div role="menu" ref={menu}
          style={{ position: "fixed", top: at.top, left: at.left, width: at.width }}
          className="z-[2147483000] rounded-xl bg-gray-900 ring-1 ring-white/10 shadow-2xl p-2">
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
      ), document.body)}
    </div>
  );
};

export default AddToPlaylist;
