// src/pages/SeriesView.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MonitorPlay, ArrowLeft, Zap, Calendar, Box, Video, PlayCircle, Loader2, Info } from "lucide-react"; 
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient';
import { DateTime } from 'luxon';

/* ================= COMPONENT: HIGHLIGHT CARD ================= */
const HighlightCard = ({ highlight, matchPoster, matchSlug }) => {
    if (!highlight) return null;
    const highlightLink = `/live-cricket/player/${matchSlug || 'unknown'}?highlightId=${highlight.id}`; 
    
    return (
        <Link 
            to={highlightLink} 
            className="group relative bg-gray-900 rounded-2xl overflow-hidden border border-white/5 transition-all hover:border-green-500/50 hover:shadow-2xl"
        >
            <div className="aspect-video relative overflow-hidden bg-gray-800">
                <img 
                    src={matchPoster || "/default-cricket.jpg"} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-60" 
                    alt="Highlight"
                    onError={(e) => { e.target.src = "/default-cricket.jpg"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1.5 bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg uppercase">
                        <Video size={10} fill="white" /> Highlight
                    </span>
                </div>
            </div>
            <div className="p-4">
                <h3 className="text-sm font-black uppercase tracking-tighter text-gray-100 line-clamp-1">{highlight.highlight_title || "Match Clip"}</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase mt-1 truncate">Match: {highlight.match_title || "Cricket Match"}</p>
            </div>
        </Link>
    );
};

/* ================= COMPONENT: MATCH CARD ================= */
const MatchCard = ({ match }) => {
    if (!match) return null;
    const isLive = match.status === 'LIVE';
    const watchUrl = match.status === "ENDED" ? `/highlights/${match.link_slug}` : `/live-cricket/player/${match.link_slug}`;

    return (
        <Link 
            to={watchUrl}
            className={`group relative bg-gray-900/50 rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-blue-500/30 ${isLive ? 'ring-1 ring-red-500/50' : ''}`}
        >
            <div className="aspect-video relative overflow-hidden bg-gray-800">
                <img 
                    src={match.cover_poster_url || "/default-cricket.jpg"} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-60" 
                    alt="Match"
                    onError={(e) => { e.target.src = "/default-cricket.jpg"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isLive ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-black/60 border-white/10 text-gray-300'}`}>
                        {match.status || 'SCHEDULED'}
                    </span>
                </div>
            </div>
            <div className="p-4 relative z-10">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-bold text-gray-200">
                        <span>{match.team_1 || 'Team A'}</span>
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{match.team_1_score || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-gray-200">
                        <span>{match.team_2 || 'Team B'}</span>
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{match.team_2_score || '-'}</span>
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 italic truncate max-w-[80%]">{match.result_summary || "Upcoming Match"}</span>
                    <PlayCircle className="w-5 h-5 text-blue-500" />
                </div>
            </div>
        </Link>
    );
};

/* ================= MAIN PAGE COMPONENT ================= */
const SeriesView = () => {
    const { seriesSlug } = useParams();
    const navigate = useNavigate();
    
    const [series, setSeries] = useState(null);
    const [matches, setMatches] = useState([]);
    const [allHighlights, setAllHighlights] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSeriesHighlights, setShowSeriesHighlights] = useState(false);

    useEffect(() => {
        const fetchSeriesData = async () => {
            if (!seriesSlug) return;
            setLoading(true);
            setError(null);
            
            try {
                // 1. Fetch Series
                const { data: seriesData, error: sErr } = await supabase
                    .from('series')
                    .select('*')
                    .eq('series_slug', seriesSlug)
                    .single();

                if (sErr || !seriesData) throw new Error("Series metadata not found in database.");
                setSeries(seriesData);

                // 2. Fetch Matches
                const { data: matchesData, error: mErr } = await supabase
                    .from('live_matches')
                    .select('*')
                    .eq('series_id', seriesData.id)
                    .order('created_at', { ascending: false });

                if (mErr) console.warn("Match Fetch Error:", mErr);
                const safeMatches = matchesData || [];
                setMatches(safeMatches);

                // 3. Fetch Highlights for these matches
                if (safeMatches.length > 0) {
                    const matchIds = safeMatches.map(m => m.id);
                    const { data: highlightsData } = await supabase
                        .from('match_highlights')
                        .select('*')
                        .in('match_id', matchIds);
                    
                    if (highlightsData) {
                        const matchMap = Object.fromEntries(safeMatches.map(m => [m.id, m]));
                        const consolidated = highlightsData.map(h => ({
                            ...h,
                            match_slug: matchMap[h.match_id]?.link_slug,
                            match_poster: matchMap[h.match_id]?.cover_poster_url,
                            match_title: matchMap[h.match_id]?.title,
                        }));
                        setAllHighlights(consolidated);
                    }
                }
            } catch (err) {
                console.error("Critical Render Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSeriesData();
    }, [seriesSlug]);

    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.3em]">Syncing Series Data</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
            <Info className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-white text-2xl font-black mb-2 uppercase">Series Load Failed</h1>
            <p className="text-gray-500 mb-6 max-w-sm">{error}</p>
            <button onClick={() => navigate('/live-cricket')} className="bg-blue-600 px-8 py-3 rounded-full font-bold">Back to Hub</button>
        </div>
    );

    const formattedStart = series?.start_date ? DateTime.fromISO(series.start_date).toFormat('LLL dd') : 'TBD';
    const formattedEnd = series?.end_date ? DateTime.fromISO(series.end_date).toFormat('LLL dd, yyyy') : 'Ongoing';

    return (
        <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-500/30 pb-20">
            {/* Immersive Header */}
            <header className="relative w-full overflow-hidden min-h-[400px] flex items-center">
                <div className="absolute inset-0">
                    <img src={series?.cover_image_url || "/default-series.jpg"} className="w-full h-full object-cover blur-2xl opacity-20 scale-110" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-950/80 to-gray-950" />
                </div>
                
                <div className="relative max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-10">
                    <div className="max-w-[240px] w-full aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5">
                        <img src={series?.cover_image_url || "/default-series.jpg"} className="w-full h-full object-cover" alt="Series Cover" />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-6">
                        <button onClick={() => navigate('/live-cricket')} className="inline-flex items-center gap-2 text-blue-400 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">
                            <ArrowLeft size={14} /> Back to Live Hub
                        </button>
                        <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none italic">{series?.series_title || "Tournament"}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500 bg-blue-500/10 text-blue-400">
                                {series?.current_status || "ACTIVE"}
                            </span>
                            <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 bg-white/5 text-gray-400 flex items-center gap-2">
                                <Calendar size={12} /> {formattedStart} - {formattedEnd}
                            </span>
                        </div>
                        {series?.highlights_source && (
                            <button 
                                onClick={() => setShowSeriesHighlights(!showSeriesHighlights)}
                                className={`px-8 py-4 rounded-2xl font-black text-xs transition-all uppercase flex items-center gap-3 shadow-xl ${showSeriesHighlights ? 'bg-red-600' : 'bg-green-600'}`}
                            >
                                <Video size={18} /> {showSeriesHighlights ? "Hide Highlights" : "Watch Full Series Highlights"}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-20">
                {/* Series Highlights Iframe Area */}
                {showSeriesHighlights && series?.highlights_source && (
                    <div className="animate-in slide-in-from-top duration-500">
                        <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-white/5 ring-1 ring-white/10 shadow-2xl">
                            {series.highlights_source.startsWith('<iframe') ? (
                                <div className="absolute inset-0 w-full h-full" dangerouslySetInnerHTML={{ __html: series.highlights_source }} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-center">
                                    <p className="text-gray-500 font-bold p-10">Stream Source Detected. Switch to full player to view.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Highlights Grid */}
                {allHighlights.length > 0 && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <div className="w-10 h-10 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20">
                                <Zap className="text-white" size={20} fill="white" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-widest">Tournament Highlights</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {allHighlights.map(h => (
                                <HighlightCard key={`h-card-${h.id}`} highlight={h} matchPoster={h.match_poster} matchSlug={h.match_slug} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Matches Grid */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <MonitorPlay className="text-white" size={20} />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-widest">Series Fixtures</h2>
                    </div>
                    {matches.length === 0 ? (
                        <div className="py-20 text-center bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No matches found for this series</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {matches.map(m => (
                                <MatchCard key={`m-card-${m.id}`} match={m} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SeriesView;