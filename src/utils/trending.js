import { liveBackend } from "./api";

/* The Top 10 follows what people actually watch. Playing a title is a vote;
   the backend decays votes over days, so the row reflects what's hot now.

   A browser's repeat plays of the same title in a short window count once —
   trending should measure how many people watch a title, not how many times
   one person replays it. */
const THROTTLE_MS = 30 * 60e3;

export function recordTrendingHit(slug) {
  if (!slug) return;
  try {
    const k = `trend_hit_${slug}`;
    if (Date.now() - Number(localStorage.getItem(k) || 0) < THROTTLE_MS) return;
    localStorage.setItem(k, String(Date.now()));
  } catch { /* private mode: still send, just unthrottled */ }
  try {
    fetch(`${liveBackend()}/api/trending/hit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,                 // still sent if the tab is closing
    }).catch(() => {});
  } catch { /* offline — no vote this time */ }
}

export async function fetchTrending(limit = 10) {
  try {
    const r = await fetch(`${liveBackend()}/api/trending?limit=${limit}`);
    if (!r.ok) return [];
    const list = await r.json();
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}
