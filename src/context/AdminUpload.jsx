import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { v4 as uuidv4 } from "uuid"; // npm install uuid



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
  const [viewMode, setViewMode] = useState("upload");

  const [movie, setMovie] = useState({
    slug: "",
    title: "",
    poster: "",
    description: "",
    categories: [],
    subCategory: [],
    language: [],
    downloads: [],
    linkColor: "#60a5fa",
    showOnHomepage: true,
    directLinksOnly: false,
  });

  const [downloadBlocks, setDownloadBlocks] = useState([
    {
      id: uuidv4(),
      quality: "",
      size: "",
      format: "",
      file: null,
      manualUrl: "",
      directUrl: "",
      gpLink: "",
      showGifAfter: false,
      count: 0,
      url: "",
    },
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
      linkColor: "#60a5fa",
      showOnHomepage: true,
    });
    setDownloadBlocks([
      { quality: "", size: "", format: "", file: null, manualUrl: "",count: 0 , gpLink: "", showGifAfter: false }
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
      toast.error("Please fill in category, subcategory, and language.");
      setLoading(false);
      return;
    }
  
    const slug = editingMovieId ? movie.slug : slugify(title.trim());

    const uploaded_by = userData?.email || "unknown";
  
    const validBlocks = downloadBlocks.filter(
      (b) => b.quality && b.size && b.format && (b.file || b.manualUrl || b.directUrl || b.gpLink)
    );
  
    if (!validBlocks.length) {
      toast.error("At least one valid download block is required.");
      setLoading(false);
      return;
    }
  
    const processedDownloads = await Promise.all(
      validBlocks.map(async (b) => {
        const id = b.id || uuidv4();
        const fallbackUrl = b.manualUrl || b.directUrl || b.gpLink || b.url;
    
        // Uploading new .torrent file
        if (b.file) {
          const fileName = b.file.name;
          if (!fileName.endsWith(".torrent")) {
            toast.error("Only .torrent files are allowed.");
            return null;
          }
    
          const timestamp = Date.now();
          const safeSlug = slug.replace(/[^a-z0-9\-]/gi, "_");
          const newFileName = `${b.quality}_${b.size}.torrent`;
          const filePath = `files/${timestamp}_${safeSlug}/${newFileName}`;
    
          const { error: uploadError } = await supabase.storage
            .from("torrents")
            .upload(filePath, b.file, { upsert: true });
    
          if (uploadError) {
            toast.error(`Failed to upload ${fileName}`);
            return null;
          }
    
          return {
            id,
            quality: b.quality,
            size: b.size,
            format: b.format,
            url: `${supabase.storageUrl}/object/public/torrents/${filePath}`,
            filename: newFileName,
            directUrl: b.directUrl || "",
            gpLink: b.gpLink || "",
            showGifAfter: b.showGifAfter || false,
            count: editingMovieId ? b.count || 0 : 0,
          };
        }
    
        // If no file is reuploaded
        return {
          id,
          quality: b.quality,
          size: b.size,
          format: b.format,
          url: fallbackUrl,
          filename: fallbackUrl?.split("/").pop() || "",
          directUrl: b.directUrl || "",
          gpLink: b.gpLink || "",
          showGifAfter: b.showGifAfter || false,
          count: editingMovieId ? b.count || 0 : 0,
        };
      })
    );
    
  
    const downloads = processedDownloads.filter(Boolean);
  
    const movieData = {
      ...movie,
      slug,
      uploaded_by,
      downloads,
      directLinksOnly: movie.directLinksOnly || false,
      ...(editingMovieId ? {} : { created_at: new Date().toISOString() }),
    };
  
    // Insert or update in Supabase
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


  
  // ✅ Fix and update showOnHomepage flag for old movies
const fixOldMoviesShowFlag = async () => {
  const { data, error } = await supabase
    .from("movies")
    .select("id, showOnHomepage");

  if (error) {
    toast.error("❌ Error fetching movies");
    return;
  }

  const missing = data.filter((m) => m.showOnHomepage === null || m.showOnHomepage === undefined);

  if (!missing.length) {
    toast.info("✅ All movies already have showOnHomepage set.");
    return;
  }

  const { error: updateError } = await supabase
    .from("movies")
    .update({ showOnHomepage: true })
    .in("id", missing.map((m) => m.id));

  if (updateError) {
    toast.error("❌ Failed to update some movies");
  } else {
    toast.success(`✅ Updated ${missing.length} old movies to show on homepage`);
    fetchMovies(); // Refresh movie list
  }
};
// All code remains same until handleEdit function

const handleEdit = (m) => {
  setEditingMovieId(m.id);

  // Populate movie form fields
  setMovie({
    slug: m.slug || "",
    title: m.title || "",
    poster: m.poster || "",
    description: m.description || "",
    categories: m.categories || [],
    subCategory: m.subCategory || [],
    language: m.language || [],
    downloads: m.downloads || [],
    linkColor: m.linkColor || "#60a5fa",
    showOnHomepage: m.showOnHomepage ?? true,
    directLinksOnly: m.directLinksOnly || false,
  });

  // Populate each download block with all needed fields
  setDownloadBlocks(
    (m.downloads || []).length
      ? m.downloads.map((d) => ({
          id: d.id || uuidv4(),
          quality: d.quality || "",
          size: d.size || "",
          format: d.format || "",
          file: null,
          manualUrl: d.url && !d.url.includes("supabase") ? d.url : "",
          directUrl: d.directUrl || "",
          gpLink: d.gpLink || "",
          showGifAfter: d.showGifAfter || false,
          count: d.count || 0,
          url: d.url || "", // required fallback if no reupload
        }))
      : [
          {
            id: uuidv4(),
            quality: "",
            size: "",
            format: "",
            file: null,
            manualUrl: "",
            directUrl: "",
            gpLink: "",
            showGifAfter: false,
            count: 0,
            url: "",
          },
        ]
  );
};


// ✅ Delete movie by slug
const handleDelete = async (slug) => {
  const { error } = await supabase.from("movies").delete().eq("slug", slug);
  if (error) {
    toast.error("❌ Failed to delete movie");
  } else {
    toast.success("🗑️ Movie deleted");
    fetchMovies(); // Refresh list
  }
};

// ✅ Update values inside a download block
const handleDownloadChange = (i, field, value) => {
  setDownloadBlocks((prev) => {
    const updated = [...prev];
    updated[i][field] = value;
    return updated;
  });
};

// ✅ Add a new empty download block
const addDownloadBlock = () => {
  setDownloadBlocks((prev) => [
    ...prev,
    {
      id: uuidv4(),
      quality: "",
      size: "",
      format: "",
      file: null,
      manualUrl: "",
      directUrl: "",
      gpLink: "",
      showGifAfter: false,
      count: 0,
      url: "",
    },
  ]);
};


// ✅ Remove download block by index
const removeDownloadBlock = (i) => {
  if (downloadBlocks.length > 1) {
    setDownloadBlocks((prev) => prev.filter((_, index) => index !== i));
  }
};





  const filteredMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>

<div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search movies…"
            className="p-3 bg-gray-800 rounded w-full placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>




      <div className="max-w-7xl mx-auto text-white">
        <h1 className="text-2xl font-bold mb-6">🎞 Upload New Movie</h1>
  
        {editingMovieId && (
          <div className="bg-yellow-900 border border-yellow-500 p-4 rounded-md mb-6">
            <span className="text-yellow-300 font-medium">
              ✏️ Editing: <strong>{movie.title}</strong>
            </span>
            <button
              onClick={resetForm}
              className="ml-4 bg-red-500 px-3 py-1 rounded text-sm hover:bg-red-600"
            >
              Cancel Edit
            </button>
          </div>
        )}
  
        
  
        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-gray-900 p-6 rounded-lg shadow border border-gray-800"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              placeholder="🎬 Title"
              className="p-3 bg-gray-800 rounded placeholder-gray-400"
              value={movie.title}
              onChange={(e) =>
                setMovie((m) => ({
                  ...m,
                  title: e.target.value,
                  slug: editingMovieId ? m.slug : slugify(e.target.value),
                }))
              }
            />
            <input
              type="text"
              placeholder="🖼️ Poster URL"
              className="p-3 bg-gray-800 rounded placeholder-gray-400"
              value={movie.poster}
              onChange={(e) =>
                setMovie((m) => ({ ...m, poster: e.target.value }))
              }
            />
          </div>



  
          <textarea
            placeholder="📝 Description"
            className="p-3 bg-gray-800 rounded w-full placeholder-gray-400"
            rows={3}
            value={movie.description}
            onChange={(e) =>
              setMovie((m) => ({ ...m, description: e.target.value }))
            }
          />
  
          <div className="grid md:grid-cols-3 gap-4">
            {["categories", "subCategory", "language"].map((key) => (
              <input
                key={key}
                type="text"
                placeholder={key}
                className="p-3 bg-gray-800 rounded placeholder-gray-400"
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
  
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={movie.linkColor}
                onChange={(e) =>
                  setMovie((m) => ({ ...m, linkColor: e.target.value }))
                }
              />
              <span className="text-sm">Link Color</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={movie.showOnHomepage}
                onChange={(e) =>
                  setMovie((m) => ({
                    ...m,
                    showOnHomepage: e.target.checked,
                  }))
                }
              />
              Show on Homepage
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={movie.directLinksOnly || false}
    onChange={(e) =>
      setMovie((m) => ({ ...m, directLinksOnly: e.target.checked }))
    }
  />
  Direct Links
</label>

  
          {/* Download Blocks */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Download Blocks</h3>
            {downloadBlocks.map((block, i) => (
              <div
                key={i}
                className="bg-gray-800 p-4 rounded-md flex flex-wrap gap-3 items-center"
              >
                {["quality", "size", "format"].map((field) => (
                  <input
                    key={field}
                    type="text"
                    placeholder={field}
                    value={block[field]}
                    onChange={(e) =>
                      handleDownloadChange(i, field, e.target.value)
                    }
                    className="p-2 rounded bg-gray-700 placeholder-gray-400"
                  />
                ))}
                <input
                  type="file"
                  accept=".torrent"
                  className="p-2 rounded bg-gray-700"
                  onChange={(e) =>
                    handleDownloadChange(i, "file", e.target.files[0])
                  }
                />
                <input
                  type="text"
                  placeholder="Manual URL"
                  className="p-2 rounded bg-gray-700 placeholder-gray-400"
                  value={block.manualUrl}
                  onChange={(e) =>
                    handleDownloadChange(i, "manualUrl", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="GP Link"
                  className="p-2 rounded bg-gray-700 placeholder-gray-400"
                  value={block.gpLink}
                  onChange={(e) =>
                    handleDownloadChange(i, "gpLink", e.target.value)
                  }
                />

<label className="flex items-center mt-4 gap-2">
        <input
          type="checkbox"
          checked={movie.directLinksOnly}
          onChange={(e) =>
            setMovie((m) => ({ ...m, directLinksOnly: e.target.checked }))
          }
        />
        Direct Links Only
      </label>





                          <input
  type="text"
  placeholder="Direct Download URL"
  className="p-2 rounded bg-gray-700 placeholder-gray-400"
  value={block.directUrl}
  onChange={(e) =>
    handleDownloadChange(i, "directUrl", e.target.value)
  }
/>


                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={block.showGifAfter}
                    onChange={(e) =>
                      handleDownloadChange(i, "showGifAfter", e.target.checked)
                    }
                  />
                  Show GIF
                </label>
                <button
                  type="button"
                  onClick={() => removeDownloadBlock(i)}
                  className="text-red-400 text-lg"
                  disabled={downloadBlocks.length === 1}
                >
                  ❌
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addDownloadBlock}
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            >
              ➕ Add Another Download
            </button>
          </div>
  
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-lg"
            disabled={loading}
          >
            {loading
              ? "Saving…"
              : editingMovieId
              ? "Update Movie"
              : "Upload Movie"}
          </button>
        </form>
  
        <div className="flex justify-end mt-6">
          <button
            className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded text-sm"
            onClick={fixOldMoviesShowFlag}
          >
            🛠 Fix Old Movies (Show on Homepage)
          </button>
        </div>
  
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Recently Uploaded Movies</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMovies.length ? (
              filteredMovies.map((m) => (
                <div
                  key={m.id}
                  className="bg-gray-900 p-4 rounded-lg shadow border border-gray-800"
                >
                  <img
                    src={
                      m.poster ||
                      "https://via.placeholder.com/300x400?text=No+Image"
                    }
                    alt={m.title}
                    className="w-full h-56 object-cover rounded mb-3"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/300x400?text=No+Image";
                    }}
                  />
                  <h3 className="text-lg font-semibold">{m.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {(m.description || "").slice(0, 80)}…
                  </p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleEdit(m)}
                      className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded text-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(m.slug)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                    >
                      🗑 Delete
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
    </AdminLayout>
  );
}  
export default AdminUpload;  