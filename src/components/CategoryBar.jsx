import React, { useState } from 'react';

const categories = [
  'Tamil Language',
  'Telugu Language',
  'Malayalam Language',
  'Hindi Language',
  'Hollywood Movies',
  'Kannada Language',
];

const languages = ['Tamil', 'Telugu', 'Hindi', 'English', 'Malayalam', 'Kannada'];

const Dropdown = ({ label, items, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full md:w-auto relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full md:w-auto bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex justify-between items-center md:justify-center"
      >
        {label}
        {/* SVG Chevron */}
        <svg
          className={`ml-2 w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full md:w-60 bg-gray-900 text-white rounded-md shadow-lg p-2 space-y-2 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item}
              onClick={() => {
                onSelect?.(item);
                setIsOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded hover:bg-blue-600 transition"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryBar = ({ onCategoryClick, onLanguageClick }) => {
  return (
    <div className="w-full bg-gray-950 border-y border-gray-800 text-white px-4 py-4">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 px-4">

        {/* Language Dropdown */}
        <Dropdown label="Select Languages" items={languages} onSelect={onLanguageClick} />

        {/* Category Dropdown */}
        <Dropdown label="🎬 Browse Categories" items={categories} onSelect={onCategoryClick} />

      </div>
    </div>
  );
};

export default CategoryBar;
