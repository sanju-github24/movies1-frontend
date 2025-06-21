import React, { useState, useEffect, useContext } from "react";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";

const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

const BlogEditor = () => {
  const { userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    thumbnail_url: "",
    tags: "",
    related_movie_ids: "",
  });
  const [loading, setLoading] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const { quill, quillRef } = useQuill();

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    if (quill && editingId === null) {
      quill.root.innerHTML = ""; // Clear editor on fresh create
    }
  }, [quill, editingId]);

  const fetchBlogs = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) toast.error("Failed to fetch blogs");
    else setBlogs(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quill) return;

    const content = quill.root.innerHTML;
    const slug = slugify(form.title);
    const tags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    const related_movie_ids = form.related_movie_ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      slug,
      content,
      thumbnail_url: form.thumbnail_url,
      tags,
      related_movie_ids,
    };

    setLoading(true);
    const result = editingId
      ? await supabase.from("blogs").update(payload).eq("id", editingId)
      : await supabase.from("blogs").insert([payload]);

    if (result.error) {
      toast.error("Error saving blog: " + result.error.message);
    } else {
      toast.success(editingId ? "Blog updated!" : "Blog created!");
      setForm({
        title: "",
        thumbnail_url: "",
        tags: "",
        related_movie_ids: "",
      });
      if (quill) quill.root.innerHTML = "";
      setEditingId(null);
      fetchBlogs();
    }

    setLoading(false);
  };

  const handleEdit = (blog) => {
    setForm({
      title: blog.title,
      thumbnail_url: blog.thumbnail_url || "",
      tags: (blog.tags || []).join(", "),
      related_movie_ids: (blog.related_movie_ids || []).join(", "),
    });
    setEditingId(blog.id);
    if (quill) quill.root.innerHTML = blog.content || "";
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("blogs").delete().eq("id", id);
    if (error) toast.error("Failed to delete blog");
    else {
      toast.success("Blog deleted");
      fetchBlogs();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-100 text-black rounded-lg">
      <h1 className="text-2xl font-bold mb-4">{editingId ? "Edit Blog" : "Create New Blog"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-10">
        <input
          type="text"
          placeholder="Blog Title"
          className="w-full p-2 rounded border"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <div className="bg-white text-black rounded border p-2">
          <div ref={quillRef} style={{ height: 200 }} />
        </div>

        <input
          type="text"
          placeholder="Thumbnail URL"
          className="w-full p-2 rounded border"
          value={form.thumbnail_url}
          onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
        />
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          className="w-full p-2 rounded border"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
        />
        <input
          type="text"
          placeholder="Related Movie IDs (UUIDs, comma-separated)"
          className="w-full p-2 rounded border"
          value={form.related_movie_ids}
          onChange={(e) => setForm({ ...form, related_movie_ids: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Submitting..." : editingId ? "Update Blog" : "Create Blog"}
        </button>
      </form>

      <h2 className="text-xl font-bold mb-4">📝 Existing Blogs</h2>
      {blogs.length === 0 ? (
        <p>No blogs found.</p>
      ) : (
        <div className="space-y-4">
          {blogs.map((blog) => (
            <div key={blog.id} className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-1">{blog.title}</h3>

              <div
                className="text-gray-600 text-sm line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html:
                    blog.content.length > 150
                      ? blog.content.slice(0, 150) + "..."
                      : blog.content,
                }}
              />

              <div className="flex gap-2 mt-3">
                <button onClick={() => handleEdit(blog)} className="bg-yellow-500 px-3 py-1 rounded">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(blog.id)}
                  className="bg-red-600 px-3 py-1 rounded text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogEditor;
