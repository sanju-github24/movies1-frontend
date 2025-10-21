import React, { useState, useEffect, useContext } from "react";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import AdminLayout from "./AdminLayout";

const BlogEditor = () => {
  const { userData } = useContext(AppContext);
  const [form, setForm] = useState({
    title: "",
    tags: "",
    related_movie_ids: "",
    is_trending: false,
  });

  const [loading, setLoading] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    fetchMovies();
    fetchBlogs();
  }, []);

  // Fetch all movies from watch_html table
  const fetchMovies = async () => {
    const { data, error } = await supabase.from("watch_html").select("id, title, slug, cover_poster");
    if (error) toast.error("Failed to fetch movies");
    else setMovies(data || []);
  };

  // Fetch existing blogs
  const fetchBlogs = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch blogs");
    else setBlogs(data || []);
  };

  // Generate content + slug automatically (no poster/thumbnail stored)
  const generateBlogPayload = (movieIds, title, tags, isTrending) => {
    const selectedMovies = movies.filter((m) => movieIds.includes(m.id));
    if (selectedMovies.length === 0) return null;

    const firstMovie = selectedMovies[0];
    const content = selectedMovies
      .map(
        (m) => `
<h2>${m.title}</h2>
<a href="/watch/${m.slug}">
  <img src="${m.cover_poster}" alt="${m.title}" style="width:200px;border-radius:8px;"/>
</a>
<p>Watch Here: <a href="/watch/${m.slug}">${m.title}</a></p>
<hr/>
`
      )
      .join("\n");

    return {
      title,
      slug: firstMovie.slug,
      content,
      tags,
      related_movie_ids: movieIds,
      is_trending: isTrending,
    };
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const related_movie_ids = form.related_movie_ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (related_movie_ids.length === 0) {
      toast.error("Please select at least one movie");
      return;
    }

    const payload = generateBlogPayload(
      related_movie_ids,
      form.title,
      tags,
      form.is_trending
    );
    if (!payload) {
      toast.error("Error creating blog payload");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("blogs").insert([payload]);
    setLoading(false);

    if (error) toast.error("Error saving blog: " + error.message);
    else {
      toast.success("✅ Blog created successfully!");
      setForm({ title: "", tags: "", related_movie_ids: "", is_trending: false });
      fetchBlogs();
    }
  };

  // Delete blog
  const handleDelete = async (id) => {
    const { error } = await supabase.from("blogs").delete().eq("id", id);
    if (error) toast.error("Failed to delete blog");
    else {
      toast.success("🗑 Blog deleted");
      fetchBlogs();
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto text-white">
        <h1 className="text-2xl font-bold mb-6">📝 Quick Blog Creator</h1>

        {/* Minimal Blog Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 mb-10 bg-gray-900 p-6 rounded-lg shadow border border-gray-800"
        >
          <input
            type="text"
            placeholder="Blog Title"
            className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <input
            type="text"
            placeholder="Tags (comma-separated)"
            className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />

          <select
            multiple
            value={form.related_movie_ids.split(",").filter(Boolean)}
            onChange={(e) =>
              setForm({
                ...form,
                related_movie_ids: Array.from(e.target.selectedOptions)
                  .map((o) => o.value)
                  .join(","),
              })
            }
            className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400 h-40"
          >
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isTrending"
              checked={form.is_trending}
              onChange={(e) =>
                setForm({ ...form, is_trending: e.target.checked })
              }
            />
            <label htmlFor="isTrending" className="text-sm">
              Mark as Trending
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Submitting..." : "Create Blog"}
          </button>
        </form>

        {/* Display Blogs */}
        <h2 className="text-xl font-bold mb-4">📚 Existing Blogs</h2>
        {blogs.length === 0 ? (
          <p className="text-gray-400">No blogs found.</p>
        ) : (
          <div className="space-y-4">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-gray-800 p-4 rounded shadow border border-gray-700"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {blog.title}
                    {blog.is_trending && (
                      <span className="bg-green-300 text-green-900 text-xs font-semibold px-2 py-0.5 rounded">
                        Trending
                      </span>
                    )}
                  </h3>
                </div>
                <div
                  className="mt-2 text-gray-300 text-sm"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />
                <button
                  onClick={() => handleDelete(blog.id)}
                  className="mt-3 bg-red-600 px-3 py-1 rounded text-sm text-white"
                >
                  🗑 Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default BlogEditor;
