/* Live radio: Indian FM and online stations, from Radio Browser
   (radio-browser.info) — an open, community-kept directory of public station
   streams. The list is asked for through our backend (/api/radio), which
   keeps it and serves the last good one when the directory is down; the
   streams themselves are the stations' own and play straight from them.

   A station plays in the same player as a song: it becomes a track with its
   stream as streamUrl and live set, so the player skips its own lookup and
   the mini player knows to say LIVE instead of counting time. */

import { liveBackend } from "./api";

export const RADIO_LANGS = [
  { key: "kannada", label: "Kannada" },
  { key: "hindi", label: "Hindi" },
  { key: "tamil", label: "Tamil" },
  { key: "telugu", label: "Telugu" },
  { key: "malayalam", label: "Malayalam" },
  { key: "english", label: "English" },
  { key: "", label: "All India" },
];

async function api(path) {
  const r = await fetch(`${liveBackend()}/api/radio${path}`, { signal: AbortSignal.timeout(20000) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `station list ${r.status}`);
  return d;
}

/* What this browser can play. Every stream must be https (an http one is
   blocked on our https page), and an HLS one only where the browser plays HLS
   by itself — Safari — since those stations do not allow the cross-site reads
   hls.js would need. */
const canNativeHls = () => {
  try { return !!document.createElement("audio").canPlayType("application/vnd.apple.mpegurl"); }
  catch { return false; }
};
const playable = (s) => {
  const u = s.url_resolved || "";
  if (!u.startsWith("https://") || s.lastcheckok !== 1) return false;
  if (/\.m3u8(\?|$)/i.test(u) || /hls/i.test(s.codec || "")) return canNativeHls();
  return /^(MP3|AAC\+?|OGG|OPUS)$/i.test(s.codec || "MP3");
};

const place = (s) => [s.state, s.country === "India" ? "" : s.country].filter(Boolean).join(", ");

export function stationTrack(s) {
  const tags = String(s.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 2).join(" · ");
  return {
    id: `radio:${s.stationuuid}`,
    title: s.name.trim(),
    artist: ["Live radio", place(s) || tags].filter(Boolean).join(" · "),
    poster: /^https:\/\//.test(s.favicon || "") ? s.favicon : null,
    streamUrl: s.url_resolved,
    live: true,
    stationuuid: s.stationuuid,
    bitrate: s.bitrate || 0,
    codec: s.codec || "",
    tags,
    place: place(s),
  };
}

/* The stations for one language, most listened first, one per name. */
const cache = new Map();
export async function fetchStations(lang = "") {
  if (cache.has(lang)) return cache.get(lang);
  const { stations: rows = [] } = await api(`/stations?lang=${encodeURIComponent(lang)}`);
  const seen = new Set();
  const out = [];
  for (const s of rows) {
    const name = s.name?.trim().toLowerCase();
    if (!name || seen.has(name) || !playable(s)) continue;
    seen.add(name);
    out.push(stationTrack(s));
  }
  cache.set(lang, out);
  return out;
}

/* The directory asks players to report a play, which is how its "most
   listened" order stays honest. Fire and forget. */
export function countPlay(uuid) {
  if (!uuid) return;
  fetch(`${liveBackend()}/api/radio/click/${encodeURIComponent(uuid)}`).catch(() => {});
}
