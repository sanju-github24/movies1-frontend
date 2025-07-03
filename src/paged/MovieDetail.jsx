import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { backendUrl } from '../utils/api';
import PopAdsScript from './components/PopAdsScript';

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
    const fullUrl = `${backendUrl}/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  
    // Inject popunder script (Adsterra style)
    const popScript = document.createElement("script");
    popScript.setAttribute("type", "text/javascript");
    popScript.setAttribute("data-cfasync", "false");
    popScript.innerHTML = `
      (function(){
        var y = window,
          m = "de033b8b0a1b1bea98c61d517231eb70",
          f = [
            ["siteId",395 - 729 - 162 + 5215416],
            ["minBid",0],
            ["popundersPerIP","0"],
            ["delayBetween",0],
            ["default",false],
            ["defaultPerDay",0],
            ["topmostLayer","auto"]
          ],
          i = [
            "d3d3LmJldHRlcmFkc3lzdGVtLmNvbS9oanF1ZXJ5LnRlcm1pbmFsLm1pbi5jc3M=",
            "ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvckovZ3J4ZGIuYnJvd3NlcmlmeS5taW4uanM="
          ],
          g = -1,
          c,
          n,
          k = function() {
            clearTimeout(n);
            g++;
            if(i[g] && !(1777437954000 < (new Date).getTime() && 1 < g)) {
              c = y.document.createElement("script");
              c.type = "text/javascript";
              c.async = true;
              var q = y.document.getElementsByTagName("script")[0];
              c.src = "https://" + atob(i[g]);
              c.crossOrigin = "anonymous";
              c.onerror = k;
              c.onload = function() {
                clearTimeout(n);
                y[m.slice(0,16)+m.slice(0,16)] || k();
              };
              n = setTimeout(k, 5000);
              q.parentNode.insertBefore(c, q);
            }
          };
        if(!y[m]) {
          try {
            Object.freeze(y[m] = f);
          } catch(e) {}
          k();
        }
      })();
    `;
    document.body.appendChild(popScript);
  
    // Update download count in Supabase
    const updatedDownloads = [...movie.downloads];
    updatedDownloads[index] = {
      ...updatedDownloads[index],
      count: (updatedDownloads[index].count || 0) + 1,
    };
  
    const { error } = await supabase
      .from('movies')
      .update({ downloads: updatedDownloads })
      .eq('id', movie.id);
  
    if (error) {
      console.error("❌ Supabase update failed:", error.message);
      alert("Failed to update download count.");
    } else {
      setMovie((prev) => ({ ...prev, downloads: updatedDownloads }));
    }
  
    // Trigger download after slight delay to allow ad to load
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = fullUrl;
      a.setAttribute("download", filename);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 300); // 300ms delay
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
      <div className="bg-white text-black rounded-xl p-6 w-full max-w-7xl shadow-2xl">
  
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 break-words leading-snug px-2">
          {topTitle}
        </h1>
        <PopAdsScript />


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
  <PopAdsScript />

  <button
  onClick={() => {
    const safeLink = `${window.location.origin}/dl/${download.id}`;
    navigator.clipboard.writeText(safeLink);
    toast.success("✅ Safe download link copied!");
  }}
  className="bg-gray-200 hover:bg-gray-300 text-black px-2 py-1 rounded text-sm"
>
  Copy Link
</button>







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
    🔺 Seed Back Here After Downloading {' '}
    <a
      href="https://www.seedr.cc/"
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

 

        </div>
      </div>
   
  );
};

export default MovieDetail;
