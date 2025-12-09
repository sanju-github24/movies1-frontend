// src/pages/LiveCricket.jsx
import React, { useState, useEffect } from "react";
import { MonitorPlay, Zap, ArrowRight, Clock, Box, Calendar } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom'; 
import { toast } from "react-toastify"; 
import { supabase } from '../utils/supabaseClient'; 
import { DateTime } from 'luxon'; 

// --- Simple Navbar (No changes) ---
const LivePageNavbar = () => {
    // ... (Navbar code is unchanged)
    return (
        <nav className="sticky top-0 w-full bg-black/90 text-white z-[100] shadow-lg h-16 flex items-center px-4 sm:px-8">
            <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
                <Link to="/" className="shrink-0 flex items-center">
                    {/* Using the specified logo path */}
                    <img src="/logo_3.png" alt="Anchor Movies" className="w-28 md:w-32 object-contain" />
                </Link>
                
                {/* Optional: Add quick links like Home, Schedule, etc. here */}
                <div className="flex items-center space-x-4 text-sm font-medium">
                    <Link to="/" className="hover:text-red-500 transition">Home</Link>
                    <Link to="/schedule" className="hover:text-red-500 transition">Schedule</Link>
                </div>
            </div>
        </nav>
    );
};
// --- END LivePageNavbar Component ---

// --- UPDATED: Series Block Component (Card Design) ---
const SeriesBlock = ({ series }) => {
    const statusClass = series.current_status === 'ONGOING' 
        ? 'bg-red-600'
        : series.current_status === 'UPCOMING'
        ? 'bg-blue-600'
        : 'bg-gray-700';

    const defaultSeriesImage = '/default-series-bg.jpg'; // Fallback image

    return (
        <Link 
            to={`/series/${series.series_slug}`} 
            className="group block relative overflow-hidden rounded-xl shadow-lg cursor-pointer transform transition duration-300 hover:shadow-2xl hover:scale-[1.02] border border-gray-700"
        >
            {/* Background Image Area (Using cover_image_url) */}
            <div 
                className="w-full h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ 
                    backgroundImage: `url(${series.cover_image_url || defaultSeriesImage})`,
                }}
            />

            {/* Black Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors"></div>
            
            {/* Status Tag (Top Right) */}
            <div className={`absolute top-2 right-2 text-xs font-bold px-3 py-1 rounded-full text-white ${statusClass} shadow-md`}>
                {series.current_status}
            </div>

            {/* Series Info (Bottom Section - Overlaid) */}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-xl font-extrabold text-white leading-tight truncate">
                    {series.series_title}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                    <Calendar className="w-3 h-3 inline-block mr-1"/>
                    {series.start_date ? DateTime.fromISO(series.start_date).toFormat('LLL dd') : 'TBD'} - 
                    {series.end_date ? DateTime.fromISO(series.end_date).toFormat('LLL dd, yyyy') : ' Ongoing'}
                </p>
            </div>
        </Link>
    );
};
// --- END Series Block Component ---


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
    let finalStatus = match.status; // Default status display

    if (isScheduled && match.live_start_time) {
        try {
            const startTime = match.live_start_datetime 
                ? DateTime.fromISO(match.live_start_datetime)
                : DateTime.fromFormat(match.live_start_time, "h:mm a ZZZ", { zone: 'system' });
            
            if (startTime.isValid && startTime < DateTime.now().plus({ minutes: 15 })) {
                isScheduledTimePassed = true;
                scheduledMessage = "Starting soon or delayed...";
                finalStatus = 'Starting Soon';
            }
        } catch (e) {
            console.warn("Failed to parse match time:", match.live_start_time, match.live_start_datetime);
        }
    }
    
    // Determine the final link target
    const playerLink = match.status === 'ENDED'
        ? `/highlights/${match.link_slug}` 
        : `/live-cricket/player/${match.link_slug}`;
    
    // Determine if the card should be disabled visually
    const isDisabled = isScheduled && !isScheduledTimePassed;
    
    // Handler to block navigation for future scheduled matches
    const handleClick = (e) => {
        if (isDisabled) {
            e.preventDefault();
            toast.info(`Match is scheduled for ${match.live_start_time}. You cannot click until it starts.`);
        }
    };

    return (
        <Link 
            to={playerLink} 
            onClick={handleClick} // Attach the blocking handler
            className={`group block w-full relative overflow-hidden rounded-lg shadow-xl cursor-pointer transform transition duration-300
                      ${isDisabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'hover:shadow-2xl hover:scale-[1.02]'}`}
        >
            {/* Background Image */}
            <div 
                className="w-full h-48 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                // Use cover_poster_url from DB
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
                {/* Use sport and league from DB */}
                <p className="text-xs font-semibold text-gray-300">{match.sport} • {match.league}</p>
                
                {/* Score or Time */}
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

// --- LiveHero Component (No change) ---
const LiveHero = () => {
    // ... (component code remains the same)
    return (
        <div 
            className="relative w-full h-[350px] sm:h-[450px] bg-cover bg-center bg-gray-900 shadow-1xl" 
            style={{ 
                backgroundImage: "url('/live-cricket.png')",
                backgroundPosition: "center top",
            }}
        >
            <div className="absolute inset-0 bg-black/60"></div>
        </div>
    );
};
// --- END LiveHero Component ---


const LiveCricket = () => {
  // === Match State ===
  const [matches, setMatches] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === Series State (NEW) ===
  const [seriesList, setSeriesList] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(true);


  useEffect(() => {
    const fetchLiveMatches = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('live_matches')
        .select('*')
        // Order: LIVE first, then SCHEDULED (closest time first), then ENDED
        .order('status', { ascending: false, nullsFirst: false }) // Assuming LIVE has a higher alphabetical value than SCHEDULED/ENDED
        .order('live_start_datetime', { ascending: true }) 
        .order('created_at', { ascending: false }); 

      if (error) {
        console.error("Supabase fetch error:", error);
        setError("Failed to load live matches.");
        toast.error("Failed to load live matches.");
        setMatches([]);
      } else {
        setMatches(data);
      }
      setLoading(false);
    };

    const fetchSeriesList = async () => {
        setSeriesLoading(true);
        const { data, error } = await supabase
            .from('series')
            .select('*')
            // Order: ONGOING, then UPCOMING
            .order('current_status', { ascending: false }) 
            .order('start_date', { ascending: true });

        if (error) {
            console.error("Supabase fetch series error:", error);
            setSeriesList([]); // Set to empty array on error
        } else {
            // Filter out CONCLUDED series for the main homepage display
            const activeSeries = data.filter(s => s.current_status !== 'CONCLUDED');
            setSeriesList(activeSeries);
        }
        setSeriesLoading(false);
    };

    fetchLiveMatches();
    fetchSeriesList();
  }, []); // Run only on mount

  // Conditional Rendering Logic for Matches

  const renderMatchContent = () => {
    if (loading) {
      return <p className="text-xl text-gray-400 p-8 text-center">Loading live match schedule...</p>;
    }

    if (error) {
        return <p className="text-xl text-red-400 p-8 text-center">{error}</p>;
    }

    if (!matches || matches.length === 0) {
      return (
        <p className="text-xl text-gray-400 p-8 text-center">
          No live or scheduled matches available right now.
        </p>
      );
    }
    
    // Display the matches grid
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
            ))}
        </div>
    );
  };
  
  // Conditional Rendering Logic for Series (NEW)

  const renderSeriesContent = () => {
    if (seriesLoading) {
      return <p className="text-gray-500 p-4 text-center text-sm">Loading series...</p>;
    }

    if (!seriesList || seriesList.length === 0) {
        // Don't show anything if no active series are found
        return null; 
    }

    return (
        <div className="pb-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Box className="w-6 h-6 text-yellow-500"/> Popular Tournaments
                </h2>
                {/* Optional: Link to a dedicated Series page */}
                <Link 
                    to="/series" 
                    className="text-blue-400 font-semibold hover:text-blue-200 transition text-sm uppercase flex items-center gap-1"
                >
                    VIEW ALL SERIES <ArrowRight className="w-4 h-4"/>
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {seriesList.map((series) => (
                    <SeriesBlock key={series.id} series={series} />
                ))}
            </div>
        </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-900"> 
        
        <LivePageNavbar />

        {/* 1. Static Live Match Hero Section (The Visual Banner) */}
        <LiveHero /> 

        {/* 2. Content Section (Series and Matches) */}
        <section className="py-10 bg-gray-900 text-white"> 
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
                
                {/* --- SERIES LISTING (NEW SECTION) --- */}
                {renderSeriesContent()}
                <hr className="border-t border-gray-700 my-8" />
                
                {/* --- MATCH LISTING --- */}
                
                {/* Match Header: "Watch Live" and "SEE ALL" link */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <MonitorPlay className="w-6 h-6 text-red-600"/> Live & Scheduled Matches
                    </h2>
                    <Link 
                        to="/schedule" 
                        className="text-blue-400 font-semibold hover:text-blue-200 transition text-sm uppercase flex items-center gap-1"
                    >
                        SEE FULL SCHEDULE <ArrowRight className="w-4 h-4"/>
                    </Link>
                </div>

                {/* Conditional Content Rendering */}
                {renderMatchContent()}
                
            </div>
        </section>
        
    </div>
  );
};

export default LiveCricket;