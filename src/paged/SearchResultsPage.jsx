import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MusicNavbar from '../components/MusicNavbar';
import MiniYouTubePlayer from '../components/MiniYouTubePlayer';
import { Music, Disc, Users, ArrowLeft, Search, LayoutGrid, List, X, Play, Clock, Youtube } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Deterministic color from any string — no CORS, instant, unique per slug
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
    const c = (1 - Math.abs(2*l-1)) * s;
    const x = c * (1 - Math.abs((H/60)%2 - 1));
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
  return { base: hsl(hue,sat,ligB), light: hsl(hue,sat,ligL) };
}

// ── Cache helpers ─────────────────────────────────────────────────────────
const cacheKey  = q => `music_search_cache_${q}`;
const scrollKey = q => `music_search_scroll_${q}`;

// ─────────────────────────────────────────────────────────────────────────
export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const query          = searchParams.get('find') || '';

  const [results,    setResults]    = useState({ songs: [], albums: [], artists: [], metadata: {} });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('all');
  const [viewMode,   setViewMode]   = useState('grid');
  const [hoveredRow, setHoveredRow] = useState(null);
  // YouTube mini-player state
  const [preview,    setPreview]    = useState(null); // { title, artist, poster, accent }

  const isDirectListing = query.startsWith('album:') || query.startsWith('artist:');
  const listingType     = query.startsWith('album:') ? 'Album' : 'Artist';
  const rawSlug         = query.split(':', 2)[1] || '';
  const listingName     = rawSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Derive color from query slug (instant, no CORS)
  const { base: baseRgb, light: lightRgb } = useMemo(() => deriveRgbFromStr(rawSlug || query), [rawSlug, query]);

  // ── Scroll restoration ────────────────────────────────────────────
  useEffect(() => {
    if (!loading && results.songs.length > 0) {
      const saved = sessionStorage.getItem(scrollKey(query));
      if (saved) requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
    }
  }, [loading, results.songs.length, query]);

  const saveAndGo = useCallback((path) => {
    sessionStorage.setItem(scrollKey(query), window.scrollY.toString());
    navigate(path);
  }, [navigate, query]);

  // ── Fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults({ songs:[], albums:[], artists:[], metadata:{} }); setLoading(false); return; }
    const cached = sessionStorage.getItem(cacheKey(query));
    if (cached) { try { setResults(JSON.parse(cached)); setLoading(false); return; } catch(_) { sessionStorage.removeItem(cacheKey(query)); } }
    setLoading(true); setError(null);
    fetch(`/api/songs/search?q=${encodeURIComponent(query.trim())}`)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch results'); return r.json(); })
      .then(d => {
        const r = { songs: d.songs||[], albums: d.albums||[], artists: d.artists||[], metadata: d.metadata||{} };
        setResults(r);
        try { sessionStorage.setItem(cacheKey(query), JSON.stringify(r)); } catch(_) {}
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [query]);

  const total = results.songs.length + results.albums.length + results.artists.length;

  // ─────────────────────────────────────────────────────────────────────
  // DIRECT LISTING — Spotify-style with dynamic colour
  // ─────────────────────────────────────────────────────────────────────
  if (isDirectListing) {
    const coverImg = results.metadata?.poster || results.songs[0]?.poster || '';

    return (
      <div style={{ minHeight: '100vh', background: '#09090f', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <MusicNavbar />

        {/* Gradient background — derived from slug, renders immediately */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(ellipse 100% 50% at 50% 0%, rgba(${baseRgb}, 0.65) 0%, rgba(${baseRgb}, 0.2) 50%, transparent 75%)`,
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* ── Hero header ─────────────────────────────────────────── */}
        <div style={{
          position: 'relative', zIndex: 10,
          padding: '24px 24px 40px',
          background: `linear-gradient(180deg, rgba(${baseRgb}, 0.55) 0%, rgba(${baseRgb}, 0.2) 60%, transparent 100%)`,
        }}>
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', background:'none', border:'none', cursor:'pointer', marginBottom:24 }}
            onMouseEnter={e => e.currentTarget.style.color='white'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.45)'}
          >
            <ArrowLeft size={13} /> Back
          </button>

          {/* Cover + title */}
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', gap:28 }}>
            {/* Cover art */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{
                position:'absolute', inset:-16, borderRadius: listingType==='Artist' ? '50%' : 20,
                background: `rgba(${baseRgb}, 0.85)`, filter:'blur(36px)', opacity:0.7,
              }} />
              <div style={{
                position:'relative',
                width:180, height:180,
                borderRadius: listingType==='Artist' ? '50%' : 16,
                overflow:'hidden',
                boxShadow: `0 24px 70px rgba(${baseRgb}, 0.7), 0 8px 24px rgba(0,0,0,0.6)`,
                border:'1px solid rgba(255,255,255,0.12)',
              }}>
                <img
                  src={coverImg || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80'}
                  alt={listingName}
                  style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  onError={e => { e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80'; }}
                />
              </div>
            </div>

            {/* Title block */}
            <div style={{ flex:1, minWidth:200 }}>
              <p style={{ fontSize:10, fontWeight:900, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:10 }}>
                {listingType}
              </p>
              <h1 style={{ fontSize:'clamp(28px, 6vw, 56px)', fontWeight:900, lineHeight:1.05, margin:'0 0 14px', color:'white' }}>
                {listingName}
              </h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>
                <span style={{ color:'rgba(255,255,255,0.8)', fontWeight:700 }}>{results.songs.length}</span> songs
              </p>
            </div>
          </div>
        </div>

        {/* ── Track list ──────────────────────────────────────────── */}
        <div style={{ position:'relative', zIndex:10, flex:1, padding:'0 16px 60px' }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:20 }}>
              <div style={{ position:'relative', width:48, height:48 }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.1)' }} />
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid transparent`, borderTopColor:`rgb(${lightRgb})`, animation:'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', fontWeight:500 }}>Loading tracks…</p>
            </div>
          ) : error ? (
            <p style={{ textAlign:'center', color:'#f87171', padding:40 }}>{error}</p>
          ) : results.songs.length === 0 ? (
            <p style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', padding:60, fontWeight:700 }}>No tracks found</p>
          ) : (
            <>
              {/* Column headers */}
              <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 1fr 32px auto', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'8px 12px', marginBottom:4 }}>
                {['#','Title','Label','',''].map((h,i) => (
                  <span key={i} style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', textAlign: i===0||i===3?'center': i===4?'right':'left' }}>
                    {i===4 ? <Clock size={13} style={{ opacity:0.3 }} /> : h}
                  </span>
                ))}
              </div>

              {results.songs.map((track, idx) => {
                const isHov = hoveredRow === idx;
                const isActive = preview?.trackId === track.id;
                return (
                  <div
                    key={track.id}
                    onMouseEnter={() => setHoveredRow(idx)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      display:'grid', gridTemplateColumns:'36px 1fr 1fr 32px auto',
                      alignItems:'center', gap:12, padding:'10px 12px',
                      borderRadius:8, cursor:'pointer',
                      background: isHov ? `rgba(${baseRgb}, 0.35)` : isActive ? `rgba(${lightRgb}, 0.08)` : 'transparent',
                      transition:'background 0.12s',
                    }}
                    onClick={(e) => { if (!e.defaultPrevented) saveAndGo(`/music/track/${track.id}`); }}
                  >
                    {/* Index / play */}
                    <div style={{ textAlign:'center', fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.35)' }}>
                      {isHov
                        ? <Play size={14} style={{ fill:'white', color:'white', margin:'0 auto' }} />
                        : isActive
                          ? <div style={{ width:8, height:8, borderRadius:'50%', background:`rgb(${lightRgb})`, margin:'0 auto', animation:'pulse-dot 1s ease infinite' }} />
                          : idx + 1}
                    </div>

                    {/* Thumbnail + title */}
                    <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                      <img
                        src={track.poster}
                        alt={track.title}
                        style={{ width:40, height:40, borderRadius:6, objectFit:'cover', flexShrink:0, border:'1px solid rgba(255,255,255,0.08)' }}
                        onError={e => { e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=80&q=80'; }}
                      />
                      <span style={{
                        fontSize:14, fontWeight:600, lineHeight:'1.2',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                        color: isActive ? `rgb(${lightRgb})` : isHov ? `rgb(${lightRgb})` : 'white',
                        transition:'color 0.12s',
                      }}>
                        {track.title}
                      </span>
                    </div>

                    {/* Label */}
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {track.label || 'Mp3 Song'}
                    </span>

                    {/* YouTube preview button — appears on hover */}
                    <button
                      title="Preview on YouTube"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isActive) { setPreview(null); return; }
                        setPreview({ trackId: track.id, title: track.title, artist: track.artist || listingName, poster: track.poster, accent: lightRgb });
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 8, border: 'none',
                        background: isActive ? `rgba(${lightRgb}, 0.2)` : isHov ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: isActive ? `rgb(${lightRgb})` : isHov ? 'rgba(255,255,255,0.6)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                      }}
                    >
                      <Youtube size={13} />
                    </button>

                    {/* Duration slot */}
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.2)', fontFamily:'monospace', textAlign:'right' }}>—</span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Mini YouTube Player ──────────────────────────────── */}
        {preview && (
          <MiniYouTubePlayer
            trackTitle={preview.title}
            trackArtist={preview.artist}
            trackPoster={preview.poster}
            accentRgb={preview.accent}
            onClose={() => setPreview(null)}
          />
        )}
        <style>{`
          @keyframes pulse-dot {
            0%,100% { opacity:1; transform:scale(1); }
            50%      { opacity:0.5; transform:scale(0.7); }
          }
        `}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // NORMAL SEARCH RESULTS
  // ─────────────────────────────────────────────────────────────────────
  const tabs = [
    { id:'all',     label:'All',     count:total,                 icon:<Search size={11}/> },
    { id:'songs',   label:'Songs',   count:results.songs.length,  icon:<Music  size={11}/> },
    { id:'albums',  label:'Albums',  count:results.albums.length, icon:<Disc   size={11}/> },
    { id:'artists', label:'Artists', count:results.artists.length,icon:<Users  size={11}/> },
  ].filter(t => t.id==='all' || t.count>0);

  const visSongs   = (activeTab==='all'||activeTab==='songs')   ? results.songs   : [];
  const visAlbums  = (activeTab==='all'||activeTab==='albums')  ? results.albums  : [];
  const visArtists = (activeTab==='all'||activeTab==='artists') ? results.artists : [];

  const cardBase = {
    cursor:'pointer', borderRadius:16, overflow:'hidden',
    border:'1px solid rgba(255,255,255,0.07)',
    background:'rgba(255,255,255,0.04)',
    transition:'all 0.2s',
  };

  const SongCard = ({ track }) => {
    const [hov, setHov] = useState(false);
    const { light } = useMemo(() => deriveRgbFromStr(track.poster || track.id), []);
    return (
      <div onClick={() => saveAndGo(`/music/track/${track.id}`)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ ...cardBase, background: hov ? `rgba(${light}, 0.12)` : 'rgba(255,255,255,0.04)', borderColor: hov ? `rgba(${light}, 0.3)` : 'rgba(255,255,255,0.07)', transform: hov && viewMode==='grid' ? 'translateY(-3px)' : 'none' }}
      >
        {viewMode === 'grid' ? (
          <>
            <div style={{ position:'relative', aspectRatio:'1', overflow:'hidden' }}>
              <img src={track.poster} alt={track.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transform: hov ? 'scale(1.06)' : 'scale(1)', transition:'transform 0.3s' }}
                onError={e => { e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&q=80'; }} />
              {hov && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:`rgb(${light})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Play size={16} style={{ fill:'#000', color:'#000', marginLeft:2 }} />
                </div>
              </div>}
            </div>
            <div style={{ padding:'10px 12px 12px' }}>
              <p style={{ fontSize:13, fontWeight:700, color: hov ? `rgb(${light})` : 'rgba(255,255,255,0.9)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'color 0.15s' }}>{track.title}</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:'3px 0 0', fontWeight:500 }}>{track.label||'Mp3 Song'}</p>
            </div>
          </>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px' }}>
            <img src={track.poster} alt={track.title} style={{ width:48, height:48, borderRadius:8, objectFit:'cover', flexShrink:0 }}
              onError={e => { e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=80&q=80'; }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:700, color: hov ? `rgb(${light})` : 'rgba(255,255,255,0.9)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.title}</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:'3px 0 0' }}>{track.label||'Mp3 Song'}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const AlbumCard = ({ album }) => {
    const [hov, setHov] = useState(false);
    const { light } = useMemo(() => deriveRgbFromStr(album.poster || album.id), []);
    return (
      <div onClick={() => saveAndGo(`/music/search?find=album:${album.id}`)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ ...cardBase, background: hov ? `rgba(${light}, 0.12)` : 'rgba(255,255,255,0.04)', borderColor: hov ? `rgba(${light}, 0.3)` : 'rgba(255,255,255,0.07)', transform: hov && viewMode==='grid' ? 'translateY(-3px)' : 'none' }}
      >
        {viewMode === 'grid' ? (
          <>
            <div style={{ position:'relative', aspectRatio:'1', overflow:'hidden' }}>
              <img src={album.poster} alt={album.title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transform: hov ? 'scale(1.06)' : 'scale(1)', transition:'transform 0.3s' }}
                onError={e => { e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&q=80'; }} />
              <div style={{ position:'absolute', top:8, right:8, fontSize:9, fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase', padding:'3px 8px', borderRadius:20, background:`rgba(${light},0.2)`, color:`rgb(${light})`, border:`1px solid rgba(${light},0.35)` }}>Album</div>
            </div>
            <div style={{ padding:'10px 12px 12px' }}>
              <p style={{ fontSize:13, fontWeight:700, color: hov ? `rgb(${light})` : 'rgba(255,255,255,0.9)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'color 0.15s' }}>{album.title}</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:'3px 0 0' }}>Click to view tracks</p>
            </div>
          </>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px' }}>
            <img src={album.poster} alt={album.title} style={{ width:48, height:48, borderRadius:8, objectFit:'cover', flexShrink:0 }}
              onError={e => { e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=80&q=80'; }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:700, color: hov ? `rgb(${light})` : 'rgba(255,255,255,0.9)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{album.title}</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:'3px 0 0' }}>Album • Click to view tracks</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ArtistCard = ({ artist }) => {
    const [hov, setHov] = useState(false);
    const { light } = useMemo(() => deriveRgbFromStr(artist.poster || artist.id), []);
    return (
      <div onClick={() => saveAndGo(`/music/search?find=artist:${artist.id}`)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ ...cardBase, background: hov ? `rgba(${light}, 0.12)` : 'rgba(255,255,255,0.04)', borderColor: hov ? `rgba(${light}, 0.3)` : 'rgba(255,255,255,0.07)', display:'flex', flexDirection: viewMode==='grid' ? 'column' : 'row', alignItems:'center', gap: viewMode==='grid' ? 12 : 14, padding: viewMode==='grid' ? '20px 12px 16px' : '12px 14px', transform: hov && viewMode==='grid' ? 'translateY(-3px)' : 'none' }}
      >
        <img src={artist.poster} alt={artist.title}
          style={{ width: viewMode==='grid' ? 72 : 48, height: viewMode==='grid' ? 72 : 48, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`2px solid ${hov ? `rgba(${light},0.5)` : 'rgba(255,255,255,0.08)'}`, transition:'border-color 0.15s' }}
          onError={e => { e.target.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=80&q=80'; }} />
        <div style={{ textAlign: viewMode==='grid' ? 'center' : 'left', flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:700, color: hov ? `rgb(${light})` : 'rgba(255,255,255,0.9)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'color 0.15s' }}>{artist.title}</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:'3px 0 0' }}>Artist{viewMode==='list' ? ' • Click to view songs' : ''}</p>
        </div>
      </div>
    );
  };

  const gridCols = viewMode==='grid'
    ? { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12 }
    : { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:8 };

  const SectionHeader = ({ icon, label, count, color }) => (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      <span style={{ color, display:'flex' }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:900, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)' }}>{label}</span>
      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
      <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontWeight:700 }}>{count}</span>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#09090f', color:'white', display:'flex', flexDirection:'column' }}>
      <MusicNavbar />

      <div style={{ maxWidth:1200, width:'100%', margin:'0 auto', padding:'24px 16px', flex:1 }}>

        {/* Search banner */}
        <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'14px 20px', marginBottom:20 }}>
          <Search size={15} style={{ color:'#5eead4', flexShrink:0 }} />
          <p style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.45)', flex:1, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            Results for: <span style={{ color:'#5eead4', fontWeight:700 }}>"{query}"</span>
          </p>
          {!loading && total>0 && (
            <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.07)', padding:'4px 10px', borderRadius:8, flexShrink:0 }}>{total} found</span>
          )}
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, gap:20 }}>
            <div style={{ position:'relative', width:56, height:56 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.08)' }} />
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#5eead4', animation:'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <Music style={{ position:'absolute', inset:0, margin:'auto', color:'#5eead4' }} size={18} />
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.7)', margin:0 }}>Fetching all pages of results…</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', margin:'6px 0 0' }}>Collecting every match across all search pages</p>
            </div>
          </div>

        ) : error ? (
          <div style={{ textAlign:'center', maxWidth:440, margin:'60px auto', padding:40, borderRadius:20, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <X size={24} style={{ color:'#f87171', margin:'0 auto 16px' }} />
            <p style={{ fontSize:16, fontWeight:900, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Search Failed</p>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:20 }}>{error}</p>
            <button onClick={() => { sessionStorage.removeItem(cacheKey(query)); window.location.reload(); }}
              style={{ background:'#dc2626', color:'white', border:'none', padding:'9px 20px', borderRadius:12, fontWeight:700, fontSize:12, cursor:'pointer' }}>
              Retry
            </button>
          </div>

        ) : total === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:16 }}>
            <Search size={32} style={{ color:'rgba(255,255,255,0.15)' }} />
            <p style={{ fontWeight:700, color:'rgba(255,255,255,0.3)', margin:0 }}>No results found</p>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.2)', margin:0 }}>Try a different song, album, or artist name</p>
          </div>

        ) : (
          <>
            {/* Tabs + view toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:24, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:4 }}>
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                    borderRadius:10, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                    background: activeTab===tab.id ? '#14b8a6' : 'transparent',
                    color: activeTab===tab.id ? '#000' : 'rgba(255,255,255,0.45)',
                    transition:'all 0.15s', whiteSpace:'nowrap',
                  }}>
                    {tab.icon} {tab.label}
                    <span style={{
                      fontSize:10, fontWeight:900, padding:'2px 6px', borderRadius:6,
                      background: activeTab===tab.id ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)',
                      color: activeTab===tab.id ? '#000' : 'rgba(255,255,255,0.35)',
                    }}>{tab.count}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:3 }}>
                {[['grid',<LayoutGrid size={14}/>],['list',<List size={14}/>]].map(([m,icon]) => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    display:'flex', padding:'6px 8px', borderRadius:9, border:'none', cursor:'pointer',
                    background: viewMode===m ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: viewMode===m ? '#5eead4' : 'rgba(255,255,255,0.25)',
                    transition:'all 0.15s',
                  }}>{icon}</button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:40 }}>
              {visSongs.length > 0 && (
                <section>
                  <SectionHeader icon={<Music size={13}/>} label="Songs" count={visSongs.length} color="#5eead4" />
                  <div style={gridCols}>{visSongs.map(t => <SongCard key={t.id} track={t} />)}</div>
                </section>
              )}
              {visAlbums.length > 0 && (
                <section>
                  <SectionHeader icon={<Disc size={13}/>} label="Albums" count={visAlbums.length} color="#a78bfa" />
                  <div style={gridCols}>{visAlbums.map(a => <AlbumCard key={a.id} album={a} />)}</div>
                </section>
              )}
              {visArtists.length > 0 && (
                <section>
                  <SectionHeader icon={<Users size={13}/>} label="Artists" count={visArtists.length} color="#fbbf24" />
                  <div style={gridCols}>{visArtists.map(a => <ArtistCard key={a.id} artist={a} />)}</div>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}