import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { AppContext } from "../context/AppContext";

const AdminStories = () => {
  const { userData } = useContext(AppContext);
  const [title, setTitle] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [quality, setQuality] = useState("");
  const [language, setLanguage] = useState("");
  const [size, setSize] = useState("");
  const [genre, setGenre] = useState("");
  const [imdb, setImdb] = useState("");
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select('id, title, poster_url, quality, language, size, genre, imdb, created_at');
  
    if (error) {
      toast.error("Failed to load stories");
      console.error("Supabase Error:", error);
      return;
    }
  
    const now = new Date();
    const expired = data.filter((story) => (now - new Date(story.created_at)) / (1000 * 60 * 60) >= 24);
    if (expired.length) {
      const idsToDelete = expired.map((s) => s.id);
      await supabase.from("stories").delete().in("id", idsToDelete);
    }
  
    const validStories = data.filter((story) => (now - new Date(story.created_at)) / (1000 * 60 * 60) < 24);
    setStories(validStories);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !posterUrl.trim()) {
      return toast.error("Please fill title and poster");
    }

    setLoading(true);

    const storyData = {
      title,
      poster_url: posterUrl.trim(),
      quality,
      language,
      size,
      genre,
      imdb,
      uploaded_by: userData?.email || "unknown",
      show_on_homepage: true,
    };

    const { error } = editingId
      ? await supabase.from("stories").update(storyData).eq("id", editingId)
      : await supabase.from("stories").insert([storyData]);

    if (error) toast.error(editingId ? "Update failed" : "Upload failed");
    else toast.success(editingId ? "Story updated" : "Story added");

    setTitle("");
    setPosterUrl("");
    setQuality("");
    setLanguage("");
    setSize("");
    setGenre("");
    setImdb("");
    setEditingId(null);
    fetchStories();
    setLoading(false);
  };

  const handleEdit = (story) => {
    setEditingId(story.id);
    setTitle(story.title);
    setPosterUrl(story.poster_url);
    setQuality(story.quality || "");
    setLanguage(story.language || "");
    setSize(story.size || "");
    setGenre(story.genre || "");
    setImdb(story.imdb || "");
  };

  const handleDelete = async (id, createdAt) => {
    const storyTime = new Date(createdAt);
    const now = new Date();
    if ((now - storyTime) / (1000 * 60 * 60) < 24) {
      toast.warn("⏳ Cannot delete before 24 hours");
      return;
    }

    if (!window.confirm("Are you sure to delete this story?")) return;

    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Deleted successfully");
      fetchStories();
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto text-white">
        <h1 className="text-2xl font-bold mb-6">
          📸 {editingId ? "Edit Story" : "Upload Story (with Metadata)"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded shadow border border-gray-800">
          <input type="text" placeholder="🎬 Title" className="w-full p-3 bg-gray-800 rounded" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="text" placeholder="🖼️ Poster URL" className="w-full p-3 bg-gray-800 rounded" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} />
          <input type="text" placeholder="🎞️ Quality (480p | 720p | 1080p)" className="w-full p-3 bg-gray-800 rounded" value={quality} onChange={(e) => setQuality(e.target.value)} />
          <input type="text" placeholder="🗣️ Language (Kannada, Tamil)" className="w-full p-3 bg-gray-800 rounded" value={language} onChange={(e) => setLanguage(e.target.value)} />
          <input type="text" placeholder="📦 Size (450MB | 1.2GB)" className="w-full p-3 bg-gray-800 rounded" value={size} onChange={(e) => setSize(e.target.value)} />
          <input type="text" placeholder="📚 Genre (Action, Drama)" className="w-full p-3 bg-gray-800 rounded" value={genre} onChange={(e) => setGenre(e.target.value)} />
          <input type="text" placeholder="⭐ IMDB Rating (7.3/10)" className="w-full p-3 bg-gray-800 rounded" value={imdb} onChange={(e) => setImdb(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-lg">
            {loading ? (editingId ? "Updating..." : "Uploading...") : (editingId ? "Update Story" : "Upload Story")}
          </button>
        </form>

        {editingId && (
          <button onClick={() => {
            setEditingId(null);
            setTitle(""); setPosterUrl(""); setQuality("");
            setLanguage(""); setSize(""); setGenre(""); setImdb("");
          }}
          className="mt-3 text-sm underline text-gray-300 hover:text-red-400">
            Cancel Edit
          </button>
        )}

        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">🎞️ Recent Stories</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {stories.map((s) => (
              <div key={s.id} className="bg-gray-800 rounded p-3 text-center">
                <img src={s.poster_url} alt={s.title} className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 mx-auto mb-2" />
                <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                <div className="text-xs text-gray-400 mt-2 leading-tight">
                  <p>🎞 {s.quality}</p>
                  <p>🗣 {s.language}</p>
                  <p>📦 {s.size}</p>
                  <p>📚 {s.genre}</p>
                  <p>⭐ {s.imdb}</p>
                </div>
                <div className="flex justify-center gap-2 mt-3">
                  <button onClick={() => handleEdit(s)} className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">✏️ Edit</button>
                  <button onClick={() => handleDelete(s.id, s.created_at)} className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStories;
