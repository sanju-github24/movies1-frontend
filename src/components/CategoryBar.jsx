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
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 px-4">
        <Dropdown label="Select Languages" items={languages} onSelect={onLanguageClick} />
        <Dropdown label="🎬 Browse Categories" items={categories} onSelect={onCategoryClick} />
      </div>
    </div>
  );
};

export default CategoryBar;
