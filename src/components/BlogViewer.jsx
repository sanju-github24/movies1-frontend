import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

const BlogViewer = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlog();
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
    }
  };

  if (error) {
    return <div className="text-red-600 text-center py-6">{error}</div>;
  }

  if (!blog) {
    return <div className="text-gray-600 text-center py-6">Loading blog...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800">{blog.title}</h1>

        {blog.thumbnail_url && (
          <img
            src={blog.thumbnail_url}
            alt={blog.title}
            className="w-full max-h-[400px] object-cover rounded mb-8 shadow"
            loading="lazy"
          />
        )}

        {/* Blog HTML content */}
        {blog.content ? (
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        ) : (
          <p className="text-gray-500 italic">No content available.</p>
        )}

        {/* Tags */}
        {blog.tags?.length > 0 && (
          <div className="mt-10 border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Tags:</h4>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag, i) => (
                <span
                  key={i}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogViewer;
;
