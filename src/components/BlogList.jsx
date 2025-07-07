import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { Helmet } from "react-helmet";


// Helper function to strip HTML and generate a clean text preview
const getTextPreview = (html, maxLength = 150) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = div.textContent || div.innerText || "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Failed to fetch blogs:", error.message);
    else setBlogs(data || []);
  };

  return (
    <>
    <Helmet>
  <title>Movie Blogs & Reviews | 1AnchorMovies</title>
  <meta
    name="description"
    content="Read the latest blogs, reviews, and updates on Tamil, Telugu, Kannada, and Malayalam movies at 1AnchorMovies."
  />
  <link rel="canonical" href="https://www.1anchormovies.live/blogs" />
</Helmet>




    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">📚 Latest Blog Articles</h1>

      <div className="grid gap-6">
        {blogs.map((blog) => (
          <Link
            key={blog.id}
            to={`/blogs/${blog.slug}`}
            className="flex flex-col sm:flex-row bg-white/5 hover:bg-white/10 transition p-5 rounded-lg shadow border border-white/10 gap-4"
          >
            {/* Thumbnail */}
            <div className="w-full sm:w-40 h-32 flex-shrink-0 overflow-hidden rounded">
              <img
                src={blog.thumbnail_url || "https://via.placeholder.com/150"}
                alt={blog.title}
                className="w-full h-full object-cover rounded"
              />
            </div>

            {/* Blog Content */}
            <div className="flex-1 text-white">
              <h2 className="text-xl font-semibold mb-1">{blog.title}</h2>
              <p className="text-sm text-gray-300 mb-2">{getTextPreview(blog.content)}</p>
              <p className="text-xs text-gray-400">
                🕒 {new Date(blog.created_at).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
    </>
  );
};

export default BlogList;

