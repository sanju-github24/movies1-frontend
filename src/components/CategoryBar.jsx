import React from "react";
import { Link, useNavigate } from "react-router-dom";

const languages = ["Tamil", "Telugu", "Kannada", "Hindi", "Malayalam", "English"];

const CategoryBar = ({ isMobile = false, onNavigate, onClose }) => {
  const navigate = useNavigate();

  const handleClick = (name) => {
    if (onNavigate) {
      onNavigate(name);
    } else {
      navigate(`/category/${encodeURIComponent(name)}`);
    }
    if (onClose) onClose();
  };

  // Desktop: render nothing — language nav is already in Navbar dropdown
  if (!isMobile) return null;

  // Mobile sidebar: language buttons only
  return (
    <div className="w-full text-white px-4 py-4">
      <div className="flex flex-col gap-6">
        <div>
          <h4 className="text-gray-400 font-semibold mb-2">Languages</h4>
          <div className="flex flex-wrap gap-2">
            {/* Real links so the collections are reachable by a crawler, and
                so these behave like links for a person too. */}
            {languages.map((lang) => (
              <Link
                key={lang}
                to={`/category/${encodeURIComponent(lang)}`}
                onClick={(e) => { if (onNavigate) { e.preventDefault(); handleClick(lang); } else if (onClose) onClose(); }}
                className="flex-1 min-w-[100px] px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 text-center"
              >
                {lang}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryBar;
