import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

const BlogViewer = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [recentBlogs, setRecentBlogs] = useState([]);
  const [nextBlog, setNextBlog] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlog();
    fetchRecentBlogs();
  }, [slug]);

  const fetchBlog = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      console.error("Blog not found:", error.message);
      setError("Blog not found.");
    } else {
      setBlog(data);
      fetchNextBlog(data.created_at);

      if (data.related_movie_ids?.length > 0) {
        fetchRelatedMovies(data.related_movie_ids);
      }
    }
  };

  const fetchRelatedMovies = async (ids) => {
    // Normalize related_movie_ids
    const movieIds = Array.isArray(ids)
      ? ids
      : ids.split(",").map((id) => id.trim()).filter(Boolean);

    if (movieIds.length === 0) return;

    const { data, error } = await supabase
      .from("watch_html")
      .select("id, title, slug, poster, cover_poster")
      .in("id", movieIds);

    if (error) {
      console.error("Error fetching related movies:", error.message);
    } else {
      // Preserve order of movieIds
      const orderedMovies = movieIds
        .map((id) => data.find((movie) => movie.id === id))
        .filter(Boolean);
      setRelatedMovies(orderedMovies);
    }
  };

  const fetchNextBlog = async (createdAt) => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, slug, title, thumbnail_url")
      .gt("created_at", createdAt)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!error && data.length > 0) setNextBlog(data[0]);
  };

  const fetchRecentBlogs = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, slug, title, thumbnail_url, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (!error) setRecentBlogs(data);
  };

  if (error) return <div className="text-red-500 text-center py-6">{error}</div>;
  if (!blog) return <div className="text-gray-400 text-center py-6">Loading blog...</div>;

  return (
    <div className="min-h-screen bg-[#ebebeb] text-[#222] font-['Roboto']">
      {/* Header */}
      <header className="bg-[#464646] shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-[70px]">
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-white text-2xl font-bold tracking-wide uppercase">
              Anchor<span className="text-[#c5c107]">Movies</span>
            </h1>
          </Link>
          <nav className="hidden md:flex space-x-6 text-white font-medium uppercase text-sm">
            <Link to="/" className="hover:text-[#c5c107] transition">Home</Link>
            <Link to="/blogs" className="hover:text-[#c5c107] transition">Blogs</Link>
            <Link to="/about" className="hover:text-[#c5c107] transition">About</Link>
            <Link to="/contact" className="hover:text-[#c5c107] transition">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Main Section */}
      <main className="max-w-7xl mx-auto py-10 px-4 grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* Left content */}
        <div className="lg:col-span-3 bg-white shadow-md rounded-md overflow-hidden">
          {/* Thumbnail */}
          {relatedMovies[0]?.cover_poster && (
            <div className="w-full h-[320px] sm:h-[400px] overflow-hidden">
              <img
                src={relatedMovies[0].cover_poster}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Blog content */}
          <div className="p-6 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 text-[#2c3e50]">
              {blog.title}
            </h1>

            <div
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            {/* Related Movies Section */}
            {relatedMovies.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-5 text-[#2c3e50]">
                  Related Movies
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedMovies.map((movie) => (
                    <Link
                      key={movie.id}
                      to={`/watch/${movie.slug}`}
                      className="group bg-gray-50 hover:bg-gray-100 rounded-lg overflow-hidden shadow-md transition"
                    >
                      <div className="relative w-full h-60 overflow-hidden">
                        <img
                          src={movie.cover_poster || movie.poster || "https://via.placeholder.com/300"}
                          alt={movie.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {movie.poster && (
                          <img
                            src={movie.poster}
                            alt={movie.slug}
                            className="absolute bottom-3 right-3 w-16 h-24 object-cover rounded shadow-md border border-gray-300"
                          />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-[#333] group-hover:text-[#c5c107] transition">
                          {movie.slug}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {blog.tags?.length > 0 && (
              <div className="pt-8 border-t border-gray-200 mt-10">
                <h4 className="text-lg font-semibold mb-3">Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="bg-[#d14242] text-white px-3 py-1 rounded-full text-sm font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next blog */}
            {nextBlog && (
              <div className="mt-14 border-t border-gray-200 pt-10">
                <h2 className="text-2xl font-bold mb-4 text-[#2c3e50]">
                  You might also like
                </h2>
                <Link
                  to={`/blogs/${nextBlog.slug}`}
                  className="block group bg-gray-50 hover:bg-gray-100 transition rounded-lg overflow-hidden shadow-md"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <img
                      src={nextBlog.thumbnail_url || "https://via.placeholder.com/300"}
                      alt={nextBlog.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="sm:col-span-2 flex flex-col justify-center px-4 pb-4 sm:pb-0">
                      <h3 className="text-xl font-semibold group-hover:text-[#c5c107] transition">
                        {nextBlog.title}
                      </h3>
                      <p className="text-gray-500 mt-1 text-sm">
                        Read the next article →
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:col-span-1">
          <div className="bg-white shadow-md rounded-md p-5">
            <h3 className="text-lg font-bold text-[#2c3e50] border-b border-gray-200 pb-3 mb-4 uppercase">
              Trending Now
            </h3>
            <div className="space-y-5">
              {recentBlogs.map((movie) => (
                <Link
                  key={movie.id}
                  to={`/blogs/${movie.slug}`}
                  className="block group"
                >
                  <div className="flex flex-col space-y-2 hover:scale-[1.02] transition">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="rounded-md shadow-sm object-cover h-40 w-full"
                    />
                    <div>
                      <h4 className="text-base font-semibold text-[#222] group-hover:text-[#479e47] transition leading-snug">
                        {movie.slug}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(movie.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="bg-[#111] text-[#cecece] py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 px-6">
          <div className="space-y-3">
            <h4 className="text-sm uppercase font-bold tracking-wide text-white">
              Join our community
            </h4>
            <p className="text-sm">
              Get updates on the latest movies, blogs, and reviews.
            </p>
          </div>
          <div className="flex justify-center items-center">
            <h1 className="text-white text-5xl sm:text-6xl font-extrabold tracking-tight italic">
              ANCHOR
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <Link to="/about" className="hover:text-white block">About Us</Link>
              <Link to="/contact" className="hover:text-white block">Contact</Link>
              <Link to="/blogs" className="hover:text-white block">Blogs</Link>
              <a href="https://t.me/AnchorMovies" target="_blank" rel="noreferrer" className="hover:text-white block">
                Telegram
              </a>
            </div>
            <div className="space-y-2">
              <a href="#" className="hover:text-white block">Privacy Policy</a>
              <a href="#" className="hover:text-white block">Terms of Service</a>
              <a href="#" className="hover:text-white block">Refund Policy</a>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-700 pt-4 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} AnchorMovies. All Rights Reserved.</p>
          <div className="flex justify-center gap-5 mt-2 text-sm font-medium">
            <a href="https://instagram.com" target="_blank" className="hover:text-white">Instagram</a>
            <a href="https://twitter.com" target="_blank" className="hover:text-white">Twitter</a>
            <a href="https://facebook.com" target="_blank" className="hover:text-white">Facebook</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogViewer;
