// src/pages/AdminLiveMatchUpload.jsx
import React, { useState, useEffect } from "react";
import { Send, MonitorPlay, Link as LinkIcon, Edit, Trash2, List } from "lucide-react"; 
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient'; 


const InputClass = "w-full p-3 border border-gray-600 rounded-lg text-white bg-gray-700 focus:ring-red-500 focus:border-red-500 placeholder-gray-400";
  const LabelClass = "block text-sm font-medium text-gray-300 mb-1";
  const SectionClass = "border border-gray-700 p-4 rounded-xl shadow-inner";
  const SectionTitleClass = "text-xl font-bold text-red-400 mb-2 border-b border-gray-700 pb-2";

// --- Constants ---
const initialFormData = {
  title: "",
  league: "",
  sport: "Cricket",
  cover_poster_url: "",
  status: "SCHEDULED",
  // --- UPDATED TIME FIELDS ---
  liveStartTime: "",         // Human-readable time string (e.g., "10:30 AM IST")
  liveStartDateTime: "",     // Machine-readable datetime-local string (YYYY-MM-DDTHH:MM)
  // ---------------------------
  team1: "",
  team2: "",
  team1Score: "",
  team2Score: "",
  result: "",
  link: "",
  iframeHtml: "",
  hlsUrl: "",
};

// --- Match List Component (No changes) ---
const MatchList = ({ matches, onEdit, onDelete }) => {
    if (matches.length === 0) {
        return <p className="text-gray-400 p-4 text-center">No recent matches found.</p>;
    }
    return (
        <div className="space-y-3">
            {matches.map((match) => (
                <div key={match.id} className="bg-gray-700/70 p-4 rounded-lg flex justify-between items-center border border-gray-600">
                    <div>
                        <p className="text-white font-bold">{match.title}</p>
                        <p className="text-xs text-gray-400">
                            {match.status} | Slug: {match.link_slug}
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => onEdit(match)}
                            className="p-2 rounded-full text-blue-400 hover:bg-gray-600 transition"
                            title="Edit Match"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onDelete(match.id)}
                            className="p-2 rounded-full text-red-400 hover:bg-gray-600 transition"
                            title="Delete Match"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
// --- END Match List Component ---


const AdminLiveMatchUpload = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [editId, setEditId] = useState(null); // State to hold ID if editing

  const InputClass = "w-full p-3 border border-gray-600 rounded-lg text-white bg-gray-700 focus:ring-red-500 focus:border-red-500 placeholder-gray-400";
  const LabelClass = "block text-sm font-medium text-gray-300 mb-1";
  const SectionClass = "border border-gray-700 p-4 rounded-xl shadow-inner";
  const SectionTitleClass = "text-xl font-bold text-red-400 mb-2 border-b border-gray-700 pb-2";


  // === DATA FETCHING ===
  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('live_matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10); // Fetch last 10 matches

    if (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to load recent matches.");
    } else {
      setMatches(data);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []); 
  // =====================


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (match) => {
    // Set edit ID
    setEditId(match.id);
    // Populate form data using the snake_case keys from the DB
    setFormData({
        title: match.title,
        league: match.league,
        sport: match.sport,
        cover_poster_url: match.cover_poster_url,
        status: match.status,
        liveStartTime: match.live_start_time || '', // Human display field
        liveStartDateTime: match.live_start_datetime ? new Date(match.live_start_datetime).toISOString().substring(0, 16) : '', // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:MM)
        team1: match.team_1,
        team2: match.team_2,
        team1Score: match.team_1_score || '',
        team2Score: match.team_2_score || '',
        result: match.result_summary,
        link: match.link_slug,
        iframeHtml: match.iframe_html || '',
        hlsUrl: match.hls_url || '',
    });
    // Scroll to the top of the form for easier editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this match?")) return;
    
    try {
        const { error } = await supabase
            .from('live_matches')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);

        toast.success("Match deleted successfully!");
        fetchMatches(); // Refresh list
    } catch (error) {
        console.error("Delete Error:", error);
        toast.error("Failed to delete the match.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Basic Validation
    if (!formData.title || !formData.team1 || !formData.team2 || !formData.cover_poster_url) {
      toast.error("Please fill in the Title, Teams, and provide the Cover Poster URL.");
      setLoading(false);
      return;
    }
    
    if (!formData.iframeHtml.trim() && !formData.hlsUrl.trim()) {
        toast.error("Please provide at least one streaming source (HLS URL or iFrame HTML).");
        setLoading(false);
        return;
    }

    if (!formData.link || formData.link.includes('ind-vs-aus')) {
        toast.error("Please provide a unique, clean internal Link Slug.");
        setLoading(false);
        return;
    }

    // 2. Prepare the machine-readable datetime field
    const liveStartDateTimeISO = formData.liveStartDateTime 
        ? new Date(formData.liveStartDateTime).toISOString() 
        : null;


    try {
      // 3. PREPARE DATA FOR DB INSERT/UPDATE
      const dataToSave = {
        title: formData.title,
        league: formData.league,
        sport: formData.sport,
        cover_poster_url: formData.cover_poster_url,
        status: formData.status,
        live_start_time: formData.liveStartTime,        // Human-readable time string
        live_start_datetime: liveStartDateTimeISO,      // Machine-readable ISO timestamp
        team_1: formData.team1,
        team_2: formData.team2,
        team_1_score: formData.team1Score,
        team_2_score: formData.team2Score,
        result_summary: formData.result,
        link_slug: formData.link,
        iframe_html: formData.iframeHtml,
        hls_url: formData.hlsUrl,
      };

      let dbError = null;

      if (editId) {
        // --- UPDATE LOGIC ---
        const { error } = await supabase
          .from('live_matches')
          .update(dataToSave)
          .eq('id', editId);
        dbError = error;
      } else {
        // --- INSERT LOGIC ---
        const { error } = await supabase
          .from('live_matches')
          .insert([{ ...dataToSave, created_at: new Date().toISOString() }]);
        dbError = error;
      }
      
      if (dbError) {
        throw new Error(dbError.message || "Failed to save match data.");
      }

      toast.success(`Match '${formData.title}' ${editId ? 'updated' : 'uploaded'} successfully!`);
      setFormData(initialFormData); // Reset form
      setEditId(null); // Clear edit state
      fetchMatches(); // Refresh list
      
    } catch (error) {
      console.error("Database Error:", error);
      toast.error(`Error: ${error.message}`);
      
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setFormData(initialFormData);
  };


  


  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* --- Upload/Edit Form --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            
            {/* Header */}
            <h1 className="text-3xl font-extrabold text-white mb-6 flex items-center gap-3 border-b border-gray-700 pb-3">
                <MonitorPlay className="w-8 h-8 text-red-500"/> 
                {editId ? 'Edit Existing Match' : 'Upload New Live/Scheduled Match'}
            </h1>

            {editId && (
                <div className="mb-4 p-3 bg-red-800/20 text-red-300 rounded-lg flex justify-between items-center">
                    <span>You are currently editing Match ID: **{editId}**.</span>
                    <button onClick={handleCancelEdit} className="text-blue-400 hover:underline">
                        Cancel Edit
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section 1: Basic Info */}
            <div className={`${SectionClass} bg-gray-700/50`}>
                <h2 className={`${SectionTitleClass} text-red-400`}>Basic Match Info</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                    <label className={LabelClass}>Match Title (e.g., IND vs AUS Final)</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} 
                            className={InputClass} required />
                </div>

                <div>
                    <label className={LabelClass}>League/Series Name</label>
                    <input type="text" name="league" value={formData.league} onChange={handleChange} 
                            className={InputClass} required />
                </div>

                <div className="md:col-span-2">
                    <label className={LabelClass}>Sport Type</label>
                    <select name="sport" value={formData.sport} onChange={handleChange} 
                            className={InputClass}>
                    <option value="Cricket">Cricket</option>
                    <option value="Football">Football</option>
                    <option value="Formula 1">Formula 1</option>
                    <option value="Other">Other</option>
                    </select>
                </div>
                </div>
            </div>
            
            {/* Section 2: Teams & Status */}
            <div className={`${SectionClass} bg-gray-700/50`}>
                <h2 className={SectionTitleClass}>Teams & Status</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div>
                    <label className={LabelClass}>Team 1 Name</label>
                    <input type="text" name="team1" value={formData.team1} onChange={handleChange} 
                            className={InputClass} required />
                </div>
                
                <div>
                    <label className={LabelClass}>Team 2 Name</label>
                    <input type="text" name="team2" value={formData.team2} onChange={handleChange} 
                            className={InputClass} required />
                </div>
                
                <div>
                    <label className={LabelClass}>Current Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} 
                            className={InputClass}>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="LIVE">LIVE</option>
                    <option value="ENDED">Ended</option>
                    </select>
                </div>
                </div>
            </div>
            
            {/* Section 3: Data, Scores, and Slug */}
            <div className={SectionClass}>
                <h2 className={SectionTitleClass}>Match Data & Results</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Start Time (Visible for SCHEDULED) */}
                {formData.status === 'SCHEDULED' && (
                    <>
                        <div>
                            <label className={LabelClass}>Display Time (e.g., 10:30 AM IST)</label>
                            <input type="text" name="liveStartTime" value={formData.liveStartTime} onChange={handleChange} 
                                className={InputClass} required />
                        </div>
                        
                        <div>
                            <label className={LabelClass}>Official Start Datetime (for logic)</label>
                            <input type="datetime-local" name="liveStartDateTime" value={formData.liveStartDateTime} onChange={handleChange} 
                                className={InputClass} required />
                        </div>
                    </>
                )}
                
                {/* Scores (Visible for LIVE or ENDED) */}
                {(formData.status === 'LIVE' || formData.status === 'ENDED') && (
                    <>
                    <div>
                        <label className={LabelClass}>{formData.team1} Score/Overs</label>
                        <input type="text" name="team1Score" placeholder="e.g., (19.5) 117/10" value={formData.team1Score} onChange={handleChange} 
                                className={InputClass} />
                    </div>
                    <div>
                        <label className={LabelClass}>{formData.team2} Score/Overs</label>
                        <input type="text" name="team2Score" placeholder="e.g., (2) 14/0" value={formData.team2Score} onChange={handleChange} 
                                className={InputClass} />
                    </div>
                    </>
                )}

                {/* Match Result/Summary (Visible for all) */}
                <div className="md:col-span-2">
                    <label className={LabelClass}>Result/Summary Text</label>
                    <textarea name="result" value={formData.result} onChange={handleChange} 
                            placeholder="e.g., Janakpur won by 6 wickets, or Scheduled to start..."
                            className={`${InputClass} resize-none`} rows="2" required />
                </div>
                </div>
            </div>
            
            {/* Section 4: Streaming Sources */}
            <div className={`${SectionClass} bg-red-800/30`}>
                <h2 className={SectionTitleClass}>Streaming Sources (REQUIRED)</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* HLS URL Input */}
                    <div>
                        <label className={LabelClass}>HLS Stream URL (.m3u8 link)</label>
                        <input 
                            type="url" 
                            name="hlsUrl" 
                            value={formData.hlsUrl} 
                            onChange={handleChange} 
                            placeholder="https://example.com/live/match/stream.m3u8"
                            className={InputClass} 
                        />
                    </div>

                    {/* Internal Link/Slug */}
                    <div>
                        <label className={LabelClass}>Internal Link Slug (e.g., ind-vs-aus)</label>
                        <input type="text" name="link" value={formData.link} onChange={handleChange} 
                            placeholder="/live-cricket/ind-vs-aus"
                            className={InputClass} required />
                    </div>
                    
                    {/* iFrame HTML Input (Full Width) */}
                    <div className="md:col-span-2">
                        <label className={LabelClass}>Direct iFrame/HTML Embed Code</label>
                        <textarea 
                            name="iframeHtml" 
                            value={formData.iframeHtml} 
                            onChange={handleChange} 
                            placeholder="<iframe src='...' width='100%' height='500'></iframe>"
                            className={`${InputClass} resize-none`} 
                            rows="4" 
                        />
                    </div>
                </div>
            </div>
            
            {/* Cover Poster URL Input */}
            <div className={`${SectionClass} border-red-500/50 bg-gray-700/50`}>
                <h2 className={SectionTitleClass}>Cover Poster URL</h2>
                <label className={LabelClass}>Poster Image URL (Provide a direct link to the image file)</label>
                <div className="flex items-center gap-4">
                    <LinkIcon className="w-5 h-5 text-gray-400 shrink-0"/>
                    <input 
                        type="url" 
                        name="cover_poster_url" 
                        value={formData.cover_poster_url} 
                        onChange={handleChange} 
                        placeholder="https://example.com/match_poster.jpg"
                        className={`${InputClass} focus:ring-red-500 focus:border-red-500`} 
                        required 
                    />
                </div>
            </div>


            {/* Submission Button */}
            <div className="pt-4 flex space-x-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                        <MonitorPlay className="w-5 h-5 animate-spin" /> Submitting Data...
                        </>
                    ) : (
                        <>
                        <Send className="w-5 h-5"/> {editId ? 'Save Changes' : 'Submit New Match'}
                        </>
                    )}
                </button>
            </div>
            </form>
        </div>
        
        {/* --- Recently Added Matches List --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            <h2 className="text-2xl font-extrabold text-white mb-4 flex items-center gap-3 border-b border-gray-700 pb-3">
                <List className="w-6 h-6 text-red-500"/> Recently Added Matches
            </h2>
            <MatchList matches={matches} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      </div> 
    </div>
  );
};

export default AdminLiveMatchUpload;