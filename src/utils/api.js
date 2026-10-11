// utils/api.js
const devMode = import.meta.env.DEV;

/* ── Which backend ───────────────────────────────────────────────────────
   The backend runs as more than one copy: list them in VITE_BACKEND_URLS,
   comma-separated, main one first (VITE_BACKEND_URL alone still works for
   one). Every visitor uses the first — the main server — and the others
   are standbys.

   If the main one stops answering — a request to it fails outright — that
   request is tried once more on the next copy, and the rest of the visit
   stays there. The next visit starts on the main server again. */
const BACKENDS = String(import.meta.env.VITE_BACKEND_URLS || import.meta.env.VITE_BACKEND_URL || (devMode ? '' : 'https://movies1-backend.onrender.com'))
  .split(',').map((u) => u.trim().replace(/\/$/, '')).filter((u, i, a) => a.indexOf(u) === i);
if (!BACKENDS.length) BACKENDS.push('');

// The old random, kept-forever pick is no longer used; clear it.
try { localStorage.removeItem('backend_pick'); } catch { /* storage blocked */ }
const pickBackend = () => BACKENDS[0];

export const backendUrl = pickBackend();
export const backendUrls = BACKENDS;

/* Failover for every fetch to a backend, wherever in the app it is made —
   the calls are spread over many files, so it is done once here rather than
   at each. Only a request that never got an answer is retried (an error
   status is an answer); one with a body that is not a plain string is left
   alone, since it may already have been read. */
if (BACKENDS.length > 1 && typeof window !== 'undefined' && !window.__backendFailover) {
  window.__backendFailover = true;
  const nativeFetch = window.fetch.bind(window);
  const movedTo = new Map();   // a copy that failed → the one now used instead
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    const from = url && BACKENDS.find((b) => b && url.startsWith(b + '/'));
    // Already found down in this visit: go straight to its replacement.
    if (from && movedTo.has(from) && !(input instanceof Request)) return nativeFetch(movedTo.get(from) + url.slice(from.length), init);
    try {
      return await nativeFetch(input, init);
    } catch (err) {
      const retryable = from && err?.name !== 'AbortError' && !(init?.body && typeof init.body !== 'string') && !(input instanceof Request);
      if (!retryable) throw err;
      const to = BACKENDS.find((b) => b && b !== from);
      movedTo.set(from, to);
      console.warn(`[api] ${from} did not answer; trying ${to}`);
      return nativeFetch(to + url.slice(from.length), init);
    }
  };
}

/**
 * musicApi(path, options?)
 * The backend fetcher the music pages use. Song data goes through
 * utils/saavn.js, which wraps this; call it directly only for the handful of
 * other music endpoints (the YouTube preview, artist recommendations).
 *
 * In development: Vite proxy forwards `/api/...` to localhost:4000 automatically.
 * In production:  VITE_BACKEND_URL is set to the Render backend URL so the
 *                 absolute URL is used instead of the relative path that would
 *                 hit the static file server and return HTML.
 *
 * Usage:
 *   const res = await musicApi(`/api/songs/youtube-preview?q=${q}`);
 *   const data = await res.json();
 */
export function musicApi(path, options) {
  return fetch(`${backendUrl}${path}`, options);
}
