import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
// Icons
import { EyeIcon } from "@heroicons/react/24/outline";
import { FaWhatsapp, FaTelegramPlane } from "react-icons/fa";
import { Copy, CornerRightDown, Zap, Film, MonitorPlay, Clock, Sparkles } from "lucide-react"; 
// Context
import { AppContext } from "../context/AppContext";

const Header = () => {
  const { userData, movies = [] } = useContext(AppContext);
  const [copied, setCopied] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState(""); // 🚀 Robust email tracking
  
  // Stories state
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [progress, setProgress] = useState(0);

  // Popup state
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showMemberPopup, setShowMemberPopup] = useState(false);
  const [showBettingPopup, setShowBettingPopup] = useState(false);

  // Mobile tap logic
  const [mobileFocusId, setMobileFocusId] = useState(null); 
  const movieGridRef = useRef(null);
  const navigate = useNavigate();

  // 🔐 Updated Admin Logic
  const adminEmail = "sanjusanjay0444@gmail.com";
  // We check both the context data and the direct session email for safety
  const isAdmin = (userData?.email?.toLowerCase() === adminEmail) || (currentUserEmail?.toLowerCase() === adminEmail);
  
  const siteUrl = "https://www.1anchormovies.live";

  // --- RECENTLY ADDED LOGIC ---
  const latestMovies = useMemo(() => {
    return [...movies]
      .filter((m) => m.showOnHomepage)
      .sort((a, b) => {
        const dateA = new Date(a.homepage_added_at || a.created_at || 0);
        const dateB = new Date(b.homepage_added_at || b.created_at || 0);
        return dateB - dateA;
      })
      .slice(0, 100);
  }, [movies]);
  
  const isMobileView = () => window.innerWidth < 640;

  // Sync session email for admin check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserEmail(session.user.email);
      }
    };
    checkUser();
  }, []);

  const handleClickOutside = useCallback((event) => {
    if (mobileFocusId !== null && isMobileView()) {
        if (movieGridRef.current && !movieGridRef.current.contains(event.target)) {
            setMobileFocusId(null);
        }
    }
  }, [mobileFocusId]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside); 
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleCardClick = (movieId, event) => {
    if (isMobileView()) {
        event.stopPropagation();
        setMobileFocusId(mobileFocusId === movieId ? null : movieId);
    }
  };

  // --- Fetch Stories ---
  useEffect(() => {
    const fetchStories = async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error) setStories(data);
    };
    fetchStories();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  const formatTimeAgo = (timestamp) => {
    const diff = new Date() - new Date(timestamp);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleShareComplete = () => {
      setShowSharePopup(false);
      localStorage.setItem("hasJoinedTelegram", "true");
  };

  return (
    <div className="flex flex-col items-center mt-1 px-4 sm:px-5 w-full bg-gray-950 min-h-screen"> 
      
      {/* STORIES SECTION */}
      {stories.length > 0 && (
        <div className="w-full max-w-7xl mt-4">
          <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 border border-gray-800 shadow-xl">
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-yellow-500"/> Featured Stories
            </h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide py-1">
              {stories.map((story, idx) => (
                <div
                  key={story.id}
                  onClick={() => { setActiveStory(story); setActiveStoryIndex(idx); }}
                  className="flex-shrink-0 flex flex-col items-center group cursor-pointer"
                >
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] transition-transform group-hover:scale-110 ${
                    JSON.parse(localStorage.getItem("viewedStories") || "[]").includes(story.id)
                      ? "bg-gray-700" : "bg-gradient-to-tr from-blue-500 to-cyan-400"
                  }`}>
                    <div className="bg-gray-950 rounded-full w-full h-full p-1 overflow-hidden">
                      <img src={story.poster_url} className="w-full h-full object-cover rounded-full" alt="" />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-2 truncate w-16 text-center">{story.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MOVIE GRID BOX */}
      {latestMovies.length > 0 && (
        <div className="w-full max-w-7xl px-3 sm:px-6 py-6 bg-gray-900/40 rounded-3xl border border-gray-800 my-6 space-y-8">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/10 p-2 rounded-xl">
                <Clock className="w-6 h-6 text-red-500 animate-pulse"/>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Fresh Releases</h2>
                <p className="text-gray-500 text-xs font-medium">Recently updated HD quality movies</p>
              </div>
            </div>
            
            <button 
                onClick={handleCopy}
                className="flex items-center gap-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
            >
                {copied ? "Link Copied!" : "Invite Friends"} <Copy className="w-4 h-4"/>
            </button>
          </div>

          {/* 🔐 PROTECTED ADMIN PANEL LINK - Moved here for high visibility */}
          {isAdmin && (
            <div className="w-full p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-center">
              <Link 
                to="/admin" 
                className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 font-black uppercase italic tracking-tighter transition-all"
                target="_blank" 
                rel="noopener noreferrer" 
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                ACCESS SECURE ADMIN PANEL
              </Link>
            </div>
          )}

          {/* Telegram Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-2xl p-6 border border-blue-500/10 group">
             <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                        <FaTelegramPlane className="text-blue-500 text-2xl" />
                    </div>
                    <div className="text-center sm:text-left">
                        <h3 className="text-white font-bold text-lg">Never miss a movie!</h3>
                        <p className="text-blue-300/60 text-sm">Join our updates for instant HD links.</p>
                    </div>
                </div>
                <a href="https://t.me/anchor2025" className="bg-cyan-500 hover:bg-cyan-400 text-white px-8 py-3 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-cyan-500/20 transition-all flex items-center gap-2">
                    <Zap className="w-4 h-4 fill-white"/> JOIN TELEGRAM
                </a>
             </div>
          </div>

          {/* GRID */}
          <div 
            ref={movieGridRef}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"
          >
            {latestMovies.map((movie) => {
              const isFocused = mobileFocusId === movie.id;
              
              return (
                <div
                  key={movie.id}
                  className="group relative bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 transition-all hover:border-blue-500/50"
                  onClick={(e) => handleCardClick(movie.id, e)}
                >
                  {/* Poster */}
                  <div className="aspect-[2/3] relative overflow-hidden">
                    <img
                      src={movie.poster || movie.poster_url || "/default-poster.jpg"}
                      alt={movie.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-700 ${isFocused ? 'scale-110' : 'group-hover:scale-110'}`}
                    />
                    
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {movie.note && (
                            <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded shadow-xl uppercase">
                                {movie.note}
                            </span>
                        )}
                        <span className="text-[10px] font-black bg-black/60 backdrop-blur-md text-blue-400 px-2 py-0.5 rounded border border-white/10">
                            {formatTimeAgo(movie.homepage_added_at || movie.created_at)}
                        </span>
                    </div>

                    {movie.subCategory && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[9px] font-black bg-red-500 backdrop-blur-md text-white px-2 py-0.5 rounded border border-white/20 shadow-lg uppercase tracking-tighter">
                          {movie.subCategory}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 flex gap-1">
                         {movie.imdb && (
                             <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg">
                                 IMDb {movie.imdb}
                             </span>
                         )}
                    </div>
                  </div>

                  <div className="p-3 text-center">
                    <h2 className="text-xs sm:text-sm font-bold text-gray-200 truncate group-hover:text-blue-400 transition-colors" 
                        style={{ color: movie.linkColor || "" }}>
                      {movie.title}
                    </h2>
                  </div>

                  {/* ACTION OVERLAY */}
                  <div className={`absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 gap-3 transition-all duration-300 ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <Link
                      to={`/movie/${movie.slug}`}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Film className="w-4 h-4" /> DETAILS
                    </Link>
                    {movie.watchUrl && (
                      <a
                        href={movie.watchUrl}
                        className="w-full bg-white text-black text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MonitorPlay className="w-4 h-4" /> WATCH NOW
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full py-12 text-center border-t border-gray-900 mt-12 bg-gray-950/50">
        <div className="flex flex-col items-center gap-4">
          <Link to="/"><img src="/logo_39.png" className="h-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" alt="Logo" /></Link>
          <p className="text-gray-600 text-[10px] tracking-[0.3em] font-bold uppercase">© 1TamilMV & AnchorMovies 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Header;