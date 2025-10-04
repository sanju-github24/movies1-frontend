import React, { useContext, useState, useEffect, useRef } from "react";
import { AppContext } from "../context/AppContext";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { EyeIcon } from "@heroicons/react/24/outline";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { useNavigate } from "react-router-dom";


const Header = () => {
  const { userData, movies = [], setMovies } = useContext(AppContext);
  const [copied, setCopied] = useState(false);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [progress, setProgress] = useState(0);
  const storyTimeoutRef = useRef(null);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showMemberPopup, setShowMemberPopup] = useState(false);

  const navigate = useNavigate();

  const adminEmail = "sanjusanjay0444@gmail.com";
  const isAdmin = userData?.email?.toLowerCase() === adminEmail.toLowerCase();
  const siteUrl = "https://www.1anchormovies.live";

  // Admin’s own uploads
  const latestAdminMovies = isAdmin
    ? movies
        .filter((m) => (m.uploaded_by || "").toLowerCase() === adminEmail.toLowerCase())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
    : [];

  // Homepage movies
  const latestMovies = [...movies]
    .filter((m) => m.showOnHomepage)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 60);

  // ✅ Reorder helper (admin only)
  const moveMovie = (index, direction) => {
    const newMovies = [...latestMovies];
    const targetIndex = index + direction;

    // prevent out-of-bounds
    if (targetIndex < 0 || targetIndex >= newMovies.length) return;

    // swap movies
    [newMovies[index], newMovies[targetIndex]] = [
      newMovies[targetIndex],
      newMovies[index],
    ];

    setMovies(newMovies); // update global context
  };

  // Popup logic (skip for admin)
  useEffect(() => {
    if (isAdmin) return;

    const hasShared = localStorage.getItem("hasShared");
    const hasSeenMemberPopup = localStorage.getItem("hasSeenMemberPopup");

    const timer = setTimeout(() => {
      if (!hasShared) {
        setShowSharePopup(true);
      } else if (!hasSeenMemberPopup) {
        setShowMemberPopup(true);
        localStorage.setItem("hasSeenMemberPopup", "true");
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [isAdmin]);
    
    
     // Handle share click
  const handleShareClick = () => {
    localStorage.setItem("sharedOnce", "true");
    setShowSharePopup(false);
  };

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
    const timer = setTimeout(() => {
      setShowSharePopup(true);
    }, 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, []);
  

  useEffect(() => {
    if (!activeStory) return;
    document.body.style.overflow = "hidden";

    const viewed = JSON.parse(localStorage.getItem("viewedStories") || "[]");
    if (!viewed.includes(activeStory.id)) {
      localStorage.setItem("viewedStories", JSON.stringify([...viewed, activeStory.id]));
      supabase
        .from("stories")
        .update({ views: activeStory.views + 1 })
        .eq("id", activeStory.id)
        .then(() => {
          setActiveStory((prev) => ({ ...prev, views: prev.views + 1 }));
        });
    }

    setProgress(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      setProgress(Math.min((diff / 30000) * 100, 100));
    }, 100);

    storyTimeoutRef.current = setTimeout(() => {
      const nextIndex = activeStoryIndex + 1;
      if (nextIndex < stories.length) {
        setActiveStory(stories[nextIndex]);
        setActiveStoryIndex(nextIndex);
      } else {
        setActiveStory(null);
        setActiveStoryIndex(null);
      }
    }, 30000);

    return () => {
      clearTimeout(storyTimeoutRef.current);
      clearInterval(interval);
      document.body.style.overflow = "";
    };
  }, [activeStory]);

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
  }, [activeStory, activeStoryIndex]);

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
    const now = new Date();
    const uploaded = new Date(timestamp);
    const diffMs = now - uploaded;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex flex-col items-center mt-1 px-5 w-full">
      {/* Stories */}
      {stories.length > 0 && (
        <div className="w-full max-w-7xl px-2 sm:px-4 mt-2">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-lg font-semibold text-black mb-3">Stories</h3>
            <div className="overflow-x-auto flex gap-4 py-2 scrollbar-hide">
              {stories.map((story, idx) => (
                <div
                  key={story.id}
                  onClick={() => {
                    setActiveStory(story);
                    setActiveStoryIndex(idx);
                  }}
                  className="flex flex-col items-center text-center cursor-pointer min-w-[72px]"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 p-1 shadow-lg">
                    <div className="bg-white rounded-full w-full h-full overflow-hidden">
                      <img
                        loading="lazy"
                        src={story.poster_url}
                        alt={story.title}
                        className="w-full h-full object-cover rounded-full"
                        
                      />
            
                    </div>
                  </div>
                  <p className="text-xs text-gray-800 mt-1 truncate w-23 font-medium">{story.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      

      {/* Active Story Viewer */}
      {activeStory && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50"
          onClick={(e) => {
            const x = e.clientX || e.touches?.[0]?.clientX || 0;
            const screenWidth = window.innerWidth;
            if (x > screenWidth / 2 && activeStoryIndex < stories.length - 1) {
              const newIndex = activeStoryIndex + 1;
              setActiveStoryIndex(newIndex);
              setActiveStory(stories[newIndex]);
            } else {
              setActiveStory(null);
              setActiveStoryIndex(null);
            }
          }}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold z-50"
            onClick={(e) => {
              e.stopPropagation();
              setActiveStory(null);
              setActiveStoryIndex(null);
            }}
          >
            ✖️
          </button>

          {/* Arrows */}
          {activeStoryIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl z-50"
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = activeStoryIndex - 1;
                setActiveStoryIndex(newIndex);
                setActiveStory(stories[newIndex]);
              }}
            >
              ‹
            </button>
          )}
          {activeStoryIndex < stories.length - 1 && (
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl z-50"
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = activeStoryIndex + 1;
                setActiveStoryIndex(newIndex);
                setActiveStory(stories[newIndex]);
              }}
            >
              ›
            </button>
          )}

          {/* Content */}
<div className="max-w-xs w-full p-4 relative animate-fadeIn">
  <div className="absolute top-0 left-0 w-full h-1 bg-white/30 rounded overflow-hidden">
    <div
      className="bg-blue-500 h-full origin-left transition-all duration-100"
      style={{ width: `${progress}%` }}
    />
  </div>

  <p className="text-gray-400 text-center text-xs mt-1">{formatTimeAgo(activeStory.created_at)}</p>

  <img
    loading="lazy"
    src={activeStory.poster_url}
    alt={activeStory.title}
    className="rounded-lg w-full object-contain shadow-lg mt-3"
    onClick={(e) => e.stopPropagation()}
  />

  <p className="text-white text-center mt-3 font-semibold">{activeStory.title}</p>

  <div className="text-gray-300 text-xxs text-center space-y-1 mt-2">
    {activeStory.quality && <p>{activeStory.quality}</p>}
    {activeStory.language && <p>{activeStory.language}</p>}
    {activeStory.size && <p>{activeStory.size}</p>}
    {activeStory.genre && <p>{activeStory.genre}</p>}
    {activeStory.imdb && <p>{activeStory.imdb}</p>}
  </div>

  <p className="text-gray-400 text-center text-xs mt-2 flex items-center justify-center gap-1">
    <EyeIcon className="w-4 h-4 text-gray-400" />
    {activeStory.views || 0} views
  </p>
</div>

        </div>
      )}
{/* Unified Block: Recently Uploaded + Telegram + Admin + Movie List */}
{latestMovies.length > 0 && (
  <div className="w-full max-w-7xl px-4 py-4 bg-white rounded-xl shadow-md border border-gray-200 my-6 space-y-4">

    {/* Recently Uploaded Header + Share */}
    <div className="flex justify-between items-start text-sm text-black">
      <div>
        <strong className="block text-sm font-semibold mb-1">🆕 Recently Uploaded</strong>
        <p className="text-gray-700 text-xs">
          Use <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">🔍 Search</span> or{" "}
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">📂 Categories</span> to explore.
        </p>
      </div>

      {/* Share Button */}
      <div className="relative group ml-2 mt-1">
        <img
          src="/share.png"
          alt="Share"
          className="w-7 h-7 sm:w-8 sm:h-8 cursor-pointer hover:opacity-80 transition"
        />
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md p-2 text-sm text-black opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition duration-200 z-50">
          <a
            href={`https://wa.me/?text=${encodeURIComponent("Check out this site: " + siteUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 hover:bg-gray-100 rounded"
          >
            WhatsApp
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 hover:bg-gray-100 rounded"
          >
            Instagram
          </a>
          <button
            onClick={handleCopy}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
          >
            {copied ? "✅ Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>

    {/* Telegram Box Inside */}
    <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow p-4 sm:p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram" className="w-14 h-14" />
        <h2 className="text-xl font-semibold text-white">Join Our Telegram Channel</h2>
        <a
          href="https://t.me/AnchorMovies"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2.5 rounded-full shadow transition-all"
        >
          Join on Telegram
        </a>
      </div>
    </div>

    {/* Admin Link */}
    {isAdmin && (
      <div className="mb-2 text-center">
        <Link to="/admin" className="text-yellow-500 hover:text-yellow-400 font-semibold underline">
          🔧 Go to Admin Panel
        </Link>
      </div>
    )}

;

<div className="flex flex-col gap-2 mt-1">
  {latestMovies.map((movie) => (
    <div
      key={movie.id}
      className="flex items-center justify-between text-black text-sm bg-gray-50 p-1 rounded"
    >
      <div>
        <Link
          to={`/movie/${movie.slug}`}
          className="font-medium break-words whitespace-normal"
          style={{ color: movie.linkColor || "#1d4ed8" }}
          title={movie.title}
        >
          {movie.title}
          {movie.directLinksOnly && (
            <span className="ml-2 text-pink-500 font-bold text-xs whitespace-nowrap">
              [Direct Links]
            </span>
          )}
        </Link>

        {movie.watchUrl && (
  <a
    href={movie.watchUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="ml-2 text-gray-600 font-bold text-xs whitespace-nowrap"
  >
    - [WATCH]
  </a>
)}
{movie.note ? (
  <span className="ml-2 text-red-600 font-bold text-xs whitespace-nowrap">
    - {movie.note}
  </span>
) : null}



      </div>
    </div>
  ))}
</div>




  </div>
)}

      {/* Footer */}
<div className="w-full py-6 mt-12 text-center border-t border-gray-200 text-sm">
  <p className="flex justify-center items-center gap-2">
    <span className="text-black text-base font-bold">©</span>
    <span className="text-black font-medium">AnchorMovies 2025</span>
  </p>
</div>
{/* Share Popup */}
{showSharePopup && (
  <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center px-4">
    <div className="text-white text-center animate-fadeIn relative w-full max-w-sm bg-gray-900 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-2">Enjoying AnchorMovies?</h2>
      <p className="text-sm text-gray-200 mb-6">
        To continue using the website, please share our link. 💙
      </p>

      <div className="flex justify-center gap-3 mb-6">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            "Check out AnchorMovies: " + siteUrl
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm"
          onClick={() => {
            localStorage.setItem("hasShared", "true");
            setShowSharePopup(false);
            setTimeout(() => setShowMemberPopup(true), 2000);
          }}
        >
          <FaWhatsapp className="text-lg" /> WhatsApp
        </a>

        <a
          href={`https://www.instagram.com/?url=${encodeURIComponent(siteUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 text-sm"
          onClick={() => {
            localStorage.setItem("hasShared", "true");
            setShowSharePopup(false);
            setTimeout(() => setShowMemberPopup(true), 2000);
          }}
        >
          <FaInstagram className="text-lg" /> Instagram
        </a>
      </div>

      <button
        onClick={() => {
          setShowSharePopup(false);
          setTimeout(() => setShowMemberPopup(true), 2000);
        }}
        className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400 text-sm font-medium"
      >
        I Know
      </button>
    </div>
  </div>
)}

{/* Membership Popup */}
{showMemberPopup && (
  <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center px-4">
    <div className="text-white text-center animate-fadeIn relative w-full max-w-sm bg-gray-900 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-2">🎉 Become a Member for Free!</h2>
      <p className="text-sm text-gray-200 mb-6">
        Apply now and enjoy exclusive perks. Login is mandatory.
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
        className="w-full bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold mb-3"
      >
        Apply Now
      </button>

      <button
        onClick={() => setShowMemberPopup(false)}
        className="w-full bg-gray-300 text-black py-2 rounded-lg hover:bg-gray-400 text-sm font-medium"
      >
        I Know
      </button>
    </div>
  </div>
)}



    </div>
  );
};

export default Header; 