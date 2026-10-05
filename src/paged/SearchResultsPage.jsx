import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import MusicSearchBar from '../components/MusicSearchBar';
import { Music, Disc, Users, ArrowLeft, Search, LayoutGrid, List, X, Play, Clock, Shuffle } from 'lucide-react';
import { fetchSearch, fetchListing } from '../utils/saavn';
import { useGoBack } from "../components/BackBar";
import PlayNextButton from '../components/PlayNextButton';
import { useMusicPlayer } from '../context/MusicPlayerContext';

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
  const goBack = useGoBack();
  const query          = searchParams.get('find') || '';

  const [results,    setResults]    = useState({ songs: [], albums: [], artists: [], metadata: {} });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('all');
  const [viewMode,   setViewMode]   = useState('grid');

  const isDirectListing = query.startsWith('album:') || query.startsWith('artist:') || query.startsWith('playlist:');
  const listingType     = query.startsWith('album:') ? 'Album' : query.startsWith('playlist:') ? 'Playlist' : 'Artist';
  const { playQueue, currentTrack } = useMusicPlayer();
  const rawSlug         = query.split(':', 2)[1] || '';
  // Prefer the real name scraped from the listing page; fall back to the slug
  const listingName     = results.metadata?.title
    || rawSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());


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
    const q = query.trim();
    (isDirectListing ? fetchListing(q) : fetchSearch(q))
      .then(d => {
        const r = { songs: d.songs||[], albums: d.albums||[], artists: d.artists||[], metadata: d.metadata||{} };
        setResults(r);
        // Only cache non-empty results — caching a failed or empty lookup would
        // keep the page stuck rendering nothing on every revisit.
        const count = r.songs.length + r.albums.length + r.artists.length;
        if (count > 0) {
          try { sessionStorage.setItem(cacheKey(query), JSON.stringify(r)); } catch(_) {}
        } else {
          try { sessionStorage.removeItem(cacheKey(query)); } catch(_) {}
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [query, isDirectListing]);

  const total = results.songs.length + results.albums.length + results.artists.length;

  // ─────────────────────────────────────────────────────────────────────
  // DIRECT LISTING — Spotify-style with dynamic colour
  // ─────────────────────────────────────────────────────────────────────
  if (isDirectListing) {
    const coverImg = results.metadata?.poster || results.songs[0]?.poster || '';
    // What the player shows as "Playing from", and where it links back to.
    const source = { title: listingName, link: `/music/search?find=${query}` };
    const shuffleAll = () => {
      const list = [...results.songs];
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      playQueue(list, 0, source);
    };

    /* One clean page, the same for every album, playlist and artist: no colours
       taken from the cover, the full title of every song with its artist under
       it, and the album name only where there is room for it. */
    return (
      <div className="min-h-dvh bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-5 sm:pt-10 pb-28">
          <button type="button" onClick={() => goBack()} className="hidden sm:inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-8">
            <div className={`w-44 h-44 sm:w-56 sm:h-56 shrink-0 overflow-hidden bg-white/5 shadow-2xl shadow-black/50 ${listingType === 'Artist' ? 'rounded-full' : 'rounded-2xl'}`}>
              {coverImg && <img src={coverImg} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-gray-400">{listingType}</p>
              <h1 className="mt-1.5 text-3xl sm:text-5xl font-black tracking-tight leading-tight break-words">{listingName}</h1>
              <p className="mt-2 text-sm text-gray-400"><span className="text-white font-semibold">{results.songs.length}</span> songs</p>
            </div>
          </div>

          {results.songs.length > 0 && (
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={() => playQueue(results.songs, 0, source)}
                className="inline-flex items-center gap-2 rounded-full bg-white text-black px-7 py-3 font-bold hover:bg-gray-200 active:scale-[0.98] transition">
                <Play size={18} className="fill-current" /> Play all
              </button>
              <button type="button" onClick={shuffleAll}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-6 py-3 font-semibold hover:bg-white/20 transition">
                <Shuffle size={18} /> Shuffle
              </button>
            </div>
          )}

          <div className="mt-8">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-14 rounded-lg bg-white/[0.04] animate-pulse" />)}</div>
            ) : error ? (
              <p className="text-center text-red-400 py-10">{error}</p>
            ) : results.songs.length === 0 ? (
              <p className="text-center text-gray-500 py-16">No songs found</p>
            ) : (
              <ol className="divide-y divide-white/[0.05]">
                {results.songs.map((track, idx) => {
                  const on = currentTrack?.id === track.id;
                  const album = track.label && track.label !== track.title && track.label !== track.artist ? track.label : '';
                  return (
                    <li key={track.id} className="group flex items-center gap-3 sm:gap-4 py-2.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.04] cursor-pointer"
                      onClick={() => playQueue(results.songs, idx, source)}>
                      <span className={`w-6 text-right text-sm tabular-nums shrink-0 ${on ? 'text-green-400' : 'text-gray-500'}`}>{idx + 1}</span>
                      <span className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden bg-white/5">
                        {track.poster && <img src={track.poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
                        <span className={`absolute inset-0 flex items-center justify-center bg-black/50 transition ${on ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <Play size={16} className="fill-white text-white" />
                        </span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[15px] font-semibold leading-snug line-clamp-2 sm:line-clamp-1 ${on ? 'text-green-400' : 'text-white'}`}>{track.title}</span>
                        <span className="block text-xs text-gray-500 truncate">{track.artist || album || 'Song'}</span>
                      </span>
                      {album && <span className="hidden md:block w-56 shrink-0 text-xs text-gray-500 truncate">{album}</span>}
                      <span onClick={(e) => e.stopPropagation()}><PlayNextButton track={track} /></span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
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
              {hov && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:`rgb(${light})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Play size={16} style={{ fill:'#000', color:'#000', marginLeft:2 }} />
                </div>
                <PlayNextButton track={track} />
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
            <PlayNextButton track={track} />
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
      <div onClick={() => saveAndGo(artist.id
          ? `/music/artist/${artist.id}`        // the artist's own page: all their songs, albums
          : `/music/search?find=artist:${encodeURIComponent(artist.title)}`)}
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

      <div style={{ maxWidth:1200, width:'100%', margin:'0 auto', padding:'24px 16px', flex:1 }}>

        {/* The field itself, seeded with this search — a result that is not
            quite the song you meant is refined here, rather than by reopening
            the rail's search panel. This replaced a banner that only restated
            the query back at you. */}
        <div style={{ marginBottom: 20 }}>
          <MusicSearchBar initialQuery={query} />
          {!loading && (
            <p style={{ fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.35)', margin:'10px 2px 0' }}>
              {total > 0
                ? <>{total} result{total === 1 ? '' : 's'} for <span style={{ color:'#5eead4', fontWeight:700 }}>"{query}"</span></>
                : <>Nothing found for <span style={{ color:'rgba(255,255,255,0.55)', fontWeight:700 }}>"{query}"</span></>}
            </p>
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
                  {/* The quick search answers five songs; the rest, and the
                      playlists, are a page at a time on the explore page. */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to={`/music/explore?q=${encodeURIComponent(query)}&tab=songs`}
                      className="rounded-full bg-white/[0.06] border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/[0.12] transition">
                      More songs for “{query}”
                    </Link>
                    <Link to={`/music/explore?q=${encodeURIComponent(query)}&tab=playlists`}
                      className="rounded-full bg-white/[0.06] border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/[0.12] transition">
                      Playlists
                    </Link>
                  </div>
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
