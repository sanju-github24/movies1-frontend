import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';

const Header = () => {
  const { userData, movies = [] } = useContext(AppContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

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
  .slice(0, 10);


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  };

  return (
    <div className="flex flex-col items-center mt-24 px-4 w-full">

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
{/* 🎬 Latest Movies - All Users */}
{latestMovies.length > 0 && (
  <div className="w-full max-w-7xl px-2 sm:px-4 py-4">

<div className="bg-white rounded-md p-3 mb-3 text-sm text-black shadow-sm">
  <strong className="block mb-1 text-base">🆕 Recently Uploaded:</strong>
  <p className="sm:inline">
    Showing the latest 10 movies here.
    <span className="block sm:inline mt-1">
      For more, you can use
      <span className="inline-block mx-1 mt-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
        🔍 Search
      </span>
      or
      <span className="inline-block mx-1 mt-1 px-2 py-1 bg-green-100 text-green-700 rounded">
        📂 Browse Categories
      </span>
    </span>
  </p>
</div>

    <div className="flex flex-col gap-3 bg-white/5 backdrop-blur-md rounded-md shadow border border-white/10 p-4">
      {latestMovies.slice(0, 50).map((movie) => (
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
