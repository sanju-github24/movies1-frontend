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

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);

    // fetch movies
    const { data: movies, error: moviesError } = await supabase
      .from("movies")
      .select("*");

    if (moviesError) {
      console.error("Error fetching movies:", moviesError.message);
    }

    // fetch watch html
    const { data: watchHtml, error: watchError } = await supabase
      .from("watch_html")
      .select("*");

    if (watchError) {
      console.error("Error fetching watch_html:", watchError.message);
    }

    // filter movies
    const filteredMovies =
      movies?.filter((movie) => {
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
      }) || [];

    // filter watch html entries
    const filteredWatch =
      watchHtml?.filter((item) =>
        item.title?.toLowerCase().includes(query)
      ) || [];

    // attach posters to watch pages
    const mergedWatch = filteredWatch.map((watch) => {
      let matchingMovie =
        movies?.find(
          (m) => m.title?.toLowerCase() === watch.title?.toLowerCase()
        ) ||
        movies?.find((m) =>
          m.title?.toLowerCase().includes(watch.title?.toLowerCase())
        ) ||
        movies?.find((m) =>
          watch.title?.toLowerCase().includes(m.title?.toLowerCase())
        );

      return {
        id: watch.id,
        title: watch.title,
        slug: watch.slug,
        type: "watch",
        poster: matchingMovie?.poster || "/default-poster.jpg",
        watchUrl: `/watch/${watch.slug}`,
      };
    });

    // normalize movies
    const normalizedMovies = filteredMovies.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug || m._id,
      type: "movie",
      poster: m.poster || "/default-poster.jpg",
      watchUrl: m.watchUrl || null,
      language: m.language,
      categories: m.categories,
      subCategory: m.subCategory,
    }));

    // merge both
    setResults([...normalizedMovies, ...mergedWatch]);
    setLoading(false);
  };

  useEffect(() => {
    fetchResults();
  }, [query]);

  return (
    <div className="px-4 sm:px-10 py-8 min-h-screen bg-gray-950 text-white">
      <Helmet>
  {/* Page Title */}
  <title>Download {prettyQuery} Movies - Search Results | 1AnchorMovies</title>

  {/* Meta Description */}
  <meta
    name="description"
    content={`Download and watch the latest ${prettyQuery} movies in HD (480p, 720p, 1080p) on 1AnchorMovies. Fast and secure downloads.`}
  />

  {/* Canonical URL */}
  <link
    rel="canonical"
    href={`https://www.1anchormovies.live/search?query=${encodeURIComponent(query)}`}
  />
</Helmet>


      <h2 className="text-2xl font-bold mb-6 text-blue-400">
        🔍 Results for: <span className="italic">{prettyQuery}</span>
      </h2>

      {loading ? (
        <p className="text-gray-400 text-lg">Searching...</p>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {results.map((item) => (
            <div
              key={item.id}
              className="border border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition duration-200 bg-gray-900 hover:bg-gray-800"
            >
              <Link
                to={item.type === "movie" ? `/movie/${item.slug}` : item.watchUrl}
              >
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/default-poster.jpg";
                  }}
                />
              </Link>

              <div className="p-3 text-center font-medium">
                <div className="text-white truncate">{item.title}</div>
                {item.type === "movie" && (
                  <>
                    <div className="text-xs text-gray-400">
                      {item.language?.join(", ") || "Unknown"}
                    </div>
                    <div className="text-xs text-gray-500 italic mt-1">
                      {item.categories?.join(", ")}
                      {item.subCategory && (
                        <>
                          {" • "}
                          {(Array.isArray(item.subCategory)
                            ? item.subCategory
                            : [item.subCategory]
                          ).join(", ")}
                        </>
                      )}
                    </div>
                  </>
                )}

                {item.watchUrl && (
                  <Link
                    to={item.watchUrl}
                    className="inline-block mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded"
                  >
                    Watch
                  </Link>
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
