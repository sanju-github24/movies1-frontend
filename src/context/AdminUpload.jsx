import React, { useState, useEffect, useContext, useCallback } from "react";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { v4 as uuidv4 } from "uuid";
import {
  Plus,
  Minus,
  Film,
  X,
  Pencil,
  Trash2,
  Home,
  Save,
  Palette,
  Eye,
  Download,
  Link as LinkIcon,
  Globe,
  Tag,
  MessageCircle,
  Search,
  Zap, // Icon for TMDB fetch button
  Star, // Added Star icon for rating
  Loader2, // Assuming Loader2 is available from lucide-react or similar
} from "lucide-react"; 
import axios from "axios"; 

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// --- Download Block Component (Refactored for clarity) ---
const DownloadBlock = ({ block, index, onChange, onRemove, isLast }) => {
  return (
    <div className="bg-gray-700 p-4 rounded-lg flex flex-col gap-4 border border-gray-600 shadow-inner relative">
      <h4 className="text-sm font-bold text-blue-300">Download Option #{index + 1}</h4>
      
      <div className="grid sm:grid-cols-3 gap-3">
        {/* Quality, Size, Format */}
        {[
          { key: "quality", placeholder: "720p/1080p (Quality)" },
          { key: "size", placeholder: "1.5GB (Size)" },
          { key: "format", placeholder: "MKV/MP4 (Format)" },
        ].map(({ key, placeholder }) => (
          <input
            key={key}
            type="text"
            placeholder={placeholder}
            value={block[key]}
            onChange={(e) => onChange(index, key, e.target.value)}
            className="p-2 rounded bg-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
            required // Made these essential fields required
          />
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {/* Manual URL */}
        <div className="md:col-span-1 relative">
          <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Manual/Torrent URL"
            value={block.manualUrl}
            onChange={(e) => onChange(index, "manualUrl", e.target.value)}
            className="p-2 pl-9 w-full rounded bg-gray-600 placeholder-gray-400"
          />
        </div>
        
        {/* GP Link */}
        <div className="md:col-span-1 relative">
            <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="GP Link (Shortener)"
            value={block.gpLink}
            onChange={(e) => onChange(index, "gpLink", e.target.value)}
            className="p-2 pl-9 w-full rounded bg-gray-600 placeholder-gray-400"
          />
        </div>

        {/* Direct URL */}
        <div className="md:col-span-1 relative">
            <Download className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Direct Download URL (Optional)"
            value={block.directUrl}
            onChange={(e) => onChange(index, "directUrl", e.target.value)}
            className="p-2 pl-9 w-full rounded bg-gray-600 placeholder-gray-400"
          />
        </div>
      </div>
      
      {/* Options & Remove */}
      <div className="flex justify-between items-center mt-2 border-t border-gray-600 pt-3">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={block.showGifAfter}
            onChange={(e) => onChange(index, "showGifAfter", e.target.checked)}
            className="accent-red-500"
          />
          Show GIF after download
        </label>
        
        <button
          type="button"
          onClick={() => onRemove(index)}
          className={`text-red-400 p-1 rounded-full hover:bg-red-900 transition ${isLast ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLast}
          title={isLast ? "Must have at least one block" : "Remove download block"}
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// --- CheckboxGroup Component (Added from original plan) ---
const CheckboxGroup = ({ title, options, selected, onChange, color }) => (
    <fieldset className="p-4 rounded-lg bg-gray-800 border border-gray-700">
        <legend className="text-base font-bold text-gray-300 mb-2">{title}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
            {options.map((option) => (
                <label key={option} className="flex items-center text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={selected.includes(option)}
                        onChange={() => {
                            const newSelected = selected.includes(option)
                                ? selected.filter(s => s !== option)
                                : [...selected, option];
                            onChange(newSelected);
                        }}
                        className={`w-4 h-4 rounded ${color}`}
                    />
                    <span className="ml-2 text-gray-300">{option}</span>
                </label>
            ))}
        </div>
    </fieldset>
);


// --- Main Component ---
const AdminUpload = () => {
  const { userData, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movies, setMovies] = useState([]);
  const [formOpen, setFormOpen] = useState(true);
  
  // --- NEW TMDB STATES ---
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState(""); 
  const [tmdbSearchResult, setTmdbSearchResult] = useState(null); 
  const [isSearching, setIsSearching] = useState(false); 

  // State for the main movie details
  const [movie, setMovie] = useState({
    slug: "",
    title: "",
    poster: "",
    description: "",
    categories: [],
    subCategory: [],
    language: [],
    linkColor: "#3b82f6", 
    showOnHomepage: true,
    directLinksOnly: false,
    watchUrl: "",
    note: "",
  });

  // State for the download blocks
  const [downloadBlocks, setDownloadBlocks] = useState([
    {
      id: uuidv4(),
      quality: "",
      size: "",
      format: "",
      manualUrl: "",
      directUrl: "",
      gpLink: "",
      showGifAfter: false,
    },
  ]);

  // --- TMDB Fetch Functionality (Copied/Adapted from UploadWatchHtml) ---
  const handleTMDBSearch = async () => {
    if (!tmdbSearchQuery.trim()) {
      return toast.error("❌ Please enter a movie title to search.");
    }
    if (!backendUrl) {
      return toast.error("❌ Backend URL is not configured in AppContext.");
    }

    setIsSearching(true);
    setTmdbSearchResult(null); 

    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { 
        params: { title: tmdbSearchQuery }
      });

      if (res.data.success && res.data.data) {
        setTmdbSearchResult(res.data.data);
        toast.success(`✅ Found metadata for: ${res.data.data.title}`);
      } else if (res.data.error_type === "TitleNotFound") {
          toast.error(`⚠️ Could not find title: "${tmdbSearchQuery}"`);
      } else {
          throw new Error(res.data.message || "Unknown error during search.");
      }

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      console.error("TMDB Search Error:", errorMessage);
      toast.error(`⚠️ TMDB Search failed: ${errorMessage}`);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Handler to apply TMDB metadata to the form ---
  const handleUseMetadata = (data) => {
      
      const newSlug = data.title 
          ? slugify(data.title)
          : movie.slug;
      
      setMovie((prev) => ({
          ...prev,
          title: data.title || prev.title,
          poster: data.poster_url || prev.poster,
          description: data.description || prev.description,
          // Auto-generate slug only if it's a new entry AND the title changed
          slug: editingMovieId && prev.title === data.title ? prev.slug : newSlug, 
      }));
      
      // Clear search results after applying
      setTmdbSearchResult(null); 
      setTmdbSearchQuery("");
      
      toast.info(`🎬 Form pre-filled: Title, Slug, Poster, and Description from ${data.title}.`);
  };


  // --- Fetching and Initialization ---

  const fetchMovies = useCallback(async () => {
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) toast.error("❌ Failed to load movies");
    else setMovies(data || []);
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const resetForm = () => {
    setMovie({
      slug: "",
      title: "",
      poster: "",
      description: "",
      categories: [],
      subCategory: [],
      language: [],
      linkColor: "#3b82f6",
      showOnHomepage: true,
      directLinksOnly: false,
      watchUrl: "",
      note: "",
    });
    setDownloadBlocks([
      {
        id: uuidv4(),
        quality: "",
        size: "",
        format: "",
        manualUrl: "",
        directUrl: "",
        gpLink: "",
        showGifAfter: false,
      },
    ]);
    setEditingMovieId(null);
    setFormOpen(true);
    setTmdbSearchQuery(""); 
    setTmdbSearchResult(null); 
  };

  // --- Handlers ---

  const toggleHomepage = async (movieObj) => {
    const newStatus = !movieObj.showOnHomepage;
    const updates = newStatus
      ? { showOnHomepage: true, homepage_added_at: new Date().toISOString() }
      : { showOnHomepage: false, homepage_added_at: null };

    const { error } = await supabase
      .from("movies")
      .update(updates)
      .eq("id", movieObj.id);

    if (error) {
      toast.error(`❌ Failed to ${newStatus ? "add to" : "remove from"} homepage`);
    } else {
      toast.success(
        `✅ ${movieObj.title} ${newStatus ? "added to" : "removed from"} homepage`
      );
      setMovies((prev) =>
        prev.map((m) => (m.id === movieObj.id ? { ...m, ...updates } : m))
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { title, poster, description } = movie;
    if (!title || !poster || !description) {
      toast.error("❌ Title, Poster, and Description are required.");
      setLoading(false);
      return;
    }

    const slug = movie.slug || slugify(title.trim());
    const uploaded_by = userData?.email || "unknown";

    const validBlocks = downloadBlocks.filter(
      (b) =>
        b.quality &&
        b.size &&
        b.format &&
        (b.manualUrl || b.directUrl || b.gpLink)
    );

    if (!validBlocks.length) {
      toast.error("❌ At least one fully specified download block is required.");
      setLoading(false);
      return;
    }

    const sanitizedDownloads = validBlocks.map((b) => ({
      id: b.id || uuidv4(),
      quality: b.quality,
      size: b.size,
      format: b.format,
      url: b.manualUrl || "",
      directUrl: b.directUrl || "",
      gpLink: b.gpLink || "",
      showGifAfter: !!b.showGifAfter,
      count: Number(b.count) || 0, // Ensure count is initialized
    }));

    const movieData = {
      ...movie,
      slug,
      title: title.trim(),
      poster: poster.trim(),
      description: description.trim(),
      downloads: sanitizedDownloads,
      uploaded_by,
      // Only set created_at on new movies
      ...(editingMovieId ? {} : { created_at: new Date().toISOString() }),
    };
    // Clean up empty fields before submitting
    delete movieData.file;

    try {
      if (editingMovieId) {
        const { error } = await supabase
          .from("movies")
          .update(movieData)
          .eq("id", editingMovieId);
        if (error) throw error;
        toast.success(`✅ Movie "${title}" updated successfully!`);
      } else {
        const { error } = await supabase.from("movies").insert([movieData]);
        if (error) throw error;
        toast.success(`🎉 Movie "${title}" uploaded!`);
      }

      resetForm();
      fetchMovies();
      setFormOpen(false); // Collapse form after successful upload
    } catch (err) {
      console.error(err);
      toast.error(`❌ Failed to save movie: ${err.message || 'Unknown error'}`);
    }

    setLoading(false);
  };

  const handleEdit = (m) => {
    setEditingMovieId(m.id);
    setFormOpen(true);
    
    // Convert old download structure to the new block format
    const blocks = (m.downloads || []).map((d) => ({
        id: d.id || uuidv4(),
        quality: d.quality || "",
        size: d.size || "",
        format: d.format || "",
        manualUrl: d.url || "", // This is crucial for populating the manual field
        directUrl: d.directUrl || "",
        gpLink: d.gpLink || "",
        showGifAfter: !!d.showGifAfter,
    }));
    
    // Ensure there is at least one block if the downloads array was empty
    if (blocks.length === 0) {
        blocks.push({
            id: uuidv4(), quality: "", size: "", format: "", manualUrl: "", directUrl: "", gpLink: "", showGifAfter: false,
        });
    }

    setMovie({
      slug: m.slug || "",
      title: m.title || "",
      poster: m.poster || "",
      description: m.description || "",
      categories: m.categories || [],
      subCategory: m.subCategory || [],
      language: m.language || [],
      linkColor: m.linkColor || "#3b82f6",
      showOnHomepage: m.showOnHomepage ?? true,
      directLinksOnly: m.directLinksOnly || false,
      watchUrl: m.watchUrl || "",
      note: m.note || "",
    });
    setDownloadBlocks(blocks);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this movie?")) return;
    
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) toast.error("❌ Failed to delete movie");
    else {
      toast.success("🗑️ Movie deleted successfully");
      fetchMovies();
    }
  };

  const handleDownloadChange = (i, field, value) => {
    setDownloadBlocks((prev) => {
      const updated = [...prev];
      updated[i][field] = value;
      return updated;
    });
  };

  const addDownloadBlock = () => {
    setDownloadBlocks((prev) => [
      ...prev,
      {
        id: uuidv4(),
        quality: "",
        size: "",
        format: "",
        manualUrl: "",
        directUrl: "",
        gpLink: "",
        showGifAfter: false,
      },
    ]);
  };

  const removeDownloadBlock = (i) => {
    if (downloadBlocks.length > 1)
      setDownloadBlocks((prev) => prev.filter((_, index) => index !== i));
  };

  const filteredMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const showPreview = movie.title || movie.poster;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto text-white p-4">
        {/* Header and Toggle */}
        <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-extrabold text-blue-400">
            <Film className="inline-block w-8 h-8 mr-2 text-red-500" />
            {editingMovieId ? "✏️ Edit Movie" : "➕ Upload New Content"}
          </h1>
          <button
            onClick={() => setFormOpen((prev) => !prev)}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition text-sm flex items-center gap-1"
          >
            {formOpen ? (<> <Minus className="w-4 h-4" /> Collapse Form </>) : (<> <Plus className="w-4 h-4" /> Expand Form </>)}
          </button>
        </div>

        {/* Expand/Collapse Upload Form & Preview */}
        {formOpen && (
          <div className="transition-all duration-500 ease-in-out overflow-hidden">
            {editingMovieId && (
              <div className="bg-yellow-900 border border-yellow-500 p-4 rounded-xl mb-6 flex justify-between items-center shadow-lg">
                <span className="text-yellow-300 font-bold text-lg">
                  ✏️ Currently Editing: **{movie.title}**
                </span>
                <button
                  onClick={resetForm}
                  className="ml-4 bg-red-600 px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 font-semibold transition"
                >
                  <X className="inline-block w-4 h-4 mr-1"/> Cancel Edit
                </button>
              </div>
            )}
            
            {/* Form and Preview Layout */}
            <div className={`grid gap-8 ${showPreview ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
                
                {/* --- Upload Form (2/3 width) --- */}
                <form 
                    onSubmit={handleSubmit} 
                    className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-8 bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800`}
                >
                
                {/* --- TMDB Search Bar (ENHANCED) --- */}
                <div className="space-y-4 border-b border-gray-700 pb-6">
                    <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400"/> Auto-Fill Details (TMDB)
                    </h2>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Search Movie/Show title on TMDB"
                            className="p-3 bg-gray-800 rounded-lg placeholder-gray-400 border border-gray-700 focus:ring-yellow-500 focus:border-yellow-500 flex-grow"
                            value={tmdbSearchQuery}
                            onChange={(e) => setTmdbSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTMDBSearch()}
                            disabled={isSearching}
                        />
                        <button
                            type="button"
                            onClick={handleTMDBSearch}
                            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50"
                            disabled={isSearching || !tmdbSearchQuery.trim() || !backendUrl}
                        >
                             {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="w-5 h-5"/>} 
                            Search
                        </button>
                    </div>

                    {/* TMDB Search Result Display (NEW) */}
                    {tmdbSearchResult && (
                        <div className="bg-gray-700 p-4 rounded-xl border border-yellow-500/50 flex gap-4 mt-4">
                            <img 
                                src={tmdbSearchResult.poster_url || 'https://placehold.co/100x150/1f2937/9ca3af?text=No+Poster'} 
                                alt={tmdbSearchResult.title} 
                                className="w-20 h-30 object-cover rounded-lg shadow-lg"
                                onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x150/1f2937/9ca3af?text=No+Poster'; }}
                            />
                            <div className="flex-grow">
                                <h3 className="text-lg font-bold text-green-300 mb-1">{tmdbSearchResult.title} ({tmdbSearchResult.year || 'N/A'})</h3>
                                <p className="text-xs text-gray-300 mb-2 truncate">
                                    {tmdbSearchResult.description.substring(0, 80)}...
                                </p>
                                <div className='flex items-center text-sm text-gray-300 mb-2'> 
                                    <Star className="h-4 w-4 text-yellow-500 inline-block fill-yellow-500 mr-1" />
                                    {tmdbSearchResult.imdb_rating ? `${tmdbSearchResult.imdb_rating.toFixed(1)}/10` : 'No Rating'}
                                </div>

                                <button
                                    onClick={() => handleUseMetadata(tmdbSearchResult)}
                                    type="button"
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold transition shadow-md text-sm mt-1"
                                >
                                    Apply Metadata to Form
                                </button>
                            </div>
                        </div>
                    )}
                </div>


                {/* --- Core Details Section --- */}
                <div className="space-y-4 border-b border-gray-700 pb-6">
                    <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-blue-400"/> Primary Information
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="🎬 Title (required)"
                        className="p-3 bg-gray-800 rounded-lg placeholder-gray-400 border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
                        value={movie.title}
                        onChange={(e) =>
                        setMovie((m) => ({
                            ...m,
                            title: e.target.value,
                            slug: editingMovieId ? m.slug : slugify(e.target.value),
                        }))
                        }
                        required
                    />
                    <input
                        type="url"
                        placeholder="🖼️ Poster URL (required)"
                        className="p-3 bg-gray-800 rounded-lg placeholder-gray-400 border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
                        value={movie.poster}
                        onChange={(e) => setMovie((m) => ({ ...m, poster: e.target.value }))}
                        required
                    />
                    </div>
                    
                    <textarea
                    placeholder="📝 Description (required for metadata)"
                    className="p-3 bg-gray-800 rounded-lg w-full placeholder-gray-400 border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    value={movie.description}
                    onChange={(e) => setMovie((m) => ({ ...m, description: e.target.value }))}
                    required
                    />
                </div>
                
                {/* --- Links & Admin Notes Section --- */}
                <div className="space-y-4 border-b border-gray-700 pb-6">
                    <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-yellow-400"/> Watch & Admin Links
                    </h2>
                    <textarea
                    placeholder="▶️ Watch URL (Embed code or direct link to player)"
                    className="p-3 bg-gray-800 rounded-lg placeholder-gray-400 font-mono text-sm w-full border border-gray-700 focus:ring-yellow-500 focus:border-yellow-500"
                    rows={3}
                    value={movie.watchUrl || ""}
                    onChange={(e) => setMovie((m) => ({ ...m, watchUrl: e.target.value }))}
                    />
                    <textarea
                    placeholder="🗒️ Admin Note (Appears on movie list for admin view only)"
                    className="p-3 bg-gray-800 rounded-lg w-full placeholder-gray-400 border border-gray-700 focus:ring-yellow-500 focus:border-yellow-500"
                    rows={2}
                    value={movie.note}
                    onChange={(e) => setMovie((m) => ({ ...m, note: e.target.value }))}
                    />
                </div>

                {/* --- Metadata Section --- */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-green-400"/> Classification
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                    {/* Categories */}
                    <CheckboxGroup
                        title="Categories"
                        options={["Hollywood", "Kollywood", "Bollywood"]}
                        selected={movie.categories}
                        onChange={(value) => setMovie((m) => ({ ...m, categories: value }))}
                        color="accent-blue-500"
                    />

                    {/* SubCategory (Quality Type) */}
                    <CheckboxGroup
                        title="Quality Type"
                        options={["WEB-DL", "HDTS", "PRE-HD", "PreDVD"]}
                        selected={movie.subCategory}
                        onChange={(value) => setMovie((m) => ({ ...m, subCategory: value }))}
                        color="accent-green-500"
                    />

                    {/* Languages */}
                    <CheckboxGroup
                        title="Languages"
                        options={["Tamil", "Malayalam", "Kannada", "Telugu", "Hindi", "English"]}
                        selected={movie.language}
                        onChange={(value) => setMovie((m) => ({ ...m, language: value }))}
                        color="accent-yellow-500"
                    />
                    </div>
                </div>

                {/* --- Options Section --- */}
                <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-cyan-400"/> Display Options
                    </h2>
                    <div className="flex items-center gap-6 flex-wrap">
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <Palette className="w-5 h-5 text-pink-400"/>
                            Link Color:
                            <input
                                type="color"
                                value={movie.linkColor}
                                onChange={(e) => setMovie((m) => ({ ...m, linkColor: e.target.value }))}
                                className="w-10 h-10 rounded-full border-none p-0 cursor-pointer"
                            />
                        </label>

                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input
                                type="checkbox"
                                checked={movie.showOnHomepage}
                                onChange={(e) => setMovie((m) => ({ ...m, showOnHomepage: e.target.checked }))}
                                className="accent-cyan-500 w-4 h-4"
                            />
                            <span className="text-cyan-300 flex items-center gap-1">
                                <Home className="w-4 h-4"/> Show on Homepage
                            </span>
                        </label>

                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input
                                type="checkbox"
                                checked={movie.directLinksOnly || false}
                                onChange={(e) => setMovie((m) => ({ ...m, directLinksOnly: e.target.checked }))}
                                className="accent-pink-500 w-4 h-4"
                            />
                            <span className="text-pink-300 flex items-center gap-1">
                                <MessageCircle className="w-4 h-4"/> Direct Links Only
                            </span>
                        </label>
                    </div>
                </div>


                {/* --- Download Blocks --- */}
                <div className="space-y-6 pt-4">
                    <h3 className="text-xl font-bold text-gray-300 flex items-center gap-2">
                        <Download className="w-5 h-5 text-red-400"/> Download Configurations
                    </h3>
                    {downloadBlocks.map((block, i) => (
                    <DownloadBlock
                        key={block.id}
                        block={block}
                        index={i}
                        onChange={handleDownloadChange}
                        onRemove={removeDownloadBlock}
                        isLast={downloadBlocks.length === 1}
                    />
                    ))}
                    
                    <button 
                        type="button" 
                        onClick={addDownloadBlock} 
                        className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 font-semibold transition flex items-center gap-2"
                    >
                    <Plus className="w-5 h-5"/> Add Another Download
                    </button>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-700">
                    <button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center gap-2 disabled:opacity-50" 
                        disabled={loading}
                    >
                    {loading ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                    ) : editingMovieId ? (
                        <><Save className="w-5 h-5"/> Update Movie</>
                    ) : (
                        <><Save className="w-5 h-5"/> Upload Movie</>
                    )}
                    </button>
                </div>
                </form>

                {/* --- Movie Preview (1/3 width) --- */}
                {showPreview && (
                    <section className="lg:col-span-1 p-6 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 h-fit sticky top-20">
                        <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2 mb-4 border-b border-gray-700 pb-3">
                            <Eye className="w-6 h-6"/> Live Preview
                        </h2>
                        
                        <div className="flex flex-col items-center">
                            {/* Poster Image */}
                            <img 
                                src={movie.poster || "https://via.placeholder.com/300x450?text=NO+POSTER"} 
                                alt={movie.title || "Movie Poster"} 
                                className="w-48 h-72 object-cover rounded-xl shadow-lg border-4 border-gray-600 mb-6"
                                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x450?text=NO+POSTER"; e.currentTarget.style.borderColor = 'red'; }} 
                            />

                            {/* Details */}
                            <h3 className="text-2xl font-extrabold text-white text-center mb-3">
                                {movie.title || "Movie Title Preview"}
                            </h3>
                            
                            <div className="w-full text-left text-sm space-y-2 mb-4 border-t border-gray-800 pt-4">
                                <p className="text-gray-300">
                                    <Tag className="w-4 h-4 inline mr-2 text-green-500"/>
                                    **Slug:** <span className="text-xs text-gray-500 font-mono break-all">{movie.slug || slugify(movie.title) || 'auto-generated'}</span>
                                </p>
                                <p className="text-gray-300">
                                    <Home className="w-4 h-4 inline mr-2 text-cyan-500"/>
                                    **Homepage:** <span className={movie.showOnHomepage ? "text-green-400" : "text-red-400"}>
                                        {movie.showOnHomepage ? 'YES' : 'NO'}
                                    </span>
                                </p>
                                <p className="text-gray-300">
                                    <Pencil className="w-4 h-4 inline mr-2 text-blue-500"/>
                                    **Link Color:** <span style={{ color: movie.linkColor }}>{movie.linkColor}</span>
                                </p>
                            </div>

                            {/* Description Preview */}
                            <h4 className="text-lg font-semibold text-gray-400 mt-2 mb-2">Description Snippet:</h4>
                            <p className="text-sm text-gray-400 italic bg-gray-800 p-3 rounded-lg w-full">
                                {movie.description.substring(0, 200) || "The description will appear here after fetching from TMDB or manual entry..."}
                                {movie.description.length > 200 && "..."}
                            </p>
                        </div>
                    </section>
                )}
            </div>
          </div>
        )}

        {/* --- Movie List Section --- */}
        <div className="mt-10 pt-6 border-t border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-gray-300">
            <Film className="inline-block w-6 h-6 mr-1"/> Movie Library ({movies.length})
          </h2>
          
          {/* Search Input */}
          <div className="mb-6 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
            <input
              type="text"
              placeholder="🔍 Search movies by title…"
              className="p-3 pl-10 bg-gray-800 rounded-lg w-full placeholder-gray-400 border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* List Display */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMovies.length ? (
              filteredMovies.map((m) => (
                <div key={m.id} className="bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700 flex flex-col hover:border-blue-500 transition">
                  <img 
                    src={m.poster || "https://via.placeholder.com/300x400?text=No+Image"} 
                    alt={m.title} 
                    className="w-full h-48 object-cover rounded-lg mb-3 shadow-md" 
                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x400?text=No+Image"; }} 
                  />
                  <h3 className="text-lg font-bold text-blue-400 truncate mb-1">{m.title}</h3>
                  <p className="text-xs text-gray-400 mb-4">
                      {m.language?.join(', ') || 'Unknown Language'}
                      <span className="mx-2">|</span>
                      {m.categories?.join(', ') || 'No Categories'}
                  </p>
                  
                  {m.note && (
                      <p className="text-xs text-red-400 italic mb-2 border-t border-gray-700 pt-2">Admin Note: {m.note}</p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2">
                    <button 
                        onClick={() => handleEdit(m)} 
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded-lg text-sm font-medium transition flex items-center"
                    >
                        <Pencil className="w-4 h-4 mr-1"/> Edit
                    </button>
                    <button 
                        onClick={() => toggleHomepage(m)} 
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition flex items-center ${
                            m.showOnHomepage ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {m.showOnHomepage ? (
                            <><Minus className="w-4 h-4 mr-1"/> Remove Home</>
                        ) : (
                            <><Home className="w-4 h-4 mr-1"/> Add Home</>
                        )}
                    </button>
                    <button 
                        onClick={() => handleDelete(m.id)} 
                        className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded-lg text-sm font-medium transition flex items-center"
                    >
                        <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))
            ) : (
                <p className="text-gray-400 text-center col-span-full py-10">
                    {search ? `No movies found matching "${search}".` : "No movies uploaded yet."}
                </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUpload;