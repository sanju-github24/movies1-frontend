// src/pages/LiveStreamPlayer.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; 
import { MonitorPlay, Zap, ArrowLeft, Loader2, Video, Clock } from "lucide-react"; 
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient'; 
import VideoPlayer from "./VideoPlayer"; 

// --- AD CONSTANTS (UPDATED) ---
const WINFIX_AFFILIATE_LINK = "https://winfix.fun/register?campaignId=anchormovies-2407";
const BANNER_IMAGE_URL = "https://i.postimg.cc/NfKD2cjX/banner.jpg"; // NEW EXTERNAL URL
const BLINKING_CTA_CLASS = "animate-pulse duration-700";
// --------------------

// NOTE: This component is optimized for fetching Live Match data (HLS/iFrame URLs) 

const LiveStreamPlayer = () => {
  const { slug } = useParams(); 
  const navigate = useNavigate();
  
  const [matchData, setMatchData] = useState(null); 
  const [highlightList, setHighlightList] = useState([]); 
  const [activeHighlightSource, setActiveHighlightSource] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Primary Data Fetching ---
  useEffect(() => {
    if (!slug) {
        setError("Invalid match link provided.");
        setLoading(false);
        return;
    }

    const fetchMatchAndHighlights = async () => {
        setLoading(true);
        setError(null);

        // 1. Fetch Main Match Data
        const { data: match, error: matchError } = await supabase
            .from('live_matches')
            .select('id, title, league, sport, status, result_summary, team_1, team_2, team_1_score, team_2_score, link_slug, hls_url, iframe_html')
            .eq('link_slug', slug)
            .single();

        if (matchError || !match) {
            console.error("Match Fetch Error:", matchError);
            setError("Could not find the requested match or stream data.");
            setLoading(false);
            return;
        }

        setMatchData(match);
        
        // 2. Determine initial source
        let initialSource = null;
        if (match.status === 'LIVE' || match.status === 'SCHEDULED') {
            initialSource = match.hls_url || match.iframe_html;
        }
        
        // 3. ALWAYS fetch highlights if the match ID is available
        const { data: highlights, error: highlightsError } = await supabase
            .from('match_highlights')
            .select('id, highlight_title, highlight_type, highlight_source')
            .eq('match_id', match.id)
            .order('created_at', { ascending: true });

        if (highlightsError) {
            console.error("Highlights Fetch Error:", highlightsError);
            toast.warn("Could not load specific highlights for this match.");
        } else {
            setHighlightList(highlights);
            
            // If the match is ENDED AND we have highlights, set the first highlight as the default source
            if (match.status === 'ENDED' && highlights.length > 0) {
                 initialSource = highlights[0].highlight_source;
            }
        }
        
        setActiveHighlightSource(initialSource);
        setLoading(false);
    };

    fetchMatchAndHighlights();
  }, [slug]);

  // Handler to switch the active highlight source
  const handleHighlightSelect = (source) => {
      setActiveHighlightSource(source);
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  // Handler to switch back to Live Stream
  const handleLiveSelect = () => {
      if (matchData) {
          const liveSource = matchData.hls_url || matchData.iframe_html;
          setActiveHighlightSource(liveSource);
          window.scrollTo({ top: 0, behavior: 'smooth' }); 
      }
  };


  // --- TRANSFORMATION: Create playerOverlayData structure ---
  const playerOverlayData = useMemo(() => {
    if (!matchData) {
        return { title: 'Stream Player', slug: slug };
    }
    
    const isLive = matchData.status === 'LIVE';
    const currentStatus = isLive ? 'LIVE' : matchData.status;
    const streamTitle = `${matchData.title} (${currentStatus})`;

    const overviewText = `${matchData.team_1} (${matchData.team_1_score || 'N/A'}) vs ${matchData.team_2} (${matchData.team_2_score || 'N/A'}). ${matchData.result_summary}`;
    
    return {
      title: streamTitle,
      slug: matchData.link_slug,
      overview: overviewText,
      genres: [matchData.sport, matchData.league].filter(Boolean),
      
      isLiveStream: isLive,
      liveStatus: currentStatus,
      liveScore: isLive ? `${matchData.team_1_score} | ${matchData.team_2_score}` : null,
    };
  }, [matchData, slug]);


  // --- Player Rendering Logic ---
  const renderPlayer = () => {
    
    // ... (Loading/Error UI remains the same)
    if (loading || error || !matchData) {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                    <p className="mt-4 text-gray-400">Loading stream data...</p>
                </div>
            );
        }
        if (error || !matchData) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-10 bg-gray-900">
                    <p className="text-xl text-red-500 font-bold">{error || "No match data available."}</p>
                    <button onClick={() => navigate('/live-cricket')} className="mt-4 text-blue-400 hover:text-blue-200">
                        Go back to Live Match List
                    </button>
                </div>
            );
        }
    }

    // Determine source properties
    const isHLS = activeHighlightSource && activeHighlightSource.includes('.m3u8');
    const isIFrame = activeHighlightSource && activeHighlightSource.startsWith('<iframe');
    const isLiveStream = matchData.status === 'LIVE'; 
    const currentSource = activeHighlightSource;

    // We need to define isPlayingLive here based on the current active source matching the live sources
    const hasLiveSource = matchData && (matchData.hls_url || matchData.iframe_html);
    const isPlayingLiveSource = activeHighlightSource === matchData?.hls_url || activeHighlightSource === matchData?.iframe_html;
    const isPlayingLive = isLiveStream && isPlayingLiveSource;

    // Priority 1: HLS/Raw URL Stream (VOD or Live)
    if (isHLS || (!isIFrame && currentSource)) { 
      return (
        <div className="w-full h-full relative bg-black">
          <VideoPlayer 
            key={currentSource} 
            src={currentSource} 
            title={playerOverlayData.title}
            playerOverlayData={playerOverlayData}
            isLive={isPlayingLive} 
          />
          {/* Status Indicator */}
          {isPlayingLive && (
              <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Zap className="w-3 h-3 fill-white" /> LIVE
              </div>
          )}
        </div>
      );
    }
    
    // Priority 2: iFrame Embed (VOD or Live)
    if (isIFrame) {
      return (
        <div 
          key={currentSource} 
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: currentSource }}
        />
      );
    }
    
    // Last Fallback: No source available to play
    return (
        <div className="flex flex-col items-center justify-center h-full p-10 bg-gray-900">
            <p className="text-xl text-yellow-500">
                {matchData.status === 'SCHEDULED' ? 'Match is scheduled, waiting for stream source.' : 'No active source selected or available.'}
            </p>
            {matchData.status === 'SCHEDULED' && (
                <p className="text-gray-400 mt-2">Stream will start closer to the match time.</p>
            )}
        </div>
    );
  };
  
  const currentTitle = matchData?.title || 'Stream Player';
  const currentStatus = matchData?.status || 'UNKNOWN';

  // Check if live stream source exists for the button logic
  const hasLiveSource = matchData && (matchData.hls_url || matchData.iframe_html);
  // Check if current source is the active live source
  const isPlayingLiveSource = activeHighlightSource === matchData?.hls_url || activeHighlightSource === matchData?.iframe_html;
  // Check if the current source is the live stream (useful for button state)
  const isPlayingLive = hasLiveSource && isPlayingLiveSource;


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
      <div className="w-full max-w-7xl mx-auto aspect-video sm:aspect-auto sm:h-[80vh] bg-black">
        {renderPlayer()}
      </div>

      {/* --- AFFILIATE BANNER PLACEMENT (MAKING ENTIRE BLOCK CLICKABLE) --- */}
      <div className="w-full max-w-7xl mx-auto p-4 bg-gray-950 text-center border-b border-gray-700">
          <div className="relative bg-gray-800 p-4 rounded-xl shadow-lg border border-yellow-500/50">
              
              {/* WRAPPER: Entire promotional block is now wrapped in the affiliate anchor tag */}
              <a
                href={WINFIX_AFFILIATE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center" // Ensure the anchor takes up the full width
              >
                  {/* Banner Image (Now clickable) */}
                  <img
                    src={BANNER_IMAGE_URL} 
                    alt="Claim your bonus"
                    className="w-full object-cover rounded-lg mb-4 border border-gray-700 hover:opacity-90 transition duration-200"
                  />

                  {/* Promotional Title (Still clickable as it's inside the anchor) */}
                  <h2 className="text-lg sm:text-xl font-extrabold text-yellow-300 mb-3">
                    600% BONUS ON 1ST DEPOSIT!
                  </h2>

                  {/* CTA Button (Still clickable, but now relies on the parent anchor tag) */}
                  <div
                    // The button style is now a plain div/span inside the anchor. 
                    // We remove the 'a' tag here as it's redundant and potentially buggy inside another 'a' tag.
                    className={`w-full max-w-sm mx-auto block bg-red-600 text-white py-3 rounded-xl shadow-lg text-base font-bold transition transform hover:scale-[1.02] ${BLINKING_CTA_CLASS}`}
                  >
                    CREATE NEW ID & GET BONUS! HURRY!
                  </div>
              </a>
              {/* END WRAPPER */}
              
              <p className="text-xs text-gray-400 mt-3">
                *Limited time offer. Terms and conditions apply.
              </p>
          </div>
      </div>
      {/* --- END AFFILIATE BANNER --- */}


      {/* Match Details Section */}
      {matchData && (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            
            {/* --- PLAYER SELECTION BUTTONS (LIVE / HIGHLIGHTS) --- */}
            {(matchData.status === 'LIVE' || matchData.status === 'SCHEDULED') && hasLiveSource && (
                <div className="mb-4">
                    <button
                        onClick={handleLiveSelect}
                        disabled={isPlayingLive}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 
                            ${isPlayingLive
                                ? 'bg-red-700 text-white cursor-default' 
                                : 'bg-red-500 hover:bg-red-600 text-white'
                            } ${!hasLiveSource ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <MonitorPlay className="w-4 h-4"/> 
                        {matchData.status === 'LIVE' ? 'Watch Live Now' : 'Stream/Countdown'}
                    </button>
                </div>
            )}
            {/* --- END LIVE BUTTON --- */}


            {/* --- HIGHLIGHT SEGMENTS SECTION (Available if list > 0) --- */}
            {highlightList.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mt-4 mb-3 flex items-center gap-2 border-b border-gray-700 pb-2">
                        <Video className="w-6 h-6 text-green-500"/> Available Highlights
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {highlightList.map((highlight, index) => (
                            <button
                                key={highlight.id}
                                onClick={() => handleHighlightSelect(highlight.highlight_source)}
                                // Button state is controlled by comparing against the full highlight source URL
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition 
                                            ${activeHighlightSource === highlight.highlight_source
                                                ? 'bg-green-600 text-white shadow-lg' 
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                            >
                                {highlight.highlight_title || `Segment ${index + 1}`}
                                {highlight.highlight_type && highlight.highlight_type !== 'FULL' && (
                                    <span className="ml-2 text-xs opacity-70">({highlight.highlight_type.replace('DAY', 'Day ').replace('INNINGS', 'Inn ')})</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {/* --- END HIGHLIGHT SEGMENTS SECTION --- */}


            <h2 className="text-2xl font-bold mt-4 mb-2 flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-red-500"/> Match Summary
            </h2>
            <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-300 font-semibold mb-1">
                    Score: {matchData.team_1} ({matchData.team_1_score || 'N/A'}) vs {matchData.team_2} ({matchData.team_2_score || 'N/A'})
                </p>
                {matchData.status === 'SCHEDULED' && (
                     <p className="text-yellow-400 font-medium flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4"/> Match is scheduled. Stream will begin closer to start time.
                    </p>
                )}
                <p className="text-gray-400 mt-2">{matchData.result_summary}</p>
            </div>
        </div>
      )}
      
    </div>
  );
};

export default LiveStreamPlayer;