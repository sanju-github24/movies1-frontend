// utils/api.js
export const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

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
  // In dev, VITE_BACKEND_URL is empty/unset → use relative path (Vite proxy handles it)
  // In prod, VITE_BACKEND_URL = "https://movies1-backend.onrender.com" → absolute URL
  const base = import.meta.env.VITE_BACKEND_URL || '';
  return fetch(`${base}${path}`, options);
}
