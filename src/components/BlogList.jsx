import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { Helmet } from "react-helmet";

// Helper: Strip HTML for preview text
const getTextPreview = (html, maxLength = 150) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = div.textContent || div.innerText || "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      // Fetch blogs
      const { data: blogsData, error: blogsError } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });

      if (blogsError) throw blogsError;

      // Fetch related movies for each blog (first related movie only)
      const blogsWithPoster = await Promise.all(
        (blogsData || []).map(async (blog) => {
          if (blog.related_movie_ids?.length > 0) {
            const movieIds = Array.isArray(blog.related_movie_ids)
              ? blog.related_movie_ids
              : blog.related_movie_ids
                  .split(",")
                  .map((id) => id.trim())
                  .filter(Boolean);

            if (movieIds.length > 0) {
              const { data: moviesData } = await supabase
                .from("watch_html")
                .select("id, poster, cover_poster")
                .in("id", [movieIds[0]])
                .limit(1);

              if (moviesData && moviesData.length > 0) {
                blog.poster_image = moviesData[0].cover_poster || moviesData[0].poster;
              }
            }
          }
          return blog;
        })
      );

      setBlogs(blogsWithPoster || []);
    } catch (err) {
      console.error("Failed to fetch blogs:", err.message);
      setError("Failed to load blogs.");
    }
    setLoading(false);
  };

  if (loading)
    return <div className="text-gray-400 text-center py-10">Loading blogs...</div>;
  if (error)
    return <div className="text-red-500 text-center py-10">{error}</div>;

  return (
    <>
      <Helmet>
        <title>Movie Blogs & Reviews | 1AnchorMovies</title>
        <meta
          name="description"
          content="Explore the latest movie blogs, reviews, and updates from Tamil, Telugu, Kannada, and Malayalam cinema on 1AnchorMovies."
        />
        <link rel="canonical" href="https://www.1anchormovies.live/blogs" />
      </Helmet>

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

        {/* Hero Section */}
        <section className="bg-[#111] text-white text-center py-16 px-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-wide uppercase">
            Movie<span className="text-[#c5c107]">Blogs</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Dive into movie reviews, industry insights, and latest updates across
            South Indian cinema — Tamil, Telugu, Kannada, and Malayalam.
          </p>
        </section>

        {/* Blog List */}
        <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-[#2c3e50] mb-8 text-center uppercase">
            📚 Latest Blog Articles
          </h1>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <Link
                key={blog.id}
                to={`/blogs/${blog.slug}`}
                className="group bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden flex flex-col"
              >
                <div className="relative">
                  <img
                    src={blog.poster_image || blog.thumbnail_url || "https://via.placeholder.com/600x400"}
                    alt={blog.slug}
                    className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-lg sm:text-xl font-semibold text-[#2c3e50] group-hover:text-[#c5c107] transition mb-2">
                    {blog.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    {getTextPreview(blog.content)}
                  </p>
                  <p className="text-xs text-gray-500 mt-auto">
                    🕒 {new Date(blog.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {blogs.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              No blogs available yet.
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-[#111] text-[#cecece] py-12 mt-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 px-6">
            <div className="space-y-3">
              <h4 className="text-sm uppercase font-bold tracking-wide text-white">
                Join our community
              </h4>
              <p className="text-sm">
                Get updates on the latest movies, blogs, and entertainment news.
              </p>
            </div>
            <div className="flex justify-center items-center">
              <h1 className="text-white text-5xl sm:text-6xl font-extrabold tracking-tight italic">
                ANCHOR
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <Link to="/about" className="hover:text-white block">
                  About Us
                </Link>
                <Link to="/contact" className="hover:text-white block">
                  Contact
                </Link>
                <Link to="/blogs" className="hover:text-white block">
                  Blogs
                </Link>
                <a
                  href="https://t.me/AnchorMovies"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white block"
                >
                  Telegram
                </a>
              </div>
              <div className="space-y-2">
                <a href="#" className="hover:text-white block">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-white block">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-white block">
                  Refund Policy
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-700 pt-4 text-center text-sm text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} AnchorMovies. All Rights Reserved.
            </p>
            <div className="flex justify-center gap-5 mt-2 text-sm font-medium">
              <a href="https://instagram.com" target="_blank" className="hover:text-white">
                Instagram
              </a>
              <a href="https://twitter.com" target="_blank" className="hover:text-white">
                Twitter
              </a>
              <a href="https://facebook.com" target="_blank" className="hover:text-white">
                Facebook
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default BlogList;
