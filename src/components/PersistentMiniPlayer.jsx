import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Pause, X, ChevronUp } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function PersistentMiniPlayer() {
  const player = useMusicPlayer();
  const navigate = useNavigate();
  const location = useLocation();
  const [hov, setHov] = useState(false);

  if (!player?.currentTrack || !player?.isMinimized) return null;

  // A session restored from a previous visit only surfaces on music pages.
  // Once the user hits play (or starts a new track) it behaves like a live
  // session again and follows them across the site.
  const isMusicPage = location.pathname.startsWith('/music');
  if (player.isRestoredSession && !isMusicPage) return null;

  const { currentTrack, isPlaying, currentTime, duration, togglePlay, close, setIsMinimized } = player;
  const progress = duration ? (currentTime / duration) * 100 : 0;
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
      {/* Thin progress bar at very top of mini player */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: `rgb(${lightRgb})`, transition: 'width 0.1s linear', borderRadius: '0 2px 2px 0' }} />
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
        @keyframes mini-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
