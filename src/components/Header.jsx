import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';


const Header = () => {
  const { userData, movies = [] } = useContext(AppContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const adminEmail = 'sanjusanjay0444@gmail.com';
  const isAdmin = userData?.email?.toLowerCase() === adminEmail.toLowerCase();
  const siteUrl = 'https://anchormovies.vercel.app';

  // 🔁 Filter recent 10 admin uploads
  const latestAdminMovies = isAdmin
  ? movies
      .filter((movie) => (movie.uploaded_by || '').toLowerCase() === adminEmail.toLowerCase())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
  : [];

const renderMovieItem = (movie, index) => {
  const {
    title = 'Untitled Movie',
    slug = '',
    downloads = [],
  } = movie;

  const firstDownload = Array.isArray(downloads) && downloads.length > 0 ? downloads[0] : {};
  const { quality = 'Unknown', format = 'Unknown' } = firstDownload;

  return (
    <div
      key={slug || index}
      className="text-sm text-left text-black whitespace-nowrap overflow-hidden text-ellipsis"
      title={title}
    >
      {title}{' '}
      <Link
        to={`/movie/${slug}`}
        className="text-blue-500 underline hover:text-blue-700"
      >
        [{quality} - {format}]
      </Link>
    </div>
  );
};

  

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
      <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
            alt="Telegram"
            className="w-14 h-14"
          />
          <h2 className="text-xl font-semibold text-white">
            Join Our Official Telegram Channel For Regular Updates
          </h2>
          <a
            href="https://t.me/AnchorMovies"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2.5 rounded-full shadow transition-all duration-200"
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
            className="w-10 h-10 cursor-pointer hover:opacity-80"
          />
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md p-2 z-50 text-sm text-black">
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Check out this site: ' + siteUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Share on WhatsApp
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 hover:bg-gray-100 rounded"
              >
                Share on Instagram
              </a>
              <button
                onClick={handleCopy}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                {copied ? '✅ Link Copied!' : 'Copy Link'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🛠 Admin Panel Link - Only for Admin */}
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





      {/* 🎬 Latest Movies - Visible to All Users */}
{movies?.length > 0 && (
  <div className="w-full max-w-7xl px-2 sm:px-4 py-4">
    <div className="flex flex-col gap-3 bg-white/5 backdrop-blur-md rounded-md shadow border border-white/10 p-4">
     
      {movies
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map((movie) => (
          <div
            key={movie.id}
            className="flex items-center justify-between bg-white/10 hover:bg-white/20 transition rounded-md p-2 text-white text-sm flex-wrap gap-2"
          >
            <div className="flex-1 min-w-0">
              <Link
                to={`/movie/${movie.slug}`}
                className="font-medium text-blue-500 hover:text-blue-800 truncate block"
                title={movie.title}
              >
                 {movie.title}
              </Link>
            </div>
            <span className="text-xs text-gray-300">
              {movie.created_at ? new Date(movie.created_at).toLocaleDateString() : ''}
            </span>
          </div>
        ))}
    </div>
  </div>
)}







     
      {/* 🆕 Admin Uploads List
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
              <a
                href={`/movie/${movie.slug}`}
                className="font-medium text-blue-500 hover:text-blue-800 truncate block"
                title={movie.title}
              >
                🎬 {movie.title}
              </a>
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
)} */}



    </div>
  );
};

export default Header;
