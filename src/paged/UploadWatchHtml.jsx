import React, { useState, useContext, useEffect, useCallback } from "react";
// Assuming these imports are correctly configured in the user's environment
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Loader2, Star } from "lucide-react";
import { backendUrl } from "../utils/api";

// =========================================================================
//                             EDITABLE ITEM COMPONENT
// =========================================================================
// This component handles the rendering and editing of existing entries in the list.
const EditableItem = ({ item, fetchWatchPages, handleDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editSlug, setEditSlug] = useState(item.slug);
  const [editHtmlCode, setEditHtmlCode] = useState(item.html_code || "");
  const [editHtmlCode2, setEditHtmlCode2] = useState(item.html_code2 || "");
  const [editPoster, setEditPoster] = useState(item.poster || "");
  const [editCoverPoster, setEditCoverPoster] = useState(item.cover_poster || "");
  const [editVideoUrl, setEditVideoUrl] = useState(item.video_url || "");
  const [editDirectUrl, setEditDirectUrl] = useState(item.direct_url || "");
  const [editTitleLogo, setEditTitleLogo] = useState(item.title_logo || "");
  const [editImdbRating, setEditImdbRating] = useState(item.imdb_rating || "");
  const [isSaving, setIsSaving] = useState(false);
  
  const [editEpisodes, setEditEpisodes] = useState(
    item.episodes && Array.isArray(item.episodes) && item.episodes.length > 0
      ? item.episodes
      : [{ title: "", html: "", direct_url: "" }]
  );
  
  // Episode handlers
  const handleEpisodeChange = (index, field, value) => {
    const updated = [...editEpisodes];
    updated[index][field] = value;
    setEditEpisodes(updated);
  };

  const handleAddEpisode = () => {
    setEditEpisodes([...editEpisodes, { title: "", html: "", direct_url: "" }]);
  };

  const handleRemoveEpisode = (index) => {
    const updated = editEpisodes.filter((_, i) => i !== index);
    setEditEpisodes(updated);
  };

  // Save handler for editing existing items
  const handleSave = async () => {
    if (!editTitle.trim() || !editSlug.trim()) {
      return toast.error("❌ Title and Slug cannot be empty!");
    }

    setIsSaving(true);
    
    const validEpisodes = editEpisodes.filter(
      (ep) => ep.title || ep.html || ep.direct_url
    );

    const updatedRecord = {
      title: editTitle.trim(),
      slug: editSlug.trim(),
      html_code: editHtmlCode.trim(),
      html_code2: editHtmlCode2.trim(),
      poster: editPoster.trim(),
      cover_poster: editCoverPoster.trim(),
      video_url: editVideoUrl.trim(),
      direct_url: editDirectUrl.trim(),
      title_logo: editTitleLogo.trim(),
      imdb_rating: editImdbRating.trim(),
      episodes: validEpisodes,
    };

    const { error } = await supabase
      .from("watch_html")
      .update(updatedRecord)
      .eq("id", item.id);

    if (error) {
      console.error(error.message);
      toast.error("⚠️ Failed to update! Slug may already exist.");
    } else {
      toast.success("📝 Updated successfully!");
      setIsEditing(false);
      fetchWatchPages(); 
    }
    setIsSaving(false);
  };

  if (isEditing) {
    return (
      <li className="p-4 bg-gray-700 rounded-lg shadow-inner border border-yellow-500/50">
        <h4 className="text-lg font-bold text-yellow-300 mb-3">
          Editing: {item.title}
        </h4>

        {/* --- Editable Fields --- */}
        <div className="space-y-3">
          <input type="text" className="w-full p-2 rounded bg-gray-600 border border-gray-500 placeholder-gray-400" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
          <input type="text" className="w-full p-2 rounded bg-gray-600 border border-gray-500 placeholder-gray-400" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="Slug" />
          <input type="text" className="w-full p-2 rounded bg-gray-600 border border-gray-500 placeholder-gray-400 text-yellow-400 font-bold" value={editImdbRating} onChange={(e) => setEditImdbRating(e.target.value)} placeholder="IMDb Rating" />
          <input type="text" className="w-full p-2 rounded bg-gray-600 border border-gray-500 placeholder-gray-400" value={editCoverPoster} onChange={(e) => setEditCoverPoster(e.target.value)} placeholder="Cover Poster URL" />
          <input type="text" className="w-full p-2 rounded bg-gray-600 border border-gray-500 placeholder-gray-400" value={editPoster} onChange={(e) => setEditPoster(e.target.value)} placeholder="Poster URL" />
          <input type="text" className="w-full p-2 rounded bg-gray-600 border border-gray-500 placeholder-gray-400" value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="HLS Video URL" />
          <textarea rows={3} className="w-full p-2 rounded bg-gray-600 border border-gray-500 font-mono text-sm placeholder-gray-400" value={editHtmlCode} onChange={(e) => setEditHtmlCode(e.target.value)} placeholder="HTML Code (Server 1)" />
          <textarea rows={3} className="w-full p-2 rounded bg-gray-600 border border-gray-500 font-mono text-sm placeholder-gray-400" value={editHtmlCode2} onChange={(e) => setEditHtmlCode2(e.target.value)} placeholder="HTML Code (Server 2)" />
        </div>

        {/* --- Episodes Editing --- */}
        <div className="mt-4 border-t border-gray-600 pt-3">
            <h5 className="font-semibold text-sm text-yellow-400 mb-2">🎞️ Episodes</h5>
            <div className="max-h-40 overflow-y-auto custom-scroll pr-2">
                {editEpisodes.map((ep, index) => (
                    <div key={index} className="p-2 mb-2 bg-gray-600 rounded relative">
                        <input type="text" className="w-full p-1 rounded bg-gray-700 border border-gray-500 mb-1 text-xs placeholder-gray-400" value={ep.title} onChange={(e) => handleEpisodeChange(index, "title", e.target.value)} placeholder={`Ep ${index + 1} Title`} />
                         <textarea rows={1} className="w-full p-1 rounded bg-gray-700 border border-gray-500 mb-1 text-xs font-mono placeholder-gray-400" value={ep.html} onChange={(e) => handleEpisodeChange(index, "html", e.target.value)} placeholder="HTML Code" />
                        <input type="text" className="w-full p-1 rounded bg-gray-700 border border-gray-500 text-xs placeholder-gray-400" value={ep.direct_url} onChange={(e) => handleEpisodeChange(index, "direct_url", e.target.value)} placeholder="Direct URL" />
                        {editEpisodes.length > 1 && (
                            <button onClick={() => handleRemoveEpisode(index)} className="absolute top-1 right-1 text-red-400 text-xs p-1">❌</button>
                        )}
                    </div>
                ))}
            </div>
             <button onClick={handleAddEpisode} className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded mt-2">+ Add Episode</button>
        </div>

        {/* --- Actions --- */}
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-3 py-2 rounded-lg font-semibold transition">
            {isSaving ? "Saving..." : "💾 Save Changes"}
          </button>
          <button onClick={() => setIsEditing(false)} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold transition">
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex justify-between items-center p-4 bg-gray-700 rounded-lg shadow-md hover:bg-gray-600 transition">
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate text-lg text-blue-300">{item.title}</p>
        <p className="text-xs text-gray-400 font-mono truncate">
          <span className="text-yellow-400 mr-2">{item.imdb_rating || 'N/A'}</span>
          /slug/{item.slug}
        </p>
        {item.episodes && item.episodes.length > 0 && (
            <p className="text-xs text-green-400 mt-1">
                {item.episodes.length} Episodes
            </p>
        )}
      </div>
      <div className="flex space-x-2 ml-4">
        <button onClick={() => setIsEditing(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1 rounded-lg transition" title="Edit">✏️</button>
        <button onClick={() => handleDelete(item.id)} className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded-lg transition" title="Delete">🗑️</button>
      </div>
    </li>
  );
};


// =========================================================================
//                             UPLOAD WATCH HTML COMPONENT
// =========================================================================
const UploadWatchHtml = () => {
  // Accessing Supabase and Context values
  const { userData, } = useContext(AppContext);
  const navigate = useNavigate();

  // --- FORM STATE ---
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [htmlCode2, setHtmlCode2] = useState("");
  const [poster, setPoster] = useState("");
  const [coverPoster, setCoverPoster] = useState(""); // This is the target field
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [titleLogo, setTitleLogo] = useState("");
  const [imdbRating, setImdbRating] = useState(""); 
  
  // --- MEDIA UPLOAD STATE ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  
  // --- TMDB SEARCH STATE (NEW) ---
  const [watchList, setWatchList] = useState([]);
  const [search, setSearch] = useState(""); 
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState(""); 
  const [tmdbSearchResult, setTmdbSearchResult] = useState(null); 
  const [isSearching, setIsSearching] = useState(false); 
  
  // --- EPISODE STATE ---
  const [episodes, setEpisodes] = useState([{ title: "", html: "", direct_url: "" }]);
  
  // --- Admin Check ---
  const isAdmin = true; 
  if (!isAdmin) {
    return (
      <div className="text-center mt-20 text-red-500 font-bold text-xl">
        🚫 Access Denied – Admins Only
      </div>
    );
  }

  // --- Supabase Data Fetching ---
  const fetchWatchPages = useCallback(async () => {
    const { data, error } = await supabase
      .from("watch_html")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Supabase Fetch Error:", error.message);
    else setWatchList(data);
  }, []);

  // --- Initial Load ---
  useEffect(() => {
    fetchWatchPages();
  }, [fetchWatchPages]);

  // --- TMDB Metadata Fetch Handler (Calls new /tmdb-details endpoint) ---
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
  
  // ------------------------------------------------------------------
  // ✅ FIX APPLIED HERE: Using data.cover_poster_url for setCoverPoster
  // ------------------------------------------------------------------
  const handleUseMetadata = (data) => {
      
      // 1. Title
      setTitle(data.title || ''); 
      
      // 2. Slug: Auto-generate/update from the cleaned title
      const newSlug = data.title 
          ? (data.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ''))
          : '';
      setSlug(newSlug); 
      
      // 3. Poster URLs
      setPoster(data.poster_url || '');
      // Use the newly available cover poster URL from the backend
      setCoverPoster(data.cover_poster_url || data.poster_url || ''); 
      
      // 4. IMDb Rating (Formatted nicely)
      const formattedRating = data.imdb_rating ? `${data.imdb_rating.toFixed(1)}/10` : '';
      setImdbRating(formattedRating); 
      
      // Clear all other media-specific fields
      setHtmlCode('');
      setHtmlCode2('');
      setVideoUrl('');
      setDirectUrl('');
      setTitleLogo('');
      setEpisodes([{ title: "", html: "", direct_url: "" }]);
      
      toast.info(`🎬 Form pre-filled: Title, Slug, Poster, and IMDb Rating from ${data.title}.`);
      setTmdbSearchResult(null); 
      setTmdbSearchQuery(""); 
  };
  // ------------------------------------------------------------------

  // --- Video Upload Handler (Bunny Stream) ---
  const handleVideoUpload = async (file) => {
    if (!file) return toast.error("❌ No file selected!");
    if (!backendUrl) return toast.error("❌ Backend URL missing for upload!");
    setIsUploading(true);
    setUploadProgress("0% (0MB / 0MB)");
    
    try {
      const formData = new FormData();
      formData.append("movie", file);
      let lastLoaded = 0;
      let lastTime = Date.now();
      const res = await axios.post(`${backendUrl}/api/upload-bunnystream`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            const mbUploaded = (event.loaded / (1024 * 1024)).toFixed(2);
            const mbTotal = (event.total / (1024 * 1024)).toFixed(2);
            const now = Date.now();
            const deltaTime = (now - lastTime) / 1000;
            const deltaBytes = event.loaded - lastLoaded;
            const speed = (deltaTime > 0 && deltaBytes > 0) ? (deltaBytes / (1024 * 1024 * deltaTime)).toFixed(2) : '0.00';
            lastLoaded = event.loaded;
            lastTime = now;
            setUploadProgress(`${percent}% (${mbUploaded}MB / ${mbTotal}MB) [${speed} MB/s]`);
          }
        },
        timeout: 0,
      });
      const { videoGuid, directUrl: fetchedDirectUrl } = res.data;
      if (!videoGuid || !fetchedDirectUrl) throw new Error("No video URL returned");
      setVideoUrl(fetchedDirectUrl);
      toast.success("✅ Video uploaded! Direct player URL is ready.");
    } catch (err) {
      console.error("❌ Upload error:", err.response?.data || err.message);
      toast.error("⚠️ Upload failed!");
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setUploadProgress("");
    }
  };

  // --- Main Upload Handler (Supabase) ---
  const handleUpload = async () => {
    if (!title.trim()) {
      return toast.error("❌ Please enter a title!");
    }
    if (!slug.trim()) {
      return toast.error("❌ Please enter a unique slug!");
    }

    setLoading(true);

    const validEpisodes = episodes.filter(
      (ep) => ep.title || ep.html || ep.direct_url
    );

    const record = {
      id: uuidv4(),
      title: title.trim(),
      slug: slug.trim(),
      html_code: htmlCode.trim() || "",
      html_code2: htmlCode2.trim() || "",
      poster: poster.trim() || "",
      cover_poster: coverPoster.trim() || "",
      video_url: videoUrl.trim() || "",
      direct_url: directUrl.trim() || "",
      title_logo: titleLogo.trim() || "",
      imdb_rating: imdbRating.trim() || "",
      episodes: validEpisodes, 
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("watch_html").insert([record]);
    if (error) {
      console.error(error.message);
      toast.error("⚠️ Failed to upload! Slug may already exist.");
    } else {
      toast.success("✅ Movie Uploaded Successfully!");
      // Reset form fields
      setTitle("");
      setSlug("");
      setHtmlCode("");
      setHtmlCode2("");
      setPoster("");
      setCoverPoster("");
      setVideoUrl("");
      setDirectUrl("");
      setTitleLogo("");
      setImdbRating("");
      setEpisodes([{ title: "", html: "", direct_url: "" }]);
      setSelectedFile(null);
      setTmdbSearchQuery(""); 
      setTmdbSearchResult(null);
      fetchWatchPages();
    }

    setLoading(false);
  };

  // --- Delete Handler (Supabase) ---
  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ Are you sure you want to delete this?")) return;
    
    const { error } = await supabase.from("watch_html").delete().eq("id", id);
    if (error) toast.error("⚠️ Failed to delete!");
    else {
      toast.success("🗑️ Deleted successfully!");
      setWatchList(watchList.filter((item) => item.id !== id));
    }
  };

  const filteredList = watchList.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );
  

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-900 min-h-screen text-white">
      {/* Tailwind CSS Script for proper styling */}
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`
        /* Custom scrollbar for better visibility */
        .custom-scroll::-webkit-scrollbar { width: 8px; }
        .custom-scroll::-webkit-scrollbar-track { background: #1f2937; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #6b7280; }
        body { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <button
        onClick={() => navigate("/admin/dashboard")}
        className="mb-6 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md transition"
      >
        ⬅️ Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">
        🎬 Upload Watch HTML
      </h1>
      
      {/* Backend URL Check */}
      {!backendUrl && (
          <div className="bg-red-900 text-white p-4 rounded-xl mb-6 border border-red-700">
            <p className="font-bold">⚠️ Backend URL Missing!</p>
            <p className="text-sm">Please ensure the `backendUrl` is correctly provided via `AppContext` for the metadata fetch and video upload features to work.</p>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Forms and Search */}
        <div className="bg-gray-800 text-white shadow-xl rounded-xl p-6">
            
          {/* --- TMDB MOVIE SEARCH (NEW) --- */}
          <h2 className="text-xl font-semibold mb-4 text-purple-300 border-b border-gray-700 pb-2">
             🔍 TMDB Movie Metadata Search
          </h2>
          
          <div className="flex gap-2 mb-4">
              <input
                type="text"
                className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={tmdbSearchQuery}
                onChange={(e) => setTmdbSearchQuery(e.target.value)}
                placeholder="Enter movie or TV show title (e.g., Baahubali)"
                onKeyDown={(e) => e.key === 'Enter' && handleTMDBSearch()}
                disabled={isSearching}
              />
              <button
                  onClick={handleTMDBSearch}
                  disabled={isSearching || !tmdbSearchQuery.trim()}
                  className={`flex items-center justify-center p-3 rounded-lg font-semibold transition ${
                      tmdbSearchQuery.trim() && !isSearching
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-gray-600 cursor-not-allowed"
                  }`}
              >
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              </button>
          </div>
          
          {/* TMDB Search Result Display */}
          {tmdbSearchResult && (
            <div className="bg-gray-700 p-4 rounded-xl mb-6 border border-purple-500/50 flex gap-4">
                <img 
                    src={tmdbSearchResult.poster_url || 'https://placehold.co/100x150/1f2937/9ca3af?text=No+Poster'} 
                    alt={tmdbSearchResult.title} 
                    className="w-24 h-36 object-cover rounded-lg shadow-lg"
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x150/1f2937/9ca3af?text=No+Poster'; }}
                />
                <div className="flex-grow">
                    <h3 className="text-xl font-bold text-green-300 mb-1">{tmdbSearchResult.title} ({tmdbSearchResult.year})</h3>
                    <p className="text-sm text-gray-300 mb-3">
                        <span className="font-semibold mr-2">Rating:</span> 
                        <Star className="h-4 w-4 text-yellow-500 inline-block fill-yellow-500 mr-1" />
                        {tmdbSearchResult.imdb_rating.toFixed(1)}/10
                    </p>
                    <button
                        onClick={() => handleUseMetadata(tmdbSearchResult)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-md"
                    >
                        Apply Metadata to Form
                    </button>
                    {tmdbSearchResult.cast && tmdbSearchResult.cast.length > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                            Top Cast: {tmdbSearchResult.cast.map(c => c.name).join(', ')}
                        </p>
                    )}
                </div>
            </div>
          )}
          {/* --- END TMDB SEARCH --- */}
            
          
          <h2 className="text-xl font-semibold mb-4 text-blue-300 border-b border-gray-700 pb-2">➕ Movie/Series Details</h2>

          {/* Movie Form */}
          <div className="mb-5">
            <label className="block font-semibold mb-2">Movie Title</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter movie title (Pre-filled from Search)"
            />
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">Slug (unique)</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="unique-slug (Pre-filled from Search)"
            />
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">IMDb Rating (e.g., 8.5/10)</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full text-yellow-400 font-bold"
              value={imdbRating}
              onChange={(e) => setImdbRating(e.target.value)}
              placeholder="IMDb Rating (e.g., 8.5/10) (Pre-filled from Search)"
            />
          </div>

           <div className="mb-5">
            <label className="block font-semibold mb-2">Title Logo URL</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full"
              value={titleLogo}
              onChange={(e) => setTitleLogo(e.target.value)}
              placeholder="Title logo URL"
            />
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">Cover Poster URL</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full"
              value={coverPoster}
              onChange={(e) => setCoverPoster(e.target.value)}
              placeholder="https://example.com/cover-poster.jpg (Pre-filled from Search)"
            />
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">Poster URL</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full"
              value={poster}
              onChange={(e) => setPoster(e.target.value)}
              placeholder="https://example.com/poster.jpg (Pre-filled from Search)"
            />
          </div>
          
          <h2 className="text-xl font-semibold mb-4 text-blue-300 border-b border-gray-700 pb-2 mt-6">🔗 Media Uploads & Links</h2>

          <div className="mb-5">
            <label className="block font-semibold mb-2">
              Bunny Video ID (Server 2)
            </label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full"
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              placeholder="Enter Bunny Video ID (guid)"
            />
            <button
              onClick={async () => {
                if (!directUrl.trim()) return toast.error("❌ Please enter video ID!");
                if (!backendUrl) return toast.error("❌ Backend URL missing for fetch!");
                try {
                  setIsUploading(true);
                  const res = await axios.get(`${backendUrl}/api/videos/${directUrl.trim()}/download`);
                  setVideoUrl(res.data.directDownloadUrl);
                  toast.success("✅ Direct video URL fetched from Bunny Stream!");
                } catch (err) {
                  console.error(err.response?.data || err.message);
                  toast.error("⚠️ Failed to fetch direct video URL!");
                } finally {
                  setIsUploading(false);
                }
              }}
              disabled={isUploading}
              className={`mt-2 px-4 py-2 rounded-lg font-semibold text-white transition ${
                directUrl ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {isUploading ? "⏳ Fetching..." : "🔗 Get Direct URL"}
            </button>

            {directUrl && (
              <p className="text-blue-300 mt-2 break-all text-sm">
                Direct URL: <span className="font-mono">{directUrl}</span>
              </p>
            )}
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">Video URL (HLS)</label>
            <input
              type="text"
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Enter or paste HLS video URL"
            />
            {videoUrl && <p className="text-green-400 text-sm mt-1">✅ HLS Ready</p>}
            {uploadProgress && <p className="text-blue-300 mt-2 font-mono text-sm">{uploadProgress}</p>}
          </div>

          <div className="mb-5 relative">
            <label className="block font-semibold mb-2">Upload Video (Server 1 – Auto converts to HLS)</label>
            <input
              type="file"
              accept="video/*,.mp4,.webm,.mkv,.mov,.avi,.m3u8,.ts"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full text-white mb-2"
            />
            {selectedFile && !isUploading && (
              <button
                onClick={() => setSelectedFile(null)}
                className="absolute top-9 right-2 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-bold"
              >
                ❌
              </button>
            )}
            <button
              onClick={() => handleVideoUpload(selectedFile)}
              disabled={!selectedFile || isUploading || !backendUrl}
              className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                selectedFile && backendUrl ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {isUploading ? "⏳ Uploading..." : "🚀 Upload & Convert to HLS"}
            </button>
          </div>

          <div className="mb-5">
            <label className="block font-semibold mb-2">Watch HTML Code (Server 1)</label>
            <textarea
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full font-mono placeholder-gray-400"
              rows={5}
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="<iframe src='...'></iframe>"
            />
          </div>

          {/* Server 2 HTML Code */}
          <div className="mb-5">
            <label className="block font-semibold mb-2">Watch HTML Code (Server 2)</label>
            <textarea
              className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full font-mono placeholder-gray-400"
              rows={5}
              value={htmlCode2}
              onChange={(e) => setHtmlCode2(e.target.value)}
              placeholder="<iframe src='...'></iframe>"
            />
          </div>

          {/* ✅ Add Episodes Section */}
          <div className="mb-5 mt-6 border-t border-gray-700 pt-4">
            <label className="block font-semibold mb-3 text-yellow-400">🎞️ Episodes (For Series)</label>
            <div className="max-h-60 overflow-y-auto custom-scroll pr-2">
                {episodes.map((ep, index) => (
                <div
                    key={index}
                    className="mb-4 border border-gray-700 rounded-lg p-3 bg-gray-700 relative shadow-inner"
                >
                    <input
                    type="text"
                    className="border border-gray-600 bg-gray-800 p-2 rounded-lg w-full mb-2 placeholder-gray-400"
                    placeholder={`Episode ${index + 1} Title`}
                    value={ep.title}
                    onChange={(e) => {
                        const updated = [...episodes];
                        updated[index].title = e.target.value;
                        setEpisodes(updated);
                    }}
                    />
                    <textarea
                    rows={3}
                    className="border border-gray-600 bg-gray-800 p-2 rounded-lg w-full font-mono mb-2 text-sm placeholder-gray-400"
                    placeholder="<iframe src='...'></iframe>"
                    value={ep.html}
                    onChange={(e) => {
                        const updated = [...episodes];
                        updated[index].html = e.target.value;
                        setEpisodes(updated);
                    }}
                    />
                    <input
                    type="text"
                    className="border border-gray-600 bg-gray-800 p-2 rounded-lg w-full text-sm placeholder-gray-400"
                    placeholder="Direct URL (optional)"
                    value={ep.direct_url}
                    onChange={(e) => {
                        const updated = [...episodes];
                        updated[index].direct_url = e.target.value;
                        setEpisodes(updated);
                    }}
                    />
                    {episodes.length > 1 && (
                        <button
                        onClick={() => {
                            const updated = episodes.filter((_, i) => i !== index);
                            setEpisodes(updated);
                        }}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-400 p-1 rounded-full bg-gray-800"
                        title="Remove Episode"
                        >
                        ❌
                        </button>
                    )}
                </div>
                ))}
            </div>
            <button
              onClick={() =>
                setEpisodes([...episodes, { title: "", html: "", direct_url: "" }])
              }
              className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white font-semibold mt-3"
            >
              ➕ Add Episode
            </button>
          </div>


          <button
            onClick={handleUpload}
            disabled={!title || !slug || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 transition text-white px-6 py-3 rounded-lg font-semibold w-full mt-6 shadow-2xl"
          >
            {loading ? "⏳ Uploading..." : "🚀 Upload HTML"}
          </button>
        </div>

        {/* Right Panel - Uploaded List */}
        <div className="bg-gray-800 text-white shadow-xl rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-400 border-b border-gray-700 pb-2">📌 Recently Uploaded</h2>
          <input
            type="text"
            placeholder="🔍 Search uploaded items by title..."
            className="border border-gray-700 bg-gray-700 p-3 rounded-lg w-full mb-4 placeholder-gray-40
            "
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filteredList.length === 0 ? (
            <p className="text-gray-400">No results found.</p>
          ) : (
            <ul className="space-y-3 max-h-[750px] overflow-y-auto pr-2 custom-scroll">
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