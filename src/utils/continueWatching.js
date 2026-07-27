// Continue-Watching store (localStorage).
// One record per title, keyed by slug. Stores enough metadata to render a card and
// to navigate back into the player, plus the resume position. Backwards-compatible
// with the older `video_last_time_v1:<slug>` = { time, updatedAt } shape.

const PREFIX = "video_last_time_v1:";
const MIN_RESUME = 10;      // ignore anything under 10s watched
const DONE_RATIO = 0.95;    // >=95% watched → treat as finished (drop from the row)

const keyFor = (slug) => PREFIX + slug;
export const isFinished = (r) => !!(r && r.duration > 0 && (r.time || 0) >= r.duration * DONE_RATIO);
/** Seconds remaining (0 if unknown). */
export const timeLeft = (r) => (r && r.duration ? Math.max(0, r.duration - (r.time || 0)) : 0);
/** A finished episode that has a next one queued → show a "Next Episode" action. */
export const hasNextEpisode = (r) => !!(r && isFinished(r) && r.content_type === "tv" && r.next && r.next.episode);

/** Save/refresh progress for a title. `rec` needs at least { slug, time }. */
export function saveProgress(rec) {
  if (!rec || !rec.slug || !(rec.time > 0)) return;
  try {
    const prev = readOne(rec.slug) || {};
    localStorage.setItem(keyFor(rec.slug), JSON.stringify({
      slug: rec.slug,
      title: rec.title ?? prev.title ?? rec.slug,
      poster: rec.poster ?? prev.poster ?? "",
      backdrop: rec.backdrop ?? prev.backdrop ?? "",
      content_type: rec.content_type ?? prev.content_type ?? "movie",
      logo: rec.logo ?? prev.logo ?? "",               // title logo (for the card)
      tmdb_id: rec.tmdb_id ?? prev.tmdb_id ?? null,
      imdb_id: rec.imdb_id ?? prev.imdb_id ?? null,
      source: rec.source ?? prev.source ?? null,
      season: rec.season ?? prev.season ?? null,       // series: last-watched episode
      episode: rec.episode ?? prev.episode ?? null,
      epTitle: rec.epTitle ?? prev.epTitle ?? null,
      next: rec.next !== undefined ? rec.next : (prev.next ?? null),   // {season,episode,epTitle}
      time: Math.floor(rec.time),
      duration: Math.floor(rec.duration || prev.duration || 0),
      updatedAt: Date.now(),
    }));
  } catch {}
}

/** Read one record (or null). */
export function readOne(slug) {
  try { return JSON.parse(localStorage.getItem(keyFor(slug)) || "null"); } catch { return null; }
}

/** Resume position (seconds) for a title, 0 if none/finished. */
export function getResumeTime(slug) {
  const r = readOne(slug);
  return r && !isFinished(r) && r.time > MIN_RESUME ? r.time : 0;
}

/** Remove a title from continue-watching. */
export function removeProgress(slug) {
  try { localStorage.removeItem(keyFor(slug)); } catch {}
}

/** All in-progress titles, newest first (finished / trivial ones excluded). */
export function readContinueList() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      let r; try { r = JSON.parse(localStorage.getItem(k)); } catch { continue; }
      if (!r) continue;
      if (!r.slug) r.slug = k.slice(PREFIX.length);   // legacy rows
      // Keep: in-progress items, OR a finished episode that has a next one queued
      // (so the card can offer "Next Episode"). Drop finished movies / last episodes.
      if (((r.time || 0) > MIN_RESUME && !isFinished(r)) || hasNextEpisode(r)) out.push(r);
    }
  } catch {}
  return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/** Percent watched (0–100) for a progress bar. */
export function progressPercent(r) {
  if (!r || !r.duration) return 0;
  return Math.min(100, Math.round(((r.time || 0) / r.duration) * 100));
}
