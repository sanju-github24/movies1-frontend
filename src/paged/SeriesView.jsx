import React, { useState, useEffect } from "react";
import { useParams, Link } from 'react-router-dom';
import { MonitorPlay, ArrowLeft, Clock, Zap, Calendar, Box, Video } from "lucide-react"; 
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient';
import { DateTime } from 'luxon';

// --- Shared Helper: Formats highlight type for display ---
const formatHighlightType = (type) => {
    if (!type || type === 'FULL') return 'Full Highlight';
    // Ensure capitalization for display consistency
    return type.replace('DAY', 'Day ').replace('INNINGS', 'Inn ').toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
};

// --- NEW: Highlight Card Component ---
const HighlightCard = ({ highlight, matchPoster, matchSlug }) => {
    // Note: The player component (LiveStreamPlayer) must read the ?segment= parameter
    const highlightLink = `/live-cricket/player/${matchSlug}?highlightId=${highlight.id}`; 
    
    return (
        <Link 
            to={highlightLink} 
            className="group block w-full relative overflow-hidden rounded-lg shadow-xl cursor-pointer transform transition duration-300 hover:shadow-2xl hover:scale-[1.02] bg-gray-800"
        >
            {/* Background Image (Match Poster) */}
            <div 
                className="w-full h-48 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${matchPoster})` }}
                aria-label={highlight.highlight_title}
            />

            {/* Black Overlay */}
            <div className="absolute inset-0 bg-black/50"></div>
            
            {/* Live Now Tag (Using Video icon) */}
            <div className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded text-white bg-green-600 flex items-center gap-1`}>
                <Video className="w-3 h-3 fill-white" /> HIGHLIGHT
            </div>

            {/* Highlight Info (Bottom Section - Overlaid) */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                
                {/* Highlight Title */}
                <h3 className="text-lg font-extrabold text-white leading-tight">
                    {highlight.highlight_title}
                </h3>
                
                {/* Segment Type */}
                <p className="text-xs font-semibold text-yellow-400 mt-1 flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-yellow-400"/> 
                    {formatHighlightType(highlight.highlight_type)}
                </p>

                {/* Match Summary/Update (Placeholder for context) */}
                <p className="text-xs text-gray-400 mt-1 truncate">
                    Match: {highlight.match_title}
                </p>
            </div>
        </Link>
    );
};
// --- END Highlight Card Component ---


// --- Reusable Match Card Component (No changes) ---
const MatchCard = ({ match }) => {
    
    const isLive = match.status === 'LIVE';
    const isScheduled = match.status === 'SCHEDULED';
    
    const statusClass = isLive 
        ? 'bg-red-600' 
        : isScheduled 
        ? 'bg-blue-600'
        : 'bg-gray-700';

    // *** Logic to determine if a scheduled match has passed its start time ***
    let isScheduledTimePassed = false;
    let scheduledMessage = match.live_start_time;
    let finalStatus = match.status; 

    if (isScheduled && match.live_start_time) {
        try {
            const startTime = match.live_start_datetime 
                ? DateTime.fromISO(match.live_start_datetime)
                : DateTime.fromFormat(match.live_start_time, "h:mm a ZZZ", { zone: 'system' });
            
            if (startTime.isValid && startTime < DateTime.now().plus({ minutes: 15 })) {
                isScheduledTimePassed = true;
                scheduledMessage = "Starting Soon";
                finalStatus = 'Starting Soon';
            }
        } catch (e) {
            console.warn("Failed to parse match time:", match.live_start_time, match.live_start_datetime);
        }
    }
    
    // Determine the final link target
    // All playable matches (LIVE/ENDED/Starting Soon) go to the primary player route.
    const playerLink = isScheduled && !isScheduledTimePassed 
        ? `/live-cricket/player/${match.link_slug}` 
        : `/live-cricket/player/${match.link_slug}`;
    
    // Determine if the card should be disabled visually
    const isDisabled = isScheduled && !isScheduledTimePassed;
    
    const handleClick = (e) => {
        if (isDisabled) {
            e.preventDefault();
            toast.info(`Match is scheduled for ${match.live_start_time}. You cannot click until it starts.`);
        }
    };

    return (
        <Link 
            to={playerLink} 
            onClick={handleClick}
            className={`group block w-full relative overflow-hidden rounded-lg shadow-xl cursor-pointer transform transition duration-300
                      ${isDisabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'hover:shadow-2xl hover:scale-[1.02]'}`}
        >
            {/* Background Image */}
            <div 
                className="w-full h-48 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${match.cover_poster_url})` }}
                aria-label={`${match.team_1} vs ${match.team_2}`}
            />

            {/* Black Overlay: The key visual element */}
            <div className="absolute inset-0 bg-black/50"></div>
            
            {/* Status Tag (Top Left) */}
            <div className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded text-white ${statusClass}`}>
                {isLive || isScheduledTimePassed ? <Zap className="w-3 h-3 inline-block mr-1 fill-white" /> : <Clock className="w-3 h-3 inline-block mr-1" />}
                {finalStatus}
            </div>

            {/* Match Info (Bottom Section - Overlaid) */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs font-semibold text-gray-300">{match.sport} • {match.league}</p>
                
                {isScheduled && !isScheduledTimePassed ? (
                    <div className="flex items-center text-sm font-bold text-yellow-400 mt-1">
                        <Clock className="w-4 h-4 mr-1"/>
                        {match.live_start_time}
                    </div>
                ) : (
                    <>
                        {/* Team 1 Score */}
                        <div className="flex justify-between items-center text-white text-base font-bold mt-1">
                            <span>{match.team_1}</span>
                            <span>{match.team_1_score}</span>
                        </div>

                        {/* Team 2 Score */}
                        <div className="flex justify-between items-center text-white text-base font-bold">
                            <span>{match.team_2}</span>
                            <span className={isLive ? 'text-red-400' : 'text-white'}>{match.team_2_score}</span>
                        </div>
                    </>
                )}

                {/* Match Summary/Update */}
                <p className="text-xs text-gray-400 mt-1">{match.result_summary}</p>
            </div>
        </Link>
    );
};
// --- END Match Card Component ---


const SeriesView = () => {
    const { seriesSlug } = useParams();
    
    const [series, setSeries] = useState(null);
    const [matches, setMatches] = useState(null);
    const [allHighlights, setAllHighlights] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSeriesHighlights, setShowSeriesHighlights] = useState(false);


    useEffect(() => {
        const fetchSeriesData = async () => {
            setLoading(true);
            setError(null);
            setShowSeriesHighlights(false); 

            try {
                // 1. Fetch Series Details
                const { data: seriesData, error: seriesError } = await supabase
                    .from('series')
                    .select('id, series_title, series_slug, cover_image_url, current_status, start_date, end_date, highlights_source')
                    .eq('series_slug', seriesSlug)
                    .single();

                if (seriesError || !seriesData) {
                    throw new Error("Series not found or failed to fetch series data.");
                }
                
                setSeries(seriesData);

                // 2. Fetch all related matches and highlight segments
                
                // Fetch ALL live_matches in this series
                const { data: matchesData, error: matchesError } = await supabase
                    .from('live_matches')
                    .select('id, link_slug, title, cover_poster_url, league, sport, status, live_start_datetime, live_start_time, team_1, team_2, team_1_score, team_2_score, result_summary')
                    .eq('series_id', seriesData.id)
                    .order('live_start_datetime', { ascending: true });
                
                if (matchesError) {
                     throw new Error("Failed to fetch matches for this series.");
                }
                
                // Get all match IDs for the next query
                const matchIds = matchesData.map(match => match.id);

                // Fetch ALL highlight segments for these matches
                const { data: highlightsData, error: highlightsError } = await supabase
                    .from('match_highlights')
                    .select('id, match_id, highlight_title, highlight_type, highlight_source')
                    .in('match_id', matchIds); // Filter by all match IDs in the series
                
                if (highlightsError) {
                     console.error("Highlight Fetch Error:", highlightsError);
                     // Allow execution to continue if highlights fail but matches succeed
                }
                
                // --- CONSOLIDATION ---
                
                // Create a map of match data for easy lookup
                const matchMap = {};
                matchesData.forEach(match => {
                    matchMap[match.id] = {
                        title: match.title,
                        slug: match.link_slug,
                        poster: match.cover_poster_url,
                    };
                });
                
                // Consolidate highlights with match context
                let consolidatedHighlights = [];
                if (highlightsData) {
                    highlightsData.forEach(highlight => {
                        const matchInfo = matchMap[highlight.match_id];
                        if (matchInfo) {
                            consolidatedHighlights.push({
                                ...highlight,
                                match_slug: matchInfo.slug,
                                match_poster: matchInfo.poster,
                                match_title: matchInfo.title,
                            });
                        }
                    });
                }
                
                // Final Processing
                const processedMatches = matchesData.map(match => ({
                    ...match,
                    league: seriesData.series_title, 
                }));
                
                setMatches(processedMatches);
                setAllHighlights(consolidatedHighlights); 

            } catch (err) {
                console.error("Series View Critical Error:", err);
                setError(err.message);
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (seriesSlug) {
            fetchSeriesData();
        }
    }, [seriesSlug]);

    const renderMatchCards = () => {
        if (matches.length === 0) {
            return (
                <div className="text-center p-12 bg-gray-800 rounded-xl">
                    <p className="text-2xl text-white mb-4">No Matches Found</p>
                    <p className="text-gray-400">There are no live, scheduled, or ended matches currently associated with **{series.series_title}**.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                ))}
            </div>
        );
    };
    
    // Determine if the series highlight source is an iFrame
    const isIFrame = series?.highlights_source?.startsWith('<iframe');
    // const isRawURL = series?.highlights_source && !isIFrame; // Not used in rendering logic here


    if (loading) {
        return <div className="min-h-screen bg-gray-900 text-white"><p className="text-xl text-gray-400 p-8 text-center">Loading **{seriesSlug}** series schedule...</p></div>;
    }

    if (error || !series) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="text-center p-12 bg-gray-800 rounded-xl mt-10">
                        <p className="text-2xl text-red-400 mb-4">Error Loading Series</p>
                        <p className="text-gray-400">{error || "The requested series could not be found."}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <header className="py-8 bg-gray-800 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <Link to="/" className="text-blue-400 hover:text-blue-200 transition mb-4 flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4"/> Back to Home
                    </Link>

                    {/* Series Header */}
                    {series && (
                        <>
                            <div className="flex items-center gap-6 mt-4">
                                <Box className="w-10 h-10 text-yellow-500 shrink-0"/>
                                <div>
                                    <h1 className="text-4xl font-extrabold text-white">{series.series_title}</h1>
                                    <p className="text-lg text-gray-400 flex items-center gap-2 mt-1">
                                        <Calendar className="w-5 h-5"/> 
                                        {series.start_date ? DateTime.fromISO(series.start_date).toFormat('LLL dd, yyyy') : 'Date TBD'} 
                                        - 
                                        {series.end_date ? DateTime.fromISO(series.end_date).toFormat('LLL dd, yyyy') : 'Ongoing'}
                                    </p>
                                    <p className={`text-sm font-semibold mt-1 inline-block px-3 py-1 rounded-full ${series.current_status === 'ONGOING' ? 'bg-red-600' : 'bg-blue-600'}`}>
                                        Status: {series.current_status}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Series Highlight Button (if present) */}
                            {series.highlights_source && (
                                <div className="mt-6">
                                    <button 
                                        onClick={() => setShowSeriesHighlights(!showSeriesHighlights)}
                                        className={`px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 
                                            ${showSeriesHighlights 
                                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                    >
                                        <Video className="w-5 h-5"/> 
                                        {showSeriesHighlights ? `Hide Series Highlights` : `Watch Full Series Highlights`}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </header>
            
            {/* --- SERIES HIGHLIGHT PLAYER AREA (CONDITIONAL) --- */}
            {showSeriesHighlights && series.highlights_source && (
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                        
                        <h3 className="text-xl font-bold p-3 bg-gray-900 flex items-center gap-2">
                            Series Highlight Reel: {series.series_title}
                        </h3>

                        {isIFrame ? (
                            <div 
                                className="w-full h-full"
                                dangerouslySetInnerHTML={{ __html: series.highlights_source }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full bg-black">
                                <p className="text-yellow-500 p-4">HLS URL: {series.highlights_source} (Needs integration with VideoPlayer component)</p>
                            </div>
                        )}
                    </div>
                    <div className="h-4"></div>
                </div>
            )}
            {/* --- END SERIES HIGHLIGHT PLAYER AREA --- */}

            <section className="py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    
                    {/* --- MATCH HIGHLIGHT SEGMENTS (NEW SECTION) --- */}
                    {allHighlights.length > 0 && (
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-white mb-8 border-b border-green-700 pb-3 flex items-center gap-2">
                                <Video className="w-7 h-7 text-green-500"/> Segment Highlights
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {allHighlights.map((highlight) => (
                                    <HighlightCard 
                                        key={highlight.id} 
                                        highlight={highlight} 
                                        matchPoster={highlight.match_poster}
                                        matchSlug={highlight.match_slug}
                                    />
                                ))}
                            </div>
                            <hr className="border-t border-gray-700 my-8" />
                        </div>
                    )}
                    {/* --- END MATCH HIGHLIGHT SEGMENTS --- */}


                    <h2 className="text-3xl font-bold text-white mb-8 border-b border-gray-700 pb-3 flex items-center gap-2">
                        <MonitorPlay className="w-7 h-7 text-red-500"/> All Matches in Series
                    </h2>
                    {renderMatchCards()}
                </div>
            </section>
        </div>
    );
};

export default SeriesView;