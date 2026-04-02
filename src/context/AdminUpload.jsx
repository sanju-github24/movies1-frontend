import React, { useState, useEffect, useContext, useCallback } from "react";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { v4 as uuidv4 } from "uuid";
import {
  Plus, Minus, Film, X, Pencil, Trash2, Home, Save, Palette,
  Eye, Download, Link as LinkIcon, Globe, Tag, MessageCircle,
  Search, Zap, Star, Loader2, ChevronDown, ChevronUp, Clapperboard,
  PlayCircle, Upload, Layers, Settings2, Hash, Languages, Monitor,
} from "lucide-react";
import axios from "axios";

/* ─── helpers ─────────────────────────────────────────────── */
function slugify(title) {
  if (!title) return "";
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

/* ─── CSS injected once ───────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --ink: #0a0b0f;
    --surface: #111318;
    --panel: #16181f;
    --card: #1c1f29;
    --border: rgba(255,255,255,0.07);
    --border-active: rgba(255,255,255,0.18);
    --gold: #f5c842;
    --gold-dim: rgba(245,200,66,0.15);
    --red: #e8455a;
    --red-dim: rgba(232,69,90,0.15);
    --cyan: #3ddde8;
    --cyan-dim: rgba(61,221,232,0.12);
    --green: #3de88c;
    --green-dim: rgba(61,232,140,0.12);
    --text: #e8eaf0;
    --muted: #6b7090;
    --font-display: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
  }

  .au-root * { box-sizing: border-box; }
  .au-root { font-family: var(--font-body); background: var(--ink); color: var(--text); min-height: 100vh; }

  /* ── layout ── */
  .au-wrap { max-width: 1380px; margin: 0 auto; padding: 40px 28px; }

  /* ── header ── */
  .au-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 48px; padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .au-header-left { display: flex; align-items: center; gap: 16px; }
  .au-logo-mark {
    width: 52px; height: 52px; border-radius: 14px;
    background: linear-gradient(135deg, var(--red), #9b1d2e);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 28px rgba(232,69,90,0.4);
  }
  .au-title { font-family: var(--font-display); font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .au-title span { color: var(--red); }
  .au-subtitle { font-size: 13px; color: var(--muted); margin-top: 2px; letter-spacing: 0.3px; }

  /* ── collapse btn ── */
  .au-collapse-btn {
    display: flex; align-items: center; gap: 8px;
    background: var(--card); border: 1px solid var(--border);
    color: var(--muted); padding: 10px 18px; border-radius: 10px;
    cursor: pointer; font-size: 13px; font-weight: 500; transition: all .2s;
  }
  .au-collapse-btn:hover { border-color: var(--border-active); color: var(--text); }

  /* ── edit banner ── */
  .au-edit-banner {
    background: linear-gradient(90deg, rgba(245,200,66,0.1), transparent);
    border: 1px solid rgba(245,200,66,0.3); border-radius: 14px;
    padding: 16px 20px; margin-bottom: 28px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .au-edit-banner-text { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--gold); }
  .au-cancel-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--red-dim); border: 1px solid rgba(232,69,90,0.4);
    color: var(--red); padding: 8px 16px; border-radius: 8px;
    cursor: pointer; font-size: 13px; font-weight: 600; transition: all .2s;
  }
  .au-cancel-btn:hover { background: rgba(232,69,90,0.25); }

  /* ── two-col layout ── */
  .au-form-grid { display: grid; grid-template-columns: 1fr 340px; gap: 28px; }
  @media (max-width: 1100px) { .au-form-grid { grid-template-columns: 1fr; } }
  .au-form-grid.no-preview { grid-template-columns: 1fr; }

  /* ── form card ── */
  .au-form-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 36px; display: flex; flex-direction: column; gap: 36px;
  }

  /* ── section heading ── */
  .au-section-head {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--font-display); font-size: 13px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase;
    margin-bottom: 20px;
  }
  .au-section-head .icon-wrap {
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .icon-gold { background: var(--gold-dim); color: var(--gold); }
  .icon-cyan { background: var(--cyan-dim); color: var(--cyan); }
  .icon-red  { background: var(--red-dim);  color: var(--red);  }
  .icon-green{ background: var(--green-dim);color: var(--green);}
  .icon-muted{ background: rgba(255,255,255,0.05); color: var(--muted); }

  .au-section-divider { border: none; border-top: 1px solid var(--border); margin: 0; }

  /* ── inputs ── */
  .au-input {
    width: 100%; background: var(--card); border: 1px solid var(--border);
    border-radius: 10px; padding: 13px 16px; color: var(--text);
    font-family: var(--font-body); font-size: 14px; transition: all .2s; outline: none;
  }
  .au-input::placeholder { color: var(--muted); }
  .au-input:focus { border-color: var(--border-active); background: #1f2230; box-shadow: 0 0 0 3px rgba(255,255,255,0.04); }
  .au-textarea { resize: vertical; min-height: 96px; line-height: 1.6; }
  .au-input-icon-wrap { position: relative; }
  .au-input-icon-wrap .icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); width: 15px; height: 15px; pointer-events: none; }
  .au-input-icon-wrap .au-input { padding-left: 40px; }

  /* ── TMDB row ── */
  .au-tmdb-row { display: flex; gap: 12px; }
  .au-tmdb-row .au-input { flex: 1; }
  .au-search-btn {
    display: flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, #c9a200, var(--gold));
    color: #0a0b0f; padding: 0 24px; border-radius: 10px;
    border: none; cursor: pointer; font-weight: 700; font-size: 14px;
    font-family: var(--font-body); white-space: nowrap; transition: all .2s;
    box-shadow: 0 4px 20px rgba(245,200,66,0.25);
  }
  .au-search-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(245,200,66,0.4); }
  .au-search-btn:disabled { opacity: 0.6; transform: none; cursor: not-allowed; }

  /* ── TMDB result card ── */
  .au-tmdb-result {
    display: flex; gap: 16px; padding: 16px; margin-top: 12px;
    background: var(--card); border: 1px solid rgba(245,200,66,0.25);
    border-radius: 14px; animation: fadeSlideIn .3s ease;
  }
  .au-tmdb-poster { width: 70px; height: 100px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
  .au-tmdb-info { display: flex; flex-direction: column; justify-content: center; gap: 6px; }
  .au-tmdb-title { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--text); }
  .au-tmdb-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
  .star-icon { color: var(--gold); fill: var(--gold); width: 12px; height: 12px; }
  .au-apply-btn {
    display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;
    background: var(--green-dim); border: 1px solid rgba(61,232,140,0.3);
    color: var(--green); padding: 7px 16px; border-radius: 8px;
    cursor: pointer; font-size: 13px; font-weight: 700; transition: all .2s;
  }
  .au-apply-btn:hover { background: rgba(61,232,140,0.22); }

  /* ── grid ── */
  .au-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .au-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media (max-width: 680px) { .au-grid-2, .au-grid-3 { grid-template-columns: 1fr; } }

  /* ── checkbox group ── */
  .au-check-group {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 18px;
  }
  .au-check-legend {
    font-size: 11px; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase; color: var(--muted); margin-bottom: 12px;
  }
  .au-check-items { display: flex; flex-wrap: wrap; gap: 8px; }
  .au-check-pill {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 13px; border-radius: 20px; cursor: pointer;
    border: 1px solid var(--border); background: var(--surface);
    font-size: 12px; font-weight: 500; transition: all .2s; user-select: none;
  }
  .au-check-pill:hover { border-color: var(--border-active); }
  .au-check-pill.active-blue  { background: rgba(99,179,237,0.12); border-color: rgba(99,179,237,0.4); color: #63b3ed; }
  .au-check-pill.active-green { background: var(--green-dim); border-color: rgba(61,232,140,0.35); color: var(--green); }
  .au-check-pill.active-gold  { background: var(--gold-dim); border-color: rgba(245,200,66,0.35); color: var(--gold); }
  .au-check-pill input { display: none; }

  /* ── display row ── */
  .au-display-row {
    display: flex; align-items: center; flex-wrap: wrap; gap: 20px;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 18px 20px;
  }
  .au-color-wrap { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); }
  .au-color-swatch {
    width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
    border: 2px solid var(--border-active); overflow: hidden; flex-shrink: 0;
  }
  .au-color-swatch input { width: 48px; height: 48px; transform: translate(-6px,-6px); opacity: 0; cursor: pointer; }
  .au-toggle-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; cursor: pointer; color: var(--text); user-select: none;
  }
  .au-toggle { position: relative; width: 38px; height: 22px; }
  .au-toggle input { display: none; }
  .au-toggle-track {
    position: absolute; inset: 0; border-radius: 11px;
    background: var(--surface); border: 1px solid var(--border);
    transition: all .25s;
  }
  .au-toggle input:checked ~ .au-toggle-track { background: var(--cyan); border-color: var(--cyan); }
  .au-toggle-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--muted); transition: transform .25s;
  }
  .au-toggle input:checked ~ .au-toggle-thumb { transform: translateX(16px); background: #fff; }

  /* ── download block ── */
  .au-dl-block {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 14px;
    position: relative; transition: border-color .2s;
  }
  .au-dl-block:hover { border-color: var(--border-active); }
  .au-dl-num {
    position: absolute; top: -11px; left: 20px;
    background: var(--red); color: #fff;
    font-family: var(--font-display); font-size: 11px; font-weight: 800;
    letter-spacing: 1px; padding: 2px 10px; border-radius: 20px;
  }
  .au-dl-remove {
    position: absolute; top: 14px; right: 14px;
    background: transparent; border: 1px solid transparent;
    color: var(--muted); border-radius: 8px; padding: 5px;
    cursor: pointer; transition: all .2s; display: flex; align-items: center;
  }
  .au-dl-remove:hover:not(:disabled) { background: var(--red-dim); color: var(--red); border-color: rgba(232,69,90,0.3); }
  .au-dl-remove:disabled { opacity: 0.3; cursor: not-allowed; }

  .au-gif-toggle {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: var(--muted); cursor: pointer;
  }
  .au-gif-toggle input[type=checkbox] { accent-color: var(--red); width: 14px; height: 14px; }

  /* ── add block btn ── */
  .au-add-block-btn {
    display: flex; align-items: center; gap: 8px;
    background: var(--green-dim); border: 1px dashed rgba(61,232,140,0.3);
    color: var(--green); padding: 12px 20px; border-radius: 10px;
    cursor: pointer; font-size: 13px; font-weight: 700; transition: all .2s;
  }
  .au-add-block-btn:hover { background: rgba(61,232,140,0.18); border-color: rgba(61,232,140,0.5); }

  /* ── submit btn ── */
  .au-submit-btn {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    background: linear-gradient(135deg, #2a6fdb, var(--cyan));
    color: #fff; padding: 16px 40px; border-radius: 12px; border: none;
    cursor: pointer; font-family: var(--font-display); font-size: 17px; font-weight: 800;
    letter-spacing: 0.2px; transition: all .2s; width: 100%;
    box-shadow: 0 6px 30px rgba(61,221,232,0.25);
  }
  .au-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(61,221,232,0.4); }
  .au-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  /* ── preview card ── */
  .au-preview-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 28px; text-align: center;
    position: sticky; top: 24px; height: fit-content;
  }
  .au-preview-head {
    font-family: var(--font-display); font-size: 11px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase; color: var(--muted);
    margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .au-preview-poster {
    width: 160px; height: 240px; object-fit: cover; border-radius: 12px;
    margin: 0 auto 16px; display: block;
    border: 1px solid var(--border); box-shadow: 0 16px 48px rgba(0,0,0,0.6);
  }
  .au-preview-title { font-family: var(--font-display); font-size: 18px; font-weight: 800; margin-bottom: 4px; }
  .au-preview-slug { font-family: monospace; font-size: 11px; color: var(--muted); margin-bottom: 12px; }
  .au-preview-desc { font-size: 12px; color: var(--muted); line-height: 1.7; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; }

  /* ── library section ── */
  .au-library-head { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .au-library-title { font-family: var(--font-display); font-size: 22px; font-weight: 800; }
  .au-library-count {
    background: var(--red-dim); border: 1px solid rgba(232,69,90,0.3);
    color: var(--red); padding: 3px 10px; border-radius: 20px;
    font-size: 12px; font-weight: 700;
  }

  .au-search-wrap { position: relative; margin-bottom: 24px; }
  .au-search-wrap .icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--muted); width: 16px; }
  .au-search-input {
    width: 100%; background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 16px 14px 44px;
    color: var(--text); font-size: 14px; outline: none;
    transition: border-color .2s;
  }
  .au-search-input:focus { border-color: var(--border-active); }
  .au-search-input::placeholder { color: var(--muted); }

  .au-movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 20px; }

  .au-movie-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden; transition: all .25s; display: flex; flex-direction: column;
  }
  .au-movie-card:hover { border-color: var(--border-active); transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
  .au-movie-thumb { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
  .au-movie-info { padding: 14px; flex: 1; display: flex; flex-direction: column; }
  .au-movie-name { font-family: var(--font-display); font-size: 14px; font-weight: 700; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--text); margin-bottom: 4px; }
  .au-movie-meta { font-size: 11px; color: var(--muted); margin-bottom: 14px; }
  .au-movie-actions { display: flex; gap: 6px; margin-top: auto; flex-wrap: wrap; }
  .au-act-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 6px 11px; border-radius: 7px; font-size: 11px; font-weight: 700;
    cursor: pointer; border: none; transition: all .15s;
  }
  .au-act-edit  { background: rgba(245,200,66,0.12); color: var(--gold); border: 1px solid rgba(245,200,66,0.2); }
  .au-act-edit:hover { background: rgba(245,200,66,0.22); }
  .au-act-show  { background: var(--green-dim); color: var(--green); border: 1px solid rgba(61,232,140,0.2); }
  .au-act-show:hover { background: rgba(61,232,140,0.22); }
  .au-act-hide  { background: var(--red-dim); color: var(--red); border: 1px solid rgba(232,69,90,0.2); }
  .au-act-hide:hover { background: rgba(232,69,90,0.22); }
  .au-act-del   { background: rgba(255,255,255,0.04); color: var(--muted); border: 1px solid var(--border); }
  .au-act-del:hover { color: var(--red); border-color: rgba(232,69,90,0.3); }

  /* ── animations ── */
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-in { animation: fadeSlideIn .3s ease; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ─── tiny components ─────────────────────────────────────── */

const Toggle = ({ checked, onChange }) => (
  <label className="au-toggle">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="au-toggle-track" />
    <span className="au-toggle-thumb" />
  </label>
);

const CheckPill = ({ label, checked, onChange, colorClass }) => (
  <label className={`au-check-pill ${checked ? colorClass : ""}`}>
    <input type="checkbox" checked={checked} onChange={onChange} />
    {checked && <span style={{ fontSize: 10 }}>✓</span>}
    {label}
  </label>
);

const PillGroup = ({ title, options, selected, onChange, colorClass }) => (
  <div className="au-check-group">
    <div className="au-check-legend">{title}</div>
    <div className="au-check-items">
      {options.map((opt) => (
        <CheckPill
          key={opt} label={opt}
          checked={selected.includes(opt)}
          colorClass={colorClass}
          onChange={() => {
            const next = selected.includes(opt)
              ? selected.filter((s) => s !== opt)
              : [...selected, opt];
            onChange(next);
          }}
        />
      ))}
    </div>
  </div>
);

const DownloadBlock = ({ block, index, onChange, onRemove, isLast }) => (
  <div className="au-dl-block">
    <span className="au-dl-num">OPTION {index + 1}</span>
    <button
      type="button" disabled={isLast}
      onClick={() => onRemove(index)}
      className="au-dl-remove"
    >
      <X style={{ width: 14, height: 14 }} />
    </button>

    <div className="au-grid-3" style={{ marginTop: 8 }}>
      {[
        { key: "quality",  placeholder: "Quality  (e.g. 1080p)" },
        { key: "size",     placeholder: "Size  (e.g. 2.1 GB)" },
        { key: "format",   placeholder: "Format  (MKV / MP4)" },
      ].map(({ key, placeholder }) => (
        <input
          key={key} type="text" className="au-input"
          placeholder={placeholder} value={block[key]}
          onChange={(e) => onChange(index, key, e.target.value)}
        />
      ))}
    </div>

    <div className="au-grid-3">
      {[
        { key: "manualUrl", icon: <LinkIcon style={{ width: 14, height: 14 }} />, placeholder: "Manual / Torrent URL" },
        { key: "gpLink",    icon: <Globe    style={{ width: 14, height: 14 }} />, placeholder: "GP Shortener Link" },
        { key: "directUrl", icon: <Download style={{ width: 14, height: 14 }} />, placeholder: "Direct Download URL" },
      ].map(({ key, icon, placeholder }) => (
        <div key={key} className="au-input-icon-wrap">
          <span className="icon">{icon}</span>
          <input type="text" className="au-input" placeholder={placeholder}
            value={block[key]} onChange={(e) => onChange(index, key, e.target.value)} />
        </div>
      ))}
    </div>

    <label className="au-gif-toggle">
      <input type="checkbox" checked={block.showGifAfter}
        onChange={(e) => onChange(index, "showGifAfter", e.target.checked)} />
      Show GIF animation after download click
    </label>
  </div>
);

/* ─── main component ──────────────────────────────────────── */
const AdminUpload = () => {
  const { userData, backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movies, setMovies] = useState([]);
  const [formOpen, setFormOpen] = useState(true);

  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResult, setTmdbResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [movie, setMovie] = useState({
    slug: "", title: "", poster: "", description: "",
    categories: [], subCategory: [], language: [],
    linkColor: "#3ddde8", showOnHomepage: true,
    directLinksOnly: false, watchUrl: "", note: "",
  });

  const [downloadBlocks, setDownloadBlocks] = useState([{
    id: uuidv4(), quality: "", size: "", format: "",
    manualUrl: "", directUrl: "", gpLink: "", showGifAfter: false,
  }]);

  /* ── data ── */
  const fetchMovies = useCallback(async () => {
    const { data, error } = await supabase.from("movies").select("*").order("created_at", { ascending: false });
    if (error) toast.error("❌ Failed to load movies");
    else setMovies(data || []);
  }, []);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  /* ── TMDB ── */
  const handleTMDBSearch = async () => {
    if (!tmdbQuery.trim()) return toast.error("Enter a title or IMDb ID");
    if (!backendUrl) return toast.error("Backend URL not configured");
    setIsSearching(true); setTmdbResult(null);
    const isImdb = /^tt\d{7,10}$/i.test(tmdbQuery.trim());
    try {
      const res = await axios.get(`${backendUrl}/api/tmdb-details`, {
        params: isImdb ? { imdbId: tmdbQuery.trim() } : { title: tmdbQuery.trim() },
      });
      if (res.data.success && res.data.data) {
        setTmdbResult(res.data.data); toast.success("✅ Metadata found");
      } else { toast.error("⚠️ Not found"); }
    } catch (err) { toast.error(`Search failed: ${err.message}`); }
    finally { setIsSearching(false); }
  };

  const handleUseMetadata = (data) => {
    const rating = data.imdb_rating ? Number(data.imdb_rating) : null;
    setMovie((prev) => ({
      ...prev,
      title: data.title || prev.title,
      poster: data.poster_url || prev.poster,
      description: data.description || prev.description,
      slug: editingMovieId && prev.title === data.title ? prev.slug : slugify(data.title),
    }));
    setTmdbResult(null); setTmdbQuery("");
    toast.info("🎬 Metadata applied");
  };

  /* ── form ── */
  const resetForm = () => {
    setMovie({ slug:"",title:"",poster:"",description:"",categories:[],subCategory:[],language:[],linkColor:"#3ddde8",showOnHomepage:true,directLinksOnly:false,watchUrl:"",note:"" });
    setDownloadBlocks([{ id:uuidv4(),quality:"",size:"",format:"",manualUrl:"",directUrl:"",gpLink:"",showGifAfter:false }]);
    setEditingMovieId(null); setFormOpen(true); setTmdbQuery(""); setTmdbResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    if (!movie.title || !movie.poster || !movie.description) {
      toast.error("❌ Title, poster and description are required"); setLoading(false); return;
    }
    const slug = movie.slug || slugify(movie.title.trim());
    const valid = downloadBlocks.filter(b => b.quality && b.size && b.format && (b.manualUrl || b.directUrl || b.gpLink));
    if (!valid.length) { toast.error("❌ At least one complete download block required"); setLoading(false); return; }

    const sanitized = valid.map((b) => ({
      id: b.id || uuidv4(), quality: b.quality, size: b.size, format: b.format,
      url: b.manualUrl || "", directUrl: b.directUrl || "", gpLink: b.gpLink || "",
      showGifAfter: !!b.showGifAfter, count: 0,
    }));
    const movieData = { ...movie, slug, downloads: sanitized, uploaded_by: userData?.email || "unknown",
      ...(editingMovieId ? {} : { created_at: new Date().toISOString() }) };
    try {
      const { error } = editingMovieId
        ? await supabase.from("movies").update(movieData).eq("id", editingMovieId)
        : await supabase.from("movies").insert([movieData]);
      if (error) throw error;
      toast.success("✅ Saved successfully");
      resetForm(); fetchMovies(); setFormOpen(false);
    } catch (err) { toast.error(`❌ ${err.message}`); }
    finally { setLoading(false); }
  };

  const handleEdit = (m) => {
    setEditingMovieId(m.id); setFormOpen(true);
    const blocks = (m.downloads || []).map((d) => ({
      id: d.id || uuidv4(), quality: d.quality||"", size: d.size||"",
      format: d.format||"", manualUrl: d.url||"", directUrl: d.directUrl||"",
      gpLink: d.gpLink||"", showGifAfter: !!d.showGifAfter,
    }));
    if (!blocks.length) blocks.push({ id:uuidv4(),quality:"",size:"",format:"",manualUrl:"",directUrl:"",gpLink:"",showGifAfter:false });
    setMovie({ ...m }); setDownloadBlocks(blocks);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this entry?")) return;
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) toast.error("❌ Delete failed");
    else { toast.success("🗑️ Deleted"); fetchMovies(); }
  };

  const toggleHomepage = async (m) => {
    const next = !m.showOnHomepage;
    const updates = next ? { showOnHomepage: true, homepage_added_at: new Date().toISOString() } : { showOnHomepage: false, homepage_added_at: null };
    const { error } = await supabase.from("movies").update(updates).eq("id", m.id);
    if (error) toast.error("❌ Update failed");
    else { toast.success("✅ Updated"); setMovies((prev) => prev.map((x) => x.id === m.id ? { ...x, ...updates } : x)); }
  };

  const handleDownloadChange = (i, field, value) => {
    setDownloadBlocks((prev) => { const u = [...prev]; u[i][field] = value; return u; });
  };

  const filtered = movies.filter((m) => m.title?.toLowerCase().includes(search.toLowerCase()));
  const showPreview = movie.title || movie.poster;

  /* ── render ── */
  return (
    <AdminLayout>
      <style>{STYLES}</style>
      <div className="au-root">
        <div className="au-wrap">

          {/* ── HEADER ── */}
          <div className="au-header">
            <div className="au-header-left">
              <div className="au-logo-mark">
                <Clapperboard style={{ width: 24, height: 24, color: "#fff" }} />
              </div>
              <div>
                <div className="au-title">
                  {editingMovieId ? "Edit" : "Upload"} <span>Content</span>
                </div>
                <div className="au-subtitle">
                  {editingMovieId ? `Editing · ${movie.title}` : "Add new movies to your library"}
                </div>
              </div>
            </div>
            <button className="au-collapse-btn" onClick={() => setFormOpen(!formOpen)}>
              {formOpen
                ? <><ChevronUp style={{ width: 14, height: 14 }} /> Collapse Form</>
                : <><ChevronDown style={{ width: 14, height: 14 }} /> Expand Form</>}
            </button>
          </div>

          {/* ── FORM ── */}
          {formOpen && (
            <div className="animate-in">
              {editingMovieId && (
                <div className="au-edit-banner">
                  <span className="au-edit-banner-text">✏️ Editing: {movie.title}</span>
                  <button className="au-cancel-btn" onClick={resetForm}>
                    <X style={{ width: 14, height: 14 }} /> Cancel
                  </button>
                </div>
              )}

              <div className={`au-form-grid ${!showPreview ? "no-preview" : ""}`}>
                {/* ── LEFT: form ── */}
                <form onSubmit={handleSubmit} className="au-form-card">

                  {/* TMDB section */}
                  <div>
                    <div className="au-section-head">
                      <span className="icon-wrap icon-gold"><Zap style={{ width: 14, height: 14 }} /></span>
                      Auto-Fill from TMDB
                    </div>
                    <div className="au-tmdb-row">
                      <input
                        type="text" className="au-input"
                        placeholder="Movie title or IMDb ID (e.g. tt0111161)"
                        value={tmdbQuery}
                        onChange={(e) => setTmdbQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTMDBSearch()}
                      />
                      <button type="button" className="au-search-btn" onClick={handleTMDBSearch} disabled={isSearching}>
                        {isSearching
                          ? <Loader2 style={{ width: 16, height: 16 }} className="spin" />
                          : <Search style={{ width: 16, height: 16 }} />}
                        Search
                      </button>
                    </div>
                    {tmdbResult && (
                      <div className="au-tmdb-result animate-in">
                        <img src={tmdbResult.poster_url} className="au-tmdb-poster" alt={tmdbResult.title} />
                        <div className="au-tmdb-info">
                          <div className="au-tmdb-title">{tmdbResult.title} ({tmdbResult.year})</div>
                          <div className="au-tmdb-meta">
                            <Star className="star-icon" />
                            {tmdbResult.imdb_rating ? Number(tmdbResult.imdb_rating).toFixed(1) : "N/A"}
                          </div>
                          <button type="button" className="au-apply-btn" onClick={() => handleUseMetadata(tmdbResult)}>
                            ✓ Apply Metadata
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="au-section-divider" />

                  {/* Primary info */}
                  <div>
                    <div className="au-section-head">
                      <span className="icon-wrap icon-cyan"><Pencil style={{ width: 14, height: 14 }} /></span>
                      Primary Info
                    </div>
                    <div className="au-grid-2" style={{ marginBottom: 14 }}>
                      <input type="text" className="au-input" placeholder="Movie Title" value={movie.title}
                        onChange={(e) => setMovie({ ...movie, title: e.target.value, slug: editingMovieId ? movie.slug : slugify(e.target.value) })} required />
                      <input type="url" className="au-input" placeholder="Poster Image URL" value={movie.poster}
                        onChange={(e) => setMovie({ ...movie, poster: e.target.value })} required />
                    </div>
                    <textarea className="au-input au-textarea" placeholder="Movie description / synopsis…"
                      value={movie.description} onChange={(e) => setMovie({ ...movie, description: e.target.value })} required />
                  </div>

                  <hr className="au-section-divider" />

                  {/* Player & Notes */}
                  <div>
                    <div className="au-section-head">
                      <span className="icon-wrap icon-muted"><PlayCircle style={{ width: 14, height: 14 }} /></span>
                      Player & Notes
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <textarea className="au-input au-textarea" style={{ minHeight: 64, fontFamily: "monospace", fontSize: 13 }}
                        placeholder="Watch / Embed URL (iframe src or player link)"
                        value={movie.watchUrl} onChange={(e) => setMovie({ ...movie, watchUrl: e.target.value })} />
                      <input type="text" className="au-input" placeholder="Private admin note (not visible to users)"
                        value={movie.note} onChange={(e) => setMovie({ ...movie, note: e.target.value })} />
                    </div>
                  </div>

                  <hr className="au-section-divider" />

                  {/* Taxonomy */}
                  <div>
                    <div className="au-section-head">
                      <span className="icon-wrap icon-gold"><Tag style={{ width: 14, height: 14 }} /></span>
                      Categories & Languages
                    </div>
                    <div className="au-grid-3">
                      <PillGroup title="Industry" options={["Hollywood","Kollywood","Bollywood"]} selected={movie.categories} onChange={(v) => setMovie({ ...movie, categories: v })} colorClass="active-blue" />
                      <PillGroup title="Quality" options={["WEB-DL","HDTS","PRE-HD","PreDVD"]} selected={movie.subCategory} onChange={(v) => setMovie({ ...movie, subCategory: v })} colorClass="active-green" />
                      <PillGroup title="Languages" options={["Tamil","Malayalam","Kannada","Telugu","Hindi","English"]} selected={movie.language} onChange={(v) => setMovie({ ...movie, language: v })} colorClass="active-gold" />
                    </div>
                  </div>

                  <hr className="au-section-divider" />

                  {/* Display */}
                  <div>
                    <div className="au-section-head">
                      <span className="icon-wrap icon-cyan"><Monitor style={{ width: 14, height: 14 }} /></span>
                      Display Settings
                    </div>
                    <div className="au-display-row">
                      <div className="au-color-wrap">
                        <div className="au-color-swatch" style={{ background: movie.linkColor }}>
                          <input type="color" value={movie.linkColor} onChange={(e) => setMovie({ ...movie, linkColor: e.target.value })} />
                        </div>
                        <span>Accent color</span>
                      </div>
                      <label className="au-toggle-label">
                        <Toggle checked={movie.showOnHomepage} onChange={(e) => setMovie({ ...movie, showOnHomepage: e.target.checked })} />
                        Show on Homepage
                      </label>
                      <label className="au-toggle-label">
                        <Toggle checked={movie.directLinksOnly} onChange={(e) => setMovie({ ...movie, directLinksOnly: e.target.checked })} />
                        Direct Links Only
                      </label>
                    </div>
                  </div>

                  <hr className="au-section-divider" />

                  {/* Downloads */}
                  <div>
                    <div className="au-section-head">
                      <span className="icon-wrap icon-red"><Download style={{ width: 14, height: 14 }} /></span>
                      Download Options
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
                      {downloadBlocks.map((block, i) => (
                        <DownloadBlock
                          key={block.id} block={block} index={i}
                          onChange={handleDownloadChange}
                          onRemove={(idx) => { if (downloadBlocks.length > 1) setDownloadBlocks((p) => p.filter((_, ii) => ii !== idx)); }}
                          isLast={downloadBlocks.length === 1}
                        />
                      ))}
                    </div>
                    <button type="button" className="au-add-block-btn"
                      onClick={() => setDownloadBlocks((p) => [...p, { id:uuidv4(),quality:"",size:"",format:"",manualUrl:"",directUrl:"",gpLink:"",showGifAfter:false }])}>
                      <Plus style={{ width: 15, height: 15 }} /> Add Download Option
                    </button>
                  </div>

                  {/* Submit */}
                  <button type="submit" className="au-submit-btn" disabled={loading}>
                    {loading
                      ? <Loader2 style={{ width: 20, height: 20 }} className="spin" />
                      : editingMovieId ? <Save style={{ width: 20, height: 20 }} /> : <Upload style={{ width: 20, height: 20 }} />}
                    {editingMovieId ? "Update Content" : "Publish Content"}
                  </button>
                </form>

                {/* ── RIGHT: preview ── */}
                {showPreview && (
                  <div className="au-preview-card">
                    <div className="au-preview-head">
                      <Eye style={{ width: 12, height: 12 }} /> Live Preview
                    </div>
                    <img
                      src={movie.poster || "https://via.placeholder.com/300x450?text=No+Poster"}
                      className="au-preview-poster" alt="preview"
                      onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x450?text=Error"; }}
                    />
                    <div className="au-preview-title">{movie.title || "Movie Title"}</div>
                    <div className="au-preview-slug">{movie.slug || "auto-slug"}</div>
                    {movie.language?.length > 0 && (
                      <div style={{ display:"flex",justifyContent:"center",gap:6,flexWrap:"wrap",marginBottom:10 }}>
                        {movie.language.map((l) => (
                          <span key={l} style={{ background:"rgba(255,255,255,0.06)",padding:"3px 10px",borderRadius:20,fontSize:11,color:"var(--muted)" }}>{l}</span>
                        ))}
                      </div>
                    )}
                    <div className="au-preview-desc">{movie.description || "No description."}</div>
                    {movie.categories?.length > 0 && (
                      <div style={{ marginTop:14,display:"flex",justifyContent:"center",gap:6 }}>
                        {movie.categories.map((c) => (
                          <span key={c} style={{ background:"var(--red-dim)",color:"var(--red)",fontSize:10,padding:"2px 8px",borderRadius:20 }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LIBRARY ── */}
          <div style={{ marginTop: 64, paddingTop: 40, borderTop: "1px solid var(--border)" }}>
            <div className="au-library-head">
              <Film style={{ width: 22, height: 22, color: "var(--red)" }} />
              <span className="au-library-title">Library</span>
              <span className="au-library-count">{movies.length} titles</span>
            </div>

            <div className="au-search-wrap">
              <Search className="icon" />
              <input type="text" className="au-search-input" placeholder="Search library…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign:"center",padding:"60px 0",color:"var(--muted)",fontFamily:"var(--font-display)" }}>
                <Film style={{ width: 48, height: 48, margin:"0 auto 12px",opacity:.3 }} />
                <div>No titles found</div>
              </div>
            ) : (
              <div className="au-movie-grid">
                {filtered.map((m) => (
                  <div key={m.id} className="au-movie-card">
                    <img src={m.poster} className="au-movie-thumb" alt={m.title}
                      onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x450?text=No+Image"; }} />
                    <div className="au-movie-info">
                      <div className="au-movie-name">{m.title}</div>
                      <div className="au-movie-meta">{[...(m.language||[]),...(m.categories||[])].join(" · ")}</div>
                      <div className="au-movie-actions">
                        <button className="au-act-btn au-act-edit" onClick={() => handleEdit(m)}>
                          <Pencil style={{ width: 10, height: 10 }} /> Edit
                        </button>
                        <button
                          className={`au-act-btn ${m.showOnHomepage ? "au-act-hide" : "au-act-show"}`}
                          onClick={() => toggleHomepage(m)}>
                          {m.showOnHomepage ? "Hide" : "Show"}
                        </button>
                        <button className="au-act-btn au-act-del" onClick={() => handleDelete(m.id)}>
                          <Trash2 style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUpload;