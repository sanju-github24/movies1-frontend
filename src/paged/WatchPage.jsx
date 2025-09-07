import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

const WatchHtmlPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [htmlCode, setHtmlCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHtml = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("watch_html")
        .select("html_code, title")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error(error.message);
        setHtmlCode("<h2 class='text-red-500'>Not Found 🚫</h2>");
      } else {
        setHtmlCode(data.html_code || "");
        document.title = data.title + " | Watch";
      }
      setLoading(false);
    };

    fetchHtml();
  }, [slug]);

  if (loading) return <p className="text-center mt-20">⏳ Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Desktop Navbar */}
      <div className="hidden sm:flex w-full bg-blue-700 text-white px-4 py-1.5 items-center justify-between sticky top-0 z-50 shadow">
        <Link to="/" className="shrink-0">
          <img
            src="/logo_3.png"
            alt="Logo"
            className="w-16 md:w-20 object-contain"
          />
        </Link>
        <ul className="flex gap-3 text-xs font-medium">
          <li>
            <Link
              to="/"
              className="hover:underline hover:text-blue-300 transition-colors"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/latest"
              className="hover:underline hover:text-blue-300 transition-colors"
            >
              Latest Uploads
            </Link>
          </li>
          <li>
            <Link
              to="/blogs"
              className="hover:underline hover:text-blue-300 transition-colors"
            >
              Blogs
            </Link>
          </li>
        </ul>
      </div>
  
      {/* Mobile Navbar */}
      <div className="sm:hidden sticky top-0 z-50">
        <Navbar />
      </div>
  
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow text-white font-medium transition"
        >
          ⬅ Previous Page
        </button>

        {/* Player 1 */}
<h2 className="text-2xl font-bold text-center text-blue-400 mb-4">
  🎬 Player 1
</h2>
<div className="w-full aspect-video bg-black rounded-lg overflow-hidden mb-10">
  <div
    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>video]:w-full [&>video]:h-full"
    dangerouslySetInnerHTML={{ __html: htmlCode }}
  />
</div>

{/* Player 2 */}
<h2 className="text-2xl font-bold text-center text-green-400 mb-4">
  🎥 Player 2
</h2>
<div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
  <div
    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>video]:w-full [&>video]:h-full"
    dangerouslySetInnerHTML={{ __html: htmlCode }}
  />
</div>

      </div>
    </div>
  );
};

export default WatchHtmlPage;
