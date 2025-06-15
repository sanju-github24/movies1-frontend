import React from 'react';

const categories = [
  'Tamil Language',
  'Telugu Language',
  'Malayalam Language',
  'Hindi Language',
  'Hollywood Movies',
  'Kannada Language'
];

const languages = ['Tamil', 'Telugu', 'Hindi', 'English', 'Malayalam', 'Kannada'];

const CategoryBar = ({ onCategoryClick, onLanguageClick }) => {
  return (
    <div className="w-full bg-gray-900 text-white px-4 py-6 border-y border-gray-700 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between gap-10">

        {/* Language Filter */}
        <section className="flex-1">
          <h2 className="text-center text-gray-300 text-base font-semibold mb-3">🌐 Filter by Language</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {languages.map((lang) => (
              <button
                key={lang}
                aria-label={`Filter by ${lang}`}
                className="bg-blue-800 hover:bg-blue-600 focus:ring focus:ring-blue-500 px-4 py-1 rounded-full text-sm transition"
                onClick={() => onLanguageClick?.(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
        </section>

        {/* Category Filter */}
        <section className="flex-1">
          <h2 className="text-center text-gray-300 text-base font-semibold mb-3">🎬 Browse Categories</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                aria-label={`Browse ${cat}`}
                className="bg-gray-800 hover:bg-blue-600 focus:ring focus:ring-blue-500 px-4 py-1 rounded-full transition text-sm"
                onClick={() => onCategoryClick?.(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default CategoryBar;

