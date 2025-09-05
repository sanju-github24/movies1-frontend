import React, { useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

const CategoryPage = () => {
  const { name: paramName } = useParams(); // /category/:name
  const [searchParams] = useSearchParams(); // ?name=...
  const navigate = useNavigate();

  const pageName = decodeURIComponent(paramName || searchParams.get("name") || "");

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subCategories, setSubCategories] = useState(["All"]);
  const [activeSub, setActiveSub] = useState("All");
  const [search, setSearch] = useState("");

  const fetchMovies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMovies([]);
      setLoading(false);
      return;
    }

    const filtered = (data || []).filter((movie) => {
      // Check categories
      const inCategory = Array.isArray(movie.categories)
        ? movie.categories.map(c => c.toLowerCase()).includes(pageName.toLowerCase())
        : movie.categories?.toLowerCase() === pageName.toLowerCase();

      // Check languages
      const inLanguage = Array.isArray(movie.language)
        ? movie.language.map(l => l.toLowerCase()).includes(pageName.toLowerCase())
        : movie.language?.toLowerCase() === pageName.toLowerCase();

      return inCategory || inLanguage;
    });

    setMovies(filtered);

    const subs = new Set();
    filtered.forEach(movie => {
      const subList = Array.isArray(movie.subCategory)
        ? movie.subCategory
        : movie.subCategory
        ? [movie.subCategory]
        : [];
      subList.forEach(s => subs.add(s));
    });
    setSubCategories(["All", ...Array.from(subs)]);
    setActiveSub("All");

    setLoading(false);
  };

  useEffect(() => {
    if (pageName) fetchMovies();
  }, [pageName]);

  const filteredMovies = movies.filter(movie => {
    const subList = Array.isArray(movie.subCategory)
      ? movie.subCategory
      : movie.subCategory
      ? [movie.subCategory]
      : [];
    const matchesSub = activeSub === "All" || subList.includes(activeSub);
    const matchesSearch =
      movie.title.toLowerCase().includes(search.toLowerCase()) ||
      (movie.description || "").toLowerCase().includes(search.toLowerCase());
    return matchesSub && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-950 px-4 sm:px-8 py-10 text-white">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-400">{pageName} Movies</h1>
        <p className="text-sm text-gray-400 mt-2">Browse top-rated {pageName} movies available for streaming and download.</p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-6">
        <input
          type="text"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none focus:ring focus:border-blue-500"
        />
      </div>

      {/* Subcategories */}
      {subCategories.length > 1 && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 w-max">
            {subCategories.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className={`min-w-[100px] px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition shadow ${
                  activeSub === sub ? "bg-blue-600 text-white" : "bg-gray-800 hover:bg-blue-600 text-gray-200"
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
            No movies found for {pageName}{activeSub !== "All" && ` and subcategory "${activeSub}"`}.
          </p>
        ) : (
          filteredMovies.map(movie => (
            <div key={movie.slug} className="bg-white/5 hover:bg-white/10 p-4 rounded shadow flex flex-col sm:flex-row items-center gap-4">
              <img src={movie.poster || "/default-poster.jpg"} alt={movie.title} className="w-24 h-36 object-cover rounded" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-blue-300">{movie.title}</h2>
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">{movie.description || "No description available."}</p>
                <a href={`/movie/${movie.slug}`} className="inline-block mt-2 text-blue-400 hover:underline text-sm mr-3">View Details →</a>
                {movie.watchUrl && (
                  <a href={movie.watchUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded">Watch Now</a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
