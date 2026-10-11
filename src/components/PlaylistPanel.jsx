import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListMusic, Plus, ChevronRight } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { listPlaylistsWithCovers } from "../utils/playlists";
import PlaylistCover from "./PlaylistCover";

/* Your playlists, on the music page: a row of covers, each opening its own
   page, and the way into the whole library. Signed out, a line saying what
   signing in gives — not an empty box.

   The rows come back scoped by the database to whoever is signed in, so this
   draws whatever it is given and never filters by hand. */
const PlaylistPanel = () => {
  const [session, setSession] = useState(undefined);
  const [lists, setLists] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { if (session === null) setLists([]); return; }
    listPlaylistsWithCovers().then(setLists, () => setLists([]));
  }, [session]);

  if (session === undefined) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
          <ListMusic className="w-5 h-5 shrink-0" aria-hidden="true" /> Your playlists
        </h2>
        {session && (
          <Link to="/music/library" className="inline-flex items-center gap-0.5 text-sm font-semibold text-gray-400 hover:text-white">
            Your library <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {!session ? (
        <p className="text-xs text-gray-500 py-6 text-center">Sign in to make playlists and find them on any device.</p>
      ) : (
        <div className="home-scroll flex gap-4 overflow-x-auto pb-3">
          <Link to="/music/library" className="group shrink-0 w-32 sm:w-40">
            <span className="block aspect-square rounded-xl border-2 border-dashed border-white/15 group-hover:border-white/40 flex flex-col items-center justify-center gap-1.5 text-gray-400 group-hover:text-white transition">
              <Plus className="w-8 h-8" /><span className="text-xs font-semibold">New playlist</span>
            </span>
          </Link>
          {(lists || []).map((pl) => (
            <Link key={pl.id} to={`/music/playlist/${pl.id}`} className="group shrink-0 w-32 sm:w-40">
              <PlaylistCover covers={pl.covers} className="ring-1 ring-white/[0.07] group-hover:ring-white/30 transition" />
              <span className="block mt-2 text-sm font-semibold truncate">{pl.name}</span>
              <span className="block text-xs text-gray-500">{pl.count} song{pl.count === 1 ? "" : "s"}</span>
            </Link>
          ))}
          {lists === null && [0, 1, 2].map((i) => <div key={i} className="shrink-0 w-32 sm:w-40 aspect-square rounded-xl bg-white/[0.04] animate-pulse" />)}
        </div>
      )}
    </section>
  );
};

export default PlaylistPanel;
