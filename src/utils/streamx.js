/**
 * StreamX Player — URL Builder API
 * Internal use only. Pass a stream/video URL + a title, get back a ready
 * play link for player.html. No restrictions, no keys, no bundle logic.
 *
 * player.html already reads ?url= and ?title= directly (see checkParams()
 * in the player script), so this is just a clean helper for generating
 * that link consistently from anywhere on your site.
 */

// Point this at wherever player.html actually lives on your site.
const STREAMX_PLAYER_BASE = "/player.html";

/**
 * Build a StreamX player URL from a video URL and a display name.
 * @param {string} videoUrl - Direct stream/video URL (.mp4, .m3u8, .mpd, etc.)
 * @param {string} [title]  - Display name shown in the player's top bar.
 * @param {string} [base]   - Optional override for the player's location.
 * @returns {string} Full player URL.
 */
function buildStreamXUrl(videoUrl, title = "", base = STREAMX_PLAYER_BASE) {
  if (!videoUrl) throw new Error("buildStreamXUrl: videoUrl is required");
  const params = new URLSearchParams();
  params.set("url", videoUrl);
  if (title) params.set("title", title);
  return `${base}?${params.toString()}`;
}

/** Open the player in a new tab. */
function openStreamX(videoUrl, title) {
  window.open(buildStreamXUrl(videoUrl, title), "_blank", "noopener,noreferrer");
}

/** Navigate the current tab to the player. */
function playStreamX(videoUrl, title) {
  window.location.href = buildStreamXUrl(videoUrl, title);
}

/** Get an iframe-ready src for embedding the player inline on a page. */
function getStreamXEmbedSrc(videoUrl, title) {
  return buildStreamXUrl(videoUrl, title);
}

// ── Example usage ───────────────────────────────────────────────
// buildStreamXUrl('https://cdn.example.com/match.m3u8', 'India vs Australia');
//   → "/player.html?url=https%3A%2F%2Fcdn.example.com%2Fmatch.m3u8&title=India+vs+Australia"
//
// openStreamX('https://cdn.example.com/movie.mp4', 'Big Buck Bunny');
//   → opens the player in a new tab with that video loaded
//
// <iframe src={getStreamXEmbedSrc(videoUrl, title)} allowFullScreen />
//   → embeds the player inline in a React/HTML page

export { buildStreamXUrl, openStreamX, playStreamX, getStreamXEmbedSrc };
