import React, { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { Bar, Pie } from "react-chartjs-2"; // Import Pie for language chart
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { backendUrl } from "../utils/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import {
  Users,
  Film,
  Hash,
  MonitorPlay,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react"; // Modern icons

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminDashboard = () => {
  const { movies, fetchMovies, allUsersCount } = useContext(AppContext);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingWatch, setLoadingWatch] = useState(false);
  
  // Toggle States
  const [showUsers, setShowUsers] = useState(false);
  const [showWatchMovies, setShowWatchMovies] = useState(false); // Added dedicated toggle for Watchable Movies
  const [expandedLangs, setExpandedLangs] = useState({});
  const [showWeeklyStats, setShowWeeklyStats] = useState(true); // Default to open for main chart
  const [showWeeklyByLang, setShowWeeklyByLang] = useState(false);
  const [showMoviesByLang, setShowMoviesByLang] = useState(false);
  const [showLangChart, setShowLangChart] = useState(false);

  // Search/Filter State
  const [userSearch, setUserSearch] = useState("");

  // Watch Movies state
  const [watchMovies, setWatchMovies] = useState([]);

  // --- Data Fetching ---

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`${backendUrl}/api/user/all`);
      const data = await res.json();
      if (data.success) {
        // Exclude admin email immediately
        setAllUsers(data.users.filter((u) => u.email !== "sanjusanjay0444@gmail.com"));
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchWatchMovies = useCallback(async () => {
    setLoadingWatch(true);
    // Fetch watch_html rows and join with the related movie row
    const { data, error } = await supabase
      .from("watch_html")
      .select("*, movie:movie_id(id, title, language, categories, description, slug)"); 

    if (!error && data) setWatchMovies(data.filter(item => item.movie)); // Filter out items with no corresponding movie
    else console.error("Error fetching watchable movies:", error);
    setLoadingWatch(false);
  }, []);
  
  useEffect(() => {
    fetchMovies();
    fetchWatchMovies();
  }, [fetchMovies, fetchWatchMovies]);

  const toggleUsers = () => {
    if (!showUsers) fetchAllUsers();
    setShowUsers(!showUsers);
  };
  
  // --- Computed Data (useMemo for performance) ---

  // 1. Filtered Users
  const filteredUsers = useMemo(() => {
    return allUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [allUsers, userSearch]);

  // 2. Weekly Upload Stats
  const { weeklyStats, chartData } = useMemo(() => {
    const counts = {};
    movies.forEach((m) => {
      // Simple date for grouping by week (could be improved for exact ISO week number)
      const date = new Date(m.created_at);
      const week = `${date.getFullYear()}-W${Math.ceil((date.getDate() + 6 - date.getDay()) / 7)}`;
      counts[week] = (counts[week] || 0) + 1;
    });
    
    const stats = Object.entries(counts)
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-6);
    
    const data = {
      labels: stats.map(([week]) => week),
      datasets: [
        {
          label: "Movies Uploaded",
          data: stats.map(([_, count]) => count),
          backgroundColor: "rgba(59,130,246,0.8)",
          borderColor: "rgba(59,130,246,1)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
    return { weeklyStats: stats, chartData: data };
  }, [movies]);

  // 3. Language Counts and Chart Data
  const { languageCounts, languageChartData } = useMemo(() => {
    const counts = {};
    movies.forEach((m) => {
      (m.language || []).forEach((lang) => {
        counts[lang] = (counts[lang] || 0) + 1;
      });
    });

    const backgroundColors = [
      "#3b82f6", // Blue
      "#10b981", // Green
      "#f97316", // Orange
      "#ec4899", // Pink
      "#6366f1", // Indigo
      "#f59e0b", // Amber
      "#ef4444", // Red
    ];

    const data = {
      labels: Object.keys(counts),
      datasets: [
        {
          label: "Movies by Language",
          data: Object.values(counts),
          backgroundColor: Object.keys(counts).map((_, i) => backgroundColors[i % backgroundColors.length]),
          borderColor: "#1f2937", // Dark gray for border
          borderWidth: 2,
        },
      ],
    };
    return { languageCounts: counts, languageChartData: data };
  }, [movies]);

  // 4. Weekly Uploads by Language
  const weeklyByLang = useMemo(() => {
    const data = {};
    movies.forEach((m) => {
      const date = new Date(m.created_at);
      const week = `${date.getFullYear()}-W${Math.ceil(
        (date.getDate() + 6 - date.getDay()) / 7
      )}`;
      (m.language || []).forEach((lang) => {
        if (!data[week]) data[week] = {};
        data[week][lang] = (data[week][lang] || 0) + 1;
      });
    });

    const weeks = Object.keys(data).sort().slice(-6); // Last 6 weeks
    const langs = [...new Set(movies.flatMap((m) => m.language || []))];
    
    const backgroundColors = [
      "rgba(59,130,246,0.7)", "rgba(16,185,129,0.7)", "rgba(239,68,68,0.7)",
      "rgba(234,179,8,0.7)", "rgba(168,85,247,0.7)", "rgba(236,72,153,0.7)",
    ];

    return {
      labels: weeks,
      datasets: langs.map((lang, idx) => ({
        label: lang,
        data: weeks.map((w) => data[w][lang] || 0),
        backgroundColor: backgroundColors[idx % backgroundColors.length],
        borderRadius: 4,
      })),
    };
  }, [movies]);

  // 5. Movies grouped by language for list
  const moviesByLanguage = useMemo(() => {
    const grouped = {};
    movies.forEach((m) => {
      (m.language || []).forEach((lang) => {
        if (!grouped[lang]) grouped[lang] = [];
        grouped[lang].push(m);
      });
    });
    // Sort by count descending
    return Object.fromEntries(
        Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length)
    );
  }, [movies]);
  
  const totalCategories = useMemo(() => {
    return [...new Set(movies.flatMap((m) => m.categories || []))].length;
  }, [movies]);

  // --- Utility Functions ---

  const toggleLang = (lang) => {
    setExpandedLangs((prev) => ({
      ...prev,
      [lang]: !prev[lang],
    }));
  };
  
  const getJoinDate = (user) => {
    if (user.createdAt) return new Date(user.createdAt).toLocaleDateString();
    if (user._id) {
      const timestamp = parseInt(user._id.substring(0, 8), 16) * 1000;
      return new Date(timestamp).toLocaleDateString();
    }
    return "N/A";
  };
  
  // Chart options for better look
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'white' } },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y} uploads`,
        },
      },
    },
    scales: {
        x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
        y: { ticks: { color: 'rgba(255,255,255,0.7)', precision: 0 }, grid: { color: 'rgba(255,255,255,0.1)' } },
    }
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'right', labels: { color: 'white' } },
      title: { display: false },
    }
  };


  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto text-white p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-extrabold text-blue-400 mb-3 sm:mb-0">
            👑 AnchorMovies Admin Hub
          </h1>
          <Link
            to="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl shadow-lg transition transform hover:scale-[1.02] font-semibold"
          >
            ⬅ Back to Home
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Movies" 
            value={movies.length} 
            color="text-blue-400" 
            Icon={Film}
            subText="All records in database"
          />
          <StatCard 
            title="Total Categories" 
            value={totalCategories} 
            color="text-green-400" 
            Icon={Hash} 
            subText="Unique categories used"
          />
          <StatCard 
            title="Registered Users" 
            value={allUsersCount} 
            color="text-purple-400" 
            Icon={Users} 
            onClick={toggleUsers} 
            subText={showUsers ? "Click to collapse" : "Click to view details"}
          />
          <StatCard 
            title="Watchable Movies" 
            value={watchMovies.length} 
            color="text-yellow-400" 
            Icon={MonitorPlay}
            onClick={() => setShowWatchMovies(!showWatchMovies)}
            subText={showWatchMovies ? "Click to collapse" : "Click to view list"}
          />
        </div>

        {/* Expanded Users */}
        {showUsers && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
              <Users className="w-5 h-5"/> Detailed User List ({filteredUsers.length} active)
            </h2>
            <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                <input
                type="text"
                placeholder="Search users by name or email..."
                className="p-3 pl-10 w-full rounded-lg bg-gray-900 border border-gray-700 placeholder-gray-400 text-white focus:ring-purple-500 focus:border-purple-500"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                />
            </div>
            
            {loadingUsers ? (
              <p className="text-gray-400 italic text-center py-4">Loading users...</p>
            ) : (
              <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-700">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-700 text-gray-300 uppercase text-xs tracking-wider">
                      <th className="p-3 border-b border-gray-600">#</th>
                      <th className="p-3 border-b border-gray-600">Name</th>
                      <th className="p-3 border-b border-gray-600">Email</th>
                      <th className="p-3 border-b border-gray-600">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user, idx) => (
                        <tr
                          key={user._id || idx}
                          className="border-b border-gray-700 hover:bg-gray-700/50 transition text-gray-200 text-sm"
                        >
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3 font-medium">{user.name || "N/A"}</td>
                          <td className="p-3 text-blue-400 break-all">{user.email}</td>
                          <td className="p-3 text-gray-400">{getJoinDate(user)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-gray-400 italic">
                          No users match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Watchable Movies List */}
        {showWatchMovies && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-400">
              <MonitorPlay className="w-5 h-5"/> Watchable Movies ({watchMovies.length})
            </h2>
            {loadingWatch ? (
              <p className="text-gray-400 italic text-center py-4">Loading watchable movies...</p>
            ) : watchMovies.length === 0 ? (
              <p className="text-gray-400 italic">No watchable movies found in the database.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {watchMovies.map((wm) => (
                  // Use wm.movie for movie details
                  <Link
                    to={`/movie/${wm.movie.slug}`}
                    key={wm.id}
                    className="flex flex-col bg-gray-900 p-4 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition group"
                  >
                    <h3 className="text-lg font-bold text-blue-400 group-hover:underline">
                      {wm.movie.title}
                    </h3>
                    <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-4">
                      <span>🎬 {wm.movie.language?.join(", ") || "Unknown Language"}</span>
                      <span># {wm.movie.categories?.join(", ") || "No Categories"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* --- Charts Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Weekly Upload Chart */}
            <ChartSection 
                title="📈 Last 6 Weeks Uploads" 
                show={showWeeklyStats} 
                toggle={() => setShowWeeklyStats(!showWeeklyStats)}
                className="lg:col-span-2"
            >
                <div className="h-80 w-full">
                    {movies.length > 0 ? <Bar data={chartData} options={barChartOptions} /> : <p className="text-center py-10 text-gray-400">No data available.</p>}
                </div>
            </ChartSection>
            
            {/* Movies by Language Chart (Pie) */}
            <ChartSection
                title="🌍 Language Distribution"
                show={showLangChart}
                toggle={() => setShowLangChart(!showLangChart)}
                className="lg:col-span-1"
            >
                <div className="h-80 w-full flex justify-center items-center">
                    {movies.length > 0 ? <Pie data={languageChartData} options={pieChartOptions} /> : <p className="text-center py-10 text-gray-400">No data available.</p>}
                </div>
            </ChartSection>

            {/* Weekly Uploads by Language (Stacked Bar) */}
            <ChartSection 
                title="📊 Weekly Uploads by Language" 
                show={showWeeklyByLang} 
                toggle={() => setShowWeeklyByLang(!showWeeklyByLang)}
                className="lg:col-span-3"
            >
                <div className="h-96 w-full">
                    {movies.length > 0 ? <Bar data={weeklyByLang} options={{...barChartOptions, scales: {...barChartOptions.scales, x: {...barChartOptions.scales.x, stacked: true}, y: {...barChartOptions.scales.y, stacked: true}}}} /> : <p className="text-center py-10 text-gray-400">No data available.</p>}
                </div>
            </ChartSection>
        </div>


        {/* Movies by Language List */}
        <div
          className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 mb-6 cursor-pointer"
          onClick={() => setShowMoviesByLang(!showMoviesByLang)}
        >
          <h2 className="text-xl font-bold mb-4 flex justify-between items-center text-green-400">
            🎞 Movies List by Language
            <span className="text-sm text-gray-400 flex items-center">
              {showMoviesByLang ? <ChevronUp className="w-4 h-4 mr-1"/> : <ChevronDown className="w-4 h-4 mr-1"/>} {showMoviesByLang ? "Collapse" : "Expand"}
            </span>
          </h2>
          {showMoviesByLang && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(moviesByLanguage).map(([lang, list]) => (
                <div 
                    key={lang} 
                    className="bg-gray-900 p-4 rounded-lg border border-gray-700 transition"
                >
                  <h3
                    className="font-bold text-lg text-blue-400 mb-2 flex justify-between items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLang(lang);
                    }}
                  >
                    {lang} ({list.length} Titles)
                    <span className="text-sm text-gray-400 hover:text-white transition">
                      {expandedLangs[lang] ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                    </span>
                  </h3>
                  {expandedLangs[lang] && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700 mt-2">
                      {list.map((m) => (
                        <Link
                          to={`/movie/${m.slug}`}
                          key={m.id}
                          className="px-3 py-1 bg-gray-700 rounded-full text-sm hover:bg-blue-600 transition"
                        >
                          {m.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="text-center pt-6 border-t border-gray-700 mt-8">
            <p className="text-sm text-gray-500">
                Dashboard rendered at: {new Date().toLocaleTimeString()}
            </p>
        </div>
      </div>
    </AdminLayout>
  );
};

// --- Helper Components for Cleanliness ---

const StatCard = ({ title, value, color, Icon, onClick, subText }) => (
    <div 
        className={`bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-800 ${onClick ? 'cursor-pointer hover:bg-gray-800 transition' : ''}`}
        onClick={onClick}
    >
        <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${color}`}/>
            <h2 className="text-lg font-bold text-gray-300">{title}</h2>
        </div>
        <p className={`text-4xl mt-3 ${color} font-extrabold`}>
            {value}
        </p>
        {subText && (
            <p className="text-sm text-gray-400 mt-2">{subText}</p>
        )}
    </div>
);

const ChartSection = ({ title, show, toggle, children, className = '' }) => (
    <div
      className={`bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 cursor-pointer ${className}`}
      onClick={toggle}
    >
      <h2 className="text-xl font-bold mb-4 flex justify-between items-center text-blue-400">
        {title}
        <span className="text-sm text-gray-400 flex items-center">
          {show ? <ChevronUp className="w-4 h-4 mr-1"/> : <ChevronDown className="w-4 h-4 mr-1"/>} {show ? "Collapse" : "Expand"}
        </span>
      </h2>
      {show && (
          <div onClick={(e) => e.stopPropagation()} className="pt-2 border-t border-gray-700">
            {children}
          </div>
      )}
    </div>
);


export default AdminDashboard;