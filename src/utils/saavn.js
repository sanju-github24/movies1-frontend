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

/* Which charts a language draws on, for the radio below. Two each rather than
   one: the top-50 alone is eighty songs short of a station, and a listener who
   leaves it running would hear the same fifty come round. The superhits chart
   is what is current, the most-searched one is what people actually go
   looking for, and together they are a pool worth shuffling. */
const LANGUAGE_CHARTS = {
  hindi:     ['1134543272', '946682072'],
  english:   ['1134595537', '945969391'],
  punjabi:   ['1134543511', '946945296'],
  tamil:     ['1134651042', '1026391929'],
  telugu:    ['1134643225', '951897805'],
  kannada:   ['1134591169', '948035636'],
  malayalam: ['1134705865', '951898142'],
  marathi:   ['1134710071', '951898019'],
};

/* A song in a language we hold no chart for still has to be followed by
   something, and what is trending is the least wrong answer available. */
const FALLBACK_CHARTS = ['110858205'];   // Trending Today

/* A random order that still respects how well listened-to a song is.
 *
 * Not a plain shuffle, which would play a song nobody streams as readily as one
 * everybody does; and not play-count order either, which would be the same
 * sequence every time. Each song draws a key of random^(1/weight) and the
 * highest keys go first — weighted sampling without replacement. A better-rated
 * song is likelier to come up early, but never certain to, so two runs of the
 * same station are not the same run.
 *
 * The weight is the log of the play count, not the count itself. These span
 * from a few hundred thousand to half a billion, and weighting by that
 * directly would let one song win every draw.
 */
function weightedShuffle(songs) {
  return songs
    .map((song) => ({ song, k: Math.random() ** (1 / Math.log10((song.plays || 0) + 10)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.song);
}

/* Half the pool, by play count. "Good rating" has to be relative: a Kannada
   song that does well is counted in millions where a Hindi one is counted in
   hundreds of millions, so a fixed floor would quietly leave some languages
   with no station at all. The median of what came back adapts on its own. */
function betterHalf(songs) {
  if (songs.length < 4) return songs;
  const mid = [...songs].sort((a, b) => (a.plays || 0) - (b.plays || 0))[Math.floor(songs.length / 2)];
  const floor = mid.plays || 0;
  const kept = songs.filter((s) => (s.plays || 0) >= floor);
  return kept.length ? kept : songs;
}

/**
 * What to play after a song finishes, so listening does not stop at the end of
 * whatever was clicked.
 *
 * Songs in the same language, well listened-to, in a different order every
 * time. "Good" is not ours to judge, so it is JioSaavn's own play counts and
 * its charts for that language rather than a rating we would have to invent.
 * `exclude` carries the ids already heard this session so the radio moves on
 * instead of circling.
 *
 * Returns [] only when there is genuinely nothing left; the caller decides
 * whether that ends the session or starts it round again.
 */
export async function fetchRadio(language, exclude = []) {
  const key = String(language || '').trim().toLowerCase();
  const charts = LANGUAGE_CHARTS[key] || FALLBACK_CHARTS;
  const skip = new Set(exclude);

  const pool = async (ids) => {
    /* One slow chart should not hold up the station, and one that fails should
       not silence it — whatever arrives is what gets played. */
    const lists = await Promise.all(ids.map(id => fetchPlaylist(id, 50).catch(() => [])));
    const seen = new Set();
    const songs = [];
    for (const list of lists) {
      for (const song of list) {
        if (!song.id || skip.has(song.id) || seen.has(song.id)) continue;
        seen.add(song.id);
        songs.push(song);
      }
    }
    return weightedShuffle(betterHalf(songs));
  };

  const sameLanguage = await pool(charts);
  if (sameLanguage.length) return sameLanguage;

  /* Heard everything we hold for that language. Rather than stop, widen to what
     is trending across all of them — and only if that is spent too is there
     genuinely nothing. */
  return charts === FALLBACK_CHARTS ? [] : pool(FALLBACK_CHARTS);
}

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
    // How well listened-to it is. The radio picks by this.
    plays: Number(song.play_count) || 0,
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
 * A track's lyrics, as lines. Empty `lines` means this song has none.
 *
 * Always ask; never decide from the song's own `has_lyrics` flag. JioSaavn
 * sets that per request — from our server's IP it comes back "false" for every
 * track, including ones the lyrics endpoint then returns fifty lines for — so
 * gating on it shows lyrics in development and never in production.
 *
 * The words carry no timing data of any kind, so they can be shown beside a
 * playing song but not followed along with it: there is nothing to sync to.
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
 * Save one track at one bitrate.
 *
 * The bytes are read first and handed over as a blob so the file is named
 * here — a plain link would save whatever the CDN's path happens to say. If
 * that read fails the URL is opened instead, which still downloads: the proxy
 * sets a Content-Disposition when the name rides along in ?download=.
 *
 * .m4a, not .mp3 — JioSaavn serves AAC in an MP4 container, and some players
 * refuse the file outright when the extension disagrees with what is inside.
 */
export async function downloadTrack(url, title, bitrate) {
  if (!url) return;
  const clean = String(title || 'Song').replace(/[^a-zA-Z0-9\s\-_()]/g, '').replace(/\s+/g, ' ').trim() || 'Song';
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${clean} (${bitrate}).m4a`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Freed on the next tick: revoking straight away can beat the save in some
    // browsers and hand the user an empty file.
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

/**
 * The audio URL to hand an <audio> element.
 * saavncdn only serves a request carrying a jiosaavn.com Referer, which a
 * browser can't set, so playback goes through the backend proxy that adds the
 * right headers and re-serves the bytes same-origin with CORS.
 */
export const playableUrl = (streamUrl) =>
  `${backendUrl}/api/music/stream?url=${encodeURIComponent(streamUrl)}`;
