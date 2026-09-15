import { supabase } from "./supabaseClient";
import { fetchTrack, playableUrl } from "./saavn";

/* Playlists, as calls rather than storage.
 *
 * Nothing playable is kept. A stream URL carries a token that expires within
 * hours, so a saved one is a dead link by the time anyone opens the playlist —
 * and a playlist of dead links is worse than none, because it looks like it
 * works. What is stored is the track's id and enough of its details to draw a
 * row; the stream is fetched when the song is actually played.
 *
 * Every call here is scoped by the database to the person making it. The
 * policies do that, not this file — see MUSIC-playlists.sql — so a mistake
 * here cannot expose somebody else's playlist.
 */

export async function listPlaylists() {
  const { data, error } = await supabase
    .from("music_playlists")
    .select("id,name,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPlaylist(name) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("A playlist needs a name");

  /* The owner is set here and checked by the policy. Passing someone else's id
     does not work — the insert is refused rather than silently misfiled. */
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to make a playlist");

  const { data, error } = await supabase
    .from("music_playlists")
    .insert([{ name: clean, user_id: user.id }])
    .select("id,name,created_at,updated_at")
    .single();

  // The unique index, reported as something a person can act on.
  if (error) throw new Error(error.code === "23505" ? "You already have a playlist by that name" : error.message);
  return data;
}

export async function renamePlaylist(id, name) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("A playlist needs a name");
  const { error } = await supabase
    .from("music_playlists")
    .update({ name: clean, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "You already have a playlist by that name" : error.message);
}

export async function deletePlaylist(id) {
  const { error } = await supabase.from("music_playlists").delete().eq("id", id);
  if (error) throw error;
}

export async function getTracks(playlistId) {
  const { data, error } = await supabase
    .from("music_playlist_tracks")
    .select("id,track_id,title,artist,poster,position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addTrack(playlistId, track) {
  const id = track?.id || track?.track_id;
  if (!id) throw new Error("That track has no id to save");

  /* Appended, so a song lands where it was added rather than at the top of
     somebody's carefully ordered list. */
  const { data: last } = await supabase
    .from("music_playlist_tracks")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("music_playlist_tracks").insert([{
    playlist_id: playlistId,
    track_id: String(id),
    title: track.title || "",
    artist: track.artist || "",
    poster: track.poster || null,
    position: ((last && last[0]?.position) ?? -1) + 1,
  }]);

  if (error) {
    if (error.code === "23505") return { already: true };   // the unique index
    throw error;
  }
  await supabase.from("music_playlists")
    .update({ updated_at: new Date().toISOString() }).eq("id", playlistId);
  return { already: false };
}

export async function removeTrack(rowId) {
  const { error } = await supabase.from("music_playlist_tracks").delete().eq("id", rowId);
  if (error) throw error;
}

/* The stream for one track, fetched when it is about to play.
 *
 * This is the reason nothing is stored: ask at the moment of playing and the
 * answer is always current, however old the playlist is.
 *
 * Asked through the same path the rest of the music pages use. The first
 * version of this called /api/songs/track, which the backend no longer has —
 * the music pages moved to /api/saavn and those routes went with the move, so
 * every playlist song 404'd.
 *
 * The CDN only serves a request carrying a jiosaavn.com Referer, which a
 * browser cannot set, so the URL handed back is the backend's proxy rather
 * than the CDN's own. */
export async function resolveStream(trackId) {
  const d = await fetchTrack(trackId);
  if (!d.success || !d.stream_url) throw new Error(d.error || "No stream for that track");
  return { streamUrl: playableUrl(d.stream_url), metadata: d.metadata || {} };
}

/* A stored row in the shape the player takes. streamUrl is deliberately
   absent — the player asks for it when the song reaches the front. */
export function toTrack(row) {
  return {
    id: row.track_id,
    rowId: row.id,
    title: row.title,
    artist: row.artist,
    poster: row.poster,
  };
}
