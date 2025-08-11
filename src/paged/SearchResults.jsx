import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "../utils/supabaseClient";

const capitalizeWords = (str) =>
  str
    ?.split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "";

const SearchResults = () => {
  const location = useLocation();
  const query =
    new URLSearchParams(location.search).get("query")?.toLowerCase() || "";
  const prettyQuery = capitalizeWords(query);

  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFilteredMovies = async () => {
    setLoading(true);
    const { data: movies, error } = await supabase.from("movies").select("*");

    if (error) {
      console.error("Error fetching movies:", error.message);
      setFilteredMovies([]);
      setLoading(false);
      return;
    }

    const results = movies.filter((movie) => {
      const titleMatch = movie.title?.toLowerCase().includes(query);
      const languageMatch = movie.language?.some((lang) =>
        lang.toLowerCase().includes(query)
      );
      const categoryMatch = movie.categories?.some((cat) =>
        cat.toLowerCase().includes(query)
      );

      const subCategoryArray = Array.isArray(movie.subCategory)
        ? movie.subCategory
        : [movie.subCategory];

      const subCategoryMatch = subCategoryArray?.some((sub) =>
        sub?.toLowerCase().includes(query)
      );

      const combinedMatch = movie.categories?.some((cat) =>
        subCategoryArray?.some(
          (sub) => `${cat.toLowerCase()} ${sub?.toLowerCase()}` === query
        )
      );

      return (
        titleMatch ||
        languageMatch ||
        categoryMatch ||
        subCategoryMatch ||
        combinedMatch
      );
    });

    setFilteredMovies(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchFilteredMovies();
  }, [query]);

  return (
    <div className="px-4 sm:px-10 py-8 min-h-screen bg-gray-950 text-white">
      <Helmet>
        <title>{prettyQuery} Movies - Search Results | 1AnchorMovies</title>
        <meta
          name="description"
          content={`Browse and download the latest ${prettyQuery} movies in HD. Fast downloads available in 480p, 720p, and 1080p on 1AnchorMovies.`}
        />
        <link
          rel="canonical"
          href={`https://www.1anchormovies.live/search?query=${encodeURIComponent(
            query
          )}`}
        />
      </Helmet>

      <h2 className="text-2xl font-bold mb-6 text-blue-400">
        🔍 Results for: <span className="italic">{prettyQuery}</span>
      </h2>

      {loading ? (
        <p className="text-gray-400 text-lg">Searching...</p>
      ) : filteredMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              className="border border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition duration-200 bg-gray-900 hover:bg-gray-800"
            >
              <Link to={`/movie/${movie.slug || movie._id}`}>
                <img
                  src={movie.poster || "/default-poster.jpg"}
                  alt={movie.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/default-poster.jpg";
                  }}
                />
              </Link>
              <div className="p-3 text-center font-medium">
                <div className="text-white truncate">{movie.title}</div>
                <div className="text-xs text-gray-400">
                  {movie.language?.join(", ") || "Unknown"}
                </div>
                <div className="text-xs text-gray-500 italic mt-1">
                  {movie.categories?.join(", ")}
                  {movie.subCategory && (
                    <>
                      {" • "}
                      {(Array.isArray(movie.subCategory)
                        ? movie.subCategory
                        : [movie.subCategory]
                      ).join(", ")}
                    </>
                  )}
                </div>

                {/* Watch URL Button */}
                {movie.watchUrl && (
                  <a
                    href={movie.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                  >
                    Watch
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-lg mt-6">
          No movies found matching your search.
        </p>
      )}
    </div>
  );
};

export default SearchResults;
