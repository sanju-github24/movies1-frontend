// Watchlist (localStorage), one list per profile — what "+" on a title adds,
// shown as the Watchlist row on the profile page. Each entry keeps enough to
// draw a card and to open the title again (a TMDB-only title needs its ids and
// type, since there is no row of ours to look it up by slug). A change is
// announced with a "watchlist-change" event so every open page updates.
import { readActiveLocal } from "./profiles";

const KEY = () => {
  const a = readActiveLocal();
  const id = typeof a === "string" ? a : a?.id;
  return `anchor_watchlist_v1:${id || "default"}`;
};

export function readWatchlist() {
  try { return JSON.parse(localStorage.getItem(KEY()) || "[]"); } catch { return []; }
}

export const inWatchlist = (slug) => !!slug && readWatchlist().some((x) => x.slug === slug);

function write(list) {
  try { localStorage.setItem(KEY(), JSON.stringify(list.slice(0, 200))); } catch { /* full or private */ }
  try { window.dispatchEvent(new Event("watchlist-change")); } catch { /* no window */ }
}

/** Add the title if absent, remove it if present. Returns true when it is now in the list. */
export function toggleWatchlist(item) {
  if (!item?.slug) return false;
  const list = readWatchlist();
  if (list.some((x) => x.slug === item.slug)) { write(list.filter((x) => x.slug !== item.slug)); return false; }
  write([{
    slug: item.slug, title: item.title || item.slug,
    poster: item.poster || "", cover_poster: item.cover_poster || "",
    content_type: item.content_type || "movie", year: item.year || null,
    tmdb_id: item.tmdb_id || null, imdb_id: item.imdb_id || null, source: item.source || null,
    addedAt: Date.now(),
  }, ...list]);
  return true;
}

export function removeFromWatchlist(slug) {
  write(readWatchlist().filter((x) => x.slug !== slug));
}
