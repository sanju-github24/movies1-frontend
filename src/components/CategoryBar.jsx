import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import Dropdown from "./Dropdown.jsx";

const categories = [
  "Tamil Language",
  "Telugu Language",
  "Kannada Language",
  "Malayalam Language",
  "Hindi Language",
  "Hollywood Movies",
];

const languages = [
  "Tamil",
  "Telugu",
  "Kannada",
  "Hindi",
  "Malayalam",
  "English",
];

const CategoryBar = ({ isMobile = false, onClose }) => {
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

  // ✅ Navigation handlers
  const handleCategoryClick = (cat) => {
    navigate(`/category/${encodeURIComponent(cat)}`);
    if (onClose) onClose(); // close drawer in mobile
  };

  const handleLanguageClick = (lang) => {
    navigate(`/category/${encodeURIComponent(lang)}`);
    if (onClose) onClose();
  };

  return (
    <div className="w-full bg-gray-950 border-y border-gray-800 text-white px-4 py-4">
      {/* 🔁 Marquee Banner (desktop only) */}
      <div className="hidden sm:block w-full bg-blue-800/90 border border-blue-500 shadow-lg overflow-hidden py-3 mb-4">
        <div className="relative w-full overflow-hidden h-6" aria-live="polite">
          {animate && (
            <span className="text-white text-sm font-semibold tracking-wide animate-slow-marquee inline-block whitespace-nowrap">
              {(showFirst ? text1 : text2) + "       "}
            </span>
          )}
        </div>
      </div>

      {/* ✅ Desktop Dropdowns */}
      {!isMobile && (
        <nav
          className="max-w-7xl mx-auto w-full hidden md:flex md:items-center md:justify-between gap-8 px-4 mt-6"
          aria-label="Movie Filters"
        >
          <Dropdown
            label="🌐 Select Languages"
            items={languages}
            onSelect={handleLanguageClick}
          />
          <Dropdown
            label="🎬 Browse Categories"
            items={categories}
            onSelect={handleCategoryClick}
          />
        </nav>
      )}

      {/* ✅ Mobile Buttons/List */}
      {isMobile && (
        <div className="flex flex-col gap-6">
          {/* Languages */}
          <div>
            <h4 className="text-gray-400 font-semibold mb-2">Languages</h4>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageClick(lang)}
                  className="flex-1 min-w-[100px] px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-gray-400 font-semibold mb-2">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900"
                >
                  {cat}
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
