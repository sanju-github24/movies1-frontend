import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MusicNavbar from '../components/MusicNavbar';
import { musicApi } from '../utils/api';
import MiniYouTubePlayer from '../components/MiniYouTubePlayer';
import { Music, Play, Flame, ChevronRight, Youtube } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Deterministic color from any string — instant, no CORS
// ─────────────────────────────────────────────────────────────────────────
function deriveRgbFromStr(str) {
  if (!str) return { base: '20, 28, 48', light: '100, 160, 240' };
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  const hue  = Math.abs(h) % 360;
  const sat  = 55 + (Math.abs(h >> 8)  % 25);
  const ligB = 18 + (Math.abs(h >> 16) % 12);
  const ligL = 55 + (Math.abs(h >> 24) % 25);
  const hsl = (H, S, L) => {
    const s = S/100, l = L/100;
    const c = (1 - Math.abs(2*l-1))*s;
    const x = c*(1 - Math.abs((H/60)%2 - 1));
    const m = l - c/2;
    let r,g,b;
    if      (H<60)  {r=c;g=x;b=0;}
    else if (H<120) {r=x;g=c;b=0;}
    else if (H<180) {r=0;g=c;b=x;}
    else if (H<240) {r=0;g=x;b=c;}
    else if (H<300) {r=x;g=0;b=c;}
    else            {r=c;g=0;b=x;}
    return `${Math.round((r+m)*255)}, ${Math.round((g+m)*255)}, ${Math.round((b+m)*255)}`;
  };
  return { base: hsl(hue, sat, ligB), light: hsl(hue, sat, ligL) };
}

// ─────────────────────────────────────────────────────────────────────────
// Track card — exact same style as RecommendCard in TrackDetailPage
// ─────────────────────────────────────────────────────────────────────────
// TrackCard accepts setPreview to open the mini player
function TrackCard({ track, navigate, setPreview }) {
  const [hov, setHov] = useState(false);
  const { light } = useMemo(() => deriveRgbFromStr(track.poster || track.id), [track.poster, track.id]);

  return (
    <div
      onClick={() => navigate(`/music/track/${track.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0,
        width: 152,
        cursor: 'pointer',
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${hov ? `rgba(${light}, 0.35)` : 'rgba(255,255,255,0.07)'}`,
        background: hov ? `rgba(${light}, 0.12)` : 'rgba(255,255,255,0.04)',
        transition: 'all 0.2s',
        transform: hov ? 'translateY(-4px)' : 'none',
      }}
    >
      {/* Poster */}
      <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
        <img
          src={track.poster}
          alt={track.title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transform: hov ? 'scale(1.07)' : 'scale(1)', transition: 'transform 0.3s',
          }}
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&q=80'; }}
        />
        {/* Play overlay */}
        {hov && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {/* Play (navigate) */}
            <div
              onClick={(e) => { e.stopPropagation(); navigate(`/music/track/${track.id}`); }}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: `rgb(${light})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 20px rgba(${light}, 0.5)`,
                cursor: 'pointer',
              }}
            >
              <Play size={14} style={{ fill: '#000', color: '#000', marginLeft: 2 }} />
            </div>
            {/* YouTube preview */}
            <div
              onClick={(e) => { e.stopPropagation(); setPreview({ trackId: track.id, title: track.title, artist: track.artist, poster: track.poster, accent: light }); }}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Preview on YouTube"
            >
              <Youtube size={12} style={{ color: 'white' }} />
            </div>
          </div>
        )}
      </div>

      {/* Text — same sizing as RecommendCard */}
      <div style={{ padding: '9px 10px 11px' }}>
        <p style={{
          fontSize: 12, fontWeight: 700,
          color: hov ? `rgb(${light})` : 'rgba(255,255,255,0.88)',
          margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
          transition: 'color 0.15s',
        }}>
          {track.title}
        </p>
        <p style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.32)',
          margin: '3px 0 0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: 500,
        }}>
          {track.artist || 'Various Artists'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Section (horizontal scroll strip)
// ─────────────────────────────────────────────────────────────────────────
function CategorySection({ name, tracks, navigate, setPreview }) {
  const { base, light } = useMemo(() => deriveRgbFromStr(name), [name]);

  return (
    <section style={{ marginBottom: 12 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingRight: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Color dot */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: `rgb(${light})`,
            boxShadow: `0 0 8px rgba(${light}, 0.7)`,
            flexShrink: 0,
          }} />
          <h2 style={{
            fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,0.9)', margin: 0,
          }}>
            {name}
          </h2>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: `rgba(${light}, 0.8)`,
            background: `rgba(${light}, 0.1)`,
            border: `1px solid rgba(${light}, 0.2)`,
            padding: '2px 8px', borderRadius: 20,
          }}>
            {tracks.length}
          </span>
        </div>
        <button
          onClick={() => {/* future: see all */}}
          style={{
            display: 'flex', alignItems: 'center', gap: 2,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            color: `rgba(${light}, 0.7)`,
            background: 'none', border: 'none', cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = `rgb(${light})`}
          onMouseLeave={e => e.currentTarget.style.color = `rgba(${light}, 0.7)`}
        >
          See all <ChevronRight size={12} />
        </button>
      </div>

      {/* Horizontal scroll strip */}
      <div
        className="home-scroll"
        style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10 }}
      >
        {tracks.map(track => (
          <TrackCard key={track.id} track={track} navigate={navigate} setPreview={setPreview} />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function HomeLandingPage() {
  const [categories, setCategories] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [preview,    setPreview]    = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    musicApi('/api/songs/homepage')
      .then(res => {
        if (!res.ok) throw new Error('Failed to retrieve songs homepage data from scraper backend');
        return res.json();
      })
      .then(data => { setCategories(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const allTracks     = Object.values(categories).flat();
  const featuredTrack = allTracks[0] || null;
  const { base: heroBase, light: heroLight } = useMemo(
    () => deriveRgbFromStr(featuredTrack?.poster || featuredTrack?.id || ''),
    [featuredTrack?.poster, featuredTrack?.id]
  );

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <MusicNavbar />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { from { opacity: 0.4; } to { opacity: 0.8; } }
        .home-scroll::-webkit-scrollbar { height: 4px; }
        .home-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius:2px; }
        .home-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius:2px; }
      `}</style>

      <div style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '0 20px 60px' }}>

        {/* ── Loading ─────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 20 }}>
            <div style={{ position: 'relative', width: 56, height: 56 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'rgba(100,220,180,0.9)', animation: 'spin 0.8s linear infinite' }} />
              <Music size={18} style={{ position: 'absolute', inset: 0, margin: 'auto', color: 'rgba(100,220,180,0.8)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Loading music…</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: '6px 0 0' }}>Fetching trending tracks</p>
            </div>
          </div>

        ) : error ? (
          <div style={{ textAlign: 'center', maxWidth: 440, margin: '80px auto', padding: 40, borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Music size={24} style={{ color: '#f87171', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 16, fontWeight: 900, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Failed to Load</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>{error}</p>
            <button onClick={() => window.location.reload()}
              style={{ background: '#dc2626', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Retry
            </button>
          </div>

        ) : Object.keys(categories).length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 14 }}>
            <Music size={36} style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>No tracks found</p>
          </div>

        ) : (
          <>
            {/* ── Hero Banner ───────────────────────────────────────── */}
            {featuredTrack && (
              <div
                onClick={() => navigate(`/music/track/${featuredTrack.id}`)}
                style={{
                  position: 'relative', borderRadius: 20, overflow: 'hidden',
                  height: 220, cursor: 'pointer', marginBottom: 40, marginTop: 24,
                  background: `rgba(${heroBase}, 0.4)`,
                  border: `1px solid rgba(${heroLight}, 0.12)`,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `rgba(${heroLight}, 0.28)`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `rgba(${heroLight}, 0.12)`}
              >
                {/* Blurred poster background */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${featuredTrack.poster})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  opacity: 0.18, filter: 'blur(2px)',
                  transform: 'scale(1.05)',
                }} />

                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(100deg, rgba(${heroBase}, 0.96) 0%, rgba(${heroBase}, 0.7) 50%, transparent 100%)`,
                }} />

                {/* Ambient glow from hero color */}
                <div style={{
                  position: 'absolute', top: -40, left: -40, width: 300, height: 300,
                  borderRadius: '50%',
                  background: `rgba(${heroLight}, 0.15)`,
                  filter: 'blur(60px)',
                }} />

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', alignItems: 'flex-end', padding: '0 28px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, width: '100%' }}>
                    {/* Cover art */}
                    <div style={{
                      width: 110, height: 110, flexShrink: 0, borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: `0 16px 48px rgba(${heroBase}, 0.8), 0 4px 16px rgba(0,0,0,0.6)`,
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}>
                      <img
                        src={featuredTrack.poster}
                        alt={featuredTrack.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80'; }}
                      />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Flame size={11} style={{ color: `rgb(${heroLight})`, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: `rgb(${heroLight})` }}>
                          Trending Now
                        </span>
                      </div>
                      <h2 style={{
                        fontSize: 'clamp(18px, 4vw, 30px)', fontWeight: 900, lineHeight: 1.1,
                        color: 'white', margin: '0 0 6px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {featuredTrack.title}
                      </h2>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', fontWeight: 500, margin: 0 }}>
                        {featuredTrack.artist || 'Various Artists'}
                      </p>
                    </div>

                    {/* Play button */}
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                      background: `rgb(${heroLight})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 8px 32px rgba(${heroLight}, 0.55)`,
                      transition: 'transform 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Play size={20} style={{ fill: '#000', color: '#000', marginLeft: 3 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Category sections ─────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {Object.entries(categories).map(([categoryName, tracks]) => (
                <CategorySection
                  key={categoryName}
                  name={categoryName}
                  tracks={tracks}
                  navigate={navigate}
                  setPreview={setPreview}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mini YouTube Player */}
      {preview && (
        <MiniYouTubePlayer
          trackTitle={preview.title}
          trackArtist={preview.artist}
          trackPoster={preview.poster}
          accentRgb={preview.accent}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
