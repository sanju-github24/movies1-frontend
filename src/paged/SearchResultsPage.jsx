import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import MusicSearchBar from '../components/MusicSearchBar';
import { Music, Disc, Users, ArrowLeft, Search, LayoutGrid, List, X, Play, Clock, Shuffle } from 'lucide-react';
import { fetchSearch, fetchListing } from '../utils/saavn';
import { useGoBack } from "../components/BackBar";
import PlayNextButton from '../components/PlayNextButton';
import { useMusicPlayer } from '../context/MusicPlayerContext';

// ── Cache helpers ─────────────────────────────────────────────────────────
const cacheKey  = q => `music_search_cache_${q}`;
const scrollKey = q => `music_search_scroll_${q}`;

// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Result cards. Defined here, at the top level, and not inside the page: the
// page re-renders four times a second while a song plays (it follows the
// player), and a component defined inside it is a new component on every
// render — so each card was thrown away and rebuilt, dropping its hover state,
// and the play button flickered in and out under the pointer. Hover is CSS
// now too, so there is no state to lose.
// ─────────────────────────────────────────────────────────────────────────
const FALLBACK_ART = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&q=80';
const cardCls = 'group cursor-pointer rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-colors active:scale-[0.98]';

function SectionHeader({ icon, label, count }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="flex text-gray-400">{icon}</span>
      <h2 className="text-lg font-bold text-white">{label}</h2>
      <span className="text-xs text-gray-500 font-semibold">{count}</span>
    </div>
  );
}

/* A tap plays the song there and then, inside the tap — a play started later,
   after the song page has fetched it, can be refused by the browser as
   autoplay — and opens its page. */
function SongCard({ track, grid, onOpen, onPlay }) {
  const open = () => { onPlay(track); onOpen(`/music/track/${track.id}`); };
  if (!grid) return (
    <div onClick={open} className={`${cardCls} flex items-center gap-3.5 p-3`}>
      <img src={track.poster} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" onError={(e) => { e.currentTarget.src = FALLBACK_ART; }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{track.title}</p>
        <p className="text-xs text-gray-500 truncate">{track.artist || track.label || 'Song'}</p>
      </div>
      <span onClick={(e) => e.stopPropagation()}><PlayNextButton track={track} /></span>
    </div>
  );
  return (
    <div onClick={open} className={cardCls}>
      <div className="relative aspect-square overflow-hidden">
        <img src={track.poster} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.src = FALLBACK_ART; }} />
        {/* Shown on hover with CSS — and always on a touch screen, which has no hover. */}
        <div className="absolute inset-0 flex items-center justify-center gap-2.5 bg-black/45 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-transparent [@media(hover:none)]:items-end [@media(hover:none)]:justify-end [@media(hover:none)]:p-2 transition-opacity">
          <span className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center [@media(hover:none)]:hidden"><Play size={16} className="fill-current ml-0.5" /></span>
          <span onClick={(e) => e.stopPropagation()}><PlayNextButton track={track} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80" /></span>
        </div>
      </div>
      <div className="px-3 pt-2.5 pb-3">
        <p className="text-[13px] font-bold text-white truncate">{track.title}</p>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">{track.artist || track.label || 'Song'}</p>
      </div>
    </div>
  );
}

function AlbumCard({ album, grid, onOpen }) {
  const open = () => onOpen(`/music/search?find=album:${album.id}`);
  if (!grid) return (
    <div onClick={open} className={`${cardCls} flex items-center gap-3.5 p-3`}>
      <img src={album.poster} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" onError={(e) => { e.currentTarget.src = FALLBACK_ART; }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{album.title}</p>
        <p className="text-xs text-gray-500 truncate">Album</p>
      </div>
    </div>
  );
  return (
    <div onClick={open} className={cardCls}>
      <div className="relative aspect-square overflow-hidden">
        <img src={album.poster} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.src = FALLBACK_ART; }} />
        <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white/90 border border-white/15">Album</span>
      </div>
      <div className="px-3 pt-2.5 pb-3">
        <p className="text-[13px] font-bold text-white truncate">{album.title}</p>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">{album.label || 'Album'}</p>
      </div>
    </div>
  );
}

function ArtistCard({ artist, grid, onOpen }) {
  const open = () => onOpen(artist.id ? `/music/artist/${artist.id}` : `/music/search?find=artist:${encodeURIComponent(artist.title)}`);
  return (
    <div onClick={open} className={`${cardCls} flex items-center ${grid ? 'flex-col gap-3 px-3 pt-5 pb-4 text-center' : 'gap-3.5 p-3'}`}>
      <img src={artist.poster} alt="" className={`${grid ? 'w-[72px] h-[72px]' : 'w-12 h-12'} rounded-full object-cover shrink-0 border-2 border-white/10 group-hover:border-white/30 transition-colors`} onError={(e) => { e.currentTarget.src = FALLBACK_ART; }} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-white truncate">{artist.title}</p>
        <p className="text-[11px] text-gray-500">Artist</p>
      </div>
    </div>
  );
}

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
  // The results become the queue, so the next song is the next result.
  const playFromSearch = (track) => {
    if (currentTrack?.id === track.id) return;
    playQueue(visSongs, Math.max(0, visSongs.findIndex((s) => s.id === track.id)), { title: `Search: ${query}`, link: `/music/search?find=${encodeURIComponent(query)}` });
  };
  const visAlbums  = (activeTab==='all'||activeTab==='albums')  ? results.albums  : [];
  const visArtists = (activeTab==='all'||activeTab==='artists') ? results.artists : [];

  const gridCols = viewMode==='grid'
    ? { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12 }
    : { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:8 };


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
                  <div style={gridCols}>{visSongs.map(t => <SongCard key={t.id} track={t} grid={viewMode==='grid'} onOpen={saveAndGo} onPlay={playFromSearch} />)}</div>
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
                  <div style={gridCols}>{visAlbums.map(a => <AlbumCard key={a.id} album={a} grid={viewMode==='grid'} onOpen={saveAndGo} />)}</div>
                </section>
              )}
              {visArtists.length > 0 && (
                <section>
                  <SectionHeader icon={<Users size={13}/>} label="Artists" count={visArtists.length} color="#fbbf24" />
                  <div style={gridCols}>{visArtists.map(a => <ArtistCard key={a.id} artist={a} grid={viewMode==='grid'} onOpen={saveAndGo} />)}</div>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
