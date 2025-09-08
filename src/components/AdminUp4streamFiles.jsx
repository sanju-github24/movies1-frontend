import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import Hls from "hls.js";
import { AppContext } from "../context/AppContext";

const AdminUp4streamFiles = () => {
  const { backendUrl } = useContext(AppContext);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [directLink, setDirectLink] = useState(null);
  const [error, setError] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // ✅ Fetch files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${backendUrl}/api/up4stream/files`);
        setFiles(res.data?.files || []);
      } catch (err) {
        console.error("Fetch files error:", err);
        setError("❌ Failed to fetch files from backend");
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [backendUrl]);

  // ✅ Fetch direct link
  const getDirectLink = async (file) => {
    setSelectedFile(file);
    setDirectLink(null);
    setError(null);

    try {
      const res = await axios.get(
        `${backendUrl}/api/up4stream/direct-link/${file.file_code}`
      );

      if (res.data?.hls || res.data?.versions?.length > 0) {
        setDirectLink(res.data);
      } else {
        setError("⚠️ No direct links available for this file");
      }
    } catch (err) {
      console.error("Direct link fetch error:", err);
      setError("❌ Failed to fetch direct link");
    }
  };

// ✅ Setup HLS / MP4 playback
useEffect(() => {
  if (!videoRef.current || !directLink) return;

  // Clean up previous HLS instance
  if (hlsRef.current) {
    hlsRef.current.destroy();
    hlsRef.current = null;
  }

  const video = videoRef.current;

  if (directLink.hls) {
    // Use the real HLS URL directly
    const hlsUrl = directLink.hls;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn("HLS.js error:", data);
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
          }
        }
      });

      hls.on(Hls.Events.BUFFER_STALLED, () => setIsBuffering(true));
      hls.on(Hls.Events.BUFFER_APPENDED, () => setIsBuffering(false));
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
    }
  } else if (directLink.versions?.length > 0) {
    // Fallback MP4
    const mp4Url = directLink.versions[0].direct_url; // use real direct URL
    video.src = mp4Url;
  }

  video.load();

  return () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };
}, [directLink]);


  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">📂 Up4Stream Files</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-600 text-white rounded">{error}</div>
      )}

      {loading ? (
        <p className="text-center mt-10">⏳ Loading files...</p>
      ) : files.length === 0 ? (
        <p className="text-center mt-6 text-gray-400">No files found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.file_code}
              className="border border-gray-700 bg-gray-900 text-white p-3 rounded shadow flex flex-col"
            >
              {file.thumbnail ? (
                <img
                  src={file.thumbnail}
                  alt={file.title}
                  className="w-full h-40 object-cover rounded mb-2"
                />
              ) : (
                <div className="w-full h-40 bg-gray-700 rounded mb-2 flex items-center justify-center text-gray-300">
                  No Thumbnail
                </div>
              )}

              <h3 className="font-semibold line-clamp-2">{file.title}</h3>
              <p className="text-sm">⏱ {file.length} sec</p>
              <p className="text-xs text-gray-400">📅 {file.uploaded}</p>

              <button
                onClick={() => getDirectLink(file)}
                className="mt-3 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
              >
                🔗 Get Links
              </button>
            </div>
          ))}
        </div>
      )}

      {directLink && selectedFile && (
        <div className="mt-6 p-4 border border-gray-700 rounded bg-gray-800 text-white">
          <h3 className="font-bold mb-2">
            🎬 Now Playing: {selectedFile.title}
          </h3>

          <div className="relative mb-4">
            <video
              ref={videoRef}
              controls
              playsInline
              className="w-full max-h-[70vh] rounded bg-black"
              poster={selectedFile.thumbnail}
            />
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* ✅ MP4 Versions with Proxy & Direct Links */}
          {directLink.versions?.length > 0 && (
            <div>
              <p className="mt-2 font-semibold">📥 MP4 Versions:</p>
              <ul className="list-disc pl-6">
                {directLink.versions.map((v) => (
                  <li key={v.name} className="mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                      <span className="font-medium">
                        {v.name} – {Math.round(v.size / 1024 / 1024)} MB
                      </span>
                      <div className="flex gap-3 mt-1 sm:mt-0">
                        <a
                          href={`${backendUrl}${v.proxy_url}`}
                          className="text-blue-400 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Proxy Download
                        </a>
                        <a
                          href={v.direct_url}
                          className="text-green-400 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Direct Download
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUp4streamFiles;
