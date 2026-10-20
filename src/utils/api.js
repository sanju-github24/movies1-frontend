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

/* The backend in use this visit: the main one, until it has failed over. A
   link the browser loads itself — a song's audio, a stream — never passes
   through fetch, so it asks this rather than holding the main server's
   address. */
let activeBackend = BACKENDS[0];
export const liveBackend = () => activeBackend;

/* Failover for every fetch to a backend, wherever in the app it is made —
   the calls are spread over many files, so it is done once here rather than
   at each. A request is tried on the next copy when it got no answer at all,
   or when the answer is the gateway saying the server behind it is down
   (502/503/504, Cloudflare's 52x/530 — what a restart looks like through the
   tunnel). Any other status is the server's own answer and is kept. Only
   requests that can safely be sent twice are retried: no body, or a plain
   string one. */
const GATEWAY_DOWN = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]);
if (BACKENDS.length > 1 && typeof window !== 'undefined' && !window.__backendFailover) {
  window.__backendFailover = true;
  const nativeFetch = window.fetch.bind(window);
  const movedTo = new Map();   // a copy that failed → the one now used instead
  const moveOn = (from, why) => {
    const to = BACKENDS.find((b) => b && b !== from && !movedTo.has(b));
    if (!to) return null;
    movedTo.set(from, to);
    if (from === activeBackend) activeBackend = to;
    console.warn(`[api] ${from} ${why}; using ${to}`);
    return to;
  };
  /* A 502 is not always the gateway. Our own routes answer 502 when the site
     they ask (MoviBox, HDHub4u, bingr…) fails, and taking that for the main
     server being down moved the rest of the visit to the standby — the
     slower Render copy, without the newest routes. Down behind the gateway
     looks like the gateway's own page: Cloudflare's HTML, or nothing. Our
     server's answer is JSON or a line of text. */
  const serverAnswered = async (res) => {
    if (/json/i.test(res.headers.get('content-type') || '')) return true;
    try {
      const text = (await res.clone().text()).slice(0, 4000);
      return !!text.trim() && !/^\s*</.test(text);
    } catch { return false; }
  };
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    const from = url && BACKENDS.find((b) => b && url.startsWith(b + '/'));
    // Already found down in this visit: go straight to its replacement.
    if (from && movedTo.has(from) && !(input instanceof Request)) return nativeFetch(movedTo.get(from) + url.slice(from.length), init);
    const repeatable = from && !(init?.body && typeof init.body !== 'string') && !(input instanceof Request);
    let res;
    try {
      res = await nativeFetch(input, init);
    } catch (err) {
      if (!repeatable || err?.name === 'AbortError') throw err;
      const to = moveOn(from, 'did not answer');
      if (!to) throw err;
      return nativeFetch(to + url.slice(from.length), init);
    }
    if (repeatable && GATEWAY_DOWN.has(res.status) && !(await serverAnswered(res))) {
      const to = moveOn(from, `answered ${res.status} (down behind its gateway)`);
      if (to) return nativeFetch(to + url.slice(from.length), init);
    }
    return res;
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
