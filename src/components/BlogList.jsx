import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

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
    <div className="p-4 max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">📚 Blog Articles</h1>
      {blogs.map((blog) => (
        <Link
          key={blog.id}
          to={`/blogs/${blog.slug}`}
          className="block border-b border-gray-700 py-3 hover:bg-gray-800"
        >
          <h2 className="text-xl font-semibold">{blog.title}</h2>
          <p className="text-gray-400">{getTextPreview(blog.content)}</p>
        </Link>
      ))}
    </div>
  );
};

export default BlogList;
