// src/pages/AdminLiveMatchUpload.jsx
import React, { useState, useEffect } from "react";
import { Send, MonitorPlay, Link as LinkIcon, Edit, Trash2, List, Calendar, Box, Video } from "lucide-react"; 
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient'; 


// --- Constants ---
const InputClass = "w-full p-3 border border-gray-600 rounded-lg text-white bg-gray-700 focus:ring-red-500 focus:border-red-500 placeholder-gray-400";
const LabelClass = "block text-sm font-medium text-gray-300 mb-1";
const SectionClass = "border border-gray-700 p-4 rounded-xl shadow-inner";
const SectionTitleClass = "text-xl font-bold text-red-400 mb-2 border-b border-gray-700 pb-2";

const initialFormData = {
  title: "",
  league: "",             
  seriesId: "",           
  sport: "Cricket",
  cover_poster_url: "",
  status: "SCHEDULED",
  liveStartTime: "",         
  liveStartDateTime: "",     
  team1: "",
  team2: "",
  team1Score: "",
  team2Score: "",
  result: "",
  link: "",
  iframeHtml: "",
  hlsUrl: "",
};

const initialSeriesData = {
    seriesTitle: "",
    seriesSlug: "",
    coverImageUrl: "",
    currentStatus: "UPCOMING",
    startDate: "", 
    endDate: "",   
    highlightsSource: "",
};

// NEW: Initial state for the dedicated Highlight Upload Form
const initialHighlightFormData = {
    matchId: "",
    highlightTitle: "",
    highlightType: "FULL",
    highlightSource: "",
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
  // === Match State ===
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [editId, setEditId] = useState(null); 

  // === Series State ===
  const [seriesData, setSeriesData] = useState(initialSeriesData);
  const [seriesList, setSeriesList] = useState([]); 
  const [seriesEditId, setSeriesEditId] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  
  // === Highlight State (NEW) ===
  const [highlightData, setHighlightData] = useState(initialHighlightFormData);
  const [highlightLoading, setHighlightLoading] = useState(false);
  // NEW: State to hold the series ID selected in the highlight form
  const [selectedHighlightSeriesId, setSelectedHighlightSeriesId] = useState("");


  // === DATA FETCHING ===
  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('live_matches')
      // IMPORTANT: Select series_id now
      .select('id, title, status, link_slug, series_id') 
      .order('created_at', { ascending: false })
      .limit(30); // Fetch more for highlights dropdown

    if (error) {
      console.error("Fetch Match Error:", error);
      toast.error("Failed to load recent matches.");
    } else {
      setMatches(data);
    }
  };

  const fetchSeries = async () => {
    const { data, error } = await supabase
        .from('series')
        // IMPORTANT: Select series_title AND id
        .select('id, series_title') 
        .order('start_date', { ascending: false });

    if (error) {
        console.error("Fetch Series Error:", error);
    } else {
        setSeriesList(data);
    }
  };

  useEffect(() => {
    fetchMatches();
    fetchSeries(); 
  }, []); 
  // =====================


  // === MATCH HANDLERS ===
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (match) => {
    // Set edit ID
    setEditId(match.id);
    // Populate form data.
    setFormData({
        title: match.title,
        league: match.league, 
        seriesId: match.series_id || '', 
        sport: match.sport,
        cover_poster_url: match.cover_poster_url,
        status: match.status,
        liveStartTime: match.live_start_time || '', 
        liveStartDateTime: match.live_start_datetime ? new Date(match.live_start_datetime).toISOString().substring(0, 16) : '', 
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
    if (!formData.title || !formData.team1 || !formData.team2 || !formData.cover_poster_url || !formData.seriesId) {
      toast.error("Please fill in the Title, Teams, Cover Poster URL, and select a Series.");
      setLoading(false);
      return;
    }
    
    // Check streaming source only if live/scheduled
    if (formData.status !== 'ENDED') {
        if (!formData.iframeHtml.trim() && !formData.hlsUrl.trim()) {
            toast.error("For LIVE/SCHEDULED, please provide a streaming source (HLS URL or iFrame HTML).");
            setLoading(false);
            return;
        }
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
        
    // 3. Determine the 'league' name from the selected series ID
    const selectedSeries = seriesList.find(s => s.id === formData.seriesId);
    const leagueName = selectedSeries ? selectedSeries.series_title : formData.league;


    try {
      // 4. PREPARE DATA FOR DB INSERT/UPDATE
      const dataToSave = {
        title: formData.title,
        league: leagueName, 
        series_id: formData.seriesId, 
        sport: formData.sport,
        cover_poster_url: formData.cover_poster_url,
        status: formData.status,
        live_start_time: formData.liveStartTime,        
        live_start_datetime: liveStartDateTimeISO,      
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
          .insert([dataToSave]); 
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

  // === SERIES HANDLERS (Unchanged) ===
  const handleSeriesChange = (e) => {
    const { name, value } = e.target;
    setSeriesData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSeriesEdit = (series) => {
    setSeriesEditId(series.id);
    setSeriesData({
        seriesTitle: series.series_title,
        seriesSlug: series.series_slug,
        coverImageUrl: series.cover_image_url || '',
        currentStatus: series.current_status,
        startDate: series.start_date ? new Date(series.start_date).toISOString().substring(0, 16) : '',
        endDate: series.end_date ? new Date(series.end_date).toISOString().substring(0, 16) : '',
        highlightsSource: series.highlights_source || '', 
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleSeriesDelete = async (id) => {
      if (!window.confirm("Are you sure you want to delete this series? This will break linked matches!")) return;
      
      try {
          const { error } = await supabase
              .from('series')
              .delete()
              .eq('id', id);

          if (error) throw new Error(error.message);

          toast.success("Series deleted successfully!");
          fetchSeries(); 
      } catch (error) {
          console.error("Delete Series Error:", error);
          toast.error(`Failed to delete the series. Error: ${error.message}`);
      }
  };

  const handleSeriesSubmit = async (e) => {
    e.preventDefault();
    setSeriesLoading(true);

    if (!seriesData.seriesTitle || !seriesData.seriesSlug || !seriesData.startDate) {
        toast.error("Please fill in the Series Title, Slug, and Start Date.");
        setSeriesLoading(false);
        return;
    }

    try {
        const dataToSave = {
            series_title: seriesData.seriesTitle,
            series_slug: seriesData.seriesSlug,
            cover_image_url: seriesData.coverImageUrl,
            current_status: seriesData.currentStatus,
            start_date: seriesData.startDate ? new Date(seriesData.startDate).toISOString() : null,
            end_date: seriesData.endDate ? new Date(seriesData.endDate).toISOString() : null,
            highlights_source: seriesData.highlightsSource, 
        };

        let dbError = null;
        if (seriesEditId) {
            const { error } = await supabase.from('series').update(dataToSave).eq('id', seriesEditId);
            dbError = error;
        } else {
            const { error } = await supabase.from('series').insert([dataToSave]);
            dbError = error;
        }

        if (dbError) throw new Error(dbError.message);
        toast.success(`Series '${seriesData.seriesTitle}' ${seriesEditId ? 'updated' : 'created'} successfully!`);
        setSeriesData(initialSeriesData);
        setSeriesEditId(null);
        fetchSeries(); 

    } catch (error) {
        console.error("Series DB Error:", error);
        toast.error(`Error creating series: ${error.message}`);
    } finally {
        setSeriesLoading(false);
    }
  };


  // === HIGHLIGHT UPLOAD HANDLERS (NEW) ===
  const handleHighlightChange = (e) => {
    const { name, value } = e.target;
    
    // Check if the changed field is the series filter
    if (name === "selectedHighlightSeriesId") {
        setSelectedHighlightSeriesId(value);
        // Reset matchId when the series changes
        setHighlightData(prev => ({ ...prev, matchId: "" }));
    } else {
        setHighlightData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleHighlightSubmit = async (e) => {
    e.preventDefault();
    setHighlightLoading(true);

    const { matchId, highlightTitle, highlightSource } = highlightData;

    if (!matchId || !highlightTitle.trim() || !highlightSource.trim()) {
        toast.error("Please select a Match, provide a Title, and the Source URL/iFrame.");
        setHighlightLoading(false);
        return;
    }

    try {
        const dataToSave = {
            match_id: matchId,
            highlight_title: highlightTitle,
            highlight_type: highlightData.highlightType,
            highlight_source: highlightSource,
        };

        const { error } = await supabase
            .from('match_highlights') // Target the new table
            .insert([dataToSave]);

        if (error) throw new Error(error.message);

        toast.success(`Highlight '${highlightTitle}' added successfully.`);
        setHighlightData(initialHighlightFormData); // Reset highlight data form
        setSelectedHighlightSeriesId(""); // Reset series filter
        
    } catch (error) {
        console.error("Highlight Upload Error:", error);
        toast.error(`Error uploading highlight: ${error.message}`);
    } finally {
        setHighlightLoading(false);
    }
  };

  // Filter matches based on the selected series ID
  const filteredHighlightMatches = matches.filter(match => 
    selectedHighlightSeriesId ? match.series_id === selectedHighlightSeriesId : true
  );


  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* --- Upload/Edit Match Form --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            {/* ... (Match Form content is largely the same, but simpler) ... */}
            
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
                
                <div className="md:col-span-2">
                    <label className={LabelClass}>Match Title (e.g., IND vs AUS Final)</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} 
                            className={InputClass} required />
                </div>

                {/* SERIES DROPDOWN */}
                <div>
                    <label className={LabelClass}>Select Associated Series *</label>
                    <select 
                        name="seriesId" 
                        value={formData.seriesId} 
                        onChange={handleChange} 
                        className={InputClass} 
                        required
                    >
                        <option value="" disabled>--- Select a Series ---</option>
                        {seriesList.filter(s => s.id && s.series_title).map((series) => (
                            <option key={series.id} value={series.id}>
                                {series.series_title}
                            </option>
                        ))}
                    </select>
                    {seriesList.length === 0 && (
                        <p className="text-xs text-yellow-400 mt-1">No series available. Create one below!</p>
                    )}
                </div>
                {/* END SERIES DROPDOWN */}


                {/* Retaining League Input (Optional) */}
                <div>
                    <label className={LabelClass}>League Name (Legacy/Manual Entry)</label>
                    <input type="text" name="league" value={formData.league} onChange={handleChange} 
                            className={InputClass} placeholder="Will be overwritten by Series Title if selected" />
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
            
            {/* Section 2 & 3: Teams, Status, Data, Scores, and Result Summary */}
            <div className={`${SectionClass} bg-gray-700/50`}>
                <h2 className={SectionTitleClass}>Teams, Status, & Scores</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Teams & Status */}
                <div><label className={LabelClass}>Team 1 Name</label><input type="text" name="team1" value={formData.team1} onChange={handleChange} className={InputClass} required /></div>
                <div><label className={LabelClass}>Team 2 Name</label><input type="text" name="team2" value={formData.team2} onChange={handleChange} className={InputClass} required /></div>
                <div><label className={LabelClass}>Current Status</label><select name="status" value={formData.status} onChange={handleChange} className={InputClass}><option value="SCHEDULED">Scheduled</option><option value="LIVE">LIVE</option><option value="ENDED">Ended (Completed)</option></select></div>
                
                {/* Time fields (visible for SCHEDULED) */}
                {formData.status === 'SCHEDULED' && (
                    <>
                        <div className="md:col-span-1"><label className={LabelClass}>Display Time</label><input type="text" name="liveStartTime" value={formData.liveStartTime} onChange={handleChange} className={InputClass} required /></div>
                        <div className="md:col-span-2"><label className={LabelClass}>Official Start Datetime</label><input type="datetime-local" name="liveStartDateTime" value={formData.liveStartDateTime} onChange={handleChange} className={InputClass} required /></div>
                    </>
                )}
                
                {/* Scores (visible for LIVE or ENDED) */}
                {(formData.status === 'LIVE' || formData.status === 'ENDED') && (
                    <>
                    <div className="md:col-span-1"><label className={LabelClass}>{formData.team1} Score/Overs</label><input type="text" name="team1Score" placeholder="e.g., (19.5) 117/10" value={formData.team1Score} onChange={handleChange} className={InputClass} /></div>
                    <div className="md:col-span-2"><label className={LabelClass}>{formData.team2} Score/Overs</label><input type="text" name="team2Score" placeholder="e.g., (2) 14/0" value={formData.team2Score} onChange={handleChange} className={InputClass} /></div>
                    </>
                )}
                
                {/* Match Result/Summary */}
                <div className="md:col-span-3">
                    <label className={LabelClass}>Result/Summary Text</label>
                    <textarea name="result" value={formData.result} onChange={handleChange} 
                            placeholder="e.g., Janakpur won by 6 wickets, or Scheduled to start..."
                            className={`${InputClass} resize-none`} rows="2" required />
                </div>
                </div>
            </div>
            
            {/* Section 4: Streaming Sources (Only for LIVE/SCHEDULED) */}
            {(formData.status === 'LIVE' || formData.status === 'SCHEDULED') && (
                <div className={`${SectionClass} bg-red-800/30`}>
                    <h2 className={SectionTitleClass}>Live Streaming Sources (REQUIRED)</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* HLS URL Input */}
                        <div><label className={LabelClass}>HLS Stream URL (.m3u8 link)</label><input type="url" name="hlsUrl" value={formData.hlsUrl} onChange={handleChange} placeholder="https://example.com/live/match/stream.m3u8" className={InputClass} /></div>

                        {/* Internal Link/Slug */}
                        <div><label className={LabelClass}>Internal Link Slug (e.g., ind-vs-aus)</label><input type="text" name="link" value={formData.link} onChange={handleChange} placeholder="ind-vs-aus-final-2024" className={InputClass} required /></div>
                        
                        {/* iFrame HTML Input (Full Width) */}
                        <div className="md:col-span-2"><label className={LabelClass}>Direct iFrame/HTML Embed Code</label><textarea name="iframeHtml" value={formData.iframeHtml} onChange={handleChange} placeholder="<iframe src='...' width='100%' height='500'></iframe>" className={`${InputClass} resize-none`} rows="4" /></div>
                    </div>
                </div>
            )}
            
            {/* Cover Poster URL Input */}
            <div className={`${SectionClass} border-red-500/50 bg-gray-700/50`}>
                <h2 className={SectionTitleClass}>Cover Poster URL</h2>
                <label className={LabelClass}>Poster Image URL (Provide a direct link to the image file)</label>
                <div className="flex items-center gap-4">
                    <LinkIcon className="w-5 h-5 text-gray-400 shrink-0"/>
                    <input type="url" name="cover_poster_url" value={formData.cover_poster_url} onChange={handleChange} placeholder="https://example.com/match_poster.jpg" className={`${InputClass} focus:ring-red-500 focus:border-red-500`} required />
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
        
        {/* --- DEDICATED HIGHLIGHT UPLOAD FORM (NEW SECTION) --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-green-600/50">
            <h2 className="text-2xl font-extrabold text-white mb-4 flex items-center gap-3 border-b border-gray-700 pb-3">
                <Video className="w-6 h-6 text-green-500"/> Upload Match Highlight Segment
            </h2>
            <p className="text-gray-400 mb-6">First select the series, then choose the match to add the highlight segment.</p>

            <form onSubmit={handleHighlightSubmit} className="space-y-6">
                
                {/* Series Selection and Match Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* 1. Series Filter Dropdown (NEW) */}
                    <div>
                        <label className={LabelClass}>Filter by Series *</label>
                        <select 
                            name="selectedHighlightSeriesId" 
                            value={selectedHighlightSeriesId} 
                            onChange={handleHighlightChange} 
                            className={InputClass} 
                        >
                            <option value="">--- Select Series (Optional Filter) ---</option>
                            {seriesList.filter(s => s.id && s.series_title).map((series) => (
                                <option key={series.id} value={series.id}>
                                    {series.series_title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Match Selection Dropdown (Filtered) */}
                    <div>
                        <label className={LabelClass}>Select Match *</label>
                        <select 
                            name="matchId" 
                            value={highlightData.matchId} 
                            onChange={handleHighlightChange} 
                            className={InputClass} 
                            required
                        >
                            <option value="" disabled>
                                {selectedHighlightSeriesId ? `--- Select Match in Series ---` : `--- Select a Match (No Series Filtered) ---`}
                            </option>
                            
                            {filteredHighlightMatches.length > 0 ? (
                                filteredHighlightMatches.map((match) => (
                                    <option key={match.id} value={match.id}>
                                        {match.title} ({match.status})
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No matches found in selected series.</option>
                            )}
                        </select>
                        {matches.length === 0 && (
                            <p className="text-xs text-red-400 mt-1">No matches found.</p>
                        )}
                    </div>
                </div>

                {/* Highlight Type and Title */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className={LabelClass}>Highlight Type</label>
                        <select name="highlightType" value={highlightData.highlightType} onChange={handleHighlightChange} 
                                className={InputClass}>
                            <option value="FULL">Full Match/Final Highlights</option>
                            <option value="DAY1">Test Day 1</option>
                            <option value="DAY2">Test Day 2</option>
                            <option value="DAY3">Test Day 3</option>
                            <option value="DAY4">Test Day 4</option>
                            <option value="DAY5">Test Day 5</option>
                            <option value="INNINGS1">1st Innings</option>
                            <option value="INNINGS2">2nd Innings</option>
                            <option value="INNINGS3">3rd Innings</option>
                            <option value="INNINGS4">4th Innings</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className={LabelClass}>Highlight Title *</label>
                        <input type="text" name="highlightTitle" value={highlightData.highlightTitle} onChange={handleHighlightChange} 
                            className={InputClass} 
                            placeholder="e.g., India's spectacular run chase"
                            required 
                        />
                    </div>
                </div>

                {/* Highlight Source */}
                <div>
                    <label className={LabelClass}>HLS URL or iFrame HTML for Highlight *</label>
                    <textarea 
                        name="highlightSource" 
                        value={highlightData.highlightSource} 
                        onChange={handleHighlightChange} 
                        placeholder="Provide the direct HLS URL or the full iFrame embed code for the highlight segment."
                        className={`${InputClass} resize-none`} 
                        rows="3" 
                        required 
                    />
                </div>

                {/* Submission Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={highlightLoading}
                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {highlightLoading ? (
                            <>
                            <Video className="w-5 h-5 animate-spin" /> Uploading Highlight...
                            </>
                        ) : (
                            <>
                            <Send className="w-5 h-5"/> Upload Highlight Segment
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
        
        {/* --- Recently Added Matches List --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            {/* ... (Match list unchanged) ... */}
            <h2 className="text-2xl font-extrabold text-white mb-4 flex items-center gap-3 border-b border-gray-700 pb-3">
                <List className="w-6 h-6 text-red-500"/> Recently Added Matches
            </h2>
            <MatchList matches={matches} onEdit={handleEdit} onDelete={handleDelete} />
        </div>


        {/* --- Series Management Block (Unchanged) --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            {/* ... (Series Management content unchanged) ... */}
            <h2 className="text-2xl font-extrabold text-white mb-4 flex items-center gap-3 border-b border-gray-700 pb-3">
                <Box className="w-6 h-6 text-yellow-500"/> {seriesEditId ? 'Edit Series Block' : 'Create New Series Block'}
            </h2>

            {seriesEditId && (
                <div className="mb-4 p-3 bg-red-800/20 text-red-300 rounded-lg flex justify-between items-center">
                    <span>You are currently editing Series ID: **{seriesEditId}**.</span>
                </div>
            )}


            <form onSubmit={handleSeriesSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Series Title */}
                    <div>
                        <label className={LabelClass}>Series Title (e.g., Asia Cup 2024)</label>
                        <input type="text" name="seriesTitle" value={seriesData.seriesTitle} onChange={handleSeriesChange} 
                                className={InputClass} required />
                    </div>

                    {/* Series Slug */}
                    <div>
                        <label className={LabelClass}>Series Slug (e.g., asia-cup-2024)</label>
                        <input type="text" name="seriesSlug" value={seriesData.seriesSlug} onChange={handleSeriesChange} 
                                className={InputClass} required />
                    </div>

                    {/* Series Status */}
                    <div>
                        <label className={LabelClass}>Status</label>
                        <select name="currentStatus" value={seriesData.currentStatus} onChange={handleSeriesChange} 
                                className={InputClass}>
                            <option value="UPCOMING">Upcoming</option>
                            <option value="ONGOING">Ongoing</option>
                            <option value="CONCLUDED">Concluded</option>
                        </select>
                    </div>
                    
                    {/* Start Date */}
                    <div>
                        <label className={LabelClass}>Start Date</label>
                        <input type="datetime-local" name="startDate" value={seriesData.startDate} onChange={handleSeriesChange} 
                                className={InputClass} required />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className={LabelClass}>End Date</label>
                        <input type="datetime-local" name="endDate" value={seriesData.endDate} onChange={handleSeriesChange} 
                                className={InputClass} />
                    </div>

                    {/* Cover Image URL */}
                    <div className="md:col-span-2">
                        <label className={LabelClass}>Cover Image URL</label>
                        <input type="url" name="coverImageUrl" value={seriesData.coverImageUrl} onChange={handleSeriesChange} 
                                className={InputClass} placeholder="https://example.com/series_poster.jpg" />
                    </div>

                </div>

                {/* SERIES HIGHLIGHTS INPUT */}
                <div className="pt-4 border-t border-gray-700">
                    <label className={LabelClass}>Series Highlights Source (HLS URL or iFrame HTML for entire series summary)</label>
                    <textarea 
                        name="highlightsSource" 
                        value={seriesData.highlightsSource} 
                        onChange={handleSeriesChange} 
                        placeholder="Provide the HLS URL or iFrame embed code for the series highlights/summary reel."
                        className={`${InputClass} resize-none`} 
                        rows="3" 
                    />
                </div>
                {/* END SERIES HIGHLIGHTS INPUT */}


                {/* Submission Button */}
                <div className="pt-4 flex space-x-4">
                    <button
                        type="submit"
                        disabled={seriesLoading}
                        className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg shadow-xl hover:bg-yellow-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {seriesLoading ? (
                             <>
                             <Calendar className="w-5 h-5 animate-spin" /> Submitting Series...
                             </>
                        ) : (
                             <>
                             <Send className="w-5 h-5"/> {seriesEditId ? 'Save Series Changes' : 'Create Series'}
                             </>
                        )}
                    </button>
                    {seriesEditId && (
                        <button type="button" onClick={() => { setSeriesEditId(null); setSeriesData(initialSeriesData); }} className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition">
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>
            
            {/* Series List */}
            <div className="mt-8 pt-4 border-t border-gray-700">
                <h3 className="text-xl font-bold text-gray-300 mb-4">Existing Series</h3>
                {seriesList.length === 0 ? (
                    <p className="text-gray-400">No series created yet.</p>
                ) : (
                    <div className="space-y-3">
                        {seriesList.map((series) => (
                            <div key={series.id} className="bg-gray-700/70 p-4 rounded-lg flex justify-between items-center border border-gray-600">
                                <div>
                                    <p className="text-white font-bold">{series.series_title}</p>
                                    <p className="text-xs text-gray-400">
                                        Status: {series.current_status} | Slug: **{series.series_slug}**
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleSeriesEdit(series)}
                                        className="p-2 rounded-full text-blue-400 hover:bg-gray-600 transition"
                                        title="Edit Series"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleSeriesDelete(series.id)}
                                        className="p-2 rounded-full text-red-400 hover:bg-gray-600 transition"
                                        title="Delete Series"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>


      </div> 
    </div>
  );
};

export default AdminLiveMatchUpload;