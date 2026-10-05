import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX,
  Loader2, Download, ArrowLeft, ChevronDown, Radio, Music, Check,
} from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { fetchTrack, playableUrl, fetchLyrics, downloadTrack, fetchSimilar } from '../utils/saavn';
import AddToPlaylist from '../components/AddToPlaylist';
import PlayNextButton from '../components/PlayNextButton';

/* The song page — one player, one look, whatever the artwork. It used to take
   its colours from each song's cover and run a muted YouTube clip behind it,
   at a size that pushed everything else below the fold. Now: the cover, the
   song, a seek bar and the controls — previous and next song, not ten-second
   jumps — then the lyrics and songs like this one, from our own API, each of
   which plays. */

const LYRICS_PREF = 'music_lyrics_panel';
const FALLBACK_ART = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80';
const clock = (s) => (Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

/* "Playing from Workout – Kannada": the list the song came from, in its own
   order, the one playing marked and kept in view. A tap plays that song and
   the list carries on from there. */
function QueueFrom({ player }) {
  const listRef = useRef(null);
  const src = player?.queueSource;
  const queue = player?.queue || [];
  const at = player?.queueIndex ?? -1;
  useEffect(() => {
    const row = listRef.current?.querySelector('[data-on="true"]');
    if (row && listRef.current) listRef.current.scrollTop = row.offsetTop - listRef.current.offsetTop - 60;
  }, [at, queue.length]);
  if (!src || queue.length < 2) return null;
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Playing from</p>
          {src.link
            ? <Link to={src.link} className="block text-base font-bold truncate hover:underline">{src.title}</Link>
            : <p className="text-base font-bold truncate">{src.title}</p>}
        </div>
        <span className="shrink-0 text-xs text-gray-500">{at + 1} / {queue.length}</span>
      </div>
      <ol ref={listRef} className="max-h-80 overflow-y-auto px-3 pb-3">
        {queue.map((t, i) => {
          const on = i === at;
          return (
            <li key={`${t.id}-${i}`} data-on={on}>
              <button type="button" onClick={() => !on && player.jumpTo(i)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition ${on ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}>
                <span className={`w-6 text-right text-xs tabular-nums shrink-0 ${on ? 'text-green-400' : 'text-gray-500'}`}>{on ? '▶' : i + 1}</span>
                <span className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-white/5">
                  {t.poster && <img src={t.poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold truncate ${on ? 'text-green-400' : 'text-white'}`}>{t.title}</span>
                  <span className="block text-xs text-gray-500 truncate">{t.artist}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function TrackDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const player = useMusicPlayer();
  const songId = id.replace(/^saavn__/, '');

  const cached = player?.trackCache?.[id] || {};
  const playingThis = player?.currentTrack?.id === id;
  const [trackData, setTrackData] = useState(cached.trackData || null);
  const [error, setError] = useState('');
  const [lyrics, setLyrics] = useState(cached.lyrics || null);
  const [lyricsOpen, setLyricsOpen] = useState(() => {
    try { return localStorage.getItem(LYRICS_PREF) !== 'closed'; } catch { return true; }
  });
  const [similar, setSimilar] = useState(cached.similar || null);
  const [dlOpen, setDlOpen] = useState(false);
  const [dlBusy, setDlBusy] = useState('');
  const dlRef = useRef(null);
  const seekRef = useRef(null);
  const [dragPct, setDragPct] = useState(null);

  const isPlaying = player?.isPlaying ?? false;
  const currentTime = player?.currentTime ?? 0;
  const duration = player?.duration ?? 0;
  const progress = dragPct != null ? dragPct * 100 : duration ? (currentTime / duration) * 100 : 0;

  // ── The song: from the cache, from what is playing, or fetched ──
  useEffect(() => {
    const entry = player?.trackCache?.[id] || {};
    setTrackData(entry.trackData || null);
    setLyrics(entry.lyrics || null);
    setSimilar(entry.similar || null);
    setError('');
    if (entry.trackData?.success) return;
    let alive = true;
    fetchTrack(songId)
      .then((d) => {
        if (!alive) return;
        if (!d.success || !d.stream_url) throw new Error(d.error || 'This song could not be played.');
        setTrackData(d);
        player?.updateTrackCache(id, { trackData: d });
        if (player?.currentTrack?.id !== id) {
          const m = d.metadata || {};
          player?.loadTrack({
            id, title: m.title, artist: m.singer || 'Unknown Artist', poster: m.cover_image || '',
            language: m.language || '', streamUrl: playableUrl(d.stream_url),
          });
        }
      })
      .catch((e) => alive && setError(e.message || 'This song could not be played.'));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // The player is on screen while this page is; it shrinks to the mini bar on leaving.
  useEffect(() => {
    player?.restore();
    return () => { if (player?.currentTrack) player?.minimize(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Follow the queue: when the next song starts, the page becomes that song.
     Replaced, not pushed, so Back returns to wherever listening began. */
  useEffect(() => {
    const now = player?.currentTrack?.id;
    if (now && now !== id) navigate(`/music/track/${now}`, { replace: true });
  }, [player?.currentTrack?.id, id, navigate]);

  // ── Lyrics ──
  useEffect(() => {
    if (lyrics) return;
    let alive = true;
    fetchLyrics(songId).catch(() => ({ lines: [], copyright: '' })).then((d) => {
      if (!alive) return;
      setLyrics(d); player?.updateTrackCache(id, { lyrics: d });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const toggleLyrics = () => setLyricsOpen((o) => {
    try { localStorage.setItem(LYRICS_PREF, o ? 'closed' : 'open'); } catch { /* not remembered */ }
    return !o;
  });

  // ── Songs like this one, from JioSaavn's song radio (our API) ──
  useEffect(() => {
    if (similar) return;
    let alive = true;
    fetchSimilar(songId).then(({ songs }) => {
      if (!alive) return;
      const list = songs.filter((s) => s.id !== songId).slice(0, 15);
      setSimilar(list); player?.updateTrackCache(id, { similar: list });
    }).catch(() => alive && setSimilar([]));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const close = (e) => { if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // ── Seeking: click or drag along the bar ──
  const pctAt = useCallback((clientX) => {
    const r = seekRef.current?.getBoundingClientRect();
    return r && r.width ? Math.min(1, Math.max(0, (clientX - r.left) / r.width)) : 0;
  }, []);
  const startSeek = (e) => {
    if (!duration) return;
    const x0 = e.touches ? e.touches[0].clientX : e.clientX;
    setDragPct(pctAt(x0));
    const move = (ev) => setDragPct(pctAt(ev.touches ? ev.touches[0].clientX : ev.clientX));
    const end = (ev) => {
      const x = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      player?.seekTo(pctAt(x) * duration);
      setDragPct(null);
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end);
    };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move, { passive: true }); window.addEventListener('touchend', end);
  };

  const saveAs = async (bitrate, url) => {
    setDlBusy(bitrate);
    try { await downloadTrack(url, trackData?.metadata?.title, bitrate); } finally { setDlBusy(''); setDlOpen(false); }
  };

  const m = trackData?.metadata || {};
  const title = m.title || (playingThis ? player.currentTrack.title : '');
  const artist = m.singer || (playingThis ? player.currentTrack.artist : '');
  const cover = m.cover_image || (playingThis ? player.currentTrack.poster : '') || FALLBACK_ART;
  const downloads = trackData?.downloads && Object.keys(trackData.downloads).length ? trackData.downloads : null;
  const lines = (lyrics?.lines || []).filter((l, i, a) => l || (i > 0 && a[i - 1]));

  const iconBtn = 'w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-white/10 active:scale-90';

  if (error && !playingThis) return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Music className="w-10 h-10 text-gray-700" />
      <p className="text-gray-400">{error}</p>
      <button type="button" onClick={() => navigate(-1)} className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold hover:bg-white/20">Back</button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-28">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-3 mb-6">
          {/* Phones have the site's own back button just above. */}
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className={`${iconBtn} bg-white/[0.06] hidden sm:flex`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-auto">
            {trackData && <AddToPlaylist compact track={{ id, title, artist, poster: cover }} />}
            {downloads && (
              <div ref={dlRef} className="relative">
                <button type="button" onClick={() => setDlOpen((o) => !o)} aria-label="Download"
                  className={`${iconBtn} bg-white/[0.06]`}><Download className="w-5 h-5" /></button>
                {dlOpen && (
                  <div className="absolute right-0 top-12 z-30 w-44 rounded-xl bg-gray-900 border border-white/10 shadow-2xl py-1">
                    {Object.entries(downloads).map(([b, url]) => (
                      <button key={b} type="button" onClick={() => saveAs(b, url)} disabled={!!dlBusy}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50">
                        {b}{dlBusy === b ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-gray-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button type="button" onClick={player?.toggleAutoplay} aria-pressed={!!player?.autoplay}
              title="Keep playing similar songs when the queue ends"
              className={`h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold transition
                ${player?.autoplay ? 'bg-white text-black' : 'bg-white/[0.06] text-gray-300 hover:bg-white/10'}`}>
              <Radio className="w-4 h-4" /> Autoplay
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
          {/* ── The player ── */}
          <section className="lg:sticky lg:top-6">
            <div className="mx-auto w-full max-w-[260px] sm:max-w-[300px] lg:max-w-none aspect-square rounded-2xl overflow-hidden bg-white/5 shadow-2xl shadow-black/50">
              {trackData || playingThis
                ? <img src={cover} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_ART; }} />
                : <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/40" /></div>}
            </div>

            <div className="mt-5 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight line-clamp-2">{title || 'Loading…'}</h1>
                <p className="mt-1 text-sm text-gray-400 truncate">{artist}{m.album && m.album !== title ? ` · ${m.album}` : ''}</p>
              </div>
            </div>

            {/* Seek */}
            <div className="mt-4">
              <div ref={seekRef} onMouseDown={startSeek} onTouchStart={startSeek}
                className="group relative h-5 flex items-center cursor-pointer" role="slider"
                aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(currentTime)}>
                <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-white" style={{ width: `${progress}%` }} />
                </div>
                <span className="absolute w-3 h-3 rounded-full bg-white shadow -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${progress}%`, opacity: dragPct != null ? 1 : undefined }} />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 tabular-nums -mt-0.5">
                <span>{clock(dragPct != null ? dragPct * duration : currentTime)}</span><span>{clock(duration)}</span>
              </div>
            </div>

            {/* Controls — previous and next song */}
            <div className="mt-3 flex items-center justify-between max-w-[340px] mx-auto">
              <button type="button" onClick={player?.toggleShuffle} aria-pressed={!!player?.shuffle} aria-label="Shuffle"
                className={`${iconBtn} ${player?.shuffle ? 'text-white' : 'text-gray-500'}`}><Shuffle className="w-5 h-5" /></button>
              <button type="button" onClick={player?.previous} aria-label="Previous song" className={`${iconBtn} w-12 h-12`}>
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              <button type="button" onClick={player?.togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
              </button>
              <button type="button" onClick={player?.next} aria-label="Next song" className={`${iconBtn} w-12 h-12`}>
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
              <button type="button" onClick={player?.cycleRepeat} aria-label={`Repeat: ${player?.repeat || 'off'}`}
                className={`${iconBtn} ${player?.repeat && player.repeat !== 'off' ? 'text-white' : 'text-gray-500'}`}>
                {player?.repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            <div className="mt-3 hidden sm:flex items-center gap-2 max-w-[260px] mx-auto">
              <button type="button" onClick={player?.toggleMute} aria-label={player?.isMuted ? 'Unmute' : 'Mute'} className="text-gray-400 hover:text-white">
                {player?.isMuted || !player?.volume ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input type="range" min="0" max="1" step="0.01" value={player?.isMuted ? 0 : (player?.volume ?? 0.8)}
                onChange={(e) => player?.changeVolume(Number(e.target.value))} aria-label="Volume"
                className="flex-1 accent-white h-1" />
            </div>
          </section>

          {/* ── The list it is playing from, lyrics, and songs like this ── */}
          <div className="space-y-8 min-w-0">
            <QueueFrom player={player} />
            {lines.length > 0 && (
              <section className="rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <button type="button" onClick={toggleLyrics} aria-expanded={lyricsOpen}
                  className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="text-base font-bold">Lyrics</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${lyricsOpen ? 'rotate-180' : ''}`} />
                </button>
                {lyricsOpen && (
                  <div className="px-5 pb-5 max-h-80 overflow-y-auto text-[15px] leading-relaxed text-gray-300 space-y-1">
                    {lines.map((l, i) => <p key={i} className={l ? '' : 'h-3'}>{l}</p>)}
                    {lyrics.copyright && <p className="pt-3 text-[11px] text-gray-600">{lyrics.copyright}</p>}
                  </div>
                )}
              </section>
            )}

            <section>
              <h2 className="text-lg font-bold mb-3">Similar songs</h2>
              {similar == null ? (
                <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-lg bg-white/[0.04] animate-pulse" />)}</div>
              ) : similar.length === 0 ? (
                <p className="text-sm text-gray-500">Nothing similar found for this one.</p>
              ) : (
                <ol className="divide-y divide-white/[0.05]">
                  {similar.map((s, i) => {
                    const on = player?.currentTrack?.id === s.id;
                    return (
                      <li key={s.id} className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.04]">
                        <button type="button" onClick={() => player?.playQueue(similar, i, { title: `Similar to ${title}`, link: `/music/track/${id}` })} aria-label={`Play ${s.title}`}
                          className="relative w-11 h-11 shrink-0 rounded-md overflow-hidden bg-white/5">
                          {s.poster && <img src={s.poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
                          <span className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Play className="w-4 h-4 fill-white text-white" />
                          </span>
                        </button>
                        <button type="button" onClick={() => player?.playQueue(similar, i, { title: `Similar to ${title}`, link: `/music/track/${id}` })} className="flex-1 min-w-0 text-left">
                          <span className={`block text-sm font-semibold truncate ${on ? 'text-green-400' : 'text-white'}`}>{s.title}</span>
                          <span className="block text-xs text-gray-500 truncate">{s.artist}</span>
                        </button>
                        {on ? <Check className="w-4 h-4 text-green-400" /> : <PlayNextButton track={s} />}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
