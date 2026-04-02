// src/pages/AdminLiveMatchUpload.jsx
import React, { useState, useEffect } from "react";
import { Send, MonitorPlay, Link as LinkIcon, Edit, Trash2, List, Calendar, Box, Plus, X } from "lucide-react"; 
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient'; 

// --- Constants ---
const InputClass = "w-full p-3 border border-gray-600 rounded-lg text-white bg-gray-700 focus:ring-red-500 focus:border-red-500 placeholder-gray-400 text-sm";
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

const AdminLiveMatchUpload = () => {
  // === State Management ===
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [editId, setEditId] = useState(null); 

  const [seriesData, setSeriesData] = useState(initialSeriesData);
  const [seriesList, setSeriesList] = useState([]); 
  const [seriesEditId, setSeriesEditId] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);

  // === NEW: Bulk Scheduler State ===
  const [bulkSeriesId, setBulkSeriesId] = useState("");
  const [bulkMatches, setBulkMatches] = useState([{ team1: "", team2: "", startTime: "", hlsUrl: "" }]);

  // === DATA FETCHING ===
  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('live_matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) toast.error("Failed to load matches.");
    else setMatches(data);
  };

  const fetchSeries = async () => {
    const { data, error } = await supabase
        .from('series')
        .select('id, series_title, series_slug, current_status, start_date, end_date, cover_image_url, highlights_source') 
        .order('start_date', { ascending: false });

    if (error) console.error(error);
    else setSeriesList(data);
  };

  useEffect(() => {
    fetchMatches();
    fetchSeries(); 
  }, []); 

  // === BULK HANDLERS ===
  const addBulkRow = () => {
    setBulkMatches([...bulkMatches, { team1: "", team2: "", startTime: "", hlsUrl: "" }]);
  };

  const removeBulkRow = (index) => {
    const updated = bulkMatches.filter((_, i) => i !== index);
    setBulkMatches(updated);
  };

  const updateBulkRow = (index, field, value) => {
    const updated = [...bulkMatches];
    updated[index][field] = value;
    setBulkMatches(updated);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkSeriesId) return toast.error("Please select a Series first.");
    
    setLoading(true);
    const selectedSeries = seriesList.find(s => s.id === bulkSeriesId);

    try {
        const matchesToInsert = bulkMatches.map(m => ({
            title: `${m.team1} vs ${m.team2}`,
            series_id: bulkSeriesId,
            league: selectedSeries.series_title,
            team_1: m.team1,
            team_2: m.team2,
            live_start_datetime: new Date(m.startTime).toISOString(),
            hls_url: m.hlsUrl || "",
            status: "SCHEDULED",
            link_slug: `${m.team1}-${m.team2}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-'),
            sport: "Cricket",
            cover_poster_url: selectedSeries.cover_image_url || "",
            result_summary: "Scheduled"
        }));

        const { error } = await supabase.from('live_matches').insert(matchesToInsert);
        if (error) throw error;

        toast.success(`Successfully scheduled ${matchesToInsert.length} matches!`);
        setBulkMatches([{ team1: "", team2: "", startTime: "", hlsUrl: "" }]);
        fetchMatches();
    } catch (err) {
        toast.error(err.message);
    } finally {
        setLoading(false);
    }
  };

  // === STANDARD MATCH HANDLERS (Edit/Delete/Single Submit) ===
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (match) => {
    setEditId(match.id);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const liveStartDateTimeISO = formData.liveStartDateTime ? new Date(formData.liveStartDateTime).toISOString() : null;
    const selectedSeries = seriesList.find(s => s.id === formData.seriesId);

    const dataToSave = {
        title: formData.title,
        league: selectedSeries ? selectedSeries.series_title : formData.league, 
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

    try {
        let error;
        if (editId) {
            const { error: err } = await supabase.from('live_matches').update(dataToSave).eq('id', editId);
            error = err;
        } else {
            const { error: err } = await supabase.from('live_matches').insert([dataToSave]);
            error = err;
        }
        if (error) throw error;
        toast.success("Match saved!");
        setEditId(null);
        setFormData(initialFormData);
        fetchMatches();
    } catch (err) {
        toast.error(err.message);
    } finally {
        setLoading(false);
    }
  };

const handleSeriesSubmit = async (e) => {
    e.preventDefault();
    setSeriesLoading(true);
    
    const dataToSave = {
        series_title: seriesData.seriesTitle,
        series_slug: seriesData.seriesSlug,
        cover_image_url: seriesData.coverImageUrl,
        current_status: seriesData.currentStatus, // Ensure this is being sent
        start_date: seriesData.startDate ? new Date(seriesData.startDate).toISOString() : null,
        end_date: seriesData.endDate ? new Date(seriesData.endDate).toISOString() : null,
    };

    try {
        let error;
        if (seriesEditId) {
            const { error: err } = await supabase.from('series').update(dataToSave).eq('id', seriesEditId);
            error = err;
        } else {
            const { error: err } = await supabase.from('series').insert([dataToSave]);
            error = err;
        }
        if (error) throw error;
        toast.success("Series status updated!");
        setSeriesData(initialSeriesData);
        setSeriesEditId(null);
        fetchSeries();
    } catch (err) {
        toast.error(err.message);
    } finally {
        setSeriesLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* --- SECTION 1: ONE-SHOT BULK SCHEDULER --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-blue-600/50">
            <h2 className="text-2xl font-extrabold text-white mb-4 flex items-center gap-3 border-b border-gray-700 pb-3">
                <Calendar className="w-6 h-6 text-blue-400"/> One-Shot Series Scheduler
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <label className={LabelClass}>Select Series</label>
                    <select className={InputClass} value={bulkSeriesId} onChange={(e) => setBulkSeriesId(e.target.value)}>
                        <option value="">-- Choose Series --</option>
                        {seriesList.map(s => <option key={s.id} value={s.id}>{s.series_title}</option>)}
                    </select>
                    <p className="mt-4 text-xs text-gray-400 italic">This will add all matches below to the selected series using its cover art and title automatically.</p>
                </div>

                <div className="lg:col-span-3 space-y-3">
                    <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-xs font-bold text-gray-500 uppercase">
                        <div className="col-span-3">Team 1</div>
                        <div className="col-span-3">Team 2</div>
                        <div className="col-span-3">Start Date/Time</div>
                        <div className="col-span-2">HLS URL (Optional)</div>
                    </div>
                    
                    {bulkMatches.map((match, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-gray-700/30 p-2 rounded-lg relative">
                            <div className="md:col-span-3"><input type="text" placeholder="Team 1" className={InputClass} value={match.team1} onChange={(e) => updateBulkRow(idx, 'team1', e.target.value)} /></div>
                            <div className="md:col-span-3"><input type="text" placeholder="Team 2" className={InputClass} value={match.team2} onChange={(e) => updateBulkRow(idx, 'team2', e.target.value)} /></div>
                            <div className="md:col-span-3"><input type="datetime-local" className={InputClass} value={match.startTime} onChange={(e) => updateBulkRow(idx, 'startTime', e.target.value)} /></div>
                            <div className="md:col-span-2"><input type="text" placeholder="m3u8 link" className={InputClass} value={match.hlsUrl} onChange={(e) => updateBulkRow(idx, 'hlsUrl', e.target.value)} /></div>
                            <div className="md:col-span-1 flex items-center justify-center">
                                <button onClick={() => removeBulkRow(idx)} className="text-red-400 hover:text-red-200"><X className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                    
                    <div className="flex justify-between items-center pt-2">
                        <button onClick={addBulkRow} className="flex items-center gap-1 text-blue-400 hover:underline text-sm font-bold">
                            <Plus className="w-4 h-4"/> Add Another Match
                        </button>
                        <button onClick={handleBulkSubmit} disabled={loading || !bulkSeriesId} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold disabled:opacity-50 transition">
                            {loading ? "Saving..." : "Schedule All Matches"}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* --- SECTION 2: EDIT/UPLOAD SINGLE MATCH --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            <h2 className={SectionTitleClass}>{editId ? "Edit Match" : "Manual Match Upload"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="md:col-span-2">
                    <label className={LabelClass}>Match Title</label>
                    <input name="title" value={formData.title} onChange={handleChange} className={InputClass} placeholder="IND vs AUS" />
                </div>
                <div>
                    <label className={LabelClass}>Series</label>
                    <select name="seriesId" value={formData.seriesId} onChange={handleChange} className={InputClass}>
                        <option value="">No Series</option>
                        {seriesList.map(s => <option key={s.id} value={s.id}>{s.series_title}</option>)}
                    </select>
                </div>
                {/* Simplified Status & Stream fields */}
                <select name="status" value={formData.status} onChange={handleChange} className={InputClass}>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="LIVE">Live</option>
                    <option value="ENDED">Ended</option>
                </select>
                <input name="hlsUrl" value={formData.hlsUrl} onChange={handleChange} className={InputClass} placeholder="HLS URL" />
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg">Save Match</button>
            </form>
        </div>

        {/* --- SECTION 3: SERIES MANAGEMENT --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
    <h2 className="text-xl font-bold text-yellow-500 mb-4 flex items-center gap-2">
        <Box/> {seriesEditId ? "Edit Series" : "Create Series Block"}
    </h2>
    <form onSubmit={handleSeriesSubmit} className="space-y-4">
        <input placeholder="Series Title" className={InputClass} value={seriesData.seriesTitle} onChange={(e) => setSeriesData({...seriesData, seriesTitle: e.target.value})} />
        
        {/* ADD THIS STATUS DROPDOWN */}
        <label className={LabelClass}>Series Status</label>
        <select 
            className={InputClass} 
            value={seriesData.currentStatus} 
            onChange={(e) => setSeriesData({...seriesData, currentStatus: e.target.value})}
        >
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing / Live</option>
            <option value="ENDED">Ended / Archive</option>
        </select>
        
        <input placeholder="Series Slug" className={InputClass} value={seriesData.seriesSlug} onChange={(e) => setSeriesData({...seriesData, seriesSlug: e.target.value})} />
        <button className="w-full bg-yellow-600 py-2 rounded-lg font-bold">Save Series</button>
    </form>
</div>

        {/* --- SECTION 4: RECENT MATCHES LIST --- */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><List/> Recent Matches</h2>
            <div className="space-y-2">
                {matches.map(m => (
                    <div key={m.id} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="text-white font-medium">{m.title}</p>
                            <p className="text-xs text-gray-400">{new Date(m.live_start_datetime).toLocaleString()} | <span className={m.status === 'LIVE' ? 'text-green-400' : 'text-blue-400'}>{m.status}</span></p>
                        </div>
                        <button onClick={() => handleEdit(m)} className="p-2 bg-gray-600 rounded-full text-white"><Edit className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLiveMatchUpload;