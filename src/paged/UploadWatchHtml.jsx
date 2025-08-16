import React, { useState, useContext, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

const UploadWatchHtml = () => {
  const { userData } = useContext(AppContext);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [loading, setLoading] = useState(false);

  const [watchList, setWatchList] = useState([]);
  const [search, setSearch] = useState("");

  // ✅ Check admin
  if (userData?.email !== "sanjusanjay0444@gmail.com") {
    return (
      <div className="text-center mt-20 text-red-500 font-bold text-xl">
        🚫 Access Denied – Admins Only
      </div>
    );
  }

  // ✅ Fetch all watch pages
  const fetchWatchPages = async () => {
    const { data, error } = await supabase
      .from("watch_html")
      .select("id, title, slug, created_at")
      .order("created_at", { ascending: false });

    if (error) console.error(error.message);
    else setWatchList(data);
  };

  useEffect(() => {
    fetchWatchPages();
  }, []);

  // ✅ Handle Upload
  const handleUpload = async () => {
    if (!title.trim() || !slug.trim() || !htmlCode.trim()) {
      return toast.error("❌ All fields are required!");
    }
    setLoading(true);

    const record = {
      id: uuidv4(),
      title: title.trim(),
      slug: slug.trim(),
      html_code: htmlCode.trim(),
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
      fetchWatchPages(); // refresh list
    }
    setLoading(false);
  };

  // ✅ Handle Delete
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

  // ✅ Handle Edit
  const handleEdit = async (id) => {
    const current = watchList.find((item) => item.id === id);
    if (!current) return;

    const newTitle = prompt("✏️ Edit Title:", current.title);
    if (!newTitle) return;

    const { error } = await supabase
      .from("watch_html")
      .update({ title: newTitle })
      .eq("id", id);

    if (error) {
      console.error(error.message);
      toast.error("⚠️ Failed to update!");
    } else {
      toast.success("✅ Title updated!");
      fetchWatchPages();
    }
  };

  // ✅ Filter list with search
  const filteredList = watchList.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 text-white shadow-xl rounded-xl p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">
        🎬 Upload Watch HTML
      </h1>

      {/* Title */}
      <div className="mb-5">
        <label className="block font-semibold mb-2">Movie Title</label>
        <input
          type="text"
          className="border border-gray-700 bg-gray-800 p-3 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter movie title"
        />
      </div>

      {/* Slug */}
      <div className="mb-5">
        <label className="block font-semibold mb-2">Slug (unique)</label>
        <input
          type="text"
          className="border border-gray-700 bg-gray-800 p-3 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="unique-slug"
        />
      </div>

      {/* HTML Code */}
      <div className="mb-5">
        <label className="block font-semibold mb-2">Watch HTML Code</label>
        <textarea
          className="border border-gray-700 bg-gray-800 p-3 rounded w-full font-mono focus:ring-2 focus:ring-blue-500 outline-none"
          rows={10}
          value={htmlCode}
          onChange={(e) => setHtmlCode(e.target.value)}
          placeholder="<iframe src='...'></iframe>"
        />
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 transition text-white px-6 py-3 rounded-lg font-semibold w-full shadow-md"
      >
        {loading ? "⏳ Uploading..." : "🚀 Upload HTML"}
      </button>

      {/* Search + List */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4 text-green-400">
          📌 Recently Uploaded
        </h2>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="🔍 Search by title..."
          className="border border-gray-700 bg-gray-800 p-3 rounded w-full mb-4 outline-none focus:ring-2 focus:ring-green-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredList.length === 0 ? (
          <p className="text-gray-400">No results found.</p>
        ) : (
          <ul className="space-y-3">
            {filteredList.map((item) => (
              <li
                key={item.id}
                className="bg-gray-800 p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-400">/{item.slug}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(item.id)}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UploadWatchHtml;
