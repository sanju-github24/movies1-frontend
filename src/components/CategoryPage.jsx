import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const subCategories = ['All', 'PreDVD', 'WEB-HD', 'HD-Rips', 'DVDScr', 'WEB-DL', 'Bluray'];

const CategoryPage = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(name || '');
  const [activeSub, setActiveSub] = useState('All');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMovies = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .contains('categories', [categoryName]) // Use .ilike if 'categories' is a string
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching movies:', error.message);
      setMovies([]);
    } else {
      setMovies(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
  }, [categoryName]);

  const handleSubCategoryClick = (sub) => {
    setActiveSub(sub);
  };

  const filteredMovies = movies.filter((movie) => {
    const subCategoryArray = Array.isArray(movie.subCategory)
      ? movie.subCategory
      : movie.subCategory
      ? [movie.subCategory]
      : [];

    return activeSub === 'All' || subCategoryArray.includes(activeSub);
  });

  return (
    <div className="min-h-screen bg-gray-950 px-4 sm:px-8 py-10 text-white">
      {/* Category Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-400 drop-shadow-sm break-words">
          {categoryName}
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Select a subcategory to explore movies
        </p>
      </div>

      {/* Subcategory Buttons */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 w-max">
          {subCategories.map((sub) => (
            <button
              key={sub}
              onClick={() => handleSubCategoryClick(sub)}
              className={`min-w-[100px] px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition duration-200 shadow text-center ${
                activeSub === sub
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-blue-600 text-gray-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Movie List */}
      <div className="mt-10 space-y-4">
        {loading ? (
          <p className="text-gray-400 text-center">Loading movies...</p>
        ) : filteredMovies.length === 0 ? (
          <p className="text-gray-500 text-center">
            No movies found for this category
            {activeSub !== 'All' && ` and subcategory "${activeSub}"`}.
          </p>
        ) : (
          filteredMovies.map((movie) => (
            <div
              key={movie.slug}
              className="bg-white/5 hover:bg-white/10 p-4 rounded shadow flex flex-col sm:flex-row items-center gap-4"
            >
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-24 h-36 object-cover rounded"
              />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-blue-300 break-words">{movie.title}</h2>
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                  {movie.description}
                </p>
                <Link
                  to={`/movie/${movie.slug}`}
                  className="inline-block mt-2 text-blue-400 hover:underline text-sm"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Back Button */}
      <div className="mt-16 text-center">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white text-sm underline transition"
        >
          ← Back to Categories
        </button>
      </div>
    </div>
  );
};

export default CategoryPage;
