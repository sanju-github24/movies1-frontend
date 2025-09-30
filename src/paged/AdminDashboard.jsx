import React, { useEffect, useState, useContext } from "react";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { Bar } from "react-chartjs-2";
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
  const [showUsers, setShowUsers] = useState(false);
  const [expandedLangs, setExpandedLangs] = useState({});
  const [showWeeklyStats, setShowWeeklyStats] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showWeeklyByLang, setShowWeeklyByLang] = useState(false);
  const [showMoviesByLang, setShowMoviesByLang] = useState(false);

  // 🎬 Watch Movies state
  const [watchMovies, setWatchMovies] = useState([]);
  const [showWatchMovies, setShowWatchMovies] = useState(false);

  useEffect(() => {
    fetchMovies();
    fetchWatchMovies();
  }, [fetchMovies]);

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`${backendUrl}/api/user/all`);
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchWatchMovies = async () => {
  const { data, error } = await supabase
    .from("watch_html")
    .select("id"); // only fetch IDs, no need for movies or extra fields

  if (!error && data) setWatchMovies(data); // this will set watchMovies.length correctly
};


  const filteredUsers = allUsers
    .filter((u) => u.email !== "sanjusanjay0444@gmail.com")
    .filter(
      (u) =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

  const toggleLang = (lang) => {
    setExpandedLangs((prev) => ({
      ...prev,
      [lang]: !prev[lang],
    }));
  };

  // Weekly Upload Stats
  const weeklyStats = (() => {
    const counts = {};
    movies.forEach((m) => {
      const date = new Date(m.created_at);
      const week = `${date.getFullYear()}-W${Math.ceil(
        (date.getDate() + 6 - date.getDay()) / 7
      )}`;
      counts[week] = (counts[week] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-6);
  })();

  const chartData = {
    labels: weeklyStats.map(([week]) => week),
    datasets: [
      {
        label: "Movies Uploaded",
        data: weeklyStats.map(([_, count]) => count),
        backgroundColor: "rgba(59,130,246,0.7)",
        borderRadius: 6,
      },
    ],
  };

  // Movies by language
  const languageCounts = (() => {
    const counts = {};
    movies.forEach((m) => {
      (m.language || []).forEach((lang) => {
        counts[lang] = (counts[lang] || 0) + 1;
      });
    });
    return counts;
  })();

  const languageChartData = {
    labels: Object.keys(languageCounts),
    datasets: [
      {
        label: "Movies by Language",
        data: Object.values(languageCounts),
        backgroundColor: [
          "rgba(59,130,246,0.7)",
          "rgba(16,185,129,0.7)",
          "rgba(239,68,68,0.7)",
          "rgba(234,179,8,0.7)",
          "rgba(168,85,247,0.7)",
        ],
        borderRadius: 6,
      },
    ],
  };

  // Weekly uploads by language
  const weeklyByLang = (() => {
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

    const weeks = Object.keys(data).sort();
    const langs = [...new Set(movies.flatMap((m) => m.language || []))];

    return {
      labels: weeks,
      datasets: langs.map((lang, idx) => ({
        label: lang,
        data: weeks.map((w) => data[w][lang] || 0),
        backgroundColor: [
          "rgba(59,130,246,0.7)",
          "rgba(16,185,129,0.7)",
          "rgba(239,68,68,0.7)",
          "rgba(234,179,8,0.7)",
          "rgba(168,85,247,0.7)",
          "rgba(236,72,153,0.7)",
        ][idx % 6],
        borderRadius: 6,
      })),
    };
  })();

  // Movies grouped by language
  const moviesByLanguage = (() => {
    const grouped = {};
    movies.forEach((m) => {
      (m.language || []).forEach((lang) => {
        if (!grouped[lang]) grouped[lang] = [];
        grouped[lang].push(m);
      });
    });
    return grouped;
  })();

  const totalCategories = [
    ...new Set(movies.flatMap((m) => m.categories || [])),
  ].length;

  const toggleUsers = () => {
    if (!showUsers) fetchAllUsers();
    setShowUsers(!showUsers);
  };

  const getJoinDate = (user) => {
    if (user.createdAt) return new Date(user.createdAt).toLocaleDateString();
    if (user._id) {
      const timestamp = parseInt(user._id.substring(0, 8), 16) * 1000;
      return new Date(timestamp).toLocaleDateString();
    }
    return "N/A";
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto text-white p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">📊 Admin Dashboard</h1>
          <Link
            to="/"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow transition"
          >
            ⬅ Back to Home
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-900 p-6 rounded shadow border border-gray-800">
            <h2 className="text-xl font-bold">🎬 Total Movies</h2>
            <p className="text-3xl mt-2 text-blue-400 font-semibold">
              {movies.length}
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded shadow border border-gray-800">
            <h2 className="text-xl font-bold">📂 Total Categories</h2>
            <p className="text-3xl mt-2 text-green-400 font-semibold">
              {totalCategories}
            </p>
          </div>
          <div
            className="bg-gray-900 p-6 rounded shadow border border-gray-800 cursor-pointer hover:bg-gray-800 transition"
            onClick={toggleUsers}
          >
            <h2 className="text-xl font-bold">👤 Registered Users</h2>
            <p className="text-3xl mt-2 text-purple-400 font-semibold">
              {allUsersCount}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {showUsers ? "Click to collapse" : "Click to expand"}
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded shadow border border-gray-800">
            <h2 className="text-xl font-bold">📺 Watchable Movies</h2>
            <p className="text-3xl mt-2 text-yellow-400 font-semibold">
              {watchMovies.length}
            </p>
          </div>
        </div>

        {/* Watchable Movies List */}
        {showWatchMovies && (
          <div className="bg-gray-900 p-6 rounded shadow border border-gray-800 mb-6">
            <h2 className="text-lg font-semibold mb-4">📺 Watchable Movies</h2>
            {watchMovies.length === 0 ? (
              <p className="text-gray-400 italic">No watchable movies</p>
            ) : (
              <div className="space-y-4">
                {watchMovies.map((wm) => (
                  <div
                    key={wm.id}
                    className="bg-gray-800 p-4 rounded-lg border border-gray-700"
                  >
                    <h3 className="text-xl font-bold text-blue-400 mb-1">
                      {wm.movies?.title || "Untitled"}
                    </h3>
                    <p className="text-sm text-gray-300">
                      {wm.movies?.language?.join(", ") || "Unknown"} |{" "}
                      {wm.movies?.categories?.join(", ") || "No Categories"}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {wm.movies?.description || "No description available"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expanded Users */}
        {showUsers && (
          <div className="bg-gray-900 p-6 rounded shadow border border-gray-800 mb-6">
            <h2 className="text-lg font-semibold mb-4">👥 User Details</h2>
            <input
              type="text"
              placeholder="🔍 Search users by name or email"
              className="p-2 mb-4 w-full rounded bg-gray-800 placeholder-gray-400 text-white"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {loadingUsers ? (
              <p className="text-gray-400 italic">Loading users...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-gray-300">
                      <th className="p-3 border-b border-gray-700">#</th>
                      <th className="p-3 border-b border-gray-700">Name</th>
                      <th className="p-3 border-b border-gray-700">Email</th>
                      <th className="p-3 border-b border-gray-700">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user, idx) => (
                        <tr
                          key={user._id || idx}
                          className="hover:bg-gray-800 transition text-gray-200"
                        >
                          <td className="p-3 border-b border-gray-700">{idx + 1}</td>
                          <td className="p-3 border-b border-gray-700">{user.name || "N/A"}</td>
                          <td className="p-3 border-b border-gray-700">{user.email}</td>
                          <td className="p-3 border-b border-gray-700">{getJoinDate(user)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-3 text-center text-gray-400 italic">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        <div
          className="bg-gray-900 p-6 rounded shadow border border-gray-800 mb-6 cursor-pointer"
          onClick={() => setShowWeeklyStats(!showWeeklyStats)}
        >
          <h2 className="text-lg font-semibold mb-4 flex justify-between">
            📈 Weekly Upload Stats
            <span className="text-sm text-gray-400">
              {showWeeklyStats ? "▼ Collapse" : "▶ Expand"}
            </span>
          </h2>
          {showWeeklyStats && <Bar data={chartData} />}
        </div>

        <div
          className="bg-gray-900 p-6 rounded shadow border border-gray-800 mb-6 cursor-pointer"
          onClick={() => setShowWeeklyByLang(!showWeeklyByLang)}
        >
          <h2 className="text-lg font-semibold mb-4 flex justify-between">
            🌍 Weekly Uploads by Language
            <span className="text-sm text-gray-400">
              {showWeeklyByLang ? "▼ Collapse" : "▶ Expand"}
            </span>
          </h2>
          {showWeeklyByLang && <Bar data={weeklyByLang} />}
        </div>

        {/* Movies by Language List */}
        <div
          className="bg-gray-900 p-6 rounded shadow border border-gray-800 mb-6 cursor-pointer"
          onClick={() => setShowMoviesByLang(!showMoviesByLang)}
        >
          <h2 className="text-lg font-semibold mb-4 flex justify-between">
            🎞 Movies by Language
            <span className="text-sm text-gray-400">
              {showMoviesByLang ? "▼ Collapse" : "▶ Expand"}
            </span>
          </h2>
          {showMoviesByLang && (
            <div className="space-y-4">
              {Object.entries(moviesByLanguage).map(([lang, list]) => (
                <div key={lang} className="bg-gray-800 p-4 rounded cursor-pointer">
                  <h3
                    className="font-semibold text-blue-400 mb-2 flex justify-between"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLang(lang);
                    }}
                  >
                    {lang} ({list.length})
                    <span className="text-sm text-gray-400">
                      {expandedLangs[lang] ? "▼ Collapse" : "▶ Expand"}
                    </span>
                  </h3>
                  {expandedLangs[lang] && (
                    <div className="flex flex-wrap gap-2">
                      {list.map((m) => (
                        <Link
                          to={`/movie/${m.id}`}
                          key={m.id}
                          className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-blue-600 transition"
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
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
