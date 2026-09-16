import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Pause, X, ChevronUp, SkipForward, Download, Loader2 } from 'lucide-react';
import { fetchTrack, downloadTrack } from '../utils/saavn';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function PersistentMiniPlayer() {
  const player = useMusicPlayer();
  const navigate = useNavigate();
  const location = useLocation();
  const [hov, setHov] = useState(false);

  /* Dragging the bar. The full player has this; minimized it was a progress
     readout you could only watch, so moving through a song meant opening the
     whole page first. Held in a ref rather than state so the pointer handlers
     wired below always see the live value. */
  /* Downloads for whatever is playing. The track page has had these; the mini
     player is where a song usually is by the time someone wants to keep it, and
     going back to the full page to find the button was the long way round.
     Asked for when the menu is opened rather than on every track — most songs
     are listened to, not saved — and kept per id so reopening costs nothing. */
  const [dlOpen, setDlOpen] = useState(false);
  const [dlBusy, setDlBusy] = useState('');
  const [dls, setDls] = useState({});
  const dlCache = useRef({});
  const dlBoxRef = useRef(null);

  const barRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragPct, setDragPct] = useState(null);
  const draggingRef = useRef(false);

  const pctFrom = useCallback((clientX) => {
    const el = barRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }, []);

  /* Bound to the window, not the bar: a drag that leaves the strip — and this
     one is three pixels tall — must keep seeking rather than stop dead. */
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setDragPct(pctFrom(x));
    };
    const up = (e) => {
      const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const pct = pctFrom(x);
      draggingRef.current = false;
      setDragging(false);
      setDragPct(null);
      const d = player?.duration;
      if (d) player?.seekTo?.(pct * d);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, pctFrom, player]);

  const trackId = player?.currentTrack?.id;

  // A new song closes the menu — its bitrates are not this song's.
  useEffect(() => { setDlOpen(false); setDls(dlCache.current[trackId] || {}); }, [trackId]);

  useEffect(() => {
    if (!dlOpen || !trackId || dlCache.current[trackId]) return;
    let live = true;
    fetchTrack(trackId)
      .then(d => {
        if (!live) return;
        dlCache.current[trackId] = d.downloads || {};
        setDls(d.downloads || {});
      })
      .catch(() => { if (live) setDls({}); });
    return () => { live = false; };
  }, [dlOpen, trackId]);

  // Clicking away closes it, the way the track page's menus do.
  useEffect(() => {
    if (!dlOpen) return;
    const away = (e) => { if (dlBoxRef.current && !dlBoxRef.current.contains(e.target)) setDlOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('touchstart', away);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('touchstart', away);
    };
  }, [dlOpen]);

  if (!player?.currentTrack || !player?.isMinimized) return null;

  // A session restored from a previous visit only surfaces on music pages.
  // Once the user hits play (or starts a new track) it behaves like a live
  // session again and follows them across the site.
  const isMusicPage = location.pathname.startsWith('/music');
  if (player.isRestoredSession && !isMusicPage) return null;

  const { currentTrack, isPlaying, currentTime, duration, togglePlay, close, setIsMinimized } = player;
  // While dragging, the bar follows the finger rather than the clock.
  const progress = dragPct != null ? dragPct * 100 : (duration ? (currentTime / duration) * 100 : 0);
  const { lightRgb = '100,160,240', baseRgb = '20,28,48' } = currentTrack;

  const fmt = s => isNaN(s) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9990,
        background: `linear-gradient(90deg, rgba(${baseRgb}, 0.98) 0%, rgba(12, 12, 20, 0.98) 100%)`,
        backdropFilter: 'blur(24px)',
        borderTop: `1px solid rgba(${lightRgb}, 0.18)`,
        boxShadow: `0 -8px 40px rgba(${baseRgb}, 0.5)`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* The seek bar. Three pixels of colour is too fine a target for a
          finger, so the strip carries a taller invisible band above it that
          takes the press — the bar looks the same and is reachable. */}
      <div
        ref={barRef}
        onMouseDown={(e) => { e.stopPropagation(); draggingRef.current = true; setDragging(true); setDragPct(pctFrom(e.clientX)); }}
        onTouchStart={(e) => { e.stopPropagation(); draggingRef.current = true; setDragging(true); setDragPct(pctFrom(e.touches[0].clientX)); }}
        onClick={(e) => e.stopPropagation()}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(currentTime || 0)}
        style={{ height: 3, background: 'rgba(255,255,255,0.08)', position: 'relative', cursor: 'pointer', touchAction: 'none' }}
      >
        <div style={{ position: 'absolute', left: 0, right: 0, top: -9, height: 15 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: `rgb(${lightRgb})`, transition: dragging ? 'none' : 'width 0.1s linear', borderRadius: '0 2px 2px 0' }} />
        {/* The handle earns its place only once there is a drag to follow. */}
        {(dragging || hov) && (
          <div style={{ position: 'absolute', top: '50%', left: `calc(${progress}% - 6px)`, transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.45)', pointerEvents: 'none' }} />
        )}
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={() => {
          // Clicking the bar goes to full track page
          navigate(`/music/track/${currentTrack.id}`);
          player.setIsMinimized(false);
        }}
      >
        {/* Poster thumbnail */}
        <div style={{ position: 'relative', flexShrink: 0, width: 42, height: 42, borderRadius: 8, overflow: 'hidden', border: `1px solid rgba(${lightRgb}, 0.25)` }}>
          <img
            src={currentTrack.poster}
            alt={currentTrack.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=80&q=80'; }}
          />
          {/* Pulsing ring when playing */}
          {isPlaying && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: 8, border: `2px solid rgb(${lightRgb})`, animation: 'mini-pulse 1.5s ease-in-out infinite', opacity: 0.6 }} />
          )}
        </div>

        {/* Track info */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentTrack.title}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentTrack.artist} · <span style={{ fontFamily: 'monospace' }}>{fmt(currentTime)}</span>
          </p>
        </div>

        {/* Controls — stop propagation so bar click doesn't trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Expand/Open full */}
          <button
            onClick={e => { e.stopPropagation(); navigate(`/music/track/${currentTrack.id}`); player.setIsMinimized(false); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', padding: 4 }}
            title="Open full player"
          >
            <ChevronUp size={16} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={e => { e.stopPropagation(); togglePlay(); }}
            style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: `rgb(${lightRgb})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px rgba(${lightRgb}, 0.4)`, transition: 'transform 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause size={16} style={{ fill: '#000', color: '#000' }} />
              : <Play  size={16} style={{ fill: '#000', color: '#000', marginLeft: 2 }} />
            }
          </button>

          {/* Download, for the song playing right now. */}
          <div ref={dlBoxRef} style={{ position: 'relative', display: 'flex' }}>
            <button
              onClick={e => { e.stopPropagation(); setDlOpen(o => !o); }}
              style={{ background: 'none', border: 'none', color: dlOpen ? `rgb(${lightRgb})` : 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', padding: 4 }}
              title="Download this song"
              aria-label="Download this song"
              aria-expanded={dlOpen}
            >
              {dlBusy ? <Loader2 size={16} style={{ animation: 'mini-spin 0.8s linear infinite' }} /> : <Download size={16} />}
            </button>

            {dlOpen && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', bottom: 34, right: 0, zIndex: 20, width: 158,
                  borderRadius: 12, background: '#14141f', border: '1px solid rgba(255,255,255,0.09)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)', padding: '4px 0',
                }}
              >
                <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'rgba(255,255,255,0.3)', margin: '6px 12px 4px' }}>
                  Quality
                </p>
                {Object.keys(dls).length === 0 ? (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, padding: '6px 12px 10px' }}>Loading…</p>
                ) : Object.entries(dls).map(([bitrate, url]) => (
                  <button
                    key={bitrate}
                    onClick={async e => {
                      e.stopPropagation();
                      setDlOpen(false); setDlBusy(bitrate);
                      try { await downloadTrack(url, currentTrack.title, bitrate); }
                      finally { setDlBusy(''); }
                    }}
                    style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Download size={12} style={{ color: `rgb(${lightRgb})` }} /> {bitrate}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Next — the radio keeps queueing songs, so there is always one. */}
          <button
            onClick={e => { e.stopPropagation(); player.next?.(); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', padding: 4 }}
            title="Next song"
            aria-label="Next song"
          >
            <SkipForward size={16} />
          </button>

          {/* Close */}
          <button
            onClick={e => { e.stopPropagation(); close(); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 4 }}
            title="Close player"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes mini-spin { to { transform: rotate(360deg); } }
        @keyframes mini-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
