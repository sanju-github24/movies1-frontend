// src/utils/cricfy.js
// Cricfy live events for the /sports page. The backend (/api/cricfy/events) signs
// and decrypts the feed; here we just fetch it and turn a chosen server into a
// source the AnchorHD player (VideoPlayer) can play.
import { backendUrl } from "./api";

let _cache = { at: 0, data: null };

export async function fetchCricfyEvents() {
  // 45s client cache so category switches / navigation don't re-hit the backend.
  if (_cache.data && Date.now() - _cache.at < 45000) return _cache.data;
  const res = await fetch(`${backendUrl}/api/cricfy/events`);
  if (!res.ok) throw new Error(`Cricfy feed ${res.status}`);
  const data = await res.json();
  _cache = { at: Date.now(), data };
  return data;
}

export function findCricfyEvent(events, id) {
  return (events || []).find((e) => String(e.id) === String(id)) || null;
}

/* Turn a server { url, kind, ref, drm } into what VideoPlayer needs.
   Streams play DIRECT from the CDN to the viewer — no VPS bandwidth (1 TB cap).
   - DASH → the .mpd as-is (aiv-cdn/pv-cdn send CORS:*), ClearKey rides alongside.
   - HLS  → the .m3u8 as-is. Works where the CDN sends CORS and needs no Referer;
            Referer-gated HLS can't play in a browser without a proxy (see note). */
export function cricfySource(server) {
  if (!server) return { src: "", drmClearKey: "" };
  return {
    src: server.url,
    drmClearKey: server.kind === "dash" ? (server.drm || "") : "",
  };
}

/* An event's servers as LiveViewer sources (used by the cards and the heroes).
   DASH plays direct from the CDN with its ClearKey; HLS goes through the
   hls-proxy (live HLS CDNs send no CORS and often need a Referer). */
export function cricfySources(ev) {
  return (ev?.servers || []).map((s) => {
    const src = { label: `${s.name}${s.drm ? " · DRM" : ""}`, src: s.url };
    if (s.kind === "dash" && s.drm && s.drm.includes(":")) {
      const [keyId, key] = s.drm.split(":");
      if (keyId && key) src.drm = { keyId: keyId.trim(), key: key.trim() };
    } else if (s.kind !== "dash") {
      src.proxy = { base: `${backendUrl}/api/hls-proxy`, ref: s.ref || "" };
    }
    return src;
  });
}
