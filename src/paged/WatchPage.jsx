import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

const WatchHtmlPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [embedSrc, setEmbedSrc] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("watch_html")
          .select("html_code, title")
          .eq("slug", slug)
          .single();

        if (error) {
          console.error(error.message);
          setTitle("Not Found 🚫");
          setLoading(false);
          return;
        }

        const rawCode = data.html_code || "";
        const iframeSrc = rawCode.match(/src="([^"]+)"/i)?.[1] || null;

        setEmbedSrc(iframeSrc);
        setTitle(data.title || "Untitled");

        document.title = (data.title || "Watch") + " | AnchorMovies";
      } catch (err) {
        console.error("Unexpected fetch error:", err);
        setTitle("Error 🚫");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (loading) return <p className="text-center mt-20">⏳ Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ✅ Desktop Navbar */}
      <div className="hidden sm:flex w-full bg-blue-700 text-white px-4 py-2 items-center justify-between sticky top-0 z-50 shadow">
        <Link to="/" className="shrink-0">
          <img src="/logo_3.png" alt="Logo" className="w-14 md:w-16 object-contain" />
        </Link>
        <ul className="flex gap-4 text-sm font-medium">
          <li><Link to="/" className="hover:underline hover:text-blue-300">Home</Link></li>
          <li><Link to="/latest" className="hover:underline hover:text-blue-300">Latest Uploads</Link></li>
          <li><Link to="/blogs" className="hover:underline hover:text-blue-300">Blogs</Link></li>
        </ul>
      </div>

      {/* ✅ Mobile Navbar */}
      <div className="sm:hidden sticky top-0 z-50">
        <Navbar />
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-5 sm:mb-6 w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow text-white font-medium transition text-sm sm:text-base"
        >
          ⬅ Previous Page
        </button>

        {/* Movie Title */}
        <h1 className="text-xl sm:text-3xl font-bold text-center text-yellow-400 mb-4 sm:mb-6 leading-snug px-2">
          {title}
        </h1>

        {/* 🎬 Video Player */}
        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden mb-8 sm:mb-10 flex items-center justify-center">
          {embedSrc ? (
            <iframe
              src={embedSrc}
              frameBorder="0"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
              className="w-full h-full rounded-lg"
            />
          ) : (
            <p className="text-gray-400 text-sm sm:text-base">⚠ No video available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchHtmlPage;
