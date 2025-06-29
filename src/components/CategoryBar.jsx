import React, { useEffect, useState } from 'react';
import Dropdown from './Dropdown.jsx';

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
    '📣 Share 1anchormovies.com with your friends!💬 Let’s build the biggest South Indian movie community!🔥 Invite now!❤️ Telegram | WhatsApp | Instagram';

  const text2 =
    '🤝 Have ideas, suggestions, or content to share? Join our contributor circle by emailing us at AnchorMovies@proton.me — let build together!'

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimate(false); // remove animation
      setTimeout(() => {
        setShowFirst((prev) => !prev); // switch text
        setAnimate(true); // restart animation
      }, 1000); // wait 2 seconds before next text
    }, 29000); // 24s animation + 2s pause

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-gray-950 border-y border-gray-800 text-white px-4 py-4">
      {/* 🔁 Marquee */}
      <div className="w-full bg-blue-800/90 border border-blue-500 shadow-lg overflow-hidden py-3">
  <div className="relative w-full overflow-hidden h-6">
    {animate && (
      <span
        className="text-white text-sm font-semibold tracking-wide animate-slow-marquee inline-block whitespace-nowrap"
      >
        {`${showFirst ? text1 : text2}       `.repeat(1)}
      </span>
    )}
  </div>
</div>



      {/* ⬇️ Dropdowns */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 px-4 mt-6">
        <Dropdown label="Select Languages" items={languages} onSelect={onLanguageClick} />
        <Dropdown label="🎬 Browse Categories" items={categories} onSelect={onCategoryClick} />
      </div>
    </div>
  );
};

export default CategoryBar;
