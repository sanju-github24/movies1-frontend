// src/pages/LiveStreamPlayer.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MonitorPlay, Zap, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient'; 
// --- NEW IMPORT ---
import VideoPlayer from "./VideoPlayer"; 
// ------------------

// NOTE: This component is optimized for fetching Live Match data (HLS/iFrame URLs) 

const LiveStreamPlayer = () => {
  const { slug } = useParams(); 
  const navigate = useNavigate();
  
  const [matchData, setMatchData] = useState(null); // Data fetched from live_matches table
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
        setError("Invalid match link provided.");
        setLoading(false);
        return;
    }

    const fetchMatch = async () => {
        const { data, error } = await supabase
            .from('live_matches')
            .select('*')
            .eq('link_slug', slug)
            .single();

        if (error || !data) {
            console.error("Fetch Error:", error);
            setError("Could not find the requested live match or stream data.");
            toast.error("Match stream not found.");
        } else {
            setMatchData(data);
        }
        setLoading(false);
    };

    fetchMatch();
  }, [slug]);

  // --- TRANSFORMATION: Create playerOverlayData structure ---
  const playerOverlayData = useMemo(() => {
    if (!matchData) {
        return { title: 'Live Stream', slug: slug };
    }
    
    // Combine match data into the required overlay structure (camelCase used by VideoPlayerPage)
    // NOTE: This ensures the VideoPlayer component gets the necessary title, poster, etc.
    return {
      logoUrl: null, // Not typically used for live sports
      title: matchData.title,
      slug: matchData.link_slug,
      imdbRating: null,
      year: null, 
      
      // Use the comprehensive result summary as the main overview/description
      overview: `${matchData.team_1} vs ${matchData.team_2} (${matchData.status}). ${matchData.result_summary}`,
      
      // Genres/Categories
      genres: [matchData.sport, matchData.league].filter(Boolean),
      
      language: null,
      activeEpisode: undefined,
      downloadUrl: null, // No download link for live streams

      // Custom fields specific to live streams (optional, if VideoPlayer can handle them)
      isLiveStream: true,
      liveStatus: matchData.status,
      liveScore: `${matchData.team_1_score} | ${matchData.team_2_score}`,
    };
  }, [matchData, slug]);


  // --- Player Rendering Logic ---
  const renderPlayer = () => {
    if (loading) {
      // ... (Loading UI)
      return (
        <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-10 h-10 animate-spin text-red-500" />
            <p className="mt-4 text-gray-400">Loading stream data...</p>
        </div>
      );
    }
    
    if (error || !matchData) {
      // ... (Error UI)
      return (
        <div className="flex flex-col items-center justify-center h-full p-10 bg-gray-900">
            <p className="text-xl text-red-500 font-bold">{error || "No match data available."}</p>
            <button onClick={() => navigate('/live-cricket')} className="mt-4 text-blue-400 hover:text-blue-200">
                Go back to Live Match List
            </button>
        </div>
      );
    }

    const { hls_url, iframe_html } = matchData;
    const finalSource = hls_url || null;
    const finalTitle = matchData.title;


    // Priority 1: HLS Stream (Delegate to existing VideoPlayer component)
    if (finalSource) {
      return (
        <div className="w-full h-full relative bg-black">
          <VideoPlayer 
            src={finalSource} 
            title={finalTitle}
            playerOverlayData={playerOverlayData} // Pass the structured metadata
            isLive={true} // Flag for the VideoPlayer component
            // We assume the VideoPlayer is smart enough to handle HLS internally
          />
          {/* Keep LIVE indicator separate for visual certainty */}
          <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
             <Zap className="w-3 h-3 fill-white" /> LIVE
          </div>
        </div>
      );
    }
    
    // Priority 2: iFrame Embed (Fallback)
    if (iframe_html) {
      return (
        <div 
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: iframe_html }}
        />
      );
    }
    
    // Last Fallback
    return (
        <div className="flex items-center justify-center h-full p-10 bg-gray-900">
            <p className="text-xl text-yellow-500">Error: No valid streaming source (HLS or iFrame) found for this match.</p>
        </div>
    );
  };
  
  const currentTitle = matchData?.title || 'Live Stream Player';
  const currentStatus = matchData?.status || 'UNKNOWN';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      {/* Header/Status Bar */}
      <header className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
            <button onClick={() => navigate('/live-cricket')} className="mr-3 p-1 rounded-full hover:bg-gray-700 transition">
                <ArrowLeft className="w-5 h-5 text-red-500" />
            </button>
            <h1 className="text-xl font-bold text-white truncate max-w-[calc(100vw-200px)]">
                {currentTitle} - {matchData?.league}
            </h1>
        </div>
        <div className={`text-sm font-semibold px-3 py-1 rounded-full ${currentStatus === 'LIVE' ? 'bg-red-600' : 'bg-gray-600'}`}>
            {currentStatus}
        </div>
      </header>

      {/* Video Player Area */}
      <div className="w-full max-w-7xl mx-auto aspect-video sm:aspect-auto sm:h-[90vh] bg-black">
        {renderPlayer()}
      </div>

      {/* Match Details Section */}
      {matchData && (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold mt-4 mb-2 flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-red-500"/> Match Summary
            </h2>
            <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-300 font-semibold mb-1">Score: {matchData.team_1} ({matchData.team_1_score}) vs {matchData.team_2} ({matchData.team_2_score})</p>
                <p className="text-gray-400">{matchData.result_summary}</p>
            </div>
        </div>
      )}
      
    </div>
  );
};

export default LiveStreamPlayer;