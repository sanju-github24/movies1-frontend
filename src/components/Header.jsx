import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from "../utils/supabaseClient";
import { useRef } from 'react';
import { EyeIcon } from "@heroicons/react/outline";

const Header = () => {
  const { userData, movies = [] } = useContext(AppContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const storyTimeoutRef = useRef(null);


  const adminEmail = 'sanjusanjay0444@gmail.com';
  const isAdmin = userData?.email?.toLowerCase() === adminEmail.toLowerCase();
  const siteUrl = 'https://1anchormovies.vercel.app';

  // 🔁 Recent 10 admin uploads
  const latestAdminMovies = isAdmin
    ? movies
        .filter((movie) => (movie.uploaded_by || '').toLowerCase() === adminEmail.toLowerCase())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
    : [];

  // ✅ Recent 10 movies (all users)
  // ✅ Recent 10 movies for homepage
  const latestMovies = [...movies]
  .filter((m) => m.showOnHomepage || m.showOnHomepage === undefined) // ✅ allow if true or missing
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .slice(0, 40);


 // ✅ Fetch stories
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
  } catch (err) {
    console.error('Clipboard error:', err);
  }
};
useEffect(() => {
  if (!activeStory) return;

  storyTimeoutRef.current = setTimeout(() => {
    const currentIndex = stories.findIndex((s) => s.id === activeStory.id);
    const nextIndex = currentIndex + 1;

    if (nextIndex < stories.length) {
      setActiveStory(stories[nextIndex]);
    } else {
      setActiveStory(null);
    }
  }, 30000);

  return () => clearTimeout(storyTimeoutRef.current);
}, [activeStory, stories]);

useEffect(() => {
  if (!activeStory) return;

  const viewed = JSON.parse(localStorage.getItem("viewedStories") || "[]");
  if (viewed.includes(activeStory.id)) return; // already counted

  // Mark as viewed
  localStorage.setItem("viewedStories", JSON.stringify([...viewed, activeStory.id]));

  // 🔁 Increment views in Supabase (or your backend)
  supabase
    .from("stories")
    .update({ views: activeStory.views + 1 })
    .eq("id", activeStory.id)
    .then(() => {
      // Optionally update UI locally
      setActiveStory({ ...activeStory, views: activeStory.views + 1 });
    });

}, [activeStory]);


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


     {/* 🆕 Latest Movie Stories Section */}
{stories.length > 0 && (
  <div className="w-full max-w-7xl px-2 sm:px-4 mt-2">
    <div className="bg-white rounded-xl shadow p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-black">Stories</h3>
      </div>

      <div className="overflow-x-auto flex gap-4 scrollbar-hide py-2">
        {stories.map((story) => (
          <div
            key={story.id}
            onClick={() => setActiveStory(story)}
            className="flex flex-col items-center text-center cursor-pointer min-w-[72px]"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 p-1 shadow-lg">
              <div className="bg-white rounded-full w-full h-full overflow-hidden">
                <img
                  src={story.poster_url}
                  alt={story.title}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>
            <p className="text-xs text-gray-800 mt-1 w-25 truncate font-medium">
              {story.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
)}


{activeStory && (
  <div
    className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50"
    onClick={() => {
      clearTimeout(window.storyTimeout);
      setActiveStory(null);
    }}
  >
    {/* ❌ Close button */}
    <button
      className="absolute top-4 right-4 text-white text-2xl font-bold z-50"
      onClick={(e) => {
        e.stopPropagation();
        clearTimeout(window.storyTimeout);
        setActiveStory(null);
      }}
    >
      ✖️
    </button>

    {/* Story Content */}
    <div className="max-w-xs w-full p-4 relative animate-fadeIn">
      

    <p className="text-gray-400 text-center text-xs mt-1">
   {formatTimeAgo(activeStory.created_at)}
</p>

      {/* Progress bar background */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/30 rounded overflow-hidden">
        <div
          className="bg-blue-500 h-full origin-left animate-progress30s"
        />
      </div>

      {/* Story Poster */}
      <img
        src={activeStory.poster_url}
        alt={activeStory.title}
        className="rounded-lg w-full object-contain shadow-lg mt-3"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Story Info */}
      <p className="text-white text-center mt-3 font-semibold">
        {activeStory.title}
      </p>
     

<p className="text-gray-400 text-center text-xs mt-1 flex items-center justify-center gap-1">
  <EyeIcon className="w-4 h-4 text-gray-400" />
  {activeStory.views || 0} views
</p>

      
    </div>
  </div>
)}



      {/* 📢 Telegram Join Box */}
<div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-md text-center">
  <div className="flex flex-col items-center gap-3 sm:gap-4">
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
      alt="Telegram"
      className="w-10 h-10 sm:w-14 sm:h-14"
    />
    <h2 className="text-lg sm:text-xl font-semibold text-white leading-tight">
      Join Our Telegram Channel
    </h2>
    <a
      href="https://t.me/AnchorMovies"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 sm:px-6 sm:py-2.5 rounded-full shadow transition-all duration-200 text-sm sm:text-base"
    >
      Join on Telegram
    </a>
  </div>
</div>


      {/* 🔗 Share Button */}
      <div className="flex justify-end w-full max-w-7xl px-2 sm:px-4 mb-4">
        <div
          className="relative"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <img
            src="/share.png"
            alt="Share"
            className="w-8 h-8 sm:w-10 sm:h-10 cursor-pointer hover:opacity-80 transition"
          />
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white shadow-lg rounded-md p-1 sm:p-2 z-50 text-xs sm:text-sm text-black">
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Check out this site: ' + siteUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-2 py-1 sm:px-3 sm:py-2 hover:bg-gray-100 rounded"
              >
                WhatsApp
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-2 py-1 sm:px-3 sm:py-2 hover:bg-gray-100 rounded"
              >
                Instagram
              </a>
              <button
                onClick={handleCopy}
                className="w-full text-left px-2 py-1 sm:px-3 sm:py-2 hover:bg-gray-100 rounded"
              >
                {copied ? '✅ Copied!' : 'Copy Link'}
              </button>
            </div>
          )}
        </div>
      </div>
{/* 🎬 Latest Movies - All Users */}
{latestMovies.length > 0 && (
  <div className="w-full max-w-7xl px-2 sm:px-4 py-4">

<div className="bg-white rounded-md px-3 py-2 mt-1 text-sm text-black shadow-sm border border-gray-200">
  <strong className="block text-sm font-semibold text-black mb-1">
    🆕 Recently Uploaded
  </strong>
  <p className="text-gray-700 text-xs">
    Latest movies are listed below. Use{" "}
    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
      🔍 Search
    </span>{" "}
    or{" "}
    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
      📂 Categories
    </span>{" "}
    to explore.
  </p>
</div>

{/* 🛠 Admin Panel Link */}
{isAdmin && (
        <div className="w-full max-w-7xl px-2 sm:px-4 mb-4 text-left">
          <Link
            to="/admin"
            className="inline-block text-yellow-400 hover:text-yellow-300 font-semibold underline"
          >
            🔧 Go to Admin Panel
          </Link>
        </div>
      )}




<div className="flex flex-col gap-0 bg-white/5 mt-1 backdrop-blur-md rounded-md shadow border border-white/10 p-4">
  {latestMovies.slice(0,40).map((movie) => (
    <div
      key={movie.id}
      className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/10 hover:bg-white/20 transition rounded-md p-3 text-white text-sm gap-1 sm:gap-2"
    >
      <Link
        to={`/movie/${movie.slug}`}
        className="font-medium break-words line-clamp-2"
        style={{ color: movie.linkColor || "#60a5fa" }}
        title={movie.title}
      >
        {movie.title}
      </Link>

      <span className="text-xs text-gray-300 whitespace-nowrap sm:text-right">
        {movie.created_at && new Date(movie.created_at).toLocaleDateString()}
      </span>
    </div>
  ))}
</div>

  </div>
)}





      {/* 🆕 Admin Uploads List (Optional - Uncomment if needed) */}
      {/* 
      {isAdmin && (
        <div className="w-full max-w-7xl px-2 sm:px-4 py-4">
          <div className="flex flex-col gap-3 bg-white/10 backdrop-blur-md rounded-md shadow border border-white/10 p-4">
            <h2 className="text-white text-lg font-semibold mb-2">Recent Admin Uploads</h2>
            {latestAdminMovies.length > 0 ? (
              latestAdminMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="flex items-center justify-between bg-white/20 hover:bg-white/30 transition rounded-md p-2 text-white text-sm flex-wrap gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/movie/${movie.slug}`}
                      className="font-medium text-blue-500 hover:text-blue-800 truncate block"
                      title={movie.title}
                    >
                      🎬 {movie.title}
                    </Link>
                  </div>
                  <span className="text-xs text-gray-200">
                    {movie.uploadDate ? new Date(movie.uploadDate).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-200 text-sm">No recent uploads from admin.</p>
            )}
          </div>
        </div>
      )}
      */}

    </div>
  );
};

export default Header;
