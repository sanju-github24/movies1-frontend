import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

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
        setHtmlCode(data.html_code);
        document.title = data.title + " | Watch";
      }
      setLoading(false);
    };

    fetchHtml();
  }, [slug]);

  if (loading) return <p className="text-center mt-20">⏳ Loading...</p>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-white">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg shadow text-white font-medium transition"
      >
        ⬅ Previous Page
      </button>

      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
        {/* Render raw HTML */}
        <div
          className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>video]:w-full [&>video]:h-full"
          dangerouslySetInnerHTML={{ __html: htmlCode }}
        />
      </div>
    </div>
  );
};

export default WatchHtmlPage;
