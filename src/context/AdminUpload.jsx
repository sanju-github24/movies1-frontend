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
  Zap,
  Star,
  Loader2,
} from "lucide-react"; 
import axios from "axios"; 

function slugify(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// --- Download Block Component ---
const DownloadBlock = ({ block, index, onChange, onRemove, isLast }) => {
  return (
    <div className="bg-gray-700 p-4 rounded-lg flex flex-col gap-4 border border-gray-600 shadow-inner relative">
      <h4 className="text-sm font-bold text-blue-300">Download Option #{index + 1}</h4>
      
      <div className="grid sm:grid-cols-3 gap-3">
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
            required 
          />
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3">
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
          <button type="button" onClick={() => onRemove(index)} disabled={isLast}><Minus className="w-5 h-5" /></button>
        </button>
      </div>
    </div>
  );
};

// --- CheckboxGroup Component ---
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
  
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState(""); 
  const [tmdbSearchResult, setTmdbSearchResult] = useState(null); 
  const [isSearching, setIsSearching] = useState(false); 

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

const handleTMDBSearch = async () => {
    if (!tmdbSearchQuery.trim()) {
      return toast.error("❌ Please enter a movie title or IMDb ID to search.");
    }
    if (!backendUrl) {
      return toast.error("❌ Backend URL is not configured.");
    }

    setIsSearching(true);
    setTmdbSearchResult(null); 

    const isImdbId = /^tt\d{7,10}$/i.test(tmdbSearchQuery.trim());
    const params = isImdbId 
        ? { imdbId: tmdbSearchQuery.trim() } 
        : { title: tmdbSearchQuery.trim() };

    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params });

      if (res.data.success && res.data.data) {
        setTmdbSearchResult(res.data.data);
        toast.success(`✅ Found metadata.`);
      } else if (res.data.error_type === "TitleNotFound") {
          toast.error(`⚠️ Could not find content.`);
      } else {
          throw new Error(res.data.message || "Unknown error.");
      }
    } catch (err) {
      toast.error(`⚠️ Search failed: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
};

const handleUseMetadata = (data) => {
    // 🚀 FIX: Convert imdb_rating to Number before calling .toFixed()
    const ratingNum = data.imdb_rating ? Number(data.imdb_rating) : null;
    const formattedRating = (ratingNum && !isNaN(ratingNum)) ? ratingNum.toFixed(1) : "";

    const newSlug = data.title ? slugify(data.title) : movie.slug;
    
    setMovie((prev) => ({
        ...prev,
        title: data.title || prev.title,
        poster: data.poster_url || prev.poster,
        description: data.description || prev.description,
        slug: editingMovieId && prev.title === data.title ? prev.slug : newSlug, 
    }));
    
    setTmdbSearchResult(null); 
    setTmdbSearchQuery("");
    toast.info(`🎬 Metadata applied successfully.`);
};

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
    setDownloadBlocks([{ id: uuidv4(), quality: "", size: "", format: "", manualUrl: "", directUrl: "", gpLink: "", showGifAfter: false }]);
    setEditingMovieId(null);
    setFormOpen(true);
    setTmdbSearchQuery(""); 
    setTmdbSearchResult(null); 
  };

  const toggleHomepage = async (movieObj) => {
    const newStatus = !movieObj.showOnHomepage;
    const updates = newStatus
      ? { showOnHomepage: true, homepage_added_at: new Date().toISOString() }
      : { showOnHomepage: false, homepage_added_at: null };

    const { error } = await supabase.from("movies").update(updates).eq("id", movieObj.id);

    if (error) toast.error(`❌ Failed to update status`);
    else {
      toast.success(`✅ Homepage status updated`);
      setMovies((prev) => prev.map((m) => (m.id === movieObj.id ? { ...m, ...updates } : m)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!movie.title || !movie.poster || !movie.description) {
      toast.error("❌ Required fields missing.");
      setLoading(false);
      return;
    }

    const slug = movie.slug || slugify(movie.title.trim());
    const validBlocks = downloadBlocks.filter(b => b.quality && b.size && b.format && (b.manualUrl || b.directUrl || b.gpLink));

    if (!validBlocks.length) {
      toast.error("❌ Valid download block required.");
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
      count: 0
    }));

    const movieData = {
      ...movie,
      slug,
      downloads: sanitizedDownloads,
      uploaded_by: userData?.email || "unknown",
      ...(editingMovieId ? {} : { created_at: new Date().toISOString() }),
    };

    try {
      const { error } = editingMovieId 
        ? await supabase.from("movies").update(movieData).eq("id", editingMovieId)
        : await supabase.from("movies").insert([movieData]);

      if (error) throw error;
      toast.success(`✅ Saved!`);
      resetForm();
      fetchMovies();
      setFormOpen(false);
    } catch (err) {
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (m) => {
    setEditingMovieId(m.id);
    setFormOpen(true);
    const blocks = (m.downloads || []).map((d) => ({
        id: d.id || uuidv4(),
        quality: d.quality || "",
        size: d.size || "",
        format: d.format || "",
        manualUrl: d.url || "",
        directUrl: d.directUrl || "",
        gpLink: d.gpLink || "",
        showGifAfter: !!d.showGifAfter,
    }));
    if (blocks.length === 0) blocks.push({ id: uuidv4(), quality: "", size: "", format: "", manualUrl: "", directUrl: "", gpLink: "", showGifAfter: false });
    setMovie({ ...m });
    setDownloadBlocks(blocks);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete?")) return;
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) toast.error("❌ Failed");
    else { toast.success("🗑️ Deleted"); fetchMovies(); }
  };

  const handleDownloadChange = (i, field, value) => {
    setDownloadBlocks((prev) => {
      const updated = [...prev];
      updated[i][field] = value;
      return updated;
    });
  };

  const addDownloadBlock = () => {
    setDownloadBlocks((prev) => [...prev, { id: uuidv4(), quality: "", size: "", format: "", manualUrl: "", directUrl: "", gpLink: "", showGifAfter: false }]);
  };

  const removeDownloadBlock = (i) => {
    if (downloadBlocks.length > 1) setDownloadBlocks((prev) => prev.filter((_, index) => index !== i));
  };

  const filteredMovies = movies.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));
  const showPreview = movie.title || movie.poster;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto text-white p-4">
        <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-extrabold text-blue-400">
            <Film className="inline-block w-8 h-8 mr-2 text-red-500" />
            {editingMovieId ? "✏️ Edit Movie" : "➕ Upload New Content"}
          </h1>
          <button onClick={() => setFormOpen(!formOpen)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition text-sm flex items-center gap-1">
            {formOpen ? (<> <Minus className="w-4 h-4" /> Collapse </>) : (<> <Plus className="w-4 h-4" /> Expand </>)}
          </button>
        </div>

        {formOpen && (
          <div className="transition-all duration-500">
            {editingMovieId && (
              <div className="bg-yellow-900 border border-yellow-500 p-4 rounded-xl mb-6 flex justify-between items-center shadow-lg">
                <span className="text-yellow-300 font-bold text-lg">✏️ Editing: **{movie.title}**</span>
                <button onClick={resetForm} className="ml-4 bg-red-600 px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 font-semibold transition"><X className="inline-block w-4 h-4 mr-1"/> Cancel</button>
              </div>
            )}
            
            <div className={`grid gap-8 ${showPreview ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
                <form onSubmit={handleSubmit} className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-8 bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800`}>
                
                <div className="space-y-4 border-b border-gray-700 pb-6">
                    <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Zap className="w-5 h-5"/> Auto-Fill (TMDB)</h2>
                    <div className="flex gap-4">
                        <input type="text" placeholder="Title or IMDb ID" className="p-3 bg-gray-800 rounded-lg w-full border border-gray-700 focus:ring-yellow-500" value={tmdbSearchQuery} onChange={(e) => setTmdbSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTMDBSearch()} />
                        <button type="button" onClick={handleTMDBSearch} className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2" disabled={isSearching}>
                             {isSearching ? <Loader2 className="animate-spin" /> : <Search />} Search
                        </button>
                    </div>

                    {tmdbSearchResult && (
                        <div className="bg-gray-700 p-4 rounded-xl border border-yellow-500 flex gap-4 mt-4 animate-in fade-in">
                            <img src={tmdbSearchResult.poster_url} className="w-20 rounded-lg object-cover" />
                            <div className="flex-grow">
                                <h3 className="text-lg font-bold text-green-300">{tmdbSearchResult.title} ({tmdbSearchResult.year})</h3>
                                <div className='flex items-center text-sm text-gray-300'><Star className="text-yellow-500 fill-yellow-500 mr-1" />
                                {tmdbSearchResult.imdb_rating ? Number(tmdbSearchResult.imdb_rating).toFixed(1) : 'N/A'}</div>
                                <button onClick={() => handleUseMetadata(tmdbSearchResult)} type="button" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold mt-2">Apply Metadata</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4 border-b border-gray-700 pb-6">
                    <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2"><Pencil className="text-blue-400"/> Primary Info</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Title" className="p-3 bg-gray-800 rounded-lg border border-gray-700" value={movie.title} onChange={(e) => setMovie({...movie, title: e.target.value, slug: editingMovieId ? movie.slug : slugify(e.target.value)})} required />
                    <input type="url" placeholder="Poster URL" className="p-3 bg-gray-800 rounded-lg border border-gray-700" value={movie.poster} onChange={(e) => setMovie({...movie, poster: e.target.value})} required />
                    </div>
                    <textarea placeholder="Description" className="p-3 bg-gray-800 rounded-lg w-full border border-gray-700" rows={4} value={movie.description} onChange={(e) => setMovie({...movie, description: e.target.value})} required />
                </div>
                
                <div className="space-y-4 border-b border-gray-700 pb-6">
                    <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2"><LinkIcon className="text-yellow-400"/> Player & Notes</h2>
                    <textarea placeholder="Watch URL (Embed/Player Link)" className="p-3 bg-gray-800 rounded-lg w-full border border-gray-700 font-mono text-sm" rows={2} value={movie.watchUrl} onChange={(e) => setMovie({...movie, watchUrl: e.target.value})} />
                    <textarea placeholder="Admin Note (Private)" className="p-3 bg-gray-800 rounded-lg w-full border border-gray-700" rows={1} value={movie.note} onChange={(e) => setMovie({...movie, note: e.target.value})} />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <CheckboxGroup title="Categories" options={["Hollywood", "Kollywood", "Bollywood"]} selected={movie.categories} onChange={(v) => setMovie({...movie, categories: v})} color="accent-blue-500" />
                    <CheckboxGroup title="Quality" options={["WEB-DL", "HDTS", "PRE-HD", "PreDVD"]} selected={movie.subCategory} onChange={(v) => setMovie({...movie, subCategory: v})} color="accent-green-500" />
                    <CheckboxGroup title="Languages" options={["Tamil", "Malayalam", "Kannada", "Telugu", "Hindi", "English"]} selected={movie.language} onChange={(v) => setMovie({...movie, language: v})} color="accent-yellow-500" />
                </div>

                <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <h2 className="text-xl font-bold text-gray-300 flex items-center gap-2"><Eye className="text-cyan-400"/> Display</h2>
                    <div className="flex gap-6 items-center">
                        <input type="color" value={movie.linkColor} onChange={(e) => setMovie({...movie, linkColor: e.target.value})} className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-none" />
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={movie.showOnHomepage} onChange={(e) => setMovie({...movie, showOnHomepage: e.target.checked})} className="accent-cyan-500" /> Show on Home</label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={movie.directLinksOnly} onChange={(e) => setMovie({...movie, directLinksOnly: e.target.checked})} className="accent-pink-500" /> Direct Links Only</label>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-300 flex items-center gap-2"><Download className="text-red-400"/> Downloads</h3>
                    {downloadBlocks.map((block, i) => (
                    <DownloadBlock key={block.id} block={block} index={i} onChange={handleDownloadChange} onRemove={removeDownloadBlock} isLast={downloadBlocks.length === 1} />
                    ))}
                    <button type="button" onClick={addDownloadBlock} className="bg-green-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"><Plus /> Add Option</button>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-700">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-10 py-4 rounded-xl font-bold text-xl transition-all shadow-lg flex items-center gap-2" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <Save />} {editingMovieId ? "Update" : "Upload"} Content
                    </button>
                </div>
                </form>

                {showPreview && (
                    <section className="lg:col-span-1 p-6 bg-gray-900 rounded-xl border border-gray-700 h-fit sticky top-20 text-center">
                        <h2 className="text-2xl font-bold text-red-400 flex items-center justify-center gap-2 mb-4 border-b border-gray-700 pb-3"><Eye /> Preview</h2>
                        <img src={movie.poster} className="w-48 h-72 mx-auto object-cover rounded-xl shadow-lg border-2 border-gray-600 mb-6" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/300x450?text=Error"} />
                        <h3 className="text-2xl font-extrabold">{movie.title || "No Title"}</h3>
                        <p className="text-gray-500 text-xs font-mono mt-2">{movie.slug || "auto-slug"}</p>
                        <p className="text-sm text-gray-400 mt-4 italic line-clamp-6">{movie.description || "No description provided."}</p>
                    </section>
                )}
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-gray-700">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Film /> Library ({movies.length})</h2>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" placeholder="Search library..." className="p-3 pl-10 bg-gray-800 rounded-lg w-full border border-gray-700" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMovies.map((m) => (
                <div key={m.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-blue-500 transition-all flex flex-col h-full">
                  <img src={m.poster} className="w-full h-48 object-cover rounded-lg mb-3" />
                  <h3 className="text-lg font-bold text-blue-400 truncate">{m.title}</h3>
                  <p className="text-[10px] text-gray-500 mb-4">{m.language?.join(', ')} | {m.categories?.join(', ')}</p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <button onClick={() => handleEdit(m)} className="bg-yellow-600 px-3 py-1 rounded-lg text-xs font-bold"><Pencil className="w-3 h-3 inline mr-1" />Edit</button>
                    <button onClick={() => toggleHomepage(m)} className={`px-3 py-1 rounded-lg text-xs font-bold ${m.showOnHomepage ? 'bg-red-600' : 'bg-green-600'}`}>{m.showOnHomepage ? 'Hide' : 'Show'}</button>
                    <button onClick={() => handleDelete(m.id)} className="bg-gray-700 px-3 py-1 rounded-lg text-xs font-bold text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUpload;