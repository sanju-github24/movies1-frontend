import React, { useCallback, useEffect, useState } from "react";
import { ListMusic, Plus, Play, Shuffle, Trash2, X, Loader2, Music2 } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { useMusicPlayer } from "../context/MusicPlayerContext";
import {
  listPlaylists, createPlaylist, deletePlaylist,
  getTracks, removeTrack, toTrack,
} from "../utils/playlists";

/* Someone's own playlists, on the music page.
 *
 * Nothing is held here that the account does not already own: the rows come
 * back scoped by the database to whoever is signed in, so this draws whatever
 * it is given and never filters by hand. Signed out there is nothing to draw,
 * and saying so is more useful than an empty box. */

const Empty = ({ children }) => (
  <p className="text-xs text-gray-500 py-6 text-center">{children}</p>
);

const PlaylistPanel = () => {
  const player = useMusicPlayer();
  const [session, setSession] = useState(undefined);   // undefined = still asking
  const [lists, setLists] = useState(null);
  const [open, setOpen] = useState(null);              // the playlist being viewed
  const [tracks, setTracks] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    try { setLists(await listPlaylists()); setErr(null); }
    catch (e) { setErr(e.message); setLists([]); }
  }, []);

  useEffect(() => { if (session) refresh(); else if (session === null) setLists([]); }, [session, refresh]);

  const openList = async (pl) => {
    setOpen(pl); setTracks(null);
    try { setTracks(await getTracks(pl.id)); }
    catch (e) { setErr(e.message); setTracks([]); }
  };

  const make = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setErr(null);
    try { await createPlaylist(name); setName(""); await refresh(); }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  const drop = async (pl) => {
    if (!window.confirm(`Delete "${pl.name}"? Its songs go with it.`)) return;
    try { await deletePlaylist(pl.id); if (open?.id === pl.id) setOpen(null); await refresh(); }
    catch (e) { setErr(e.message); }
  };

  /* Played through the queue, so shuffle, repeat, skip and the lock screen
     buttons all work on it — the same machinery any other queue uses. The
     songs carry no stream; the player asks for each as it reaches the front. */
  const play = (rows, shuffled) => {
    if (!rows?.length) return;
    if (shuffled && !player.shuffle) player.toggleShuffle();
    if (!shuffled && player.shuffle) player.toggleShuffle();
    player.playQueue(rows.map(toTrack), 0);
  };

  if (session === undefined) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
          <ListMusic className="w-5 h-5 shrink-0" aria-hidden="true" /> Your playlists
        </h2>
        {lists?.length > 0 && (
          <span className="text-[11px] font-bold text-gray-500">{lists.length}</span>
        )}
      </div>

      {!session && (
        <Empty>Sign in to make playlists and find them on any device.</Empty>
      )}

      {session && (
        <>
          <form onSubmit={make} className="flex gap-2 mb-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New playlist name"
              maxLength={80}
              className="flex-1 min-w-0 bg-white/[0.04] ring-1 ring-white/10 rounded-xl px-4 py-2.5
                         text-sm outline-none focus:ring-white/30 placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white text-black
                         px-4 py-2.5 text-[11px] font-black uppercase tracking-widest
                         disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    : <Plus className="w-4 h-4" aria-hidden="true" />}
              Create
            </button>
          </form>

          {err && <p className="text-xs text-amber-400 mb-3">{err}</p>}

          {lists === null && (
            <p className="text-xs text-gray-500 py-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…
            </p>
          )}

          {lists?.length === 0 && (
            <Empty>No playlists yet. Make one above, then add songs from any track.</Empty>
          )}

          <div className="grid gap-2">
            {(lists || []).map((pl) => (
              <div key={pl.id} className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => (open?.id === pl.id ? setOpen(null) : openList(pl))}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className="block text-sm font-bold truncate">{pl.name}</span>
                    <span className="block text-[11px] text-gray-500">
                      {open?.id === pl.id ? "Hide songs" : "Show songs"}
                    </span>
                  </button>

                  <button type="button" onClick={() => drop(pl)} aria-label={`Delete ${pl.name}`}
                    className="shrink-0 rounded-lg p-2 text-gray-500 hover:text-red-400 hover:bg-white/5">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {open?.id === pl.id && (
                  <div className="px-4 pb-4">
                    {tracks === null && (
                      <p className="text-xs text-gray-500 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading songs…
                      </p>
                    )}

                    {tracks?.length === 0 && <Empty>Nothing in here yet.</Empty>}

                    {tracks?.length > 0 && (
                      <>
                        <div className="flex gap-2 mb-3">
                          <button type="button" onClick={() => play(tracks, false)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black
                                       px-3 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-gray-200">
                            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Play all
                          </button>
                          <button type="button" onClick={() => play(tracks, true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 text-white
                                       px-3 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-white/20">
                            <Shuffle className="w-3.5 h-3.5" aria-hidden="true" /> Shuffle all
                          </button>
                        </div>

                        <ul className="divide-y divide-white/5">
                          {tracks.map((row, i) => (
                            <li key={row.id} className="flex items-center gap-3 py-2">
                              <button type="button" onClick={() => play(tracks.slice(i), false)}
                                className="flex items-center gap-3 flex-1 min-w-0 text-left group">
                                <span className="w-10 h-10 rounded-md bg-white/5 overflow-hidden shrink-0
                                                 flex items-center justify-center">
                                  {row.poster
                                    ? <img src={row.poster} alt="" className="w-full h-full object-cover" />
                                    : <Music2 className="w-4 h-4 text-gray-600" aria-hidden="true" />}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold truncate group-hover:text-white">
                                    {row.title || row.track_id}
                                  </span>
                                  <span className="block text-[11px] text-gray-500 truncate">{row.artist}</span>
                                </span>
                              </button>
                              <button type="button" aria-label="Remove"
                                onClick={async () => {
                                  await removeTrack(row.id);
                                  setTracks((t) => t.filter((x) => x.id !== row.id));
                                }}
                                className="shrink-0 rounded-lg p-2 text-gray-600 hover:text-red-400 hover:bg-white/5">
                                <X className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default PlaylistPanel;
