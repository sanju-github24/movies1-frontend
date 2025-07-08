import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { backendUrl } from '../utils/api';
import AdScriptLoader from "../components/AdScriptLoader"; // ✅ adjust path if needed
import { Helmet } from "react-helmet"; // ✅ Add this



const MovieDetail = () => {
  const { code } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!code) return;

      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', code)
        .maybeSingle();

      if (error) {
        console.error('Supabase fetch error:', error.message);
        setMovie(null);
      } else {
        setMovie(data);
      }

      setLoading(false);
    };

    fetchMovie();
  }, [code]);
  const handleDownload = async (url, filename, index) => {
    const proxyUrl = `${backendUrl}/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  
    // Step 1: Update Supabase download count
    try {
      const updatedDownloads = [...movie.downloads];
      updatedDownloads[index] = {
        ...updatedDownloads[index],
        count: (updatedDownloads[index].count || 0) + 1,
      };
  
      const { error } = await supabase
        .from("movies")
        .update({ downloads: updatedDownloads })
        .eq("id", movie.id);
  
      if (error) {
        console.error("❌ Supabase update failed:", error.message);
        alert("Failed to update download count.");
      } else {
        setMovie((prev) => ({ ...prev, downloads: updatedDownloads }));
      }
    } catch (err) {
      console.warn("⚠️ Download count update failed silently:", err.message);
    }
  
    // Step 2: Attempt download via proxy with fallback
    setTimeout(async () => {
      try {
        const response = await fetch(proxyUrl, { method: "GET" });
  
        if (!response.ok) {
          console.warn("⚠️ Proxy failed, falling back to direct URL...");
          window.location.href = url; // fallback to original
          return;
        }
  
        // Blob download (for full browser compatibility)
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
  
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("❌ Proxy fetch error:", err.message);
        // Fallback to direct link if fetch fails entirely
        window.location.href = url;
      }
    }, 300); // Delay for potential ads or loaders
  };
  
             
  
  

  if (loading) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  if (!movie) {
    return (
      <div className="text-center text-white mt-20">
        <h2 className="text-2xl font-bold">Movie Not Found</h2>
        <p className="text-sm text-gray-400 mt-2">
          The movie you are looking for does not exist or may have been removed.
        </p>
      </div>
    );
  }

  const firstDownload = movie.downloads?.[0];
  const topTitle = `${movie.title || ''} - ${firstDownload?.format || 'Format Unknown'}`;

  return (
    <div className="flex justify-center mt-4 px-2 sm:px-6 md:px-10 w-full bg-black">
      <Helmet>
        <title>{movie.title} - Movie Download | 1AnchorMovies</title>
        <meta
          name="description"
          content={`Download ${movie.title} in HD quality. Available in 480p, 720p, and 1080p. Fast and secure downloads on 1AnchorMovies.`}
        />
        <link
          rel="canonical"
          href={`https://www.1anchormovies.live/movie/${code}`}
        />
      </Helmet>
      <div className="bg-white text-black rounded-xl p-6 w-full max-w-7xl shadow-2xl">
  
        {/* Title */}
        <h1 className="text-center text-2xl sm:text-3xl md:text-4xl font-extrabold leading-snug text-black mb-3 break-words px-2">
          {topTitle}
        </h1>
        <AdScriptLoader />


        {/* ✅ Ad below title */}
      
  
        {/* Break line after title */}
        <hr className="border-t-2 border-gray-300 mb-6 w-1/2 mx-auto" />
  
        {/* Blue full-width bar inside white box */}
        <div className="w-full bg-blue-900 text-white text-sm sm:text-base px-4 sm:px-6 py-3 rounded-md shadow flex justify-between items-center mb-6">
          <span className="font-semibold">
             Posted {movie.created_at ? new Date(movie.created_at).toLocaleString() : "Unknown"}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("🔗 Link copied!");
            }}
            className="text-blue-100 hover:text-white transition"
          >
           Share
          </button>
        </div>
      
  
        {/* ...continue your movie content */}
  
        <hr className="border-t-2 border-gray-300 mb-6 w-1/2 mx-auto" />

<div className="flex justify-center mb-8">
  <img
    src={movie.poster || 'https://via.placeholder.com/400x600?text=No+Image'}
    alt={movie.title || 'Movie Poster'}
    className="rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl"
  />
</div>

<div className="bg-gray-100 border border-gray-300 p-4 rounded-md shadow text-center text-gray-800 mb-8">
  <h2 className="text-lg font-semibold tracking-wide">We’re Hiring Trusted Uploaders</h2>
  <p className="text-sm mt-1">Interested? Email us at <span className="underline">AnchorMovies@proton.me</span></p>
</div>


         {/* ✅ Optional Ad before downloads */}
        

        <div className="space-y-10">
  {movie.downloads?.map((download, index) => {
    const quality = download.quality || 'Unknown';
    const format = download.format || 'Unknown Format';
    const filename = `${quality}_${format}.torrent`.replace(/[^a-z0-9_\-\.]/gi, '_');

    return (
      <React.Fragment key={index}>
  <div className="bg-gray-100 border border-gray-300 p-6 rounded text-center text-[16px] text-black shadow-md "> 
    {/* Quality + Format */}
    <div className="font-semibold text-[15px] mb-2 text-gray-800">
      {quality} - {format}
    </div>
   
    


{/* Download Button */}
<button
  onClick={() => handleDownload(download.url, filename, index)}
  className="text-blue-800 underline hover:text-blue-900 text-[18px] font-bold"
>
  📥 {download.quality}
</button>
<AdScriptLoader />

<button
  onClick={() => {
    const originalUrl = download.url; // assuming this is the full public Wasabi URL
    navigator.clipboard.writeText(originalUrl);
    toast.success("✅ Original download link copied!");
  }}
  className="bg-gray-200 hover:bg-gray-300 text-black px-2 py-1 rounded text-sm"
>
  Copy Link
</button>

{/* Telegram Channel Message */}
<div className="mt-3 text-center text-sm text-gray-800">
  Stay updated with our latest uploads — <a
    href="https://t.me/AnchorMovies"
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-700 underline hover:text-blue-900"
  >
    join our Telegram channel
  </a>
</div>


<AdScriptLoader />






    {/* Direct Download Link */}
{download.directUrl && (
  <a
    href={download.directUrl}
    download={download.filename}
    className="block mt-2 text-sm text-blue-600 underline hover:text-blue-800"
  >
    ⬇️ Direct Download Link
  </a>
)}


    {/* Download Count */}
    <p className="text-[15px] text-gray-600 mt-2 mb-3">
      Downloads: <span className="font-medium">{download.count || 0}</span>
    </p>

    {/* 🔺 Red Seedr Notice with GIFs */}
<div className="flex items-center justify-center gap-3 mb-3">
  <img
    src="/clapping.gif"
    alt="Seed GIF"
    className="w-8 h-8 object-contain"
  />
  <p className="text-red-600 font-semibold text-[14px] text-center">
    🔺 Upload Back Here After Downloading Torrent File{' '}
    <a
      href="https://www.seedr.cc/?r=4619221"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-red-800"
    >
      https://www.seedr.cc
    </a>
  </p>
  <img
    src="/clapping.gif"
    alt="Seed GIF"
    className="w-8 h-8 object-contain"
  />
</div>

    {/* Magnet Link */}
    {download.magnet && (
      <a
        href={download.magnet}
        className="inline-block bg-red-300 hover:bg-red-500 text-black px-4 py-2 rounded font-semibold text-[15px] transition"
        target="_blank"
        rel="noopener noreferrer"
      >
        🧲 Magnet
      </a>
    )}
  </div>

  {/* Optional GIF */}
  {download.showGifAfter && (
    <div className="flex justify-center my-6">
      <img
        src="/torrent1.gif"
        alt="Torrent GIF"
        className="w-28 h-28 object-contain"
      />
    </div>
  )}
</React.Fragment>

    );
  })}

  {/* ✅ GP Links shown at the bottom */}
  {movie.downloads?.some((d) => d.gpLink) && (
    <div className="bg-gray-100 border border-gray-300 p-5 rounded text-black text-sm space-y-2 mt-6">
      <h3 className="font-semibold mb-2">GP Links:</h3>
      {movie.downloads
        .filter((d) => d.gpLink)
        .map((d, idx) => (
          <p key={idx}>
            <strong>{d.quality || d.size}:</strong>{" "}
            <a
              href={d.gpLink}
              className="text-blue-600 underline hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {d.gpLink}
            </a>
          </p>
        ))}
    </div>
  )}
</div>

{/* Footer - Community Join CTA */}
<div className="w-full max-w-7xl px-6 py-8 mt-12 bg-gradient-to-r from-black via-gray-900 to-black rounded-xl shadow-lg text-center border border-white/10">
  <h3 className="text-white text-xl sm:text-2xl font-bold flex justify-center items-center gap-2 mb-2">
    📢 Let's Build the <span className="text-blue-400">AnchorMovies</span> Community
  </h3>
  <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
    Got suggestions, cool ideas, or want to collaborate? <br className="hidden sm:block" />
    We’d love to hear from you — drop us a message at:
  </p>
  <p className="mt-3">
    <a
      href="mailto:AnchorMovies@proton.me"
      className="inline-block text-blue-400 font-medium hover:text-blue-300 underline text-sm sm:text-base transition"
    >
      AnchorMovies@proton.me
    </a>
  </p>
</div>


 

        </div>
      </div>
   
  );
};

export default MovieDetail;
