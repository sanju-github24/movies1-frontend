import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { supabase } from "../utils/supabaseClient";


function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

const AdminUpload = () => {
  const { userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movies, setMovies] = useState([]);

  const [movie, setMovie] = useState({
    slug: "",
    title: "",
    poster: "",
    description: "",
    categories: [],
    subCategory: [],
    language: [],
    downloads: [],
    linkColor: "#60a5fa"
  });

  const [downloadBlocks, setDownloadBlocks] = useState([
    { quality: "", size: "", format: "", file: null, manualUrl: "", gpLink: "", showGifAfter: false }
  ]);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    const { data, error } = await supabase.from("movies").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Failed to load movies");
    else setMovies(data || []);
  };

  const resetForm = () => {
    setMovie({
      slug: "",
      title: "",
      poster: "",
      description: "",
      categories: [],
      subCategory: [],
      language: [],
      downloads: [],
      linkColor: "#60a5fa"
    });
    setDownloadBlocks([
      { quality: "", size: "", format: "", file: null, manualUrl: "", gpLink: "", showGifAfter: false }
    ]);
    setEditingMovieId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { title, poster, description, categories, subCategory, language } = movie;

    if (!title.trim() || !poster.trim() || !description.trim()) {
      toast.error("Please fill in Title, Poster, and Description.");
      setLoading(false);
      return;
    }

    if (!categories.length || !subCategory.length || !language.length) {
      toast.error("Please fill in all category, subcategory, and language fields.");
      setLoading(false);
      return;
    }

    const slug = editingMovieId ? movie.slug : slugify(title);
    const uploaded_by = userData?.email || "unknown";

    const validBlocks = downloadBlocks.filter(
      (b) => b.quality && b.size && b.format && (b.file || b.manualUrl || b.gpLink)
    );

    if (!validBlocks.length) {
      toast.error("At least one valid download block is required.");
      setLoading(false);
      return;
    }

    const updatedDownloads = await Promise.all(
      validBlocks.map(async (block) => {
        if (block.file) {
          const fileName = block.file.name;
          if (!fileName.endsWith(".torrent")) {
            toast.error("Only .torrent files are allowed.");
            return null;
          }

          const timestamp = Date.now();
          const safeSlug = slug.replace(/[^a-z0-9\-]/gi, "_");
          const newFileName = `${block.quality}_${block.size}.torrent`;
          const filePath = `files/${timestamp}_${safeSlug}/${newFileName}`;

          const { error: uploadError } = await supabase.storage
            .from("torrents")
            .upload(filePath, block.file, { upsert: true });

          if (uploadError) {
            toast.error(`Failed to upload ${fileName}`);
            return null;
          }

          return {
            quality: block.quality,
            size: block.size,
            format: block.format,
            url: `${supabase.storageUrl}/object/public/torrents/${filePath}`,
            filename: newFileName,
            gpLink: block.gpLink || "",
            showGifAfter: block.showGifAfter || false
          };
        } else {
          const url = block.manualUrl || block.gpLink;
          return {
            quality: block.quality,
            size: block.size,
            format: block.format,
            url,
            filename: url.split("/").pop(),
            gpLink: block.gpLink || "",
            showGifAfter: block.showGifAfter || false
          };
        }
      })
    );

    const downloads = updatedDownloads.filter(Boolean);

    const movieData = {
      ...movie,
      slug,
      downloads,
      uploaded_by,
      ...(editingMovieId ? {} : { created_at: new Date().toISOString() })
    };

    const { error } = editingMovieId
      ? await supabase.from("movies").update(movieData).eq("id", editingMovieId)
      : await supabase.from("movies").insert([movieData]);

    if (error) {
      toast.error("Failed to save movie");
      console.error("Supabase error:", error.message);
    } else {
      toast.success(editingMovieId ? "Movie updated!" : "Movie uploaded!");
      resetForm();
      fetchMovies();
    }

    setLoading(false);
  };

  const handleEdit = (m) => {
    setEditingMovieId(m.id);
    setMovie({
      slug: m.slug,
      title: m.title,
      poster: m.poster,
      description: m.description,
      categories: m.categories || [],
      subCategory: m.subCategory || [],
      language: m.language || [],
      downloads: m.downloads || [],
      linkColor: m.linkColor || "#60a5fa"
    });

    setDownloadBlocks(
      m.downloads.length
        ? m.downloads.map((d) => ({
            quality: d.quality,
            size: d.size,
            format: d.format,
            file: null,
            manualUrl: d.url && !d.url.includes("supabase") ? d.url : "",
            gpLink: d.gpLink || "",
            showGifAfter: d.showGifAfter || false
          }))
        : [{ quality: "", size: "", format: "", file: null, manualUrl: "", gpLink: "", showGifAfter: false }]
    );
  };

  const handleDelete = async (slug) => {
    const { error } = await supabase.from("movies").delete().eq("slug", slug);
    if (error) toast.error("Failed to delete movie");
    else {
      toast.success("Movie deleted");
      fetchMovies();
    }
  };

  const handleDownloadChange = (i, field, value) => {
    const updated = [...downloadBlocks];
    updated[i][field] = value;
    setDownloadBlocks(updated);
  };

  const addDownloadBlock = () => {
    setDownloadBlocks([
      ...downloadBlocks,
      { quality: "", size: "", format: "", file: null, manualUrl: "", gpLink: "", showGifAfter: false }
    ]);
  };

  const removeDownloadBlock = (i) => {
    if (downloadBlocks.length > 1) {
      const updated = [...downloadBlocks];
      updated.splice(i, 1);
      setDownloadBlocks(updated);
    }
  };

  const filteredMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-6xl mx-auto text-white">
  
      {/* ---- Edit banner ---- */}
      {editingMovieId && (
        <div className="text-yellow-300 font-medium mb-4">
          ✏️ Editing: <strong>{movie.title}</strong>
          <button
            onClick={resetForm}
            className="ml-4 bg-red-500 px-2 py-1 rounded text-sm"
          >
            Cancel Edit
          </button>
        </div>
      )}
  
      {/* ---- Upload / Edit Form ---- */}
      <form onSubmit={handleSubmit} className="space-y-4">
  
        {/* search bar */}
        <input
          type="text"
          placeholder="Search movies…"
          className="p-2 bg-gray-800 rounded w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
  
        {/* core movie fields */}
        <input
          type="text"
          placeholder="Title"
          className="p-2 bg-gray-800 rounded w-full"
          value={movie.title}
          onChange={(e) =>
            setMovie((m) => ({ ...m, title: e.target.value, slug: slugify(e.target.value) }))
          }
        />
  
        <input
          type="text"
          placeholder="Poster URL"
          className="p-2 bg-gray-800 rounded w-full"
          value={movie.poster}
          onChange={(e) => setMovie((m) => ({ ...m, poster: e.target.value }))}
        />
  
        <textarea
          placeholder="Description"
          className="p-2 bg-gray-800 rounded w-full"
          rows={3}
          value={movie.description}
          onChange={(e) => setMovie((m) => ({ ...m, description: e.target.value }))}
        />
  
        {/* categories / subCats / languages */}
        <div className="grid grid-cols-3 gap-4">
          {["categories", "subCategory", "language"].map((key) => (
            <input
              key={key}
              type="text"
              placeholder={key}
              className="p-2 bg-gray-800 rounded"
              value={movie[key].join(",")}
              onChange={(e) =>
                setMovie((m) => ({
                  ...m,
                  [key]: e.target.value.split(",").map((x) => x.trim()),
                }))
              }
            />
          ))}
        </div>
  
        {/* link‑color picker */}
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={movie.linkColor}
            onChange={(e) => setMovie((m) => ({ ...m, linkColor: e.target.value }))}
          />
          <span className="text-sm">Choose Link Color</span>
        </div>
  
        {/* -------------- Download blocks -------------- */}
        <div className="space-y-3">
          {downloadBlocks.map((block, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
  
              {["quality", "size", "format"].map((field) => (
                <input
                  key={field}
                  type="text"
                  placeholder={field}
                  value={block[field]}
                  onChange={(e) => handleDownloadChange(i, field, e.target.value)}
                  className="p-2 bg-gray-800 rounded flex-1 min-w-[120px]"
                />
              ))}
  
              <input
                type="file"
                accept=".torrent"
                className="p-2 bg-gray-800 rounded flex-1 min-w-[160px]"
                onChange={(e) => handleDownloadChange(i, "file", e.target.files[0])}
              />
  
              <input
                type="text"
                placeholder="Manual URL"
                className="p-2 bg-gray-800 rounded flex-1 min-w-[160px]"
                value={block.manualUrl}
                onChange={(e) => handleDownloadChange(i, "manualUrl", e.target.value)}
              />
  
              <input
                type="text"
                placeholder="GP Link"
                className="p-2 bg-gray-800 rounded flex-1 min-w-[160px]"
                value={block.gpLink}
                onChange={(e) => handleDownloadChange(i, "gpLink", e.target.value)}
              />
  
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={block.showGifAfter}
                  onChange={(e) => handleDownloadChange(i, "showGifAfter", e.target.checked)}
                />
                Show GIF
              </label>
  
              <button
                type="button"
                onClick={() => removeDownloadBlock(i)}
                className="text-red-500 text-lg"
                disabled={downloadBlocks.length === 1}
              >
                ❌
              </button>
            </div>
          ))}
  
          <button
            type="button"
            onClick={addDownloadBlock}
            className="text-green-400 mt-2"
          >
            + Add Another Download
          </button>
        </div>
  
        {/* submit */}
        <button
          type="submit"
          className="bg-blue-600 px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Saving…" : editingMovieId ? "Update Movie" : "Upload Movie"}
        </button>
      </form>
  
      {/* ------ Recently Uploaded Movies ------ */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Recently Uploaded Movies</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMovies.length ? (
            filteredMovies.map((m) => (
              <div key={m.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                <img
                  src={m.poster || 'https://via.placeholder.com/300x400?text=No+Image'}
                  alt={m.title}
                  className="w-full h-56 object-cover rounded mb-2"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://via.placeholder.com/300x400?text=No+Image';
                  }}
                />
                <h3 className="text-lg font-semibold">{m.title}</h3>
                <p className="text-sm text-gray-400">
                  {(m.description || '').slice(0, 80)}…
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(m)}
                    className="bg-yellow-500 px-3 py-1 rounded text-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m.slug)}
                    className="bg-red-600 px-3 py-1 rounded text-sm"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No movies uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
  
};

export default AdminUpload;
