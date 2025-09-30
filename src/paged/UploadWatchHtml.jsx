import React, { useState, useContext, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";

// ================== Main Upload Component ==================
const UploadWatchHtml = () => {
  const { userData } = useContext(AppContext);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [htmlCode2, setHtmlCode2] = useState(""); // ✅ New Server 2
  const [poster, setPoster] = useState("");
  const [coverPoster, setCoverPoster] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");


  const navigate = useNavigate();

  const [watchList, setWatchList] = useState([]);
  const [search, setSearch] = useState("");

  if (userData?.email !== "sanjusanjay0444@gmail.com") {
    return (
      <div className="text-center mt-20 text-red-500 font-bold text-xl">
        🚫 Access Denied – Admins Only
      </div>
    );
  }

  // 📌 Fetch Movies
  const fetchWatchPages = async () => {
    const { data, error } = await supabase
      .from("watch_html")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error.message);
    else setWatchList(data);
  };

  useEffect(() => {
    fetchWatchPages();
  }, []);

  // 📌 Upload Movie
  const handleUpload = async () => {
    if (!title.trim() || !slug.trim() || !htmlCode.trim() || !poster.trim()) {
      return toast.error("❌ All fields are required!");
    }
    setLoading(true);

    const record = {
      id: uuidv4(),
      title: title.trim(),
      slug: slug.trim(),
      html_code: htmlCode.trim(),
      html_code2: htmlCode2.trim(),
      poster: poster.trim(),
      cover_poster: coverPoster.trim(),
      video_url: videoUrl.trim(), // ✅ NEW
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("watch_html").insert([record]);
    if (error) {
      console.error(error.message);
      toast.error("⚠️ Failed to upload!");
    } else {
      toast.success("✅ HTML Code Uploaded!");
      setTitle("");
      setSlug("");
      setHtmlCode("");
      setHtmlCode2("");
      setPoster("");
      setCoverPoster("");
      fetchWatchPages();
    }
    setLoading(false);
  };

  // 📌 Delete Movie
  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ Are you sure you want to delete this?")) return;

    const { error } = await supabase.from("watch_html").delete().eq("id", id);
    if (error) {
      console.error(error.message);
      toast.error("⚠️ Failed to delete!");
    } else {
      toast.success("🗑️ Deleted successfully!");
      setWatchList(watchList.filter((item) => item.id !== id));
    }
  };

  const filteredList = watchList.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <button
        onClick={() => navigate("/admin/dashboard")}
        className="mb-6 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md transition"
      >
        ⬅️ Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">
        🎬 Upload Watch HTML
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="bg-gray-900 text-white shadow-xl rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-300">
            ➕ Add New Movie
          </h2>

          {/* Movie Form */}
          <div className="mb-5">
            <label className="block font-semibold mb-2">Movie Title</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-800 p-3 rounded w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter movie title"
            />
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">Slug (unique)</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-800 p-3 rounded w-full"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="unique-slug"
            />
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">Cover Poster URL</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-800 p-3 rounded w-full"
              value={coverPoster}
              onChange={(e) => setCoverPoster(e.target.value)}
              placeholder="https://example.com/cover-poster.jpg"
            />
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">Poster URL</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-800 p-3 rounded w-full"
              value={poster}
              onChange={(e) => setPoster(e.target.value)}
              placeholder="https://example.com/poster.jpg"
            />
          </div>

          <div className="mb-5">
  <label className="block font-semibold mb-2">Video URL</label>
  <input
    type="text"
    className="border border-gray-700 bg-gray-800 p-3 rounded w-full"
    value={videoUrl}
    onChange={(e) => setVideoUrl(e.target.value)}
    placeholder="https://example.com/video.mp4"
  />
  
</div>



          <div className="mb-5">
            <label className="block font-semibold mb-2">
              Watch HTML Code (Server 1)
            </label>
            <textarea
              className="border border-gray-700 bg-gray-800 p-3 rounded w-full font-mono"
              rows={5}
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="<iframe src='...'></iframe>"
            />
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">
              Watch HTML Code (Server 2)
            </label>
            <textarea
              className="border border-gray-700 bg-gray-800 p-3 rounded w-full font-mono"
              rows={5}
              value={htmlCode2}
              onChange={(e) => setHtmlCode2(e.target.value)}
              placeholder="<iframe src='...'></iframe>"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 transition text-white px-6 py-3 rounded-lg font-semibold w-full"
          >
            {loading ? "⏳ Uploading..." : "🚀 Upload HTML"}
          </button>
        </div>

        {/* Right Panel */}
        <div className="bg-gray-900 text-white shadow-xl rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-400">
            📌 Recently Uploaded
          </h2>

          <input
            type="text"
            placeholder="🔍 Search by title..."
            className="border border-gray-700 bg-gray-800 p-3 rounded w-full mb-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filteredList.length === 0 ? (
            <p className="text-gray-400">No results found.</p>
          ) : (
            <ul className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredList.map((item) => (
                <EditableItem
                  key={item.id}
                  item={item}
                  fetchWatchPages={fetchWatchPages}
                  handleDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
    
  );
};

export default UploadWatchHtml;

// ================== Inline Editable Item ==================
const EditableItem = ({ item, fetchWatchPages, handleDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editSlug, setEditSlug] = useState(item.slug);
  const [editPoster, setEditPoster] = useState(item.poster || "");
  const [editCoverPoster, setEditCoverPoster] = useState(item.cover_poster || "");
  const [editHtml, setEditHtml] = useState(item.html_code || "");
  const [editHtml2, setEditHtml2] = useState(item.html_code2 || "");
  const [editVideoUrl, setEditVideoUrl] = useState(item.video_url || "");


  // 📌 Episodes
  const [episodes, setEpisodes] = useState([]);
  const [newEpisodes, setNewEpisodes] = useState([{ title: "", html: "" }]);

  // Fetch episodes
  const fetchEpisodes = async () => {
    const { data, error } = await supabase
      .from("watch_episodes")
      .select("*")
      .eq("watch_id", item.id)
      .order("created_at", { ascending: true });

    if (!error) setEpisodes(data);
  };

  useEffect(() => {
    fetchEpisodes();
  }, []);

  // 💾 Save Movie
  const handleSave = async () => {
    const { error } = await supabase
  .from("watch_html")
  .update({
    title: editTitle.trim(),
    slug: editSlug.trim(),
    poster: editPoster.trim(),
    cover_poster: editCoverPoster.trim(),
    html_code: editHtml.trim(),
    html_code2: editHtml2.trim(),
    video_url: editVideoUrl.trim(), // ✅ NEW
  })
  .eq("id", item.id);


    if (error) toast.error("⚠️ Failed to update!");
    else {
      toast.success("✅ Updated successfully!");
      setIsEditing(false);
      fetchWatchPages();
    }
  };

  // ➕ Add Episode Input Field
  const handleAddEpisodeField = () => {
    setNewEpisodes([...newEpisodes, { title: "", html: "" }]);
  };

  // Change new episode input
  const handleEpisodeChange = (index, field, value) => {
    const updated = [...newEpisodes];
    updated[index][field] = value;
    setNewEpisodes(updated);
  };

  // 💾 Save Episodes
  const handleSaveEpisodes = async () => {
    const validEpisodes = newEpisodes.filter(
      (ep) => ep.title.trim() && ep.html.trim()
    );
    if (validEpisodes.length === 0) {
      return toast.error("❌ Please fill at least one episode!");
    }

    const records = validEpisodes.map((ep) => ({
      id: uuidv4(),
      watch_id: item.id,
      episode_title: ep.title.trim(),
      episode_html: ep.html.trim(),
    }));

    const { error } = await supabase.from("watch_episodes").insert(records);

    if (error) toast.error("⚠️ Failed to add episodes!");
    else {
      toast.success(`✅ ${records.length} episode(s) added!`);
      setNewEpisodes([{ title: "", html: "" }]);
      fetchEpisodes();
    }
  };

  // 🗑️ Delete Episode
  const handleDeleteEpisode = async (id) => {
    if (!window.confirm("Delete this episode?")) return;
    const { error } = await supabase.from("watch_episodes").delete().eq("id", id);
    if (error) toast.error("⚠️ Failed to delete episode!");
    else {
      toast.success("🗑️ Episode deleted!");
      setEpisodes(episodes.filter((ep) => ep.id !== id));
    }
  };

  return (
    <li className="bg-gray-800 p-4 rounded-lg flex flex-col gap-3">
      {isEditing ? (
        // ✏️ Edit Mode
        <div className="flex flex-col gap-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white"
          />
          <input
            value={editSlug}
            onChange={(e) => setEditSlug(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white"
          />
          <input
            value={editCoverPoster}
            onChange={(e) => setEditCoverPoster(e.target.value)}
            placeholder="Cover Poster URL"
            className="p-2 rounded bg-gray-700 text-white"
          />
          <input
            value={editPoster}
            onChange={(e) => setEditPoster(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white"
          />
          <input
  value={editVideoUrl}
  onChange={(e) => setEditVideoUrl(e.target.value)}
  placeholder="Video URL"
  className="p-2 rounded bg-gray-700 text-white"
/>

          <textarea
            value={editHtml}
            onChange={(e) => setEditHtml(e.target.value)}
            rows={3}
            className="p-2 rounded bg-gray-700 text-white"
            placeholder="Server 1 iframe"
          />
          <textarea
            value={editHtml2}
            onChange={(e) => setEditHtml2(e.target.value)}
            rows={3}
            className="p-2 rounded bg-gray-700 text-white"
            placeholder="Server 2 iframe"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
            >
              💾 Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      ) : (
        // Normal View
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-gray-400">/{item.slug}</p>
            {item.poster && (
              <img
                src={item.poster}
                alt={item.title + " cover"}
                className="w-20 h-28 object-cover mt-1 rounded"
                onError={(e) => (e.currentTarget.src = "/default-poster.jpg")}
              />
            )}
            {item.video_url && (
  <video
    src={item.video_url}
    controls
    className="w-32 h-20 object-cover mt-2 rounded"
  />
)}

          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded"
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}

      {/* 🎬 Episodes */}
      <div className="mt-3 border-t border-gray-700 pt-3">
        <h3 className="font-semibold text-blue-300 mb-2">📺 Episodes</h3>

        {episodes.length === 0 ? (
          <p className="text-gray-400 text-sm">No episodes yet.</p>
        ) : (
          <ul className="space-y-2">
            {episodes.map((ep) => (
              <li
                key={ep.id}
                className="flex justify-between bg-gray-700 px-3 py-2 rounded"
              >
                <span>{ep.episode_title}</span>
                <button
                  onClick={() => handleDeleteEpisode(ep.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add Episodes */}
        <div className="mt-3 flex flex-col gap-3">
          {newEpisodes.map((ep, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 bg-gray-700 p-3 rounded"
            >
              <input
                value={ep.title}
                onChange={(e) =>
                  handleEpisodeChange(index, "title", e.target.value)
                }
                placeholder={`Episode Title ${index + 1}`}
                className="p-2 rounded bg-gray-800 text-white"
              />
              <textarea
                value={ep.html}
                onChange={(e) =>
                  handleEpisodeChange(index, "html", e.target.value)
                }
                placeholder="<iframe src='...'></iframe>"
                rows={2}
                className="p-2 rounded bg-gray-800 text-white"
              />
            </div>
          ))}

          <div className="flex gap-2">
            <button
              onClick={handleAddEpisodeField}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-2 rounded w-full"
            >
              ➕ Add Another Episode Field
            </button>
            <button
              onClick={handleSaveEpisodes}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded w-full"
            >
              💾 Save Episodes
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};
