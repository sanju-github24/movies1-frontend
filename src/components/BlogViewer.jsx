import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

const BlogViewer = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
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
      fetchNextBlog(data.created_at); // Load next blog
    }
  };

  const fetchNextBlog = async (createdAt) => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, slug, title, thumbnail_url")
      .gt("created_at", createdAt)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!error && data.length > 0) {
      setNextBlog(data[0]);
    }
  };

  const fetchRecentBlogs = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, slug, title, thumbnail_url, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (!error) {
      setRecentBlogs(data);
    }
  };

  if (error) return <div className="text-red-500 text-center py-6">{error}</div>;
  if (!blog) return <div className="text-gray-400 text-center py-6">Loading blog...</div>;

  return (
    <div className="bg-black text-white min-h-screen py-10 px-4 sm:px-6 lg:px-8">

      {/* Navbar */}
      <header className="bg-black border-b border-white/10 mb-6">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-1">
            <img src="/Logo_6.png" alt="AnchorMovies Logo" className="h-8 sm:h-10 object-contain w-auto" />
            <span className="text-xl sm:text-2xl font-bold text-white hidden sm:inline">
              <span className="text-blue-500">Movies</span>
            </span>
          </Link>
          <nav className="flex gap-4 text-sm sm:text-base">
            <Link to="/" className="text-gray-300 hover:text-white transition">Home</Link>
            <Link to="/blogs" className="text-gray-300 hover:text-white transition">All Blogs</Link>
            <Link to="/about" className="text-gray-300 hover:text-white transition">About</Link>
            <Link to="/contact" className="text-gray-300 hover:text-white transition">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Blog Thumbnail */}
      {blog.thumbnail_url && (
        <div className="relative w-full max-w-4xl mx-auto h-[220px] sm:h-[300px] md:h-[360px] lg:h-[400px] rounded-xl overflow-hidden shadow-lg mb-10">
          <img src={blog.thumbnail_url} alt={blog.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end px-6 pb-6">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white drop-shadow-lg">
              {blog.title}
            </h1>
          </div>
        </div>
      )}

      {/* Main Content & Sidebar */}
      <section className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-3 space-y-10">
          <article
            className="prose prose-xl prose-invert leading-relaxed prose-img:rounded-md prose-img:shadow-md prose-a:text-blue-400 max-w-none text-gray-200"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Tags */}
          {blog.tags?.length > 0 && (
            <div className="pt-8 border-t border-white/10">
              <h4 className="text-xl font-semibold mb-3">Tags:</h4>
              <div className="flex flex-wrap gap-3">
                {blog.tags.map((tag, i) => (
                  <span key={i} className="bg-blue-900 text-blue-200 px-4 py-1.5 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Next Blog Section */}
          {nextBlog && (
            <div className="mt-20 border-t border-white/10 pt-10">
              <h2 className="text-2xl font-bold mb-6">You might also like...</h2>
              <Link
                to={`/blogs/${nextBlog.slug}`}
                className="group block bg-white/5 hover:bg-white/10 transition rounded-xl overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-6">
                  <img
                    src={nextBlog.thumbnail_url || "https://via.placeholder.com/300"}
                    alt={nextBlog.title}
                    className="rounded-lg h-48 w-full object-cover shadow-md"
                  />
                  <div className="sm:col-span-2 flex flex-col justify-center">
                    <h3 className="text-xl sm:text-2xl font-semibold text-white group-hover:underline">
                      {nextBlog.title}
                    </h3>
                    <p className="text-gray-400 mt-2">Read the next blog post</p>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="md:col-span-1 sticky top-24 self-start space-y-4">
          <h3 className="text-xs uppercase tracking-wider font-bold border-b border-gray-500 pb-2 text-white">
            Trending Now
          </h3>
          {recentBlogs.map((item) => (
            <Link
              key={item.id}
              to={`/blogs/${item.slug}`}
              className="block hover:bg-white/10 p-4 rounded-xl transition duration-200"
            >
              <div className="flex flex-col items-start gap-4">
                <img
                  src={item.thumbnail_url || "https://via.placeholder.com/120"}
                  alt={item.title}
                  className="w-full h-40 object-cover rounded-lg shadow"
                />
                <div>
                  <h4 className="text-lg font-semibold text-white leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-400 mt-2">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </aside>
      </section>

      {/* Footer */}
      <footer className="bg-yellow-400 text-black py-12 mt-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
          <div className="space-y-3">
            <h4 className="font-bold uppercase text-sm tracking-wide">Join our community</h4>
            <p className="text-sm">Get updates on latest movies and blogs.</p>
          </div>
          <div className="flex justify-center items-center">
            <h1 className="text-white text-[80px] sm:text-[100px] font-extrabold italic leading-none tracking-tight">
              ANCHOR
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <Link to="/about" className="hover:underline block">About Us</Link>
              <Link to="/contact" className="hover:underline block">Contact</Link>
              <Link to="/blogs" className="hover:underline block">Blogs</Link>
              <a href="https://t.me/AnchorMovies" className="hover:underline block" target="_blank" rel="noreferrer">Telegram</a>
            </div>
            <div className="space-y-2">
              <a href="#" className="hover:underline block">Privacy Policy</a>
              <a href="#" className="hover:underline block">Terms of Service</a>
              <a href="#" className="hover:underline block">Refund Policy</a>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-black/20 pt-4 text-center text-sm text-black">
          <p>&copy; {new Date().getFullYear()} AnchorMovies. All Rights Reserved.</p>
          <div className="flex justify-center gap-4 mt-2 text-sm font-medium">
            <a href="https://instagram.com" target="_blank" className="hover:underline">Instagram</a>
            <a href="https://twitter.com" target="_blank" className="hover:underline">Twitter</a>
            <a href="https://facebook.com" target="_blank" className="hover:underline">Facebook</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default BlogViewer;
