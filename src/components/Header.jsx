import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
// Icons
import { EyeIcon } from "@heroicons/react/24/outline";
import { FaWhatsapp } from "react-icons/fa";
// Removed: ArrowUp, ArrowDown
import { Copy, CornerRightDown, Zap, Film, MonitorPlay } from "lucide-react"; 
import { FaTelegramPlane } from "react-icons/fa"; 
// Context
import { AppContext } from "../context/AppContext";


const Header = () => {
  const { userData, movies = [], setMovies } = useContext(AppContext);
  const [copied, setCopied] = useState(false);
  
  // Stories state
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [progress, setProgress] = useState(0);
  const storyTimeoutRef = useRef(null);

  // Popup state
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showMemberPopup, setShowMemberPopup] = useState(false);

  // STATE FOR MOBILE TAP-TO-SHOW BEHAVIOR
  const [mobileFocusId, setMobileFocusId] = useState(null); 
  const movieGridRef = useRef(null);

  const [showBettingPopup, setShowBettingPopup] = useState(false);
  const navigate = useNavigate();

  const adminEmail = "sanjusanjay0444@gmail.com";
  const isAdmin = userData?.email?.toLowerCase() === adminEmail.toLowerCase();
  const siteUrl = "https://www.1anchormovies.live";

  // --- Movie Logic ---
  const latestMovies = [...movies]
    .filter((m) => m.showOnHomepage)
    .sort(
      // Sort by homepage_added_at (most recent first)
      (a, b) =>
        new Date(b.homepage_added_at || 0) - new Date(a.homepage_added_at || 0)
    )
    // Updated to show the top 100 movies
    .slice(0, 100);
  
  // --- Mobile Focus Logic ---
  
  const isMobileView = () => window.innerWidth < 640; // Assuming Tailwind's 'sm' breakpoint

  // Handler to close overlay when tapping outside the grid (for mobile)
  const handleClickOutside = useCallback((event) => {
    // Only execute if a card is currently focused AND we are in a mobile view
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

  // Handler for tapping a movie card
  const handleCardClick = (movieId, event) => {
    event.stopPropagation();
    
    // Only apply toggle logic if it's a mobile/touch view
    if (isMobileView()) {
        if (mobileFocusId === movieId) {
            // Tapping the focused card: Unfocus/Hide options
            setMobileFocusId(null); 
        } else {
            // Tapping a new card: Focus/Show options for the new card
            setMobileFocusId(movieId);
        }
    }
    // Desktop hover handles itself via CSS, so we do nothing here for desktop
  };

  // --- Popups Logic (Unchanged) ---
  useEffect(() => {
    if (isAdmin) return;

    const hasShared = localStorage.getItem("hasShared");
    const hasSeenMemberPopup = localStorage.getItem("hasSeenMemberPopup");

    const initialTimer = setTimeout(() => {
      if (!hasShared) {
        setShowSharePopup(true);
      } else if (!hasSeenMemberPopup) {
        setShowMemberPopup(true);
        localStorage.setItem("hasSeenMemberPopup", "true");
      }
    }, 10000); // 10 seconds

    return () => clearTimeout(initialTimer);
  }, [isAdmin]);

  const handleShareComplete = () => {
    localStorage.setItem("hasShared", "true");
    setShowSharePopup(false);
    setTimeout(() => {
        const hasSeenMemberPopup = localStorage.getItem("hasSeenMemberPopup");
        if (!hasSeenMemberPopup) {
            setShowMemberPopup(true);
            localStorage.setItem("hasSeenMemberPopup", "true");
        }
    }, 500); 
  };
    
  // --- Stories Logic (Unchanged) ---
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

  useEffect(() => {
    if (!activeStory) {
        document.body.style.overflow = "";
        return;
    }
    
    document.body.style.overflow = "hidden";

    // Update view count
    const viewed = JSON.parse(localStorage.getItem("viewedStories") || "[]");
    if (!viewed.includes(activeStory.id)) {
      localStorage.setItem("viewedStories", JSON.stringify([...viewed, activeStory.id]));
      supabase
        .from("stories")
        .update({ views: activeStory.views + 1 })
        .eq("id", activeStory.id)
        .then(() => {
          setActiveStory((prev) => ({ ...prev, views: (prev?.views || 0) + 1 }));
        });
    }

    // Progress bar animation (30 seconds)
    setProgress(0);
    const duration = 30000;
    const intervalTime = 100;
    
    const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + (100 / (duration / intervalTime)), 100));
    }, intervalTime);


    // Auto-advance or close after duration
    storyTimeoutRef.current = setTimeout(() => {
      const nextIndex = activeStoryIndex + 1;
      if (nextIndex < stories.length) {
        setActiveStory(stories[nextIndex]);
        setActiveStoryIndex(nextIndex);
      } else {
        setActiveStory(null);
        setActiveStoryIndex(null);
      }
    }, duration);

    return () => {
      clearTimeout(storyTimeoutRef.current);
      clearInterval(progressInterval);
      document.body.style.overflow = "";
    };
  }, [activeStory, activeStoryIndex, stories.length]);

  // Keyboard navigation for stories (Unchanged)
  useEffect(() => {
    const handleKey = (e) => {
      if (!activeStory) return;
      if (e.key === "ArrowLeft" && activeStoryIndex > 0) {
        setActiveStoryIndex(activeStoryIndex - 1);
        setActiveStory(stories[activeStoryIndex - 1]);
      } else if (e.key === "ArrowRight" && activeStoryIndex < stories.length - 1) {
        setActiveStoryIndex(activeStoryIndex + 1);
        setActiveStory(stories[activeStoryIndex + 1]);
      } else if (e.key === "Escape") {
        setActiveStory(null);
        setActiveStoryIndex(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeStory, activeStoryIndex, stories]);

  // --- Utility Functions (Unchanged) ---
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const diffMs = new Date() - new Date(timestamp);
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };
  
  const { 
    title = '', 
    poster_url = '', 
    quality, 
    language, 
    size, 
    genre, 
    imdb, 
    views = 0, 
    created_at = new Date().toISOString() 
  } = activeStory || {};


  return (
    <div className="flex flex-col items-center mt-1 px-5 w-full bg-gray-950 min-h-screen"> 
      {/* ... (Stories Section & Active Story Viewer - Unchanged) ... */}
      {stories.length > 0 && (
        <div className="w-full max-w-7xl px-2 sm:px-4 mt-2">
          <div className="bg-gray-900 rounded-xl shadow-lg p-4 border border-gray-800">
            <h3 className="text-xl font-bold text-white mb-3 border-b border-gray-700 pb-2">🔥 Stories</h3>
            <div className="overflow-x-auto flex gap-4 py-2 scrollbar-hide">
              {stories.map((story, idx) => (
                <div
                  key={story.id}
                  onClick={() => {
                    setActiveStory(story);
                    setActiveStoryIndex(idx);
                  }}
                  className="flex flex-col items-center text-center cursor-pointer min-w-[72px] transition transform hover:scale-105"
                >
                  <div className={`w-20 h-20 rounded-full p-[3px] shadow-lg ${
                    JSON.parse(localStorage.getItem("viewedStories") || "[]").includes(story.id)
                      ? "bg-gray-600" 
                      : "bg-gradient-to-tr from-red-500 to-yellow-500"
                  }`}>
                    <div className="bg-gray-950 rounded-full w-full h-full overflow-hidden">
                      <img
                        loading="lazy"
                        src={story.poster_url}
                        alt={story.title}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 truncate w-[80px] font-medium">{story.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      

      {activeStory && (
        <div
          className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 transition-opacity duration-300"
          onClick={(e) => {
            const x = e.clientX || e.touches?.[0]?.clientX || 0;
            const screenWidth = window.innerWidth;

            if (x > screenWidth * 0.7 && activeStoryIndex < stories.length - 1) {
              const newIndex = activeStoryIndex + 1;
              setActiveStoryIndex(newIndex);
              setActiveStory(stories[newIndex]);
            } else if (x < screenWidth * 0.3 && activeStoryIndex > 0) {
              const newIndex = activeStoryIndex - 1;
              setActiveStoryIndex(newIndex);
              setActiveStory(stories[newIndex]);
            } else {
              setActiveStory(null);
              setActiveStoryIndex(null);
            }
          }}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl font-light z-50 p-2 opacity-80 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setActiveStory(null);
              setActiveStoryIndex(null);
            }}
          >
            &times;
          </button>

          <div className="hidden sm:block">
            {activeStoryIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-5xl z-50 opacity-50 hover:opacity-100 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStoryIndex(activeStoryIndex - 1);
                  setActiveStory(stories[activeStoryIndex - 1]);
                }}
              >
                ‹
              </button>
            )}
            {activeStoryIndex < stories.length - 1 && (
              <button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-5xl z-50 opacity-50 hover:opacity-100 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStoryIndex(activeStoryIndex + 1);
                  setActiveStory(stories[activeStoryIndex + 1]);
                }}
              >
                ›
              </button>
            )}
          </div>

          <div className="max-w-xs w-full relative bg-gray-900 rounded-xl shadow-2xl overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 bg-white/30 rounded overflow-hidden">
                <div
                className="bg-blue-500 h-full origin-left transition-all duration-100"
                style={{ width: `${progress}%` }}
                />
            </div>
            
            <div className="p-4 flex flex-col items-center">
                <p className="text-gray-400 text-xs mt-2">{formatTimeAgo(created_at)}</p>

                <img
                    loading="lazy"
                    src={poster_url}
                    alt={title}
                    className="rounded-lg w-full object-contain shadow-lg mt-3 border border-gray-700"
                    style={{ maxHeight: '40vh' }}
                />

                <h3 className="text-white text-lg mt-3 font-bold text-center">{title}</h3>

                <div className="text-gray-300 text-xs text-center space-y-1 mt-2 w-full border-t border-gray-700 pt-3">
                    {quality && <p className="bg-gray-800 rounded-full px-3 py-1 inline-block mx-1">🎬 {quality}</p>}
                    {language && <p className="bg-gray-800 rounded-full px-3 py-1 inline-block mx-1">🗣️ {language}</p>}
                    {size && <p className="bg-gray-800 rounded-full px-3 py-1 inline-block mx-1">💾 {size}</p>}
                    {genre && <p className="bg-gray-800 rounded-full px-3 py-1 inline-block mx-1">🎭 {genre}</p>}
                    {imdb && <p className="bg-gray-800 rounded-full px-3 py-1 inline-block mx-1">⭐ IMDb: {imdb}</p>}
                </div>

                <p className="text-gray-400 text-xs mt-3 flex items-center justify-center gap-1">
                    <EyeIcon className="w-4 h-4 text-gray-400" />
                    {views} views
                </p>
            </div>
          </div>

        </div>
      )}

{/* Unified Block: Movie List + Telegram + Admin */}
{latestMovies.length > 0 && (
  <div className="w-full max-w-7xl px-4 py-5 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 my-6 space-y-6">

    {/* HEADER SECTION (MODIFIED) - Replaced "Fresh Arrivals" with a simple header and share button */}
    <div className="flex justify-between items-center text-sm text-white border-b border-gray-700 pb-3">
      <div className="flex flex-col">
        {/* NEW TITLE: More generic and less verbose, keeping the accent color */}
        <strong className="text-xl font-extrabold text-white mb-1 flex items-center gap-2">
            <CornerRightDown className="w-6 h-6 text-red-500"/> Latest Releases
        </strong>
        <p className="text-gray-400 text-sm mt-1 font-medium">
          Check out the newest HD downloads here.
        </p>
      </div>
      {/* Share Button (Unchanged) */}
      <div className="relative group ml-2 mt-1">
        <button className="flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-blue-700 transition">
            Share <Copy className="w-3 h-3"/>
        </button>
        <div className="absolute right-0 top-full mt-2 w-40 bg-gray-800 shadow-xl rounded-lg p-1 text-sm text-gray-300 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition duration-200 z-50 border border-gray-700">
          <a
            href={`https://wa.me/?text=${encodeURIComponent("Check out this site: " + siteUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded"
          >
            <FaWhatsapp className="text-green-400"/> WhatsApp
          </a>
          <button
            onClick={handleCopy}
            className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded"
          >
            <Copy className="w-4 h-4 text-gray-400"/> {copied ? "✅ Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>

    {/* Telegram Box Inside (Unchanged) */}
    <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-xl shadow-inner p-4 sm:p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram" className="w-12 h-12" />
        <h2 className="text-xl font-bold text-white">Get Instant Updates!</h2>
        <a
          href="https://t.me/AnchorMovies"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-6 py-2.5 rounded-full shadow-lg transition-all flex items-center gap-2"
        >
          <Zap className="w-5 h-5"/> Join Telegram
        </a>
      </div>
    </div>

    {/* Admin Link (Unchanged) */}
    {isAdmin && (
      <div className="text-center pt-2">
        <Link 
          to="/admin" 
          className="text-red-400 hover:text-red-500 font-bold underline transition"
          target="_blank" 
          rel="noopener noreferrer" 
        >
          <span className="inline-block px-3 py-1 bg-gray-800 rounded-lg shadow-sm border border-red-500/50">
            🔧 Go to Admin Panel
          </span>
        </Link>
      </div>
    )}

    {/* POSTER GRID: Mobile Tap-to-Show Implemented */}
    <div 
      ref={movieGridRef}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4 max-w-7xl mx-auto p-4 bg-gray-800/80 rounded-xl shadow-inner border border-gray-700"
    >
      {latestMovies.map((movie) => {
        const isFocused = mobileFocusId === movie.id;
        
        return (
          <div
            key={movie.id}
            className="group bg-gray-900 rounded-xl shadow-lg hover:shadow-blue-500/30 transition duration-300 overflow-hidden relative border border-gray-700 cursor-pointer"
            onClick={(e) => handleCardClick(movie.id, e)} 
            tabIndex="0" 
            data-focused={isFocused} 
          >
            {/* Poster */}
            <div className="relative w-full aspect-[2/3] overflow-hidden">
              <img
                src={movie.poster || movie.poster_url || "/default-poster.jpg"}
                alt={movie.title}
                className={`w-full h-full object-cover transition duration-500 ${isFocused ? 'scale-105' : 'group-hover:scale-105'}`}
              />
              <div className="absolute top-0 left-0 p-2 space-y-1">
                  {movie.directLinksOnly && (
                      <span className="text-xs font-bold whitespace-nowrap bg-pink-700 text-white px-2 py-0.5 rounded shadow-md">
                      DIRECT
                      </span>
                  )}
                  {movie.note && (
                      <span className="text-xs font-bold whitespace-nowrap bg-red-700 text-white px-2 py-0.5 rounded shadow-md">
                      {movie.note}
                      </span>
                  )}
              </div>
            </div>
            
            {/* Info */}
            <div className="p-3 text-center">
              <h2 
                  className="text-sm font-semibold truncate mb-1 text-gray-200" 
                  style={{ color: movie.linkColor || "#3b82f6" }}
                  title={movie.title}
              >
                {movie.title}
              </h2>
            </div>

            {/* Action Overlay: Uses isFocused state for visibility on mobile */}
            <div 
              className={`absolute inset-0 flex items-center justify-center bg-black/70 transition-opacity duration-300
                          ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <div className="flex flex-col gap-2 w-3/4">
                  
                  {/* Details Button */}
                  <Link
                      to={`/movie/${movie.slug}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-full font-medium transition flex items-center justify-center gap-2 w-full"
                      onClick={(e) => { e.stopPropagation(); setMobileFocusId(null); }} 
                  >
                      <Film className="w-4 h-4" /> Download
                  </Link>
                  
                  {/* Watch Now Button (if link exists) */}
                  {movie.watchUrl && (
                      <a
                          href={movie.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-full font-medium transition flex items-center justify-center gap-2 w-full"
                          onClick={(e) => { e.stopPropagation(); setMobileFocusId(null); }} 
                      >
                          <MonitorPlay className="w-4 h-4" /> Watch Now
                      </a>
                  )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)}

      {/* Footer (Dark themed, Unchanged) */}
<div className="w-full py-6 mt-12 text-center border-t border-gray-800 text-sm bg-gray-950">
  <p className="flex justify-center items-center gap-2 text-gray-500">
    <span className="text-white text-lg font-bold">©</span>
    <span className="text-gray-300 font-medium">AnchorMovies 2025</span>
  </p>
</div>

{/* Popups (Unchanged) */}
{showSharePopup && (
  <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center px-4">
    <div className="text-white text-center animate-fadeIn relative w-full max-w-sm bg-gray-900 p-6 rounded-xl shadow-2xl border border-blue-600/50">
      <h2 className="text-2xl font-extrabold mb-2 text-blue-400">🚨 Important Step!</h2>
      <p className="text-sm text-gray-300 mb-6">
        To continue and access the site, you **must join our Telegram Channel** for updates and support.
      </p>

      <div className="flex justify-center gap-4 mb-6">
        <a
          href="https://t.me/AnchorMovies" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 text-sm font-semibold transition transform hover:scale-[1.05]"
          onClick={handleShareComplete}
        >
          <FaTelegramPlane className="text-xl" /> Must Click & Join Our Channel
        </a>
      </div>

      <button
        onClick={handleShareComplete}
        className="w-full bg-blue-700 text-white py-2 rounded-lg hover:bg-blue-800 text-sm font-semibold"
      >
        I have successfully joined the Channel
      </button>
    </div>
  </div>
)}

{showMemberPopup && (
  <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center px-4">
    <div className="text-white text-center animate-fadeIn relative w-full max-w-sm bg-gray-900 p-6 rounded-xl shadow-2xl border border-yellow-500/50">
      <h2 className="2xl font-extrabold mb-2 text-yellow-400">🎉 Become a Free Member!</h2>
      <p className="text-sm text-gray-300 mb-6">
        Apply now to enjoy **ad-free viewing** and **exclusive download links**. Login is mandatory.
      </p>

      <button
        onClick={() => {
          setShowMemberPopup(false);
          if (userData) {
            navigate("/profile");
          } else {
            navigate("/login");
          }
        }}
        className="w-full bg-yellow-600 text-black px-5 py-2 rounded-lg hover:bg-yellow-500 text-sm font-bold mb-3 transition transform hover:scale-[1.02]"
      >
        Apply Now
      </button>

      <button
        onClick={() => {
            setShowMemberPopup(false);
            localStorage.setItem("hasSeenMemberPopup", "true");
        }}
        className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 text-sm font-medium"
      >
        No, thanks
      </button>
    </div>
  </div>
)}


{showBettingPopup && (
  <div className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center px-4">
    <div className="text-white text-center animate-fadeIn relative w-full max-w-sm sm:max-w-md bg-gray-950 p-4 rounded-xl shadow-2xl border border-yellow-400/50">
      
      {/* Close Button */}
      <button
        onClick={() => setShowBettingPopup(false)}
        className="absolute top-2 right-4 text-gray-400 text-3xl font-light hover:text-white transition"
      >
        &times;
      </button>

      {/* Banner Image */}
      {/* Ensure 'banner.jpg' is in your public directory */}
      <img
        src="/banner.jpg" 
        alt="Promotional Banner"
        className="w-full object-cover rounded-lg mb-4 border border-gray-700"
      />

      {/* Promotional Title */}
      <h2 className="text-xl sm:text-2xl font-extrabold text-yellow-300 mb-4">
        CLAIM YOUR BONUS NOW!
      </h2>

      {/* Call to Action Button with Affiliate Link */}
      <a
        href="https://winfix.fun/register?campaignId=anchormovies-2407" 
        target="_blank"
        rel="noopener noreferrer"
        // Using standard Tailwind classes for a pulsating (blinking) effect
        className="w-full block bg-red-600 text-white py-3 rounded-xl shadow-lg hover:bg-red-700 text-base sm:text-lg font-bold transition transform hover:scale-[1.02] animate-pulse duration-700"
        onClick={() => {
          // Close the popup after clicking the button
          setShowBettingPopup(false); 
        }}
      >
        CREATE NEW ID & GET 600% BONUS ON 1ST DEPOSIT! HURRY!
      </a>
      
      <p className="text-xs text-gray-400 mt-3">
        *Terms and conditions apply.
      </p>

    </div>
  </div>
)}


    </div>
  );
};
export default Header;