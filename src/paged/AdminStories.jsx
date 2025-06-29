import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { AppContext } from "../context/AppContext";

const AdminStories = () => {
  const { userData } = useContext(AppContext);
  const [title, setTitle] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null); // for edit mode

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });
  
    if (error) {
      toast.error("Failed to load stories");
      return;
    }
  
    const now = new Date();
  
    // Filter expired stories (older than 24 hours)
    const expired = data.filter((story) => {
      const storyTime = new Date(story.created_at);
      const diff = (now - storyTime) / (1000 * 60 * 60);
      return diff >= 24;
    });
  
    // Auto-delete expired stories
    if (expired.length) {
      const idsToDelete = expired.map((s) => s.id);
      const { error: deleteError } = await supabase
        .from("stories")
        .delete()
        .in("id", idsToDelete);
  
      if (deleteError) {
        toast.warn("⚠️ Some expired stories could not be auto-deleted");
      }
    }
  
    // Keep only non-expired stories
    const validStories = data.filter((story) => {
      const storyTime = new Date(story.created_at);
      const diff = (now - storyTime) / (1000 * 60 * 60);
      return diff < 24;
    });
  
    setStories(validStories);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !posterUrl.trim()) {
      return toast.error("Please provide both title and poster URL");
    }
  
    setLoading(true);
  
    if (editingId) {
      const { error } = await supabase
        .from("stories")
        .update({ title, poster_url: posterUrl.trim() })
        .eq("id", editingId);
  
      if (error) toast.error("Update failed");
      else toast.success("Story updated");
    } else {
      const { error } = await supabase.from("stories").insert([
        {
          title,
          poster_url: posterUrl.trim(),
          uploaded_by: userData?.email || "unknown",
          show_on_homepage: true,
        },
      ]);
  
      if (error) toast.error("Upload failed");
      else toast.success("Story added");
    }
  
    setTitle("");
    setPosterUrl("");
    setEditingId(null);
    fetchStories();
    setLoading(false);
  };
  
  const handleEdit = (story) => {
    setEditingId(story.id);
    setTitle(story.title);
    setPosterUrl(story.poster_url);
  };
  
  const handleDelete = async (id, createdAt) => {
    const storyTime = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now - storyTime) / (1000 * 60 * 60);
  
    if (hoursDiff < 24) {
      toast.warn("⏳ You can only delete this story after 24 hours.");
      return;
    }
  
    const confirm = window.confirm("Are you sure you want to delete this story?");
    if (!confirm) return;
  
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
        <h1 className="text-2xl font-bold mb-6">📸 {editingId ? "Edit Story" : "Upload Story (Poster URL)"}</h1>

        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded shadow border border-gray-800">
          <input
            type="text"
            placeholder="🎬 Movie Title"
            className="w-full p-3 bg-gray-800 rounded placeholder-gray-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="🖼️ Poster Image URL"
            className="w-full p-3 bg-gray-800 rounded placeholder-gray-400"
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-lg"
          >
            {loading ? (editingId ? "Updating..." : "Uploading...") : (editingId ? "Update Story" : "Upload Story")}
          </button>
        </form>

        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setTitle("");
              setPosterUrl("");
            }}
            className="mt-3 text-sm underline text-gray-300 hover:text-red-400"
          >
            Cancel Edit
          </button>
        )}

        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">🎞️ Recent Stories</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {stories.map((s) => (
              <div key={s.id} className="bg-gray-800 rounded p-3 text-center">
                <img
                  src={s.poster_url}
                  alt={s.title}
                  className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 mx-auto mb-2"
                />
                <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                <div className="flex justify-center gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(s)}
                    className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    ✏️ Edit
                  </button>
                  <button
  onClick={() => handleDelete(s.id, s.created_at)} // pass created_at
  className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
>
  🗑️ Delete
</button>

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
