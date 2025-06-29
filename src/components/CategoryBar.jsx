import React from 'react';
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
  return (
    <div className="w-full bg-gray-950 border-y border-gray-800 text-white px-4 py-4">
      {/* 🏁 Marquee CTA Banner FIRST */}
      <div className="mb-6 bg-blue-800/90 rounded-lg py-3 px-4 overflow-hidden relative shadow-lg border border-blue-500">
        <div className="animate-marquee whitespace-nowrap text-[13px] sm:text-sm md:text-base text-white font-semibold tracking-wide">
          📣 Share <span className="underline text-blue-300">1anchormovies.com</span> with your friends! 💬 Let’s build the biggest South Indian movie community! 🔥 Invite now! ❤️ Telegram | WhatsApp | Insta | 📧 Email us → 
          <a 
            href="mailto:AnchorMovies@proton.me" 
            className="ml-1 underline text-blue-200 hover:text-blue-100"
          >
            AnchorMovies@proton.me
          </a> 🔗
        </div>
      </div>
  
      {/* Category and Language Dropdowns */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 px-4">
        <Dropdown label="Select Languages" items={languages} onSelect={onLanguageClick} />
        <Dropdown label="🎬 Browse Categories" items={categories} onSelect={onCategoryClick} />
      </div>
    </div>
  );
  
};

export default CategoryBar;
