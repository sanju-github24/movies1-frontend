import React, { useEffect, useState } from 'react';
import Dropdown from './Dropdown.jsx';
import AdSlot from '../components/AdSlot';

const categories = [
  'Tamil Language',
  'Telugu Language',
  'Kannada Language',
  'Malayalam Language',
  'Hindi Language',
  'Hollywood Movies',
];

const languages = ['Tamil', 'Telugu', 'Kannada', 'Hindi', 'Malayalam', 'English'];

const CategoryBar = ({ onCategoryClick, onLanguageClick }) => {
  const [showFirst, setShowFirst] = useState(true);
  const [animate, setAnimate] = useState(true);

  const text1 =
    '📣 Share 1anchormovies.com with your friends! 💬 Let’s build the biggest South Indian movie community! 🔥 Invite now! ❤️ Telegram | WhatsApp | Instagram';

  const text2 =
    '🤝 Have ideas, suggestions, or content to share? Join our contributor circle by emailing us at AnchorMovies@proton.me — let’s build together!';

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

  return (
    <div className="w-full bg-gray-950 border-y border-gray-800 text-white px-4 py-4">
      {/* 🔁 Marquee Banner */}
      <div className="w-full bg-blue-800/90 border border-blue-500 shadow-lg overflow-hidden py-3">
        <div className="relative w-full overflow-hidden h-6" aria-live="polite">
          {animate && (
            <span
              className="text-white text-sm font-semibold tracking-wide animate-slow-marquee inline-block whitespace-nowrap"
            >
              {(showFirst ? text1 : text2) + '       '}
            </span>
          )}
        </div>
      </div>

      {/* ⬇️ Dropdowns & Ad */}
      <nav
        className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 px-4 mt-6"
        aria-label="Movie Filters"
      >
        <AdSlot />
        <Dropdown label="Select Languages" items={languages} onSelect={onLanguageClick} />
        <Dropdown label="🎬 Browse Categories" items={categories} onSelect={onCategoryClick} />
      </nav>
    </div>
  );
};

export default CategoryBar;
