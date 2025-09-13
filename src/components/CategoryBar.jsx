import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Dropdown from "./Dropdown.jsx";

const languages = ["Tamil", "Telugu", "Kannada", "Hindi", "Malayalam", "English"];

const CategoryBar = ({ isMobile = false, onNavigate, onClose }) => {
  const [showFirst, setShowFirst] = useState(true);
  const [animate, setAnimate] = useState(true);
  const navigate = useNavigate();

  const text1 =
    "📣 Share 1anchormovies.com with your friends! 💬 Let’s build the biggest South Indian movie community! 🔥 Invite now! ❤️ Telegram | WhatsApp | Instagram";
  const text2 =
    "🤝 Have ideas, suggestions, or content to share? Join our contributor circle by emailing us at AnchorMovies@proton.me — let’s build together!";

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimate(false);
      setTimeout(() => {
        setShowFirst((prev) => !prev);
        setAnimate(true);
      }, 1000);
    }, 29000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Unified click handler
  const handleClick = (name) => {
    if (onNavigate) {
      onNavigate(name);
    } else {
      navigate(`/category/${encodeURIComponent(name)}`);
    }
    if (onClose) onClose(); // closes mobile drawer
  };

  return (
    <div className="w-full bg-gray-950 border-y border-gray-800 text-white px-4 py-4">
      {/* Marquee (desktop only) */}
      <div className="hidden sm:block w-full bg-blue-800/90 border border-blue-500 shadow-lg overflow-hidden py-3 mb-4">
        <div className="relative w-full overflow-hidden h-6" aria-live="polite">
          {animate && (
            <span className="text-white text-sm font-semibold tracking-wide animate-slow-marquee inline-block whitespace-nowrap">
              {(showFirst ? text1 : text2) + "       "}
            </span>
          )}
        </div>
      </div>

      {/* Desktop Dropdown */}
{!isMobile && (
  <nav className="max-w-7xl mx-auto w-full flex md:items-center md:justify-center gap-8 px-4 mt-6">
    <Dropdown
      label="🌐 Select Languages"
      items={languages}
      onSelect={(lang) => onNavigate(lang)} // use the prop instead of missing function
    />
  </nav>
)}


      {/* Mobile Buttons */}
      {isMobile && (
        <div className="flex flex-col gap-6">
          <div>
            <h4 className="text-gray-400 font-semibold mb-2">Languages</h4>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleClick(lang)}
                  className="flex-1 min-w-[100px] px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryBar;
