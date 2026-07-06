import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Youtube, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { musicApi } from '../utils/api';

/**
 * MiniYouTubePlayer
 * Props:
 *   trackTitle   — song name (used as YouTube search query part)
 *   trackArtist  — artist / singer name
 *   trackPoster  — album art URL for the header thumbnail
 *   accentRgb    — "r, g, b" string for tinting (optional)
 *   onClose      — callback to hide the player
 */
export default function MiniYouTubePlayer({ trackTitle, trackArtist, trackPoster, accentRgb, onClose }) {
  const [state,        setState]        = useState('loading'); // 'loading' | 'ready' | 'error'
  const [videoId,      setVideoId]      = useState(null);
  const [startSeconds, setStartSeconds] = useState(60);
  const [ytTitle,      setYtTitle]      = useState('');
  const [muted,        setMuted]        = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);

  const accent = accentRgb || '100, 200, 160';

  // Fetch YouTube video on mount / title change
  useEffect(() => {
    if (!trackTitle) return;
    setState('loading'); setVideoId(null);
    const q = [trackTitle, trackArtist].filter(Boolean).join(' ');
    musicApi(`/api/songs/youtube-preview?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => {
        if (d.videoId) {
          setVideoId(d.videoId);
          setStartSeconds(d.startSeconds || 60);
          setYtTitle(d.ytTitle || trackTitle);
          setState('ready');
        } else {
          setState('error');
        }
      })
      .catch(() => setState('error'));
  }, [trackTitle, trackArtist]);

  // Build embed URL
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startSeconds}&rel=0&modestbranding=1&iv_load_policy=3${muted ? '&mute=1' : ''}`
    : null;

  return (
    <>
      <style>{`
        @keyframes mini-slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .mini-yt-player {
          animation: mini-slide-up 0.3s ease;
        }
      `}</style>

      <div
        className="mini-yt-player"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          width: collapsed ? 280 : 320,
          borderRadius: 18,
          background: '#0e0e16',
          border: `1px solid rgba(${accent}, 0.25)`,
          boxShadow: `0 32px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(${accent},0.08)`,
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          /* mobile: full-width pinned bottom */
        }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          background: `rgba(${accent}, 0.08)`,
          borderBottom: `1px solid rgba(${accent}, 0.1)`,
        }}>
          {/* Poster thumbnail */}
          {trackPoster && (
            <img
              src={trackPoster}
              alt={trackTitle}
              style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              onError={e => e.currentTarget.style.display = 'none'}
            />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, margin: 0,
              color: 'rgba(255,255,255,0.9)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {trackTitle}
            </p>
            {trackArtist && (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {trackArtist}
              </p>
            )}
          </div>

          {/* PREVIEW badge */}
          <span style={{
            fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '2px 7px', borderRadius: 6,
            color: `rgb(${accent})`,
            background: `rgba(${accent}, 0.15)`,
            border: `1px solid rgba(${accent}, 0.25)`,
            flexShrink: 0,
          }}>
            Preview
          </span>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            {/* Mute toggle */}
            {state === 'ready' && (
              <button
                onClick={() => setMuted(m => !m)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display:'flex', padding:4, borderRadius:6 }}
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
              </button>
            )}
            {/* Collapse / expand */}
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display:'flex', padding:4, borderRadius:6 }}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <Maximize2 size={13}/>
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display:'flex', padding:4, borderRadius:6 }}
              title="Close preview"
            >
              <X size={15}/>
            </button>
          </div>
        </div>

        {/* ── Video frame ────────────────────────────────────────── */}
        {!collapsed && (
          <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000', width: '100%' }}>
            {state === 'loading' && (
              <div style={{ position: 'absolute', inset: 0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, background:'#050508' }}>
                <Loader2 size={24} style={{ color: `rgb(${accent})`, animation: 'spin 0.8s linear infinite' }}/>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.28)', margin:0 }}>Finding on YouTube…</p>
              </div>
            )}

            {state === 'error' && (
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, background:'#050508' }}>
                <Youtube size={28} style={{ color:'rgba(255,255,255,0.18)' }}/>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.28)', margin:0 }}>No preview found</p>
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.15)', margin:0 }}>Try searching manually on YouTube</p>
              </div>
            )}

            {state === 'ready' && embedUrl && (
              <iframe
                key={embedUrl}           /* re-mount on url change */
                src={embedUrl}
                title={ytTitle || trackTitle}
                width="100%"
                height="100%"
                style={{ display: 'block', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        )}

        {/* ── Collapsed "now previewing" bar ─────────────────────── */}
        {collapsed && state === 'ready' && (
          <div style={{ padding: '8px 12px', background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:`rgb(${accent})`, animation:'spin 2s linear infinite', flexShrink:0 }} />
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              Playing preview…
            </p>
          </div>
        )}
      </div>

      {/* ── Mobile: full-width version ──────────────────────────── */}
      <style>{`
        @media (max-width: 500px) {
          .mini-yt-player {
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            border-radius: 18px 18px 0 0 !important;
          }
        }
      `}</style>
    </>
  );
}
