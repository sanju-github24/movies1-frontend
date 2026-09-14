// utils/saavn.js
// The music pages' single data source: the JioSaavn API the backend serves at
// /api/saavn (a port of github.com/anxkhn/jiosaavn-api). Everything the /music
// routes render — home rows, search, a track's metadata and its audio URL —
// comes from here.
import { musicApi, backendUrl } from './api';

export const saavnApi = (path) => musicApi(`/api/saavn${path}`);

async function getJson(path) {
  const res = await saavnApi(path);
  if (!res.ok) {
    // The API answers FastAPI-style, with the reason under `detail`.
    const detail = await res.json().then(d => d?.detail).catch(() => null);
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Home rows ───────────────────────────────────────────────────────────
// The API has no trending endpoint, so the home page is built from JioSaavn's
// own chart playlists — one /playlist/ call each, 50 songs a row, every one of
// them carrying a playable media_url already.
export const CHART_PLAYLISTS = [
  { name: 'Hindi Top 50',     id: '1134543272' },
  { name: 'Trending Today',   id: '110858205'  },
  { name: 'English Top 50',   id: '1134595537' },
  { name: 'Punjabi Top 50',   id: '1134543511' },
  { name: 'Tamil Top 50',     id: '1134651042' },
  { name: 'Telugu Top 50',    id: '1134643225' },
  { name: 'Kannada Top 50',   id: '1134591169' },
  { name: 'Malayalam Top 50', id: '1134705865' },
  { name: 'Marathi Top 50',   id: '1134710071' },
];

/** A song object from the API, shaped into the card the rows and lists render. */
export function toCard(song) {
  const title = song.song || song.title || 'Untitled';
  const album = song.album || '';
  const artist = song.primary_artists || song.singers || '';
  return {
    id: song.id,
    title,
    // A single's album repeats its title; the artists are more use there.
    label: album && album !== title ? album : (artist || 'Single'),
    poster: song.image || '',
    artist: artist || 'Unknown Artist',
  };
}

const clock = (seconds) => {
  const s = parseInt(seconds, 10);
  if (!Number.isFinite(s)) return 'N/A';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// JioSaavn masters every track at these bitrates and serves each as its own
// file, the URL differing only in the suffix. A track without a 320k master
// exists up to 160k — its media_url says so by coming back as _160.
const BITRATES = [320, 160, 96, 48];

/**
 * Every quality this track can be saved at, highest first, as
 * { '320 kbps': url }. Each URL goes through the proxy: saavncdn needs a
 * jiosaavn.com Referer, and the page reads the bytes to name the file itself,
 * which needs CORS. The filename rides along for the fallback that opens the
 * URL directly instead.
 */
function downloadUrls(mediaUrl, title) {
  const m = /^(.*)_(\d+)\.mp4(\?.*)?$/.exec(mediaUrl || '');
  if (!m) return {};
  const [, base, maxBitrate, qs = ''] = m;
  const name = `${(title || 'Song').replace(/[^\w\s()-]/g, '').replace(/\s+/g, ' ').trim() || 'Song'}.m4a`;
  return Object.fromEntries(
    BITRATES
      .filter(b => b <= Number(maxBitrate))
      .map(b => [`${b} kbps`, `${playableUrl(`${base}_${b}.mp4${qs}`)}&download=${encodeURIComponent(name)}`])
  );
}

/** A song object shaped into what the track page and the player consume. */
export function toTrack(song) {
  return {
    success: Boolean(song?.media_url),
    stream_url: song?.media_url || null,
    downloads: downloadUrls(song?.media_url, song?.song),
    metadata: {
      title:       song?.song || 'Untitled',
      cover_image: song?.image || '',
      singer:      song?.singers || song?.primary_artists || 'Unknown Artist',
      album:       song?.album || 'Single',
      composer:    song?.music || 'Unknown',
      starring:    song?.starring || 'N/A',
      label:       song?.label || 'JioSaavn',
      duration:    clock(song?.duration),
      added_on:    song?.release_date || song?.year || 'N/A',
      page_url:    song?.perma_url || (song?.id ? `https://www.jiosaavn.com/song/${song.id}` : ''),
      language:    song?.language || '',
      // Whether there are words to fetch at all — roughly half the catalogue
      // has none, and the lyrics panel hides itself rather than fetching to
      // find out.
      has_lyrics:  song?.has_lyrics === 'true',
    },
    source: 'saavn',
    error: song?.media_url ? null : 'JioSaavn returned no playable url for this song.',
  };
}

// ── Calls ───────────────────────────────────────────────────────────────

/** One chart playlist, as a row of cards. */
export async function fetchPlaylist(id, limit = 20) {
  const data = await getJson(`/playlist/?query=${encodeURIComponent(id)}`);
  return (data.songs || []).slice(0, limit).map(toCard);
}

/** Every chart row, in parallel. Rows that fail are dropped, not fatal. */
export async function fetchHomeRows(limit = 20) {
  const rows = await Promise.all(CHART_PLAYLISTS.map(async ({ name, id }) => {
    try {
      return [name, await fetchPlaylist(id, limit)];
    } catch {
      return [name, []];
    }
  }));
  return Object.fromEntries(rows.filter(([, songs]) => songs.length > 0));
}

/** Songs, albums and artists for a query — one upstream call. */
export function fetchSearch(query) {
  return getJson(`/search?query=${encodeURIComponent(query)}`);
}

/**
 * A "direct listing" — the album or artist a search result card opens.
 *
 * An album has its own endpoint. The API has no artist endpoint, so an artist
 * card carries the artist's name rather than an id, and their listing is a
 * search for that name.
 */
export async function fetchListing(query) {
  if (query.startsWith('album:')) {
    const album = await getJson(`/album/?query=${encodeURIComponent(query.slice(6))}`);
    return {
      songs: (album.songs || []).map(toCard),
      albums: [], artists: [],
      metadata: { title: album.name || '', poster: album.image || '' },
    };
  }
  const name = query.slice(7);
  const { songs } = await fetchSearch(name);
  return { songs, albums: [], artists: [], metadata: { title: name, poster: songs[0]?.poster || '' } };
}

/**
 * One song, with its playable url.
 * Lyrics are off by default — asking for them costs a second upstream call and
 * nothing on the track page renders them yet.
 */
export async function fetchTrack(songId, { lyrics = false } = {}) {
  const song = await getJson(`/song/get?song_id=${encodeURIComponent(songId)}&lyrics=${lyrics}`);
  return toTrack(song);
}

/**
 * A track's lyrics, as lines.
 *
 * JioSaavn returns one block of text with <br> between lines and no timing
 * data of any kind, so these can be shown beside a playing song but not
 * followed along with it — there is nothing to sync a highlight to.
 */
export async function fetchLyrics(songId) {
  const data = await getJson(`/lyrics/?query=${encodeURIComponent(songId)}`);
  if (!data.status || !data.lyrics) return { lines: [], copyright: '' };
  return {
    lines: data.lyrics.split(/<br\s*\/?>/i).map(l => l.trim()),
    copyright: data.copyright || '',
  };
}

/**
 * The audio URL to hand an <audio> element.
 * saavncdn only serves a request carrying a jiosaavn.com Referer, which a
 * browser can't set, so playback goes through the backend proxy that adds the
 * right headers and re-serves the bytes same-origin with CORS.
 */
export const playableUrl = (streamUrl) =>
  `${backendUrl}/api/music/stream?url=${encodeURIComponent(streamUrl)}`;
