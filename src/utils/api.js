// utils/api.js
const devMode = import.meta.env.DEV;
export const backendUrl = import.meta.env.VITE_BACKEND_URL || (devMode ? '' : 'https://movies1-backend.onrender.com');

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
