import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom"; 
import { supabase } from "../utils/supabaseClient";
import { Search, Loader2, Frown, Film, MonitorPlay } from "lucide-react"; // Imported for better UX

const CategoryPage = () => {
  const { name } = useParams(); // /category/:name
  const pageName = decodeURIComponent(name || ""); // e.g., "Tamil"

  const [allMovies, setAllMovies] = useState([]); // Store all fetched movies
  const [loading, setLoading] = useState(true);
  const [subCategories, setSubCategories] = useState(["All"]);
  const [activeSub, setActiveSub] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  // Helper function: Normalizes and flattens a field into an array of lowercase strings
  const normalizeField = useCallback((field) => {
    if (!field) return [];
    if (typeof field === "string") return [field.toLowerCase()];
    if (Array.isArray(field)) return field.map((x) => x?.toLowerCase() || "");
    return [];
  }, []);

  /* --- Data Fetching Logic (Optimized) --- */
  const fetchMovies = useCallback(async () => {
    if (!pageName) return;
    setLoading(true);
    setError(null); // Reset error state

    // 1. Fetch ALL movies (or at least a large initial set)
    const { data, error: fetchError } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Supabase error:", fetchError.message);
      setError("Failed to fetch movies. Please try again.");
      setAllMovies([]);
      setLoading(false);
      return;
    }

    // 2. Filter movies by the main language/category name
    const categoryFiltered = (data || []).filter((movie) =>
      normalizeField(movie.language).includes(pageName.toLowerCase())
    );

    setAllMovies(categoryFiltered);

    // 3. Collect unique subcategories
    const subs = new Set();
    categoryFiltered.forEach((movie) =>
      normalizeField(movie.subCategory).forEach((s) => s && subs.add(s))
    );

    setSubCategories(["All", ...Array.from(subs)]);
    setActiveSub("All");
    setLoading(false);
  }, [pageName, normalizeField]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  /* --- Filtering Logic (Memoized) --- */
  const filteredMovies = useMemo(() => {
    // Return a subset of allMovies based on subcategory and search filters
    return allMovies.filter((movie) => {
      const subsList = normalizeField(movie.subCategory);
      
      const matchesSub = 
        activeSub === "All" || 
        subsList.includes(activeSub.toLowerCase());
        
      const matchesSearch =
        movie.title?.toLowerCase().includes(search.toLowerCase()) ||
        (movie.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (movie.cast || []).join(', ').toLowerCase().includes(search.toLowerCase()); // Added cast search

      return matchesSub && matchesSearch;
    });
  }, [allMovies, activeSub, search, normalizeField]);

  const searchPlaceholder = `Search in ${pageName} movies...`;

  /* --- JSX Structure --- */
  return (
    <div className="min-h-screen bg-gray-950 px-4 sm:px-8 py-10 text-white">
      {/* Page Header */}
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-blue-400 border-b border-gray-800 pb-3">
          <Film className="inline w-8 h-8 mr-2 -mt-1" />
          {pageName} Movies
        </h1>
        <p className="text-md text-gray-400 mt-3">
          Explore the world of **{pageName}** cinema, including genres and releases.
        </p>
      </header>

      {/* Search Bar */}
      <div className="max-w-xl mx-auto mb-8 relative">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-lg"
        />
        <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      {/* Subcategories (Pill Tabs) */}
      {subCategories.length > 1 && (
        <div className="max-w-4xl mx-auto overflow-x-auto pb-4 mb-8 custom-scrollbar">
          <div className="flex gap-3 w-max">
            {subCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => {
                    setActiveSub(sub);
                    setSearch(""); // Clear search when changing subcategory
                }}
                className={`min-w-[100px] px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition border ${
                  activeSub === sub
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/50"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- Movie List Area --- */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mr-3" />
          <p className="text-xl text-gray-400">Loading {pageName} collection...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 text-red-400">
            <Frown className="w-10 h-10 mb-2" />
            <p className="text-xl font-medium">{error}</p>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Frown className="w-10 h-10 mb-2" />
            <p className="text-xl font-medium">
              No movies found matching your criteria.
            </p>
            <p className="text-sm mt-1">
                Try broadening your search or switching the subcategory.
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 mt-10 max-w-7xl mx-auto">
          {filteredMovies.map((movie) => (
            <div
              key={movie.slug}
              className="group bg-gray-800 rounded-xl shadow-lg hover:shadow-blue-500/30 transition duration-300 overflow-hidden relative"
            >
              {/* Poster */}
              <div className="relative w-full aspect-[2/3] overflow-hidden">
                <img
                  src={movie.poster || "/default-poster.jpg"}
                  alt={movie.title}
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/0 transition duration-300" />
              </div>
              
              {/* Info */}
              <div className="p-3 text-center">
                <h2 className="text-md font-semibold text-blue-300 truncate mb-1">
                  {movie.title}
                </h2>
                <p className="text-xs text-gray-400 capitalize">
                    {normalizeField(movie.subCategory)[0] || pageName}
                </p>
              </div>

              {/* Action Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex flex-col gap-3">
                    <Link
                        to={`/movie/${movie.slug}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-full font-medium transition flex items-center gap-2"
                    >
                        <Film className="w-4 h-4" /> Details
                    </Link>
                    {movie.watchUrl && (
                        <a
                            href={movie.watchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-full font-medium transition flex items-center gap-2"
                        >
                            <MonitorPlay className="w-4 h-4" /> Watch Now
                        </a>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryPage;