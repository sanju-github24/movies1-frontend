// src/pages/UploadWatchHtml.jsx
import React, { useState, useContext, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Search, Loader2, Star, Settings, Trash2, Edit3, Plus, ArrowLeft, 
  Layers, Database, Tv, Layout, Monitor, Film, RotateCcw, Save, X, Eye, EyeOff, TrendingUp
} from "lucide-react";

/* ================= EDITABLE ITEM COMPONENT (STUDIO EDITOR) ================= */
const EditableItem = ({ item, fetchWatchPages, handleDelete, backendUrl }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...item });
  const [editEpisodes, setEditEpisodes] = useState(item.episodes || []);
  // DOWNLOADS (EDIT MODE)
const [editDownloads, setEditDownloads] = useState(item.download_links || []);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
  if (isEditing) {
    setEditData({ ...item });
    setEditEpisodes(item.episodes || []);
    setEditDownloads(item.download_links || []);
  }
}, [isEditing, item]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validEps = editEpisodes.filter(e => e.title || e.tmdb_id || e.direct_url || e.html);
      
      const { error } = await supabase
        .from("watch_html")
        .update({ 
  title: editData.title,
  slug: editData.slug,
  tmdb_id: editData.tmdb_id,
  imdb_id: editData.imdb_id,
  imdb_rating: editData.imdb_rating,
  poster: editData.poster,
  cover_poster: editData.cover_poster,
  title_logo: editData.title_logo,
  video_url: editData.video_url,
  direct_url: editData.direct_url,
  html_code: editData.html_code,
  html_code2: editData.html_code2,
  show_on_hero: editData.show_on_hero,
  is_trending: editData.is_trending,
  episodes: validEps,
  download_links: editDownloads.filter(d => d.quality)
})

        .eq("id", item.id);

      if (!error) {
        toast.success("Studio Sync Successful!");
        setIsEditing(false);
        fetchWatchPages();
      } else throw error;
    } catch (e) { 
      toast.error("Sync failed: " + e.message); 
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="p-6 bg-slate-900 rounded-[2.5rem] border-2 border-blue-500/50 space-y-6 shadow-2xl animate-in zoom-in-95 overflow-hidden">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
                <Settings size={16} className="text-blue-500"/>
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Full Content Editor</h4>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        {/* Feature Toggles in Editor */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {editData.show_on_hero ? <Eye size={18} className="text-green-500"/> : <EyeOff size={18} className="text-red-500"/>}
                    <div>
                        <p className="text-[10px] font-black text-white uppercase">Hero</p>
                    </div>
                </div>
                <button 
                    onClick={() => setEditData({...editData, show_on_hero: !editData.show_on_hero})}
                    className={`w-10 h-5 rounded-full transition-all relative ${editData.show_on_hero ? 'bg-green-600' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editData.show_on_hero ? 'right-1' : 'left-1'}`} />
                </button>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp size={18} className={editData.is_trending ? "text-blue-400" : "text-slate-500"}/>
                    <div>
                        <p className="text-[10px] font-black text-white uppercase">Trending</p>
                    </div>
                </div>
                <button 
                    onClick={() => setEditData({...editData, is_trending: !editData.is_trending})}
                    className={`w-10 h-5 rounded-full transition-all relative ${editData.is_trending ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editData.is_trending ? 'right-1' : 'left-1'}`} />
                </button>
            </div>
        </div>

        {/* 1. Identity & Config */}
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 ml-1">Title</label>
                    <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs text-white" value={editData.title || ""} onChange={e => setEditData({...editData, title: e.target.value})} placeholder="Title" />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 ml-1">Slug</label>
                    <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs font-mono text-blue-400" value={editData.slug || ""} onChange={e => setEditData({...editData, slug: e.target.value})} placeholder="Slug" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 ml-1">TMDB ID</label>
                    <input className="w-full bg-slate-800 border border-blue-500/20 p-3 rounded-xl text-xs font-mono text-blue-300" value={editData.tmdb_id || ""} onChange={e => setEditData({...editData, tmdb_id: e.target.value})} placeholder="TMDB ID" />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 ml-1">IMDb ID</label>
                    <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs text-white" value={editData.imdb_id || ""} onChange={e => setEditData({...editData, imdb_id: e.target.value})} placeholder="IMDb ID" />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 ml-1">Rating</label>
                    <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs text-yellow-500" value={editData.imdb_rating || ""} onChange={e => setEditData({...editData, imdb_rating: e.target.value})} placeholder="8.5/10" />
                </div>
            </div>
        </div>

        {/* 2. Visual Assets */}
        <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Branding Assets</p>
            <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-[10px] text-slate-300" value={editData.poster || ""} onChange={e => setEditData({...editData, poster: e.target.value})} placeholder="Poster URL" />
            <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-[10px] text-slate-300" value={editData.cover_poster || ""} onChange={e => setEditData({...editData, cover_poster: e.target.value})} placeholder="Backdrop URL" />
            <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-[10px] text-slate-300" value={editData.title_logo || ""} onChange={e => setEditData({...editData, title_logo: e.target.value})} placeholder="Title Logo URL" />
        </div>

        {/* 3. Server Config */}
        <div className="space-y-3 border-l-4 border-blue-600 pl-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Server Handlers</p>
            <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs font-mono text-green-400" value={editData.video_url || ""} onChange={e => setEditData({...editData, video_url: e.target.value})} placeholder="Primary Stream URL" />
            <textarea className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs font-mono" rows={1} value={editData.html_code || ""} onChange={e => setEditData({...editData, html_code: e.target.value})} placeholder="Primary Iframe Mirror" />
            <input className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs text-white" value={editData.direct_url || ""} onChange={e => setEditData({...editData, direct_url: e.target.value})} placeholder="Backup Stream Handler" />
            <textarea className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs font-mono" rows={1} value={editData.html_code2 || ""} onChange={e => setEditData({...editData, html_code2: e.target.value})} placeholder="Backup Iframe Mirror" />
        </div>

        {/* 4. Episodes Architect */}
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Episode Stack ({editEpisodes.length})</p>
                <button onClick={() => setEditEpisodes([...editEpisodes, { title: "", season: 1, tmdb_id: "", direct_url: "", html: "" }])} className="text-blue-500 text-[9px] font-black uppercase">+ New Episode</button>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1 custom-scroll">
                {editEpisodes.map((ep, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                        <div className="flex gap-2 items-center">
                            <input className="w-12 bg-slate-900 border border-slate-800 p-2 rounded-lg text-blue-500 text-[10px] font-black text-center" value={ep.season} onChange={e => {
                                const u = [...editEpisodes]; u[idx].season = e.target.value; setEditEpisodes(u);
                            }} />
                            <input className="flex-1 bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-white font-bold" value={ep.title} placeholder="Title" onChange={e => {
                                const u = [...editEpisodes]; u[idx].title = e.target.value; setEditEpisodes(u);
                            }} />
                            <button onClick={() => setEditEpisodes(editEpisodes.filter((_, i) => i !== idx))}><Trash2 size={14} className="text-red-500"/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-[9px] text-blue-400 font-mono" value={ep.tmdb_id} placeholder="TMDB Ep ID" onChange={e => {
                                const u = [...editEpisodes]; u[idx].tmdb_id = e.target.value; setEditEpisodes(u);
                            }} />
                            <input className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-[9px] text-green-400 font-mono" value={ep.direct_url} placeholder="Stream URL" onChange={e => {
                                const u = [...editEpisodes]; u[idx].direct_url = e.target.value; setEditEpisodes(u);
                            }} />
                        </div>
                        <textarea className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-[9px] text-purple-400 font-mono" rows={1} value={ep.html} placeholder="Iframe Mirror Code..." onChange={e => {
                            const u = [...editEpisodes]; u[idx].html = e.target.value; setEditEpisodes(u);
                        }} />
                    </div>
                ))}
            </div>
        </div>

        {/* ================= DOWNLOADS EDITOR ================= */}
<div className="space-y-4">
  <div className="flex justify-between items-center">
    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
      Downloads ({editDownloads.length})
    </p>
    <button
      onClick={() =>
        setEditDownloads([
          ...editDownloads,
          { quality: "", size: "", links: [{ label: "", url: "" }] }
        ])
      }
      className="text-blue-400 text-[9px] font-black uppercase"
    >
      + Quality
    </button>
  </div>

  <div className="space-y-6 max-h-[300px] overflow-y-auto pr-1 custom-scroll">
    {editDownloads.map((q, qIdx) => (
      <div
        key={qIdx}
        className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <input
            className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs"
            placeholder="Quality (720p)"
            value={q.quality}
            onChange={(e) => {
              const u = [...editDownloads];
              u[qIdx].quality = e.target.value;
              setEditDownloads(u);
            }}
          />
          <input
            className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs"
            placeholder="Size (1.2GB)"
            value={q.size}
            onChange={(e) => {
              const u = [...editDownloads];
              u[qIdx].size = e.target.value;
              setEditDownloads(u);
            }}
          />
        </div>

        {q.links.map((l, lIdx) => (
          <div key={lIdx} className="grid grid-cols-2 gap-3">
            <input
              className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-[10px]"
              placeholder="Label"
              value={l.label}
              onChange={(e) => {
                const u = [...editDownloads];
                u[qIdx].links[lIdx].label = e.target.value;
                setEditDownloads(u);
              }}
            />
            <input
              className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-[10px] font-mono"
              placeholder="URL"
              value={l.url}
              onChange={(e) => {
                const u = [...editDownloads];
                u[qIdx].links[lIdx].url = e.target.value;
                setEditDownloads(u);
              }}
            />
          </div>
        ))}

        <div className="flex justify-between">
          <button
            onClick={() => {
              const u = [...editDownloads];
              u[qIdx].links.push({ label: "", url: "" });
              setEditDownloads(u);
            }}
            className="text-green-400 text-[9px] font-black uppercase"
          >
            + Link
          </button>

          <button
            onClick={() =>
              setEditDownloads(editDownloads.filter((_, i) => i !== qIdx))
            }
            className="text-red-500 text-[9px] font-black uppercase"
          >
            Remove
          </button>
        </div>
      </div>
    ))}
  </div>
</div>


        <div className="flex gap-3 pt-4 border-t border-white/5">
            <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <><Save size={16}/> Sync Studio</>}
            </button>
            <button onClick={() => setIsEditing(false)} className="bg-slate-800 px-6 rounded-2xl font-black text-xs uppercase text-white">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-slate-900/50 border border-white/5 p-4 rounded-2xl hover:border-blue-500/30 transition-all flex items-center justify-between">
      <div className="flex items-center gap-4 overflow-hidden">
         <div className="w-10 h-14 bg-slate-800 rounded-lg overflow-hidden border border-white/5 shadow-lg relative">
            <img src={item.poster || "/default-poster.jpg"} className="w-full h-full object-cover" alt="" />
            <div className="absolute top-0 right-0 flex flex-col gap-0.5">
                {item.show_on_hero && <div className="bg-green-500 w-2 h-2 rounded-bl-sm animate-pulse" />}
                {item.is_trending && <div className="bg-blue-500 w-2 h-2 rounded-bl-sm" />}
            </div>
         </div>
         <div className="overflow-hidden">
            <p className="font-bold text-gray-100 truncate text-sm uppercase italic leading-none">{item.title || "Untitled"}</p>
            <div className="flex gap-2 text-[8px] font-black uppercase mt-2">
                <span className={item.show_on_hero ? "text-green-500" : "text-gray-600"}>HERO:{item.show_on_hero ? "Y" : "N"}</span>
                <span className={item.is_trending ? "text-blue-500" : "text-gray-600"}>TREND:{item.is_trending ? "Y" : "N"}</span>
            </div>
         </div>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setIsEditing(true)} className="p-2 bg-slate-800 hover:bg-blue-600 rounded-xl transition-colors text-white" title="Studio Editor"><Edit3 size={14}/></button>
        <button onClick={() => handleDelete(item.id)} className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl transition-colors text-white" title="Remove Record"><Trash2 size={14}/></button>
      </div>
    </div>
  );
};

/* ================= MAIN DASHBOARD ================= */
const UploadWatchHtml = () => {
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const initialForm = {
    title: "", slug: "", tmdb_id: "", poster: "", cover_poster: "",
    video_url: "", direct_url: "", title_logo: "", imdb_rating: "", imdb_id: "",
    html_code: "", html_code2: "",
    show_on_hero: false,
    is_trending: false // Initial state for Trending
  };

  const [formData, setFormData] = useState(initialForm);
  const [episodes, setEpisodes] = useState([{ title: "", html: "", direct_url: "", season: 1, tmdb_id: "" }]);
  const [watchList, setWatchList] = useState([]);
  const [search, setSearch] = useState("");
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState("");
  const [tmdbResult, setTmdbResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  // TELEGRAM FILES
const [telegramFiles, setTelegramFiles] = useState([]);
const [tgLoading, setTgLoading] = useState(true);
const [tgSearch, setTgSearch] = useState("");


// DOWNLOADS (NEW FEATURE)
const [downloads, setDownloads] = useState([
  {
    quality: "",
    size: "",
    links: [{ label: "", url: "" }]
  }
]);



  const fetchWatchPages = useCallback(async () => {
    try {
      const { data } = await supabase.from("watch_html").select("*").order("created_at", { ascending: false });
      if (data) setWatchList(data);
    } catch (e) { console.error("Database fetch failed"); }
  }, []);

  const fetchTelegramFiles = useCallback(async () => {
  const { data, error } = await supabase
    .from("telegram_files")
    .select("file_name, file_code, created_at")
    .order("created_at", { ascending: false });

  if (!error && data) setTelegramFiles(data);
  setTgLoading(false);
}, []);


 useEffect(() => {
  fetchWatchPages();
  fetchTelegramFiles();
}, [fetchWatchPages, fetchTelegramFiles]);


  

  const handleTMDBSearch = async () => {
    if (!tmdbSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const isId = /^tt\d+$/i.test(tmdbSearchQuery) || /^\d+$/.test(tmdbSearchQuery);
      const params = isId ? { imdb_id: tmdbSearchQuery } : { title: tmdbSearchQuery };
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, { params });
      if (res.data.success) setTmdbResult(res.data.data);
    } catch (err) { toast.error("TMDB error"); } finally { setIsSearching(false); }
  };

  const applyMetadata = (data) => {
    setFormData(prev => ({
      ...prev,
      title: data.title || "",
      slug: data.title ? data.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, '') : "",
      tmdb_id: data.tmdb_id?.toString() || "",
      poster: data.poster_url || "",
      cover_poster: data.cover_poster_url || "",
      imdb_rating: data.imdb_rating ? `${data.imdb_rating.toFixed(1)}/10` : "",
      imdb_id: data.imdb_id || ""
    }));
    setTmdbResult(null);
  };

  const handleVideoUpload = async (file) => {
    if (!file) return toast.error("Select file!");
    setIsUploading(true);
    try {
      const fd = new FormData(); fd.append("movie", file);
      const res = await axios.post(`${backendUrl}/api/upload-bunnystream`, fd, {
        onUploadProgress: e => setUploadProgress(`${Math.round((e.loaded/e.total)*100)}%`)
      });
      setFormData(prev => ({...prev, video_url: res.data.directUrl}));
      toast.success("Upload Success!");
    } catch (err) { toast.error("Upload failed"); } finally { setIsUploading(false); setUploadProgress(""); }
  };

  const handleUpload = async () => {
    if (!formData.title || !formData.slug) return toast.error("Title/Slug required");
    setLoading(true);
    try {
      const validEps = episodes.filter(e => e.title || e.tmdb_id || e.direct_url || e.html);
      const { error } = await supabase.from("watch_html").insert([{ 
  ...formData,
  episodes: validEps,
  download_links: downloads.filter(d => d.quality),
  id: uuidv4(),
  created_at: new Date().toISOString()
}]);

      
      if (!error) {
        toast.success("Deployed!");
        setFormData(initialForm);
        setEpisodes([{ title: "", html: "", direct_url: "", season: 1, tmdb_id: "" }]);
        fetchWatchPages();
      } else throw error;
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 sm:p-8 font-sans">
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 mb-12">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate("/admin/dashboard")} className="p-3 bg-slate-900 border border-white/5 rounded-2xl hover:text-blue-400 transition-all text-white"><ArrowLeft size={20}/></button>
           <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white underline decoration-blue-600 decoration-4 underline-offset-8">Studio <span className="text-blue-500">Pro</span></h1>
        </div>
        <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
            <input className="w-full bg-slate-900 border border-white/5 p-3 pl-12 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-sm text-white" placeholder="TMDB Sync..." value={tmdbSearchQuery} onChange={e => setTmdbSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTMDBSearch()} />
            {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={18}/>}
        </div>
      </header>

      {tmdbResult && (
        <div className="max-w-4xl mx-auto mb-10 bg-slate-900 border border-blue-500/40 rounded-[2.5rem] p-6 flex flex-col md:flex-row gap-8 shadow-2xl animate-in zoom-in-95">
            <img src={tmdbResult.poster_url || "/default-poster.jpg"} className="w-40 h-56 object-cover rounded-3xl shadow-2xl border border-white/10" alt="" />
            <div className="flex-1 space-y-4">
                <h2 className="text-3xl font-black uppercase italic text-white leading-none">{tmdbResult.title} <span className="text-slate-500 block not-italic text-lg mt-2 tracking-widest uppercase">{tmdbResult.year}</span></h2>
                <button onClick={() => applyMetadata(tmdbResult)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg">
                    <Database size={16}/> Sync
                </button>
            </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
            
            {/* HERO & TRENDING DUAL TOGGLE SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="bg-slate-900/80 border border-blue-500/20 p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-3xl ${formData.show_on_hero ? 'bg-green-600/20 text-green-500' : 'bg-red-600/20 text-red-500'}`}>
                            {formData.show_on_hero ? <Eye size={24}/> : <EyeOff size={24}/>}
                        </div>
                        <div>
                            <h3 className="font-black uppercase tracking-widest text-[11px] text-white leading-none">Hero Slide</h3>
                            <p className="text-[10px] text-slate-500 uppercase mt-1">{formData.show_on_hero ? 'Visible' : 'Hidden'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setFormData({...formData, show_on_hero: !formData.show_on_hero})}
                        className={`w-16 h-8 rounded-full transition-all relative ${formData.show_on_hero ? 'bg-green-600' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all ${formData.show_on_hero ? 'right-1.5' : 'left-1.5'}`} />
                    </button>
                </section>

                <section className="bg-slate-900/80 border border-blue-500/20 p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-3xl ${formData.is_trending ? 'bg-blue-600/20 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
                            <TrendingUp size={24}/>
                        </div>
                        <div>
                            <h3 className="font-black uppercase tracking-widest text-[11px] text-white leading-none">Trending 10</h3>
                            <p className="text-[10px] text-slate-500 uppercase mt-1">{formData.is_trending ? 'Enabled' : 'Disabled'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setFormData({...formData, is_trending: !formData.is_trending})}
                        className={`w-16 h-8 rounded-full transition-all relative ${formData.is_trending ? 'bg-blue-600' : 'bg-slate-800'}`}
                    >
                        <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all ${formData.is_trending ? 'right-1.5' : 'left-1.5'}`} />
                    </button>
                </section>
            </div>

            <section className="bg-slate-900/80 border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                    <Layout size={18} className="text-blue-500"/>
                    <h3 className="font-black uppercase tracking-widest text-[11px] text-white">Identity</h3>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <input className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-white" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Title" />
                    <input className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs font-mono text-blue-400" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="Slug" />
                </div>
                <div className="grid grid-cols-3 gap-5">
                    <input className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs font-mono text-blue-200" value={formData.tmdb_id} onChange={e => setFormData({...formData, tmdb_id: e.target.value})} placeholder="TMDB ID" />
                    <input className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-white" value={formData.imdb_id} onChange={e => setFormData({...formData, imdb_id: e.target.value})} placeholder="IMDb ID" />
                    <input className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-yellow-500" value={formData.imdb_rating} onChange={e => setFormData({...formData, imdb_rating: e.target.value})} placeholder="Rating" />
                </div>
            </section>

            <section className="bg-slate-900/80 border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-xl text-white">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                    <Film size={18} className="text-purple-500"/>
                    <h3 className="font-black uppercase tracking-widest text-[11px]">Visuals</h3>
                </div>
                <div className="space-y-4">
                    <input className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs" value={formData.poster} onChange={e => setFormData({...formData, poster: e.target.value})} placeholder="Poster URL" />
                    <input className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs" value={formData.cover_poster} onChange={e => setFormData({...formData, cover_poster: e.target.value})} placeholder="Cover URL" />
                    <input className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs" value={formData.title_logo} onChange={e => setFormData({...formData, title_logo: e.target.value})} placeholder="Logo URL" />
                </div>
            </section>

            <section className="bg-slate-900/80 border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-xl border-l-4 border-l-blue-600 text-white">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                    <Monitor size={18} className="text-blue-400"/>
                    <h3 className="font-black uppercase tracking-widest text-[11px]">Global Stream</h3>
                </div>
                <div className="space-y-4">
                    <input className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-green-400 font-mono" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} placeholder="HLS/MKV URL" />
                    <textarea className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs font-mono" rows={1} value={formData.html_code} onChange={e => setFormData({...formData, html_code: e.target.value})} placeholder="Iframe code..." />
                    <div className="flex gap-4 items-center bg-slate-800/30 p-4 rounded-2xl">
                        <input type="file" className="flex-1 text-[10px] cursor-pointer" onChange={e => setSelectedFile(e.target.files[0])} />
                        <button onClick={() => handleVideoUpload(selectedFile)} disabled={isUploading || !selectedFile} className="bg-blue-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase">
                            {isUploading ? uploadProgress : "Upload"}
                        </button>
                    </div>
                </div>
                <div className="pt-4 border-t border-white/5 space-y-4">
                    <input className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-white font-mono" value={formData.direct_url} onChange={e => setFormData({...formData, direct_url: e.target.value})} placeholder="Backup Stream Handler" />
                    <textarea className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs font-mono" rows={1} value={formData.html_code2} onChange={e => setFormData({...formData, html_code2: e.target.value})} placeholder="Backup Iframe Mirror" />
                </div>
            </section>

            <section className="bg-slate-900/80 border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-xl text-white">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2">
                        <Tv size={18} className="text-blue-500"/>
                        <h3 className="font-black uppercase tracking-widest text-[11px]">Episodes</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEpisodes([...episodes, { title: "", html: "", direct_url: "", season: episodes[episodes.length-1].season, tmdb_id: "" }])} className="px-3 py-1.5 bg-slate-800 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 transition-all">+ Ep</button>
                        <button onClick={() => setEpisodes([...episodes, { title: "", html: "", direct_url: "", season: Number(episodes[episodes.length-1].season) + 1, tmdb_id: "" }])} className="px-3 py-1.5 bg-slate-800 rounded-lg text-[9px] font-black uppercase hover:bg-purple-600 transition-all">+ Ssn</button>
                    </div>
                </div>
                <div className="max-h-[450px] overflow-y-auto pr-3 custom-scroll space-y-4">
                    {episodes.map((ep, idx) => (
                        <div key={idx} className="p-5 bg-slate-950 rounded-[2rem] border border-slate-800 space-y-4 group">
                            <div className="flex gap-3 items-center">
                                <input className="w-10 bg-slate-900 border border-slate-800 p-2 rounded-lg text-blue-500 text-[11px] font-black text-center" value={ep.season} onChange={e => {
                                    const u = [...episodes]; u[idx].season = e.target.value; setEpisodes(u);
                                }} />
                                <input className="flex-1 bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-white" placeholder="Episode Title" value={ep.title} onChange={e => {
                                    const u = [...episodes]; u[idx].title = e.target.value; setEpisodes(u);
                                }} />
                                <button onClick={() => setEpisodes(episodes.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={16}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-[10px] font-mono text-blue-400" placeholder="TMDB ID" value={ep.tmdb_id} onChange={e => {
                                    const u = [...episodes]; u[idx].tmdb_id = e.target.value; setEpisodes(u);
                                }} />
                                <input className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-[10px] text-green-400 font-mono" placeholder="Stream Link" value={ep.direct_url} onChange={e => {
                                    const u = [...episodes]; u[idx].direct_url = e.target.value; setEpisodes(u);
                                }} />
                            </div>
                            <textarea className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-[10px] text-purple-400 font-mono" rows={1} placeholder="Mirror Code..." value={ep.html} onChange={e => {
                                const u = [...episodes]; u[idx].html = e.target.value; setEpisodes(u);
                            }} />
                        </div>
                    ))}
                </div>
            </section>

            {/* ================= DOWNLOAD LINKS (NEW) ================= */}
<section className="bg-slate-900/80 border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-xl text-white">
  <div className="flex items-center justify-between border-b border-white/5 pb-4">
    <div className="flex items-center gap-2">
      <Database size={18} className="text-green-500" />
      <h3 className="font-black uppercase tracking-widest text-[11px]">
        Downloads
      </h3>
    </div>
    <button
      onClick={() =>
        setDownloads([
          ...downloads,
          { quality: "", size: "", links: [{ label: "", url: "" }] }
        ])
      }
      className="text-[9px] font-black uppercase text-blue-400"
    >
      + Quality
    </button>
  </div>

  <div className="space-y-6">
    {downloads.map((q, qIdx) => (
      <div
        key={qIdx}
        className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="Quality (e.g. 720p)"
            className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs"
            value={q.quality}
            onChange={(e) => {
              const u = [...downloads];
              u[qIdx].quality = e.target.value;
              setDownloads(u);
            }}
          />

          <input
            placeholder="Size (e.g. 1.2GB)"
            className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs"
            value={q.size}
            onChange={(e) => {
              const u = [...downloads];
              u[qIdx].size = e.target.value;
              setDownloads(u);
            }}
          />
        </div>

        {q.links.map((l, lIdx) => (
          <div key={lIdx} className="grid grid-cols-2 gap-3">
            <input
              placeholder="Label (Telegram / Direct)"
              className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-[10px]"
              value={l.label}
              onChange={(e) => {
                const u = [...downloads];
                u[qIdx].links[lIdx].label = e.target.value;
                setDownloads(u);
              }}
            />

            <input
              placeholder="Download URL"
              className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-[10px] font-mono"
              value={l.url}
              onChange={(e) => {
                const u = [...downloads];
                u[qIdx].links[lIdx].url = e.target.value;
                setDownloads(u);
              }}
            />
          </div>
        ))}

        <button
          onClick={() => {
            const u = [...downloads];
            u[qIdx].links.push({ label: "", url: "" });
            setDownloads(u);
          }}
          className="text-[9px] uppercase font-black text-green-400"
        >
          + Link
        </button>
      </div>
    ))}
  </div>
</section>


            <button onClick={handleUpload} disabled={loading} className="w-full bg-blue-600 py-5 rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-blue-500 active:scale-[0.98] transition-all text-white flex items-center justify-center gap-4">
                {loading ? <Loader2 className="animate-spin" /> : <><Database size={22}/> Deploy Content</>}
            </button>
        </div>

        <div className="lg:col-span-5">
            <div className="sticky top-24 bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl backdrop-blur-2xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
                    <Layers size={18} className="text-yellow-500"/>
                    <h3 className="font-black uppercase tracking-widest text-[11px] text-white">Live Content Cloud</h3>
                </div>
               {/* TELEGRAM CLOUD FILES */}
<div className="mt-10 bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] space-y-6 shadow-2xl">
  <div className="flex items-center gap-2 border-b border-white/5 pb-4">
    <Database size={18} className="text-blue-500" />
    <h3 className="font-black uppercase tracking-widest text-[11px] text-white">
      Telegram Cloud Files
    </h3>
  </div>

  {/* SEARCH INPUT */}
  <div className="relative">
    <Search
      size={14}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
    />
    <input
      value={tgSearch}
      onChange={(e) => setTgSearch(e.target.value)}
      placeholder="Search file name or code..."
      className="w-full bg-slate-950 border border-slate-800 pl-9 p-2 rounded-xl text-[10px] text-white outline-none focus:border-blue-500/40"
    />
  </div>

  {tgLoading && (
    <div className="flex items-center gap-2 text-slate-400 text-xs">
      <Loader2 className="animate-spin" size={14} />
      Loading telegram files...
    </div>
  )}

  {!tgLoading && telegramFiles.length === 0 && (
    <p className="text-[10px] uppercase text-slate-500">
      No telegram files uploaded
    </p>
  )}

  <div className="space-y-4 max-h-[45vh] overflow-y-auto custom-scroll pr-2">
    {telegramFiles
      .filter((file) =>
        `${file.file_name} ${file.file_code}`
          .toLowerCase()
          .includes(tgSearch.toLowerCase())
      )
      .map((file, index) => {
        const url = `https://t.me/anchormovies_bot?start=${file.file_code}`;

        return (
          <div
            key={index}
            className="bg-slate-950 border border-slate-800 p-4 rounded-2xl hover:border-blue-500/40 transition-all space-y-2"
          >
            <p className="text-xs font-bold text-white truncate">
              {file.file_name}
            </p>

            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-blue-400">
                Code: {file.file_code}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(url)}
                className="text-green-400 hover:text-green-300 transition"
              >
                Copy URL
              </button>
            </div>

            <input
              readOnly
              value={url}
              className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-[9px] text-slate-300"
            />
          </div>
        );
      })}
  </div>
</div>


                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                    <input className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 rounded-[1.5rem] outline-none text-xs text-white" placeholder="Filter stream titles..." onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="space-y-4 max-h-[75vh] overflow-y-auto custom-scroll pr-3">
                    {watchList.filter(i => i.title?.toLowerCase().includes(search.toLowerCase())).map(item => (
                        <EditableItem key={item.id} item={item} fetchWatchPages={fetchWatchPages} backendUrl={backendUrl} handleDelete={async (id) => {
                            if(window.confirm("Delete record?")) { await supabase.from("watch_html").delete().eq("id", id); fetchWatchPages(); }
                        }} />
                    ))}
                </div>
            </div>
        </div>
      </main>
      <div className="h-32"></div>
    </div>
  );
};

export default UploadWatchHtml;