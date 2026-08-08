// Tiny local "My List" + rating store used by the mobile detail sheet.
// Keyed by slug, kept in localStorage — no backend table exists for these yet.

const LIST_KEY = "my_list_v1";
const RATE_KEY = "my_ratings_v1";

const read = (key) => {
  try { const v = JSON.parse(localStorage.getItem(key) || "{}"); return v && typeof v === "object" ? v : {}; }
  catch { return {}; }
};
const write = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

export const inMyList = (slug) => !!(slug && read(LIST_KEY)[slug]);

/** Toggle a title in the list. Returns the new state (true = now in list). */
export function toggleMyList(movie) {
  if (!movie?.slug) return false;
  const list = read(LIST_KEY);
  if (list[movie.slug]) delete list[movie.slug];
  else list[movie.slug] = {
    slug: movie.slug,
    title: movie.title || movie.slug,
    poster: movie.poster || movie.poster_url || "",
    content_type: movie.content_type || "movie",
    tmdb_id: movie.tmdb_id || null,
    addedAt: Date.now(),
  };
  write(LIST_KEY, list);
  return !!list[movie.slug];
}

export const readMyList = () =>
  Object.values(read(LIST_KEY)).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

export const getRating = (slug) => (slug ? read(RATE_KEY)[slug] || 0 : 0);

export function setRating(slug, stars) {
  if (!slug) return 0;
  const all = read(RATE_KEY);
  if (!stars || all[slug] === stars) delete all[slug];   // tapping the same star clears it
  else all[slug] = stars;
  write(RATE_KEY, all);
  return all[slug] || 0;
}
