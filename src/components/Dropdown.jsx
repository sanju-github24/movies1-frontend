import React, { useState, useRef, useEffect } from 'react';

const Dropdown = ({ label, items, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full md:w-auto relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full md:w-auto bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex justify-between items-center md:justify-center"
      >
        {label}
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

export default Dropdown;

