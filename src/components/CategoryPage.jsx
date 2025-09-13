import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; 
import { supabase } from "../utils/supabaseClient";

const CategoryPage = () => {
  const { name } = useParams(); // /category/:name
  const pageName = decodeURIComponent(name || "");

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subCategories, setSubCategories] = useState(["All"]);
  const [activeSub, setActiveSub] = useState("All");
  const [search, setSearch] = useState("");

  const normalizeField = (field) => {
    if (!field) return [];
    if (typeof field === "string") return [field.toLowerCase()];
    if (Array.isArray(field)) return field.map((x) => x?.toLowerCase() || "");
    return [];
  };

  const fetchMovies = async () => {
    if (!pageName) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error.message);
      setMovies([]);
      setLoading(false);
      return;
    }

    // Filter only by language
    const filtered = (data || []).filter((movie) =>
      normalizeField(movie.language).includes(pageName.toLowerCase())
    );

    setMovies(filtered);

    // Collect unique subcategories
    const subs = new Set();
    filtered.forEach((movie) =>
      normalizeField(movie.subCategory).forEach((s) => s && subs.add(s))
    );

    setSubCategories(["All", ...Array.from(subs)]);
    setActiveSub("All");
    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
  }, [pageName]);

  const filteredMovies = movies.filter((movie) => {
    const subsList = normalizeField(movie.subCategory);
    const matchesSub = activeSub === "All" || subsList.includes(activeSub.toLowerCase());
    const matchesSearch =
      movie.title?.toLowerCase().includes(search.toLowerCase()) ||
      (movie.description || "").toLowerCase().includes(search.toLowerCase());
    return matchesSub && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-950 px-4 sm:px-8 py-10 text-white">
      {/* Page Title */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-400">{pageName} Movies</h1>
        <p className="text-sm text-gray-400 mt-2">
          Browse the latest {pageName} movies available for streaming and download.
        </p>
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
            {subCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className={`min-w-[100px] px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition shadow ${
                  activeSub === sub
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 hover:bg-blue-600 text-gray-200"
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
            No movies found for {pageName}
            {activeSub !== "All" && ` and subcategory "${activeSub}"`}.
          </p>
        ) : (
          filteredMovies.map((movie) => (
            <div
              key={movie.slug}
              className="bg-white/5 hover:bg-white/10 p-4 rounded-lg shadow flex flex-col sm:flex-row items-center gap-4 transition"
            >
              <img
                src={movie.poster || "/default-poster.jpg"}
                alt={movie.title}
                className="w-24 h-36 object-cover rounded"
              />
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-bold text-blue-300">{movie.title}</h2>
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                  {movie.description || "No description available."}
                </p>
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-3">
                  <a
                    href={`/movie/${movie.slug}`}
                    className="text-blue-400 hover:underline text-sm"
                  >
                    View Details →
                  </a>
                  {movie.watchUrl && (
                    <a
                      href={movie.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                    >
                      Watch Now
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
