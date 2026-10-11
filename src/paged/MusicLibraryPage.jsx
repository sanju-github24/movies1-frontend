import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Plus, Loader2, Check, X, Library } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { listPlaylistsWithCovers, createPlaylist } from "../utils/playlists";
import PlaylistCover from "../components/PlaylistCover";

/* Your library: every playlist you have made, as covers in a grid, newest
   change first. A playlist opens on its own page. */
export default function MusicLibraryPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [lists, setLists] = useState(null);
  const [making, setMaking] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { if (session === null) setLists([]); return; }
    listPlaylistsWithCovers().then(setLists, (e) => { setErr(e.message); setLists([]); });
  }, [session]);

  const make = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setErr("");
    try { const pl = await createPlaylist(name); navigate(`/music/playlist/${pl.id}`); }
    catch (e2) { setErr(e2.message); setBusy(false); }
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <Helmet><title>Your library — Music</title></Helmet>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-28">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back"
          className="mb-6 w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/15 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <Library className="w-7 h-7 text-white/80" />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Your library</h1>
          {lists?.length > 0 && <span className="text-sm text-gray-500 mt-2">{lists.length} playlist{lists.length === 1 ? "" : "s"}</span>}
        </div>

        {session === null ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">Sign in to see and make your playlists.</p>
            <Link to="/login" className="inline-block mt-4 rounded-full bg-white text-black px-6 py-2.5 text-sm font-bold">Sign in</Link>
          </div>
        ) : lists === null ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-white/50" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {/* New playlist */}
            <div>
              {making ? (
                <form onSubmit={make} className="aspect-square rounded-xl bg-white/[0.05] ring-1 ring-white/10 p-3 flex flex-col justify-center gap-2">
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" maxLength={80}
                    className="w-full bg-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 placeholder:text-gray-600" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={!name.trim() || busy}
                      className="flex-1 rounded-lg bg-white text-black py-2 text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-1">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create
                    </button>
                    <button type="button" onClick={() => { setMaking(false); setName(""); }} aria-label="Cancel"
                      className="rounded-lg bg-white/10 px-3"><X className="w-4 h-4" /></button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setMaking(true)}
                  className="group w-full aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-white/40 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white transition">
                  <Plus className="w-10 h-10" />
                  <span className="text-sm font-semibold">New playlist</span>
                </button>
              )}
            </div>

            {lists.map((pl) => (
              <Link key={pl.id} to={`/music/playlist/${pl.id}`} className="group block">
                <PlaylistCover covers={pl.covers} className="ring-1 ring-white/[0.07] group-hover:ring-white/30 transition shadow-lg shadow-black/40" />
                <p className="mt-2.5 text-sm font-bold truncate">{pl.name}</p>
                <p className="text-xs text-gray-500">{pl.count} song{pl.count === 1 ? "" : "s"}</p>
              </Link>
            ))}
          </div>
        )}
        {err && <p className="mt-6 text-sm text-amber-400">{err}</p>}
      </div>
    </div>
  );
}
