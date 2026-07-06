import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MusicNavbar from '../components/MusicNavbar';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import {
  Play, Pause, Download, ArrowLeft,
  Volume2, VolumeX, Loader2, SkipBack, SkipForward, User,
  Minus, MoreHorizontal, X, ChevronDown
} from 'lucide-react';
import { musicApi } from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────
// Deterministic color from string
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
    const s = S/100, l = L/100, c = (1 - Math.abs(2*l-1)) * s;
    const x = c * (1 - Math.abs((H/60)%2 - 1)), m = l - c/2;
    let r,g,b;
    if      (H<60)  {r=c;g=x;b=0;} else if (H<120) {r=x;g=c;b=0;}
    else if (H<180) {r=0;g=c;b=x;} else if (H<240) {r=0;g=x;b=c;}
    else if (H<300) {r=x;g=0;b=c;} else            {r=c;g=0;b=x;}
    return `${Math.round((r+m)*255)}, ${Math.round((g+m)*255)}, ${Math.round((b+m)*255)}`;
  };
  return { base: hsl(hue, sat, ligB), light: hsl(hue, sat, ligL) };
}

// ─────────────────────────────────────────────────────────────────────────
// Small recommendation card
// ─────────────────────────────────────────────────────────────────────────
function RecommendCard({ track, baseRgb, lightRgb, navigate }) {
  const [hov, setHov] = useState(false);
  const { light: cardLight } = useMemo(() => deriveRgbFromStr(track.poster || track.id), [track]);
  return (
    <div
      onClick={() => navigate(`/music/track/${track.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0, width: 148, cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${hov ? `rgba(${cardLight},0.35)` : 'rgba(255,255,255,0.07)'}`,
        background: hov ? `rgba(${cardLight},0.12)` : 'rgba(255,255,255,0.04)',
        transition: 'all 0.2s', transform: hov ? 'translateY(-3px)' : 'none',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
        <img src={track.poster} alt={track.title}
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transform: hov?'scale(1.06)':'scale(1)', transition:'transform 0.3s' }}
          onError={e => { e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&q=80'; }} />
        {hov && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:`rgb(${cardLight})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Play size={14} style={{ fill:'#000', color:'#000', marginLeft:2 }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ padding:'9px 10px 11px' }}>
        <p style={{ fontSize:12, fontWeight:700, color: hov?`rgb(${cardLight})`:'rgba(255,255,255,0.88)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'color 0.15s' }}>{track.title}</p>
        <p style={{ fontSize:10, color:'rgba(255,255,255,0.32)', margin:'3px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.label||'Mp3 Song'}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function TrackDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const player   = useMusicPlayer();

  // ── Seed from global cache (survives minimize/maximize) ──────────
  const cachedEntry = player?.trackCache?.[id] || {};

  // Local page state — start from cache so there's zero flicker on maximize
  const isAlreadyPlaying = useMemo(() => player?.currentTrack?.id === id, [player?.currentTrack?.id, id]);
  const [trackData,   setTrackData]   = useState(cachedEntry.trackData || null);
  const [loading,     setLoading]     = useState(!cachedEntry.trackData && !isAlreadyPlaying);
  const [error,       setError]       = useState(null);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [dlBitrate,   setDlBitrate]   = useState('');
  const [showDlMenu,  setShowDlMenu]  = useState(false);

  // Draggable seek bar states
  const [isDragging, setIsDragging] = useState(false);
  const seekWrapRef = useRef(null);

  // Mobile dots menu
  const [showDotsMenu, setShowDotsMenu] = useState(false);

  // Responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Recommendations — live view directly from global cache (never disappears)
  // artistRecs is NOT local state — it reads from the reactive context cache on every render
  const artistRecs = player?.trackCache?.[id]?.artistRecs || {};
  const [artistRecsLoading, setArtistRecsLoading] = useState({});

  const singersList = useMemo(() => {
    const singerStr = trackData?.metadata?.singer;
    if (!singerStr) return [];
    return singerStr
      .split(/,|\band\b|&/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [trackData?.metadata?.singer]);

  // YouTube preview status — seeded from cache too
  const [ytPreview,   setYtPreview]   = useState(cachedEntry.ytPreview || null);
  const [ytReady,     setYtReady]     = useState(false);

  const dlMenuRef   = useRef(null);
  const dotsMenuRef = useRef(null);

  // Aliases from global player context
  const isPlaying  = player?.isPlaying  ?? false;
  const currentTime= player?.currentTime?? 0;
  const duration   = player?.duration   ?? 0;
  const volume     = player?.volume     ?? 0.8;
  const isMuted    = player?.isMuted    ?? false;
  const progress   = duration ? (currentTime / duration) * 100 : 0;

  // ── Sync viewport ──────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ── Initialize trackData from active context if maximizing ─────
  useEffect(() => {
    if (isAlreadyPlaying && !trackData && player?.currentTrack) {
      const synthetic = {
        success: true,
        stream_url: player.currentTrack.streamUrl,
        metadata: {
          title: player.currentTrack.title,
          singer: player.currentTrack.artist,
          cover_image: player.currentTrack.poster,
        }
      };
      setTrackData(synthetic);
      setLoading(false);
    }
  }, [id, isAlreadyPlaying, player?.currentTrack, trackData]);

  // ── Fetch track ────────────────────────────────────────────────────
// ── Fetch track ────────────────────────────────────────────────────
  useEffect(() => {
    // If we already have full track data in local state (from cache or context) skip API call
    if (trackData?.success) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setShowDlMenu(false);
    setShowDotsMenu(false);

    // ── THE CRITICAL PATH CORRECTION ──
    // Check if the current route ID payload contains un-parsed search markers from a JioSaavn fallback card click
    const isLooseQuery = !id.includes('-mp3-song') && !id.includes('.html');
    const endpoint = isLooseQuery
      ? `/api/songs/track?resolve=${encodeURIComponent(id.replace(/-/g, ' '))}`
      : `/api/songs/track?id=${encodeURIComponent(id)}`;

    musicApi(endpoint)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch track'); return r.json(); })
      .then(d => {
        if (!d.success || !d.stream_url) throw new Error(d.error || 'Stream URL could not be resolved.');
        setTrackData(d);
        setLoading(false);

        // Write to global cache so maximize brings it back instantly
        player?.updateTrackCache(id, { trackData: d });

        // Push track into global player context
        const meta = d.metadata || {};
        const seed = meta.cover_image || id || '';
        const { base, light } = deriveRgbFromStr(seed);
        if (!isAlreadyPlaying) {
          player?.loadTrack({
            id,
            title:     meta.title   || id.replace(/-/g,' '),
            artist:    meta.singer  || 'Unknown Artist',
            poster:    meta.cover_image || '',
            streamUrl: d.stream_url,
            lightRgb:  light,
            baseRgb:   base,
          });
        }
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  // Auto-play is handled inside MusicPlayerContext on the `canplay` event.
  // No manual play trigger needed here.

  // ── Fetch YouTube preview — skip if cached ─────────────────────
  useEffect(() => {
    if (!trackData?.metadata) return;
    // Already cached? Skip network call.
    if (ytPreview) return;
    const title  = trackData.metadata.title  || '';
    const singer = trackData.metadata.singer || '';
    musicApi(`/api/songs/youtube-preview?q=${encodeURIComponent(`${title} ${singer}`.trim())}`)
      .then(r => r.json())
      .then(d => {
        if (d.videoId) {
          setYtPreview(d);
          player?.updateTrackCache(id, { ytPreview: d });
        }
      })
      .catch(() => {});
  }, [trackData]);

  // ── Fetch recommendations — write atomically to global cache ──
  useEffect(() => {
    if (singersList.length === 0) return;

    singersList.forEach(singer => {
      // Already have this artist's data in cache? Skip entirely.
      const cached = player?.trackCache?.[id]?.artistRecs?.[singer];
      if (cached?.length > 0) return;

      setArtistRecsLoading(prev => ({ ...prev, [singer]: true }));
      musicApi(`/api/songs/singer?name=${encodeURIComponent(singer)}`)
        .then(r => r.json())
        .then(d => {
          const filtered = (d.songs || []).filter(s => s.id !== id).slice(0, 15);
          // Atomic update: uses functional setState inside — safe for parallel fetches
          player?.addArtistRec(id, singer, filtered);
          setArtistRecsLoading(prev => ({ ...prev, [singer]: false }));
        })
        .catch(() => {
          setArtistRecsLoading(prev => ({ ...prev, [singer]: false }));
        });
    });
  }, [singersList, id]);

  // ── Auto minimize when unmounting ────────────────────────────────
  useEffect(() => {
    player?.restore();
    return () => {
      if (player?.currentTrack) {
        player?.minimize();
      }
    };
  }, [id]);

  // ── YouTube iframe event tracking for seamless transitions ──────
  useEffect(() => {
    if (!ytPreview) {
      setYtReady(false);
      return;
    }
    setYtReady(false);

    const handleYtMessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'infoDelivery' && data.info && data.info.playerState === 1) {
          setYtReady(true);
        }
      } catch (_) {}
    };

    // 4 second fallback
    const timer = setTimeout(() => {
      setYtReady(true);
    }, 4000);

    window.addEventListener('message', handleYtMessage);
    return () => {
      window.removeEventListener('message', handleYtMessage);
      clearTimeout(timer);
    };
  }, [ytPreview]);

  useEffect(() => {
    const fn = (e) => {
      if (dlMenuRef.current   && !dlMenuRef.current.contains(e.target))   setShowDlMenu(false);
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target)) setShowDotsMenu(false);
    };
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn);
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('touchstart', fn); };
  }, []);

  const metadata  = trackData?.metadata || {};
  const coverSrc  = metadata.cover_image || '';
  const colorSeed = coverSrc || id || '';
  const { base: baseRgb, light: lightRgb } = useMemo(() => deriveRgbFromStr(colorSeed), [colorSeed]);

  const fmt = s => isNaN(s) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  const getScrubTime = useCallback((clientX) => {
    const audio = player?.audioRef?.current;
    if (!audio || !seekWrapRef.current) return 0;
    const dur = audio.duration || 0;
    if (!dur) return 0;
    const rect = seekWrapRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * dur;
  }, [player?.audioRef?.current]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const targetTime = getScrubTime(clientX);
    player?.seekTo(targetTime);
  };

  // Dragging event tracking
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const targetTime = getScrubTime(clientX);
      if (player?.audioRef?.current) {
        player.audioRef.current.currentTime = targetTime;
      }
      player?.setCurrentTime(targetTime);
    };

    const onEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, getScrubTime, player]);

  const handleVolChange = (e) => {
    player?.changeVolume(parseFloat(e.target.value));
  };

  const toggleMute = () => player?.toggleMute();

  const triggerDownload = async (url, bitrate) => {
    if (!url) return;
    setDownloading(true); setDlBitrate(bitrate); setShowDlMenu(false);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const clean = (metadata.title||'Song').replace(/[^a-zA-Z0-9\s\-_()]/g,'').replace(/\s+/g,' ').trim();
      a.download = `${clean} (${bitrate}).mp3`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (_) { window.open(url,'_blank'); }
    finally { setDownloading(false); setDlBitrate(''); }
  };

  const handleMinimize = () => {
    player?.minimize();
    navigate(-1);
  };

  // ── Download Menu component (shared) ──────────────────────────────
  const DownloadMenu = () => (
    <div ref={dlMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
      {downloading ? (
        <div style={{ width:28, height:28, borderRadius:'50%', background:`rgb(${lightRgb})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Loader2 size={12} style={{ color:'#000', animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <button onClick={() => setShowDlMenu(v => !v)}
          style={{ width:28, height:28, borderRadius:'50%', background:`rgb(${lightRgb})`, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:`0 4px 12px rgba(${lightRgb},0.3)` }}
          title="Download">
          <Download size={12} style={{ color:'#000', strokeWidth:3 }} />
        </button>
      )}
      {showDlMenu && trackData?.downloads && (
        <div style={{ position:'absolute', bottom:34, right:0, zIndex:200, width:150, borderRadius:12, background:'#14141f', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', padding:'4px 0' }}>
          <p style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.08em', color:'rgba(255,255,255,0.3)', margin:'6px 12px 4px' }}>Quality</p>
          {Object.entries(trackData.downloads).map(([bitrate, dlUrl]) => (
            <button key={bitrate} onClick={() => triggerDownload(dlUrl, bitrate)}
              style={{ width:'100%', padding:'8px 12px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.7)', display:'block', transition:'all 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              {bitrate}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const LoadingSpinner = () => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, gap:20 }}>
      <div style={{ position:'relative', width:56, height:56 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.1)' }} />
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid transparent', borderTopColor:`rgb(${lightRgb})`, animation:'spin 0.8s linear infinite' }} />
      </div>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>Resolving audio stream…</p>
    </div>
  );

  const ErrorView = () => (
    <div style={{ textAlign:'center', maxWidth:420, padding:40, borderRadius:24, background:`rgba(${baseRgb},0.25)`, border:`1px solid rgba(${lightRgb},0.2)`, marginTop:40 }}>
      <p style={{ fontSize:16, fontWeight:900, color:'#f87171', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>Stream Error</p>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:24 }}>{error}</p>
      <button onClick={() => navigate(-1)} style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', background:'none', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.1em' }}>← Go Back</button>
    </div>
  );

  const Recommendations = () => {
    if (singersList.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 28 }}>
        {singersList.map(singer => {
          const songs = artistRecs[singer] || [];
          const isLoading = artistRecsLoading[singer];

          if (!isLoading && songs.length === 0) return null;

          return (
            <div key={singer}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:6, background:`rgba(${lightRgb},0.15)`, flexShrink:0 }}>
                  <User size={11} style={{ color:`rgb(${lightRgb})` }} />
                </div>
                <p style={{ fontSize:11, fontWeight:900, letterSpacing:'0.05em', textTransform:'uppercase', color:'rgba(255,255,255,0.85)', margin:0 }}>
                  More by {singer}
                </p>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
              </div>

              {isLoading ? (
                <div style={{ display:'flex', gap:12, overflowX:'hidden' }}>
                  {[...Array(3)].map((_,i) => (
                    <div key={i} style={{ flexShrink:0, width:120, borderRadius:10, overflow:'hidden', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ aspectRatio:'1', background:`rgba(${baseRgb},0.25)` }} />
                      <div style={{ padding:'6px 8px' }}><div style={{ height:8, borderRadius:2, background:'rgba(255,255,255,0.06)', width:'80%' }} /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rec-scroll" style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:8 }}>
                  {songs.map(s => <RecommendCard key={s.id} track={s} baseRgb={baseRgb} lightRgb={lightRgb} navigate={navigate} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', color:'white', background:'#09090f', position:'relative', overflowX:'hidden' }}>
      <MusicNavbar />

      {/* Background video canvas — both desktop & mobile */}
      {ytPreview ? (
        <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytPreview.videoId}?enablejsapi=1&autoplay=1&mute=1&start=${ytPreview.startSeconds}&controls=0&showinfo=0&rel=0&loop=1&playlist=${ytPreview.videoId}&playsinline=1`}
            style={{ position:'absolute', top:'50%', left:'50%', width:'100vw', height:'56.25vw', minHeight:'100vh', minWidth:'177.78vh', transform:'translate(-50%,-50%) scale(1.15)', border:'none', opacity: ytReady ? (isMobile ? 0.42 : 0.28) : 0, transition:'opacity 0.8s ease' }}
            allow="autoplay; encrypted-media"
          />
          <div style={{ position:'absolute', inset:0, background: isMobile
            ? `linear-gradient(180deg, rgba(${baseRgb},0.25) 0%, rgba(9,9,15,0.78) 65%, #09090f 100%)`
            : `radial-gradient(ellipse 90% 55% at 50% 0%, rgba(${baseRgb},0.2) 0%, rgba(9,9,15,0.85) 60%, #09090f 100%)` }} />
        </div>
      ) : (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:1, pointerEvents:'none',
          background: isMobile
            ? `linear-gradient(180deg, rgba(${baseRgb},0.55) 0%, #0d0d15 65%, #09090f 100%)`
            : `radial-gradient(ellipse 90% 55% at 50% 0%, rgba(${baseRgb},0.70) 0%, rgba(${baseRgb},0.25) 45%, #09090f 85%)` }} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes wave-eq { 0%,100%{transform:scaleY(0.15)}50%{transform:scaleY(1)} }
        .wave-bar-eq { transform-origin:bottom; animation:wave-eq 1.1s ease-in-out infinite; }
        .seek-wrap:hover .seek-thumb { display:block !important; }
        .rec-scroll::-webkit-scrollbar { height:4px; }
        .rec-scroll::-webkit-scrollbar-track { background:rgba(255,255,255,0.04); border-radius:2px; }
        .rec-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:2px; }

        /* Volume slider — filled portion tracks accent color exactly */
        .vol-track {
          -webkit-appearance: none !important;
          appearance: none !important;
          height: 4px !important;
          border-radius: 3px !important;
          outline: none !important;
          cursor: pointer !important;
          background: linear-gradient(
            to right,
            var(--vol-fill, rgba(255,255,255,0.9)) 0%,
            var(--vol-fill, rgba(255,255,255,0.9)) var(--vol, 80%),
            rgba(255,255,255,0.14) var(--vol, 80%),
            rgba(255,255,255,0.14) 100%
          ) !important;
        }
        .vol-track::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 12px !important;
          height: 12px !important;
          border-radius: 50% !important;
          background: white !important;
          border: none !important;
          margin-top: -4px !important;
          box-shadow: 0 1px 6px rgba(0,0,0,0.35) !important;
          transition: transform 0.1s !important;
        }
        .vol-track::-webkit-slider-thumb:hover { transform: scale(1.25) !important; }
        .vol-track::-webkit-slider-runnable-track {
          background: transparent !important;
          height: 4px !important;
          border: none !important;
        }
        .vol-track::-moz-range-thumb {
          width: 12px !important;
          height: 12px !important;
          border-radius: 50% !important;
          background: white !important;
          border: none !important;
          box-shadow: 0 1px 6px rgba(0,0,0,0.35) !important;
        }
        .vol-track::-moz-range-progress {
          background: var(--vol-fill, rgba(255,255,255,0.9)) !important;
          border-radius: 3px !important;
          height: 4px !important;
        }
        .vol-track::-moz-range-track {
          background: transparent !important;
          height: 4px !important;
          border: none !important;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
          ══════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <>
          <div style={{ position:'relative', zIndex:10, padding:'20px 28px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={() => navigate(-1)}
              style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', background:'none', border:'none', cursor:'pointer' }}
              onMouseEnter={e=>e.currentTarget.style.color='white'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.45)'}>
              <ArrowLeft size={13} /> Back
            </button>
            {/* Desktop minimize button */}
            <button onClick={handleMinimize}
              style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'5px 12px', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.color='white';e.currentTarget.style.background='rgba(255,255,255,0.08)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.35)';e.currentTarget.style.background='rgba(255,255,255,0.04)';}}
              title="Minimize — keep playing in mini bar">
              <Minus size={12} /> Minimize
            </button>
          </div>

          <div style={{ position:'relative', zIndex:10, flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 28px 80px' }}>
            {loading ? <LoadingSpinner /> : error ? <ErrorView /> : (
              <div style={{ width:'100%', maxWidth:900 }}>
                {/* Cover + Info side-by-side */}
                <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', gap:28, marginBottom:28 }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <div style={{ position:'absolute', inset:-20, borderRadius:32, background:`rgba(${baseRgb},0.9)`, filter:'blur(40px)', opacity:isPlaying?0.9:0.5, transform:isPlaying?'scale(1.1)':'scale(1)', transition:'opacity 0.6s,transform 0.6s' }} />
                    <div style={{ position:'relative', width:220, height:220, borderRadius:16, overflow:'hidden', boxShadow:`0 32px 80px rgba(${baseRgb},0.6),0 8px 32px rgba(0,0,0,0.6)`, border:'1px solid rgba(255,255,255,0.1)' }}>
                      <img src={coverSrc||'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80'} alt={metadata.title}
                        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                        onError={e=>{e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80';}} />
                    </div>
                  </div>
                  <div style={{ flex:1, minWidth:200 }}>
                    <p style={{ fontSize:10, fontWeight:900, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.32)', marginBottom:8 }}>{metadata.album?'Album Track':'Single'}</p>
                    <h1 style={{ fontSize:'clamp(22px,5vw,40px)', fontWeight:900, lineHeight:1.1, margin:'0 0 10px', color:'white' }}>{metadata.title||id.replace(/-/g,' ')}</h1>
                    {metadata.singer && <p style={{ fontSize:15, fontWeight:600, color:`rgb(${lightRgb})`, marginBottom:5 }}>{metadata.singer}</p>}
                    {metadata.album  && <p style={{ fontSize:13, color:'rgba(255,255,255,0.32)', fontWeight:500 }}>{metadata.album}</p>}
                    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:18, marginTop:14 }}>
                      {[...Array(8)].map((_,i) => (
                        <div key={i} className="wave-bar-eq" style={{ width:3, height:'100%', borderRadius:2, background:`rgb(${lightRgb})`, animationDelay:`${i*0.12}s`, animationPlayState:isPlaying?'running':'paused', opacity:isPlaying?0.9:0.2, transition:'opacity 0.3s' }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Player card — wider */}
                <div style={{ borderRadius:20, background:`rgba(${baseRgb},0.35)`, backdropFilter:'blur(24px)', border:`1px solid rgba(${lightRgb},0.12)`, padding:'28px 32px 24px', marginBottom:16 }}>
                  {/* Seek bar */}
                  <div style={{ marginBottom:20 }}>
                    <div className="seek-wrap" ref={seekWrapRef} onMouseDown={handleDragStart} onTouchStart={handleDragStart}
                      style={{ position:'relative', width:'100%', height:5, background:'rgba(255,255,255,0.14)', borderRadius:2.5, cursor:'pointer', marginBottom:8 }}>
                      <div style={{ position:'absolute', top:0, left:0, height:'100%', borderRadius:2.5, background:`rgb(${lightRgb})`, width:`${progress}%`, transition: isDragging ? 'none' : 'width 0.1s linear' }} />
                      <div className="seek-thumb" style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:14, height:14, borderRadius:'50%', background:'white', left:`calc(${progress}% - 7px)`, display: isDragging ? 'block' : undefined }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'monospace', color:'rgba(255,255,255,0.32)' }}>
                      <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
                    </div>
                  </div>
                  {/* Controls */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, width:140, flexShrink:0 }}>
                      <button onClick={toggleMute} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex', flexShrink:0 }}>
                        {isMuted||volume===0 ? <VolumeX size={15}/> : <Volume2 size={15}/>}
                      </button>
                      <input type="range" className="vol-track" min="0" max="1" step="0.05"
                        value={isMuted ? 0 : volume} onChange={handleVolChange}
                        ref={el => { if (el) { el.style.setProperty('--vol', `${(isMuted ? 0 : volume) * 100}%`); el.style.setProperty('--vol-fill', `rgb(${lightRgb})`); } }}
                        style={{ width:'100%' }} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                      <button style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.28)', display:'flex' }}><SkipBack size={20}/></button>
                      <button onClick={player?.togglePlay}
                        style={{ width:58, height:58, borderRadius:'50%', border:'none', cursor:'pointer', background:`rgb(${lightRgb})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 8px 30px rgba(${lightRgb},0.5)`, transition:'transform 0.15s' }}
                        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                        {isPlaying ? <Pause size={24} style={{fill:'#000',color:'#000'}}/> : <Play size={24} style={{fill:'#000',color:'#000',marginLeft:3}}/>}
                      </button>
                      <button style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.28)', display:'flex' }}><SkipForward size={20}/></button>
                    </div>
                    {/* Desktop download button (replaces HQ badge) */}
                    <DownloadMenu />
                  </div>
                  {/* Desktop download list as fallback buttons */}
                  {trackData?.downloads && Object.keys(trackData.downloads).length > 0 && (
                    <div style={{ marginTop:22, paddingTop:18, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ fontSize:10, fontWeight:900, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', marginBottom:10 }}>Downloads</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                        {Object.entries(trackData.downloads).map(([bitrate, dlUrl]) => (
                          <button key={bitrate} onClick={() => triggerDownload(dlUrl, bitrate)} disabled={downloading}
                            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:12, fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:`rgb(${lightRgb})`, border:`1px solid rgba(${lightRgb},0.28)`, background:`rgba(${baseRgb},0.4)`, cursor:downloading?'not-allowed':'pointer', opacity:downloading?0.5:1, transition:'all 0.15s' }}
                            onMouseEnter={e=>{if(!downloading){e.currentTarget.style.background=`rgb(${lightRgb})`;e.currentTarget.style.color='#000';e.currentTarget.style.borderColor='transparent';}}}
                            onMouseLeave={e=>{e.currentTarget.style.background=`rgba(${baseRgb},0.4)`;e.currentTarget.style.color=`rgb(${lightRgb})`;e.currentTarget.style.borderColor=`rgba(${lightRgb},0.28)`;}}>
                            {downloading && dlBitrate===bitrate ? <Loader2 size={12} style={{animation:'spin 0.8s linear infinite'}}/> : <Download size={12}/>}
                            {bitrate}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                {(() => {
                  const fields = [['Singer',metadata.singer],['Composer',metadata.composer],['Starring',metadata.starring],['Duration',metadata.duration],['Label',metadata.label],['Added On',metadata.added_on]].filter(([,v])=>v);
                  return fields.length > 0 ? (
                    <div style={{ borderRadius:16, padding:20, background:`rgba(${baseRgb},0.18)`, border:'1px solid rgba(255,255,255,0.06)', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:14, marginBottom:16 }}>
                      {fields.map(([label,value]) => (
                        <div key={label}>
                          <p style={{ fontSize:9, fontWeight:900, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.26)', marginBottom:4 }}>{label}</p>
                          <p style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.80)', lineHeight:1.3, margin:0 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                <Recommendations />
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE LAYOUT
          ══════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <>
          {/* Header bar */}
          <div style={{ position:'relative', zIndex:10, padding:'14px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <button onClick={handleMinimize}
              style={{ display:'inline-flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.75)', padding:4, flexShrink:0 }}
              title="Minimize to mini-player">
              <ChevronDown size={28} />
            </button>
            <span style={{ flex:1, textAlign:'center', fontSize:11, fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {metadata.album || 'NOW PLAYING'}
            </span>

            {/* 3-dots menu */}
            <div ref={dotsMenuRef} style={{ position:'relative' }}>
              <button onClick={() => setShowDotsMenu(v=>!v)}
                style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', padding:4 }}>
                <MoreHorizontal size={22} />
              </button>
              {showDotsMenu && (
                <div style={{ position:'absolute', top:32, right:0, zIndex:300, width:190, borderRadius:14, background:'#14141f', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 12px 32px rgba(0,0,0,0.6)', padding:'6px 0', overflow:'hidden' }}>
                  {/* Minimize option */}
                  <button onClick={() => { setShowDotsMenu(false); handleMinimize(); }}
                    style={{ width:'100%', padding:'11px 16px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', display:'flex', alignItems:'center', gap:10, transition:'background 0.12s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <Minus size={15} style={{ color:`rgb(${lightRgb})` }} />
                    Minimize Player
                  </button>
                  <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'2px 0' }} />
                  {/* Download options inside dots menu */}
                  {trackData?.downloads && Object.entries(trackData.downloads).map(([bitrate, dlUrl]) => (
                    <button key={bitrate} onClick={() => { setShowDotsMenu(false); triggerDownload(dlUrl, bitrate); }}
                      style={{ width:'100%', padding:'11px 16px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', display:'flex', alignItems:'center', gap:10, transition:'background 0.12s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <Download size={15} style={{ color:`rgb(${lightRgb})` }} />
                      Download {bitrate}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main content */}
          <div style={{ position:'relative', zIndex:10, flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 24px 80px' }}>
            {loading ? <LoadingSpinner /> : error ? <ErrorView /> : (
              <div style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column' }}>

                {/* Collapsing transition container for mobile poster */}
                <div style={{
                  maxHeight: ytReady ? 0 : 420,
                  overflow: 'hidden',
                  opacity: ytReady ? 0 : 1,
                  marginBottom: ytReady ? 0 : 28,
                  transform: ytReady ? 'scale(0.93) translateY(-15px)' : 'scale(1) translateY(0)',
                  transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  pointerEvents: ytReady ? 'none' : 'auto',
                }}>
                  <div style={{ position:'relative', width:'100%', aspectRatio:'1', borderRadius:14, overflow:'hidden', boxShadow:'0 20px 48px rgba(0,0,0,0.6)', background:'#07070c', marginTop:10, border:'1px solid rgba(255,255,255,0.06)' }}>
                    <img src={coverSrc||'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80'} alt={metadata.title}
                      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                      onError={e=>{e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80';}} />
                  </div>
                </div>

                {/* Expanding spacer container to lift content smoothly as poster disappears */}
                <div style={{
                  height: ytReady ? '28vh' : 0,
                  transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />

                {/* Title row with inline download button */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, position:'relative' }}>
                  <div style={{ flex:1, minWidth:0, paddingRight:10 }}>
                    <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'-0.02em', color:'white', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{metadata.title||id.replace(/-/g,' ')}</h1>
                    <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', fontWeight:500, margin:'4px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{metadata.singer||'Unknown Artist'}</p>
                  </div>
                  <DownloadMenu />
                </div>

                {/* Seek bar */}
                <div style={{ marginBottom:22 }}>
                  <div className="seek-wrap" ref={seekWrapRef} onMouseDown={handleDragStart} onTouchStart={handleDragStart}
                    style={{ position:'relative', width:'100%', height:4, background:'rgba(255,255,255,0.12)', borderRadius:2, cursor:'pointer', marginBottom:6 }}>
                    <div style={{ position:'absolute', top:0, left:0, height:'100%', borderRadius:2, background:`rgb(${lightRgb})`, width:`${progress}%`, transition: isDragging ? 'none' : 'width 0.1s linear' }} />
                    <div className="seek-thumb" style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:10, height:10, borderRadius:'50%', background:'white', left:`calc(${progress}% - 5px)`, display: isDragging ? 'block' : undefined }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'monospace', color:'rgba(255,255,255,0.4)' }}>
                    <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
                  </div>
                </div>

                {/* Controls row: SkipBack, SkipBack, Play, SkipFwd, Download (replaces shuffle/repeat) */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, padding:'0 8px' }}>
                  <button style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer' }}><SkipBack size={20}/></button>
                  <button style={{ background:'none', border:'none', color:'white', cursor:'pointer' }}><SkipBack size={24} style={{fill:'white'}}/></button>

                  <button onClick={player?.togglePlay}
                    style={{ width:60, height:60, borderRadius:'50%', border:'none', cursor:'pointer', background:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', transition:'transform 0.15s' }}>
                    {isPlaying ? <Pause size={24} style={{fill:'#000',color:'#000'}}/> : <Play size={24} style={{fill:'#000',color:'#000',marginLeft:3}}/>}
                  </button>

                  <button style={{ background:'none', border:'none', color:'white', cursor:'pointer' }}><SkipForward size={24} style={{fill:'white'}}/></button>
                  {/* Download replaces repeat/shuffle */}
                  <div ref={null}>
                    <button onClick={() => setShowDlMenu(v=>!v)}
                      style={{ background:'none', border:'none', color:`rgb(${lightRgb})`, cursor:'pointer', display:'flex', padding:2 }}
                      title="Download">
                      <Download size={20} />
                    </button>
                  </div>
                </div>

                {/* Volume row */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 8px', marginBottom:24 }}>
                  <button onClick={toggleMute} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex', padding:0 }}>
                    {isMuted||volume===0 ? <VolumeX size={14}/> : <Volume2 size={14}/>}
                  </button>
                  <input type="range" className="vol-track" min="0" max="1" step="0.05"
                    value={isMuted ? 0 : volume} onChange={handleVolChange}
                    ref={el => { if (el) { el.style.setProperty('--vol', `${(isMuted ? 0 : volume) * 100}%`); el.style.setProperty('--vol-fill', `rgb(${lightRgb})`); } }}
                    style={{ flex:1 }} />
                </div>

                {/* Metadata strip */}
                {(() => {
                  const fields = [['Label', metadata.label], ['Added', metadata.added_on]].filter(([,v])=>v);
                  return fields.length > 0 ? (
                    <div style={{ borderRadius:12, padding:'10px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.04)', display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:20 }}>
                      {fields.map(([label,value]) => (
                        <div key={label} style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          <span style={{ fontWeight:800, textTransform:'uppercase', letterSpacing:'0.04em', marginRight:6 }}>{label}:</span>
                          <span style={{ fontWeight:500, color:'rgba(255,255,255,0.7)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                <Recommendations />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
