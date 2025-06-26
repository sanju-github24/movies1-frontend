import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    const { data, error } = await supabase.from("movies").select("*");
    if (!error) setMovies(data || []);
  };

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

  const totalCategories = [...new Set(movies.flatMap((m) => m.categories || []))].length;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto text-white p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">📊 Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-900 p-6 rounded shadow border border-gray-800">
            <h2 className="text-xl font-bold text-white">🎬 Total Movies</h2>
            <p className="text-3xl mt-2 text-blue-400 font-semibold">{movies.length}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded shadow border border-gray-800">
            <h2 className="text-xl font-bold text-white">📂 Total Categories</h2>
            <p className="text-3xl mt-2 text-green-400 font-semibold">{totalCategories}</p>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded shadow border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">📈 Weekly Upload Stats</h2>
          <Bar data={chartData} />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
