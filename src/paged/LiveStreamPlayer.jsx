// src/pages/LiveStreamPlayer.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; 
import { MonitorPlay, Zap, ArrowLeft, Loader2, Video, Clock, Trophy, Share2, Info, Play } from "lucide-react"; 
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient'; 
import VideoPlayer from "./VideoPlayer"; 

const WINFIX_AFFILIATE_LINK = "https://winfix.fun/register?campaignId=anchormovies-2407";
const BANNER_IMAGE_URL = "https://i.postimg.cc/NfKD2cjX/banner.jpg";

const LiveStreamPlayer = () => {
  const { slug } = useParams(); 
  const navigate = useNavigate();
  
  const [matchData, setMatchData] = useState(null); 
  const [highlightList, setHighlightList] = useState([]); 
  const [activeHighlightSource, setActiveHighlightSource] = useState(null); 
  const [isSwitching, setIsSwitching] = useState(false); // NEW: Transition guard
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
        setError("Invalid match link.");
        setLoading(false);
        return;
    }

    const fetchMatchAndHighlights = async () => {
        setLoading(true);
        try {
            const { data: match, error: matchError } = await supabase
                .from('live_matches')
                .select('*')
                .eq('link_slug', slug)
                .single();

            if (matchError || !match) {
                setError("Stream currently unavailable.");
                setLoading(false);
                return;
            }

            setMatchData(match);
            let initialSource = match.hls_url || match.iframe_html;
            
            const { data: highlights } = await supabase
                .from('match_highlights')
                .select('*')
                .eq('match_id', match.id)
                .order('created_at', { ascending: true });

            if (highlights) {
                setHighlightList(highlights);
                if (match.status === 'ENDED' && highlights.length > 0) {
                     initialSource = highlights[0].highlight_source;
                }
            }
            
            setActiveHighlightSource(initialSource);
        } catch (err) {
            setError("Connection error.");
        } finally {
            setLoading(false);
        }
    };

    fetchMatchAndHighlights();
  }, [slug]);

  // SAFE SWITCHER: Prevents white screens by cleaning up state before changing source
  const handleSourceSelect = useCallback((source) => {
    if (!source || source === activeHighlightSource) return;
    
    setIsSwitching(true);
    setActiveHighlightSource(source);
    
    // Smooth transition to allow React to unmount old instance
    setTimeout(() => {
        setIsSwitching(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, [activeHighlightSource]);

  const playerOverlayData = useMemo(() => {
    if (!matchData) return { title: 'Stream Player', slug: slug };
    return {
      title: matchData.title,
      slug: matchData.link_slug,
      overview: matchData.result_summary,
      genres: [matchData.sport, matchData.league],
    };
  }, [matchData, slug]);

  const renderPlayer = () => {
    if (loading || isSwitching) return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-950">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.3em]">
                {isSwitching ? "Syncing Stream..." : "Connecting to Server"}
            </p>
        </div>
    );

    const isIFrame = activeHighlightSource?.trim().startsWith('<iframe');
    const isPlayingLive = matchData?.status === 'LIVE' && (activeHighlightSource === matchData?.hls_url || activeHighlightSource === matchData?.iframe_html);

    if (isIFrame) {
      return (
        <div className="w-full h-full relative group bg-black" key={activeHighlightSource}>
          <div className="absolute inset-0 w-full h-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: activeHighlightSource }} />
          {isPlayingLive && (
             <div className="absolute top-4 left-4 pointer-events-none z-20">
                <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-2xl animate-pulse">
                    <Zap size={10} fill="white" /> LIVE
                </span>
             </div>
          )}
        </div>
      );
    }
    
    if (activeHighlightSource) {
        return (
            <div className="w-full h-full" key={activeHighlightSource}>
                <VideoPlayer 
                    src={activeHighlightSource} 
                    title={playerOverlayData.title}
                    playerOverlayData={playerOverlayData}
                    isLive={isPlayingLive} 
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 border-2 border-dashed border-gray-800 rounded-3xl m-4">
            <Clock className="w-12 h-12 text-gray-700 mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Waiting for Broadcast</p>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-500/30">
      
      {/* Cinematic Header */}
      <header className="bg-gray-950/80 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/live-cricket')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all">
                    <ArrowLeft size={20} className="text-blue-500" />
                </button>
                <div>
                    <h1 className="text-sm sm:text-lg font-black uppercase tracking-tighter leading-none">
                        {matchData?.title || 'Live Stream'}
                    </h1>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        {matchData?.league || 'International'} • Stream 01
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => {navigator.clipboard.writeText(window.location.href); toast.success("Share link copied!");}} className="p-2 bg-white/5 rounded-full hover:text-blue-400 transition-colors">
                    <Share2 size={18} />
                </button>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${matchData?.status === 'LIVE' ? 'bg-red-600/10 border-red-500 text-red-500 animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                    {matchData?.status || 'Offline'}
                </span>
            </div>
        </div>
      </header>

      {/* Main Player Section */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 space-y-6">
        
        {/* Scoreboard Element */}
        {matchData?.status === 'LIVE' && (
            <div className="mx-4 bg-gray-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
                <div className="flex-1 flex justify-center items-center gap-4">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-tighter text-right w-1/3">{matchData.team_1}</span>
                    <span className="text-xl sm:text-3xl font-black text-blue-500 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">{matchData.team_1_score || '0'}</span>
                </div>
                <div className="px-4 text-[10px] font-black text-gray-600 uppercase">VS</div>
                <div className="flex-1 flex justify-center items-center gap-4">
                    <span className="text-xl sm:text-3xl font-black text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">{matchData.team_2_score || '0'}</span>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-tighter text-left w-1/3">{matchData.team_2}</span>
                </div>
            </div>
        )}

        <div className="relative w-full aspect-video sm:rounded-3xl overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 ring-1 ring-white/10">
          {renderPlayer()}
        </div>

        {/* Affiliate Block */}
        <div className="mx-4">
            <a href={WINFIX_AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="group block relative overflow-hidden bg-gray-900 border border-yellow-500/30 rounded-3xl p-6 shadow-2xl transition-all hover:border-yellow-500">
                <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[10px] font-black px-4 py-1 rounded-br-2xl uppercase tracking-widest z-10 shadow-lg">
                    Premium Offer
                </div>
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-full md:w-64 h-32 relative overflow-hidden rounded-2xl border border-white/10 shadow-lg">
                        <img src={BANNER_IMAGE_URL} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Promo" />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-yellow-400">
                            Claim 600% Welcome Bonus
                        </h2>
                        <div className="bg-red-600 group-hover:bg-red-500 text-white font-black py-3 rounded-2xl text-center text-sm shadow-xl shadow-red-600/20 animate-pulse transition-all">
                            CREATE NEW ID & GET BONUS NOW!
                        </div>
                    </div>
                </div>
            </a>
        </div>

        {/* Controls & Summary */}
        <div className="mx-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Highlights Column */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Video size={16} />
                    </div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Match Highlights</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* BUTTON TO RETURN TO LIVE STREAM */}
                    {(matchData?.hls_url || matchData?.iframe_html) && (
                        <button
                            onClick={() => handleSourceSelect(matchData.hls_url || matchData.iframe_html)}
                            className={`p-4 rounded-2xl flex items-center justify-between text-left transition-all border ${activeHighlightSource === (matchData.hls_url || matchData.iframe_html) ? 'bg-red-600 border-red-400 shadow-xl' : 'bg-gray-900/50 border-white/5 hover:bg-gray-800'}`}
                        >
                            <div className="flex items-center gap-4">
                                <Zap size={14} className={activeHighlightSource === (matchData.hls_url || matchData.iframe_html) ? 'text-white' : 'text-red-500'} />
                                <span className="text-xs font-black uppercase">Live Feed</span>
                            </div>
                            <span className="text-[8px] font-black opacity-60 uppercase">Real-Time</span>
                        </button>
                    )}

                    {highlightList.map((highlight, idx) => (
                        <button
                            key={highlight.id}
                            onClick={() => handleSourceSelect(highlight.highlight_source)}
                            className={`p-4 rounded-2xl flex items-center justify-between text-left transition-all border ${activeHighlightSource === highlight.highlight_source ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-gray-900/50 border-white/5 hover:bg-gray-800'}`}
                        >
                            <div className="flex items-center gap-4 overflow-hidden">
                                <Play size={14} className={activeHighlightSource === highlight.highlight_source ? 'text-white' : 'text-blue-500'} fill="currentColor" />
                                <span className="text-xs font-bold truncate">{highlight.highlight_title || `Segment ${idx + 1}`}</span>
                            </div>
                            <span className="text-[9px] font-black opacity-40 uppercase tracking-tighter ml-2">
                                {highlight.highlight_type || 'Clip'}
                            </span>
                        </button>
                    ))}
                    
                    {highlightList.length === 0 && (
                        <p className="text-gray-600 text-xs font-bold italic p-4 bg-gray-900/30 rounded-2xl border border-dashed border-gray-800 col-span-full">
                            Highlights will appear here during/after the match.
                        </p>
                    )}
                </div>
            </div>

            {/* Summary Column */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center">
                        <Info size={16} />
                    </div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Match Information</h2>
                </div>
                
                <div className="bg-gray-900/50 rounded-3xl p-6 border border-white/5 space-y-4 shadow-xl">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Current Summary</p>
                        <p className="text-sm font-bold text-blue-400 leading-relaxed">{matchData?.result_summary || 'Toss coming soon...'}</p>
                    </div>
                    <div className="space-y-1 pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Competition</p>
                        <p className="text-sm font-bold">{matchData?.sport} • {matchData?.league}</p>
                    </div>
                </div>
            </div>
        </div>
      </main>

      <footer className="mt-20 py-10 border-t border-white/5 text-center bg-black/30">
          <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.6em]">Premium Sports Streaming • AnchorMovies 2025</p>
      </footer>
    </div>
  );
};

export default LiveStreamPlayer;