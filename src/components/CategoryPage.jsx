import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const CategoryPage = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(name || '');
  const [activeSub, setActiveSub] = useState('All');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subCategories, setSubCategories] = useState(['All']);
  const [search, setSearch] = useState('');

  const categoryDescriptions = {
    Kannada: 'Watch the latest Kannada movies online. Full HD downloads and trending stories from the heart of Karnataka.',
    Tamil: 'Download and stream the latest Tamil blockbusters. High-quality movies featuring top Kollywood actors.',
    Telugu: 'Explore new Telugu action, romance, and thriller movies. Updated regularly with HD downloads.',
    Malayalam: 'Discover critically acclaimed Malayalam cinema with powerful storytelling and rich visuals.',
    Hindi: 'Bollywood hits and top-rated Hindi films available to download in HD.',
    English: 'Latest Hollywood releases and English films available in 720p and 1080p quality.',
  };

  const fetchMovies = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching movies:', error.message);
      setMovies([]);
    } else {
      const categoryFiltered = (data || []).filter((movie) => {
        const inCategory = Array.isArray(movie.categories)
          ? movie.categories.map(c => c.toLowerCase()).includes(categoryName.toLowerCase())
          : typeof movie.categories === 'string' &&
            movie.categories.toLowerCase() === categoryName.toLowerCase();

        return inCategory;
      });

      setMovies(categoryFiltered);

      const subs = new Set();
      categoryFiltered.forEach((movie) => {
        const subList = Array.isArray(movie.subCategory)
          ? movie.subCategory
          : movie.subCategory
            ? [movie.subCategory]
            : [];

        subList.forEach((s) => subs.add(s));
      });

      setSubCategories(['All', ...Array.from(subs)]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
    setActiveSub('All');
    setSearch('');
  }, [categoryName]);

  const filteredMovies = movies.filter((movie) => {
    const subCategoryArray = Array.isArray(movie.subCategory)
      ? movie.subCategory
      : movie.subCategory
        ? [movie.subCategory]
        : [];

    const matchesSubCategory =
      activeSub === 'All' || subCategoryArray.includes(activeSub);

    const matchesSearch =
      movie.title.toLowerCase().includes(search.toLowerCase()) ||
      (movie.description || '').toLowerCase().includes(search.toLowerCase());

    return matchesSubCategory && matchesSearch;
  });

  const categoryIntro =
    categoryDescriptions[categoryName] ||
    `Browse top-rated ${categoryName} movies available for streaming and download.`;

  return (
    <div className="min-h-screen bg-gray-950 px-4 sm:px-8 py-10 text-white">
      {/* Category Title */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-400">{categoryName} Movies</h1>
        <p className="text-sm text-gray-400 mt-2">{categoryIntro}</p>
        <p className="text-xs text-gray-500 mt-1">
          {subCategories.length > 1
            ? 'Select a subcategory to explore movies'
            : 'No subcategories found for this genre.'}
        </p>
      </div>

      {/* 🔍 Search bar */}
      <div className="max-w-md mx-auto mb-6">
        <input
          type="text"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none focus:ring focus:border-blue-500"
        />
      </div>

      {/* Subcategory Buttons */}
      {subCategories.length > 1 && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 w-max">
            {subCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className={`min-w-[100px] px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition shadow ${activeSub === sub
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-blue-600 text-gray-200'
                  }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

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
                src={movie.poster || '/default-poster.jpg'}
                alt={movie.title}
                className="w-24 h-36 object-cover rounded"
              />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-blue-300">{movie.title}</h2>
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                  {movie.description || 'No description available.'}
                </p>

                {/* View Details link */}
                <Link
                  to={`/movie/${movie.slug}`}
                  className="inline-block mt-2 text-blue-400 hover:underline text-sm mr-3"
                >
                  View Details →
                </Link>

                {/* Watch Now button if URL exists */}
                {movie.watchUrl && (
                  <a
                    href={movie.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                  >
                     Watch Now
                  </a>
                )}
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
