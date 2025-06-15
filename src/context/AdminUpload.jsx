import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { supabase } from "../utils/supabaseClient";

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const AdminUpload = () => {
  const { userData } = useContext(AppContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingMovieId, setEditingMovieId] = useState(null);

  const [movie, setMovie] = useState({
    slug: "",
    title: "",
    poster: "",
    description: "",
    categories: [],
    subCategory: [],
    language: [],
    downloads: []
  });

  const [downloadBlocks, setDownloadBlocks] = useState([
    { quality: "", size: "", format: "", file: null, manualUrl: "" }
  ]);

  const [movies, setMovies] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load movies");
    } else {
      setMovies(data || []);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    // Validate fields
    if (!movie.title.trim() || !movie.poster.trim() || !movie.description.trim()) {
      toast.error("Please fill in all required fields (Title, Poster, Description)");
      setLoading(false);
      return;
    }
  
    if (!movie.categories.length || !movie.subCategory.length || !movie.language.length) {
      toast.error("Categories, SubCategories, and Language fields cannot be empty.");
      setLoading(false);
      return;
    }
  
    const validDownloadBlocks = downloadBlocks.filter((block) =>
      block.quality && block.size && block.format && (block.file || block.manualUrl)
    );
  
    if (!validDownloadBlocks.length) {
      toast.error("At least one valid download block is required.");
      setLoading(false);
      return;
    }
  
    // Slug & timestamp setup
    const nowISO = new Date().toISOString();
    const slug = slugify(movie.title);
    const uploaded_by = userData?.email || "unknown";
  
    const updatedDownloads = await Promise.all(
      validDownloadBlocks.map(async (block) => {
        if (block.file) {
          const fileName = block.file.name;
          if (!fileName.endsWith(".torrent")) {
            toast.error("Only .torrent files allowed.");
            return null;
          }
  
          const safeSlug = slug.replace(/[^a-z0-9\-]/gi, "_");
          const timestamp = Date.now();
          const newFileName = `${block.quality}_${block.size}.torrent`;
          const filePath = `files/${timestamp}_${safeSlug}/${newFileName}`;
  
          const { error: uploadError } = await supabase.storage
            .from("torrents")
            .upload(filePath, block.file, { upsert: true });
  
          if (uploadError) {
            toast.error(`Upload failed: ${fileName}`);
            return null;
          }
  
          return {
            quality: block.quality,
            size: block.size,
            format: block.format,
            url: `https://${supabase.supabaseUrl}/storage/v1/object/public/torrents/${filePath}`,
            filename: newFileName
          };
        } else {
          const filename = block.manualUrl.split("/").pop();
          return {
            quality: block.quality,
            size: block.size,
            format: block.format,
            url: block.manualUrl,
            filename
          };
        }
      })
    );
  
    const validDownloads = updatedDownloads.filter(Boolean);
  
    const fullMovie = {
      ...movie,
      slug,
      downloads: validDownloads,
      created_at: nowISO,
      uploaded_by
    };
  
    const response = editingMovieId
      ? await supabase.from("movies").update(fullMovie).eq("id", editingMovieId)
      : await supabase.from("movies").insert([fullMovie]);
  
    if (response.error) {
      toast.error("Upload failed");
      console.error("Upload error:", response.error.message);
    } else {
      toast.success(editingMovieId ? "Movie updated" : "Movie uploaded");
      resetForm();
      fetchMovies();
    }
    setLoading(false);
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
      downloads: []
    });
    setDownloadBlocks([{ quality: "", size: "", format: "", file: null, manualUrl: "" }]);
    setEditingMovieId(null);
  };

  const handleDelete = async (slug) => {
    const { data, error } = await supabase
      .from("movies")
      .select("downloads")
      .eq("slug", slug)
      .single();
    if (error) {
      toast.error("Failed to delete");
      return;
    }

    // Optionally remove from storage if you want
    await supabase.from("movies").delete().eq("slug", slug);
    toast.success("Deleted");
    fetchMovies();
  };

  const addDownloadBlock = () =>
    setDownloadBlocks((prev) => [
      ...prev,
      { quality: "", size: "", format: "", file: null, manualUrl: "" }
    ]);

  const removeDownloadBlock = (i) => {
    if (downloadBlocks.length > 1) {
      setDownloadBlocks((prev) => prev.filter((_, idx) => idx !== i));
    }
  };

  const handleDownloadChange = (i, field, value) => {
    const blocks = [...downloadBlocks];
    blocks[i][field] = value;
    setDownloadBlocks(blocks);
  };

  const handleEdit = (m) => {
    setEditingMovieId(m.id);
    setMovie({
      slug: m.slug,
      title: m.title,
      poster: m.poster,
      description: m.description,
      categories: m.categories,
      subCategory: m.subCategory,
      language: m.language,
      downloads: m.downloads
    });
    setDownloadBlocks(
      m.downloads.length
        ? m.downloads.map((d) => ({
            quality: d.quality,
            size: d.size,
            format: d.format,
            file: null,
            manualUrl: d.url && !d.url.includes(supabase.supabaseUrl) ? d.url : ""
          }))
        : [{ quality: "", size: "", format: "", file: null, manualUrl: "" }]
    );
  };

  const filtered = movies.filter(
    (m) =>
      (selectedLanguage === "all" || m.language.includes(selectedLanguage)) &&
      (selectedCategory === "all" || m.categories.includes(selectedCategory)) &&
      m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-6xl mx-auto text-white">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Search movies..."
          className="p-2 rounded bg-gray-800 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="text"
          placeholder="Title"
          className="p-2 rounded bg-gray-800 w-full"
          value={movie.title}
          onChange={(e) =>
            setMovie((m) => ({
              ...m,
              title: e.target.value,
              slug: slugify(e.target.value)
            }))
          }
        />
        <input
          type="text"
          placeholder="Poster URL"
          className="p-2 rounded bg-gray-800 w-full"
          value={movie.poster}
          onChange={(e) => setMovie((m) => ({ ...m, poster: e.target.value }))}
        />
        <textarea
          placeholder="Description"
          className="p-2 rounded bg-gray-800 w-full"
          value={movie.description}
          onChange={(e) => setMovie((m) => ({ ...m, description: e.target.value }))}
        />
        {/* Categories/Lang */}
        <div className="grid grid-cols-3 gap-4">
          {["categories", "subCategory", "language"].map((key) => (
            <input
              key={key}
              type="text"
              placeholder={key}
              className="p-2 rounded bg-gray-800"
              value={movie[key].join(",")}
              onChange={(e) =>
                setMovie((m) => ({
                  ...m,
                  [key]: e.target.value.split(",").map((x) => x.trim())
                }))
              }
            />
          ))}
        </div>

        {/* Download Blocks */}
        <div className="space-y-2">
          <label className="font-semibold">Downloads:</label>
          {downloadBlocks.map((block, i) => (
            <div key={i} className="flex gap-2 flex-wrap">
              {["quality", "size", "format"].map((f) => (
                <input
                  key={f}
                  type="text"
                  placeholder={f}
                  className="p-2 rounded bg-gray-800 flex-1"
                  value={block[f]}
                  onChange={(e) => handleDownloadChange(i, f, e.target.value)}
                />
              ))}
              <input
                type="file"
                accept=".torrent"
                className="p-2 rounded bg-gray-800 flex-1"
                onChange={(e) => handleDownloadChange(i, "file", e.target.files[0])}
              />
              <input
                type="text"
                placeholder="Manual .torrent URL"
                className="p-2 rounded bg-gray-800 flex-1"
                value={block.manualUrl}
                onChange={(e) => handleDownloadChange(i, "manualUrl", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeDownloadBlock(i)}
                className={`text-red-400 ${downloadBlocks.length === 1 ? "opacity-50" : ""}`}
                disabled={downloadBlocks.length === 1}
              >
                ❌
              </button>
            </div>
          ))}
          <button type="button" onClick={addDownloadBlock} className="text-green-400">
            + Add Another Download
          </button>
        </div>

        <button type="submit" disabled={loading} className="bg-blue-600 px-4 py-2 rounded">
          {loading ? "Saving..." : editingMovieId ? "Update Movie" : "Upload Movie"}
        </button>
      </form>

      <hr className="my-6 border-gray-700" />

      {/* Display List */}
      <h2 className="text-xl font-semibold">Uploaded Movies</h2>
      <div className="my-4 flex gap-4">
        {["all"].concat(...new Set(movies.flatMap((m) => m.language))).map((lang) => (
          <button
            key={lang}
            className={`px-2 py-1 rounded ${selectedLanguage === lang ? "bg-blue-500" : "bg-gray-600"}`}
            onClick={() => setSelectedLanguage(lang)}
          >
            {lang}
          </button>
        ))}
        {["all"].concat(...new Set(movies.flatMap((m) => m.categories))).map((cat) => (
          <button
            key={cat}
            className={`px-2 py-1 rounded ${selectedCategory === cat ? "bg-blue-500" : "bg-gray-600"}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
  {filtered.map((m) => (
    <div key={m.id} className="flex justify-between p-2 bg-gray-800 rounded">
      <Link to={`/movie/${m.slug}`} className="flex items-center gap-3">
      <img
  src={m.poster?.trim() || "https://via.placeholder.com/80x120?text=No+Image"}
  onError={(e) => {
    e.target.onerror = null;
    e.target.src = "https://via.placeholder.com/80x120?text=No+Image";
  }}
  alt={m.title}
  className="w-12 h-16 object-cover rounded"
/>

        <div>
                <h3 className="font-semibold">{m.title}</h3>
                <p className="text-sm">{new Date(m.created_at).toLocaleDateString()}</p>
              </div>
            </Link>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(m)} className="text-yellow-400">
                Edit
              </button>
              <button onClick={() => handleDelete(m.slug)} className="text-red-400">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUpload;
