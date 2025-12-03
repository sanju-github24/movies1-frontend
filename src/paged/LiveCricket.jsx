// src/pages/LiveCricket.jsx
import React, { useState, useEffect } from "react";
import { MonitorPlay, Zap, ArrowRight, Clock } from "lucide-react"; 
import { Link, useNavigate } from 'react-router-dom'; 
import { toast } from "react-toastify"; 
import { supabase } from '../utils/supabaseClient'; 
import { DateTime } from 'luxon'; // 💡 ASSUMING LUXON IS INSTALLED: npm install luxon

// --- Simple Navbar (No changes) ---
const LivePageNavbar = () => {
    // ... (component code remains the same)
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


// --- Reusable Match Card Component (CRITICAL LOGIC UPDATE) ---
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

    if (isScheduled && match.live_start_time) {
        try {
            // 💡 WARNING: Timezone parsing is highly complex with string inputs like "10:30 AM IST".
            // We use Luxon's best-guess local parsing for demonstration.
            // For production, use a full ISO string from the DB!
            const startTime = DateTime.fromFormat(match.live_start_time, "h:mm a ZZZ", { zone: 'system' });
            
            // Check if the start time is a valid future time (within today)
            if (startTime.isValid && startTime < DateTime.now()) {
                isScheduledTimePassed = true;
                scheduledMessage = "Starting soon or delayed...";
            }
        } catch (e) {
            console.warn("Failed to parse live_start_time string:", match.live_start_time);
        }
    }
    
    // Determine the final link target
    const playerLink = `/live-cricket/player/${match.link_slug}`;
    
    // Determine if the card should be disabled visually
    const isDisabled = isScheduled && !isScheduledTimePassed;
    
    // Handler to block navigation for future scheduled matches
    const handleClick = (e) => {
        if (isDisabled) {
            e.preventDefault();
            toast.info(`Match is scheduled for ${match.live_start_time}. You cannot click until it's about to start.`);
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
                {isScheduledTimePassed ? 'Starting Soon' : match.status}
            </div>

            {/* Match Info (Bottom Section - Overlaid) */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                {/* Use sport and league from DB */}
                <p className="text-xs font-semibold text-gray-300">{match.sport} • {match.league}</p>
                
                {/* Score or Time */}
                {isScheduled ? (
                    <div className="flex items-center text-sm font-bold text-yellow-400 mt-1">
                        <Clock className="w-4 h-4 mr-1"/>
                        {isDisabled ? match.live_start_time : scheduledMessage}
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
  // Use null initial state to indicate loading
  const [matches, setMatches] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLiveMatches = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('live_matches')
        .select('*')
        .order('created_at', { ascending: false }); // Show newest first

      if (error) {
        console.error("Supabase fetch error:", error);
        setError("Failed to load live matches. Please check the network.");
        toast.error("Failed to load live matches.");
        setMatches([]); // Set to empty array on error
      } else {
        setMatches(data);
      }
      setLoading(false);
    };

    fetchLiveMatches();
  }, []); // Run only on mount

  // Conditional Rendering Logic

  const renderContent = () => {
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


  return (
    <div className="min-h-screen bg-gray-900"> 
        
        <LivePageNavbar />

        {/* 1. Static Live Match Hero Section (The Visual Banner) */}
        <LiveHero /> 

        {/* 2. Live Match Listing Section */}
        <section className="py-10 bg-gray-900 text-white"> 
            <div className="max-w-7xl mx-auto px-4 sm:px-8">
                
                {/* Section Header: "Watch Live" and "SEE ALL" link */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <MonitorPlay className="w-6 h-6 text-red-600"/> Watch Live
                    </h2>
                    <Link 
                        to="/schedule" 
                        className="text-blue-400 font-semibold hover:text-blue-200 transition text-sm uppercase flex items-center gap-1"
                    >
                        SEE ALL <ArrowRight className="w-4 h-4"/>
                    </Link>
                </div>

                {/* Conditional Content Rendering */}
                {renderContent()}
                
            </div>
        </section>
        
    </div>
  );
};

export default LiveCricket;