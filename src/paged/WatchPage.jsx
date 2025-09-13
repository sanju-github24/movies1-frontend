import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

// ✅ Parse BBCode for URL, IMG, video, and title
const parseBBCode = (code) => {
  if (!code) return { title: "", img: "", url: "" };

  const urlMatch = code.match(/\[URL=(.*?)\]/i);
  const url = urlMatch ? urlMatch[1] : "";

  const imgMatch = code.match(/\[IMG\](.*?)\[\/IMG\]/i);
  const img = imgMatch ? imgMatch[1] : "";

  // Remove BBCode to extract remaining text as title
  const title = code
    .replace(/\[URL=.*?\]|\[\/URL\]|\[IMG\].*?\[\/IMG\]/gi, "")
    .trim() || "Untitled";

  return { title, img, url };
};

const WatchHtmlPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [htmlCode, setHtmlCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [embedSrc, setEmbedSrc] = useState(null);
  const [title, setTitle] = useState("");
  const [coverImg, setCoverImg] = useState("");
  const [watchUrl, setWatchUrl] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("watch_html")
        .select("html_code, title, watchUrl")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error(error.message);
        setHtmlCode("<h2 class='text-red-500'>Not Found 🚫</h2>");
        setLoading(false);
        return;
      }

      const rawCode = data.html_code || "";
      setWatchUrl(data.watchUrl || ""); // ✅ store direct watch link if present

      // Detect BBCode
      if (rawCode.includes("[URL") || rawCode.includes("[IMG")) {
        const { title, img, url } = parseBBCode(rawCode);
        setTitle(title);
        setCoverImg(img);
        setHtmlCode(
          url
            ? `<iframe src="${url}" frameborder="0" allowfullscreen class="w-full h-full"></iframe>`
            : ""
        );
        setEmbedSrc(url || null);
      }
      // Detect raw iframe HTML
      else if (rawCode.includes("<iframe")) {
        setHtmlCode(rawCode);
        setEmbedSrc(rawCode.match(/src="([^"]+)"/i)?.[1] || null);
        setTitle(data.title || "Untitled");
      } else {
        // fallback plain text or HTML
        setHtmlCode(rawCode);
        setTitle(data.title || "Untitled");
      }

      document.title = (data.title || "Watch") + " | AnchorMovies";
      setLoading(false);
    };

    fetchData();
  }, [slug]);

  if (loading) return <p className="text-center mt-20">⏳ Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Desktop Navbar */}
      <div className="hidden sm:flex w-full bg-blue-700 text-white px-4 py-1 items-center justify-between sticky top-0 z-50 shadow">
        <Link to="/" className="shrink-0">
          <img src="/logo_3.png" alt="Logo" className="w-14 md:w-16 object-contain" />
        </Link>
        <ul className="flex gap-3 text-xs font-medium">
          <li>
            <Link to="/" className="hover:underline hover:text-blue-300">Home</Link>
          </li>
          <li>
            <Link to="/latest" className="hover:underline hover:text-blue-300">Latest Uploads</Link>
          </li>
          <li>
            <Link to="/blogs" className="hover:underline hover:text-blue-300">Blogs</Link>
          </li>
        </ul>
      </div>

      {/* Mobile Navbar */}
      <div className="sm:hidden sticky top-0 z-50">
        <Navbar />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow text-white font-medium transition"
        >
          ⬅ Previous Page
        </button>

        {/* Movie Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-yellow-400 mb-4 leading-snug">
          {title}
        </h1>

        {/* Cover Image */}
        {coverImg && (
          <div className="w-full flex justify-center mb-6">
            <img
              src={coverImg}
              alt={title}
              className="rounded-lg shadow-md max-h-80 object-contain"
            />
          </div>
        )}

{/* 🎬 Video Player OR Watch Link */}
<div className="w-full bg-black rounded-lg overflow-hidden mb-10 flex items-center justify-center h-[60vh] sm:aspect-video sm:h-auto">
  {embedSrc ? (
    // ✅ If we already detected an iframe/embed
    <iframe
      src={embedSrc}
      frameBorder="0"
      allowFullScreen
      className="w-full h-full rounded-lg"
    />
  ) : watchUrl ? (
    // ✅ Instead of showing link, embed it directly
    <iframe
      src={watchUrl}
      frameBorder="0"
      allowFullScreen
      className="w-full h-full rounded-lg"
    />
  ) : (
    // ✅ fallback for raw HTML or text
    <div
      className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
      dangerouslySetInnerHTML={{ __html: htmlCode }}
    />
  )}
</div>

      </div>
    </div>
  );
};

export default WatchHtmlPage;
