import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
// Icons
import { EyeIcon } from "@heroicons/react/24/outline";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { Copy, CornerRightDown, Zap } from "lucide-react"; // Added Lucide icons for modern look
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

  const navigate = useNavigate();

  const adminEmail = "sanjusanjay0444@gmail.com";
  const isAdmin = userData?.email?.toLowerCase() === adminEmail.toLowerCase();
  const siteUrl = "https://www.1anchormovies.live";

  // --- Movie Logic ---
  const latestMovies = [...movies]
    .filter((m) => m.showOnHomepage)
    .sort(
      (a, b) =>
        new Date(b.homepage_added_at || 0) - new Date(a.homepage_added_at || 0)
    )
    .slice(0, 60);

  // Helper function for admin reorder (currently not used in return, kept for context)
  // const moveMovie = (index, direction) => {
  //   const newMovies = [...latestMovies];
  //   const targetIndex = index + direction;
  //   if (targetIndex < 0 || targetIndex >= newMovies.length) return;
  //   [newMovies[index], newMovies[targetIndex]] = [
  //     newMovies[targetIndex],
  //     newMovies[index],
  //   ];
  //   setMovies(newMovies); // update global context
  // };

  // --- Popups Logic ---
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

  // Handler to smoothly transition from share to member popup
  const handleShareComplete = () => {
    localStorage.setItem("hasShared", "true");
    setShowSharePopup(false);
    // Use a small delay for better UX before showing the next popup
    setTimeout(() => {
        const hasSeenMemberPopup = localStorage.getItem("hasSeenMemberPopup");
        if (!hasSeenMemberPopup) {
            setShowMemberPopup(true);
            localStorage.setItem("hasSeenMemberPopup", "true");
        }
    }, 500); 
  };
    
  // --- Stories Logic ---
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
    const steps = duration / intervalTime;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
        currentStep++;
        setProgress(Math.min((currentStep / steps) * 100, 100));
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

  // Keyboard navigation for stories
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

  // --- Utility Functions ---
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
  
  // Destructure activeStory for cleaner JSX
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
    <div className="flex flex-col items-center mt-1 px-5 w-full">
      {/* Stories Section */}
      {stories.length > 0 && (
        <div className="w-full max-w-7xl px-2 sm:px-4 mt-2">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">🔥 Stories</h3>
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
                      ? "bg-gray-400"
                      : "bg-gradient-to-tr from-red-500 to-yellow-500"
                  }`}>
                    <div className="bg-white rounded-full w-full h-full overflow-hidden">
                      <img
                        loading="lazy"
                        src={story.poster_url}
                        alt={story.title}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-800 mt-1 truncate w-[80px] font-medium">{story.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      

      {/* Active Story Viewer */}
      {activeStory && (
        <div
          className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 transition-opacity duration-300"
          onClick={(e) => {
            // Tap/Click to advance logic
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
              // Tap center to close
              setActiveStory(null);
              setActiveStoryIndex(null);
            }
          }}
        >
          {/* Close Button */}
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

          {/* Navigation Arrows (for desktop) */}
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

          {/* Content Container */}
          <div className="max-w-xs w-full relative bg-gray-900 rounded-xl shadow-2xl overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            {/* Progress Bar */}
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

{/* Unified Block: Recently Uploaded + Telegram + Admin + Movie List */}
{latestMovies.length > 0 && (
  <div className="w-full max-w-7xl px-4 py-5 bg-white rounded-xl shadow-2xl border border-gray-200 my-6 space-y-6">

    {/* Recently Uploaded Header + Share */}
    <div className="flex justify-between items-center text-sm text-black border-b pb-3">
      <div className="flex flex-col">
        <strong className="text-xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
            <CornerRightDown className="w-6 h-6 text-red-600"/> Fresh Arrivals! Don't Miss Out
        </strong>
        <p className="text-gray-700 text-sm mt-1 font-medium">
          **Grab the newest HD downloads here.** Can't find an older title? Check out the <span className="text-blue-600 font-bold">Search</span> or <span className="text-blue-600 font-bold">Categories</span> to explore our full library!
        </p>
      </div>
      {/* Share Button (unchanged) */}

      {/* Share Button (Cleaned up hover menu) */}
      <div className="relative group ml-2 mt-1">
        <button className="flex items-center gap-1 bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-blue-600 transition">
            Share <Copy className="w-3 h-3"/>
        </button>
        <div className="absolute right-0 top-full mt-2 w-40 bg-white shadow-xl rounded-lg p-1 text-sm text-gray-800 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition duration-200 z-50">
          <a
            href={`https://wa.me/?text=${encodeURIComponent("Check out this site: " + siteUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded"
          >
            <FaWhatsapp className="text-green-500"/> WhatsApp
          </a>
          <button
            onClick={handleCopy}
            className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded"
          >
            <Copy className="w-4 h-4 text-gray-600"/> {copied ? "✅ Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>

    {/* Telegram Box Inside */}
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

    {/* Admin Link */}
    {isAdmin && (
      <div className="text-center pt-2">
        <Link 
          to="/admin" 
          className="text-red-500 hover:text-red-600 font-bold underline transition"
          target="_blank" // <--- Add this attribute
          rel="noopener noreferrer" // <--- It's best practice to add this too
        >
          <span className="inline-block px-3 py-1 bg-red-50 rounded-lg shadow-sm">
            🔧 Go to Admin Panel
          </span>
        </Link>
      </div>
    )}

    {/* Movie List */}
    <div className="flex flex-col gap-1 mt-4 border border-gray-200 rounded-lg overflow-hidden">
      {latestMovies.map((movie) => (
        <div
          key={movie.id}
          className="flex items-center justify-between text-black text-sm bg-white hover:bg-gray-50 transition p-3 border-b border-gray-100 last:border-b-0"
        >
          <div className="flex-1 min-w-0">
            <Link
              to={`/movie/${movie.slug}`}
              className="font-medium break-words whitespace-normal text-base hover:underline"
              style={{ color: movie.linkColor || "#1d4ed8" }}
              title={movie.title}
            >
              {movie.title}
            </Link>

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
              {movie.directLinksOnly && (
                <span className="text-pink-600 font-bold whitespace-nowrap bg-pink-50 px-2 py-0.5 rounded">
                  [Direct Links]
                </span>
              )}
              {movie.watchUrl && (
                <a
                  href={movie.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 font-bold whitespace-nowrap hover:text-blue-500 transition"
                >
                  - [WATCH]
                </a>
              )}
              {movie.note ? (
                <span className="text-red-600 font-bold whitespace-nowrap bg-red-50 px-2 py-0.5 rounded">
                  - {movie.note}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

      {/* Footer */}
<div className="w-full py-6 mt-12 text-center border-t border-gray-200 text-sm">
  <p className="flex justify-center items-center gap-2 text-gray-500">
    <span className="text-gray-800 text-lg font-bold">©</span>
    <span className="text-gray-800 font-medium">AnchorMovies 2025</span>
  </p>
</div>

{/* --- Popups --- */}

{/* Share Popup (Modified for Mandatory Telegram Join) */}
{showSharePopup && (
  <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center px-4">
    <div className="text-white text-center animate-fadeIn relative w-full max-w-sm bg-gray-900 p-6 rounded-xl shadow-2xl border border-blue-600/50">
      <h2 className="text-2xl font-extrabold mb-2 text-blue-400">🚨 Important Step!</h2>
      <p className="text-sm text-gray-300 mb-6">
        To continue and access the site, you **must join our Telegram Channel** for updates and support.
      </p>

      <div className="flex justify-center gap-4 mb-6">
        <a
          // Link updated to your specified Telegram channel
          href="https://t.me/AnchorMovies" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 text-sm font-semibold transition transform hover:scale-[1.05]"
          onClick={handleShareComplete} // Closes the popup and continues
        >
          {/* Ensure FaTelegramPlane is imported */}
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

{/* Membership Popup (Unchanged) */}
{showMemberPopup && (
  <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center px-4">
    <div className="text-white text-center animate-fadeIn relative w-full max-w-sm bg-gray-900 p-6 rounded-xl shadow-2xl border border-yellow-500/50">
      <h2 className="text-2xl font-extrabold mb-2 text-yellow-400">🎉 Become a Free Member!</h2>
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
            localStorage.setItem("hasSeenMemberPopup", "true"); // Re-set to prevent showing on next load
        }}
        className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 text-sm font-medium"
      >
        No, thanks
      </button>
    </div>
  </div>
)}


    </div>
  );
};
export default Header;