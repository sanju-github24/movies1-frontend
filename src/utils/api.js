// utils/api.js
const devMode = import.meta.env.DEV;
export const backendUrl = import.meta.env.VITE_BACKEND_URL || (devMode ? '' : 'https://movies1-backend.onrender.com');

/**
 * musicApi(path, options?)
 * Use this for all /api/songs/... calls in music pages.
 *
 * In development: Vite proxy forwards `/api/...` to localhost:4000 automatically.
 * In production:  VITE_BACKEND_URL is set to the Render backend URL so the
 *                 absolute URL is used instead of the relative path that would
 *                 hit the static file server and return HTML.
 *
 * Usage:
 *   const res = await musicApi(`/api/songs/search?q=${q}`);
 *   const data = await res.json();
 */
export function musicApi(path, options) {
  return fetch(`${backendUrl}${path}`, options);
}
