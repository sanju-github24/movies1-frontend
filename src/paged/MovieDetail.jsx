import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, Link } from "react-router-dom"; 
import { supabase } from "../utils/supabaseClient";
import { backendUrl } from "../utils/api";
import { Helmet } from "react-helmet";
import { AppContext } from "../context/AppContext";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";
// ✅ Import Icons for a more modern look
import { Download, Share2, MessageSquare, Trash2, Copy, Tv } from "lucide-react"; 
// Note: Film and Monitor icons removed based on request

const MovieDetail = () => {
  const { code } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  // Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  const { isLoggedIn, userData } = useContext(AppContext);

  // Fetch movie & comments
  useEffect(() => {
    const fetchMovie = async () => {
      if (!code) return;
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("slug", code)
        .maybeSingle();
      if (error) {
        console.error("Supabase fetch error:", error.message);
        setMovie(null);
      } else {
        setMovie(data);
        if (data?.id) fetchComments(data.id);
      }
      setLoading(false);
    };
    fetchMovie();
  }, [code]);

  const fetchComments = async (movieId) => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("movie_id", movieId)
      .order("created_at", { ascending: false });
    if (!error) setComments(data);
    else console.error("❌ Failed to fetch comments:", error.message);
  };

  const postComment = async () => {
    if (!newComment.trim()) return toast.error("Comment cannot be empty!");
    if (!isLoggedIn || !userData) return toast.error("Please log in first.");

    setCommentLoading(true);
    const comment = {
      id: uuidv4(),
      movie_id: movie.id,
      user_id: userData._id,
      username: userData.name || userData.email || "Anonymous",
      content: newComment.trim(),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("comments").insert([comment]);
    if (!error) {
      setComments([comment, ...comments]);
      setNewComment("");
      toast.success("✅ Comment posted!");
    } else {
      console.error("❌ Failed to post comment:", error.message);
      toast.error("Error posting comment");
    }
    setCommentLoading(false);
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("🗑 Comment deleted!");
    } else {
      console.error("❌ Failed to delete comment:", error.message);
      toast.error("Error deleting comment");
    }
  };

  const handleDownload = async (url, filename, index) => {
    const proxyUrl = `${backendUrl}/proxy-download?url=${encodeURIComponent(
      url
    )}&filename=${encodeURIComponent(filename)}`;
    try {
      // ⚠️ Note: Supabase update logic is kept but using direct download link in production might be preferred
      const updatedDownloads = [...movie.downloads];
      updatedDownloads[index] = {
        ...updatedDownloads[index],
        count: (updatedDownloads[index].count || 0) + 1,
      };
      await supabase
        .from("movies")
        .update({ downloads: updatedDownloads })
        .eq("id", movie.id);
      setMovie((prev) => ({ ...prev, downloads: updatedDownloads }));
    } catch (err) {
      console.warn("⚠️ Download count update failed:", err.message);
    }
    setTimeout(async () => {
      try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          window.location.href = url;
          return;
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback to direct URL if proxy fails completely
        window.location.href = url;
      }
    }, 300);
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !event.target.closest('button[onClick*="setShowEmojiPicker"]') // Added check for the emoji button itself
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // --- Loading & Not Found States ---
  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-blue-400">
          <svg className="animate-spin h-10 w-10 mx-auto mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-gray-300">Loading Movie Details...</p>
        </div>
      </div>
    );

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-950 text-center text-white pt-20">
        <h2 className="text-3xl font-bold text-red-500">Movie Not Found 🚫</h2>
        <p className="text-base text-gray-400 mt-2">
          The movie you are looking for does not exist or may have been removed.
        </p>
        <Link to="/" className="mt-4 inline-block text-blue-400 hover:text-blue-300 underline">
          Go to Homepage
        </Link>
      </div>
    );
  }

  // === SEO & Constants ===
  const qualities = movie.qualities?.join(", ") || "HD";
  const movieTitle = movie.year ? `${movie.title} (${movie.year})` : movie.title; // Cleaner title format
  const firstDownload = movie.downloads?.[0];
  const topTitle = `${movieTitle} - ${firstDownload?.format || "HD"} Download`;
  const metaDescription = `Download or watch ${movieTitle} in full HD (${qualities}). Fast and secure streaming available on 1TamilMV and AnchorMovies.`;
  const canonicalUrl = `https://www.1anchormovies.live/movie/${code}`;

  return (
    // Updated BG/Container for modern dark theme contrast
    <div className="flex justify-center w-full min-h-screen bg-gray-950 py-8 px-2 sm:px-6">
      {/* SEO */}
      <Helmet>
        <title>{movieTitle} Full HD Download | Watch Online | 1TamilMV & AnchorMovies</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${movieTitle} Full HD Download | 1TamilMV & AnchorMovies`} />
        {/* ... other meta tags ... */}
      </Helmet>

      {/* Movie Content */}
      <div className="bg-gray-800 text-white rounded-xl p-4 sm:p-6 w-full max-w-7xl shadow-2xl shadow-blue-900/50">
        
        {/* Main Title Block */}
        <h1 className="text-center text-xl sm:text-3xl font-extrabold mb-4 break-words leading-snug text-blue-400 border-b border-gray-700 pb-3">
          {topTitle}
        </h1>

        {/* Posted Date & Share Button */}
        <div className="w-full bg-gray-700 text-gray-300 text-xs sm:text-sm px-3 py-2 rounded-lg shadow flex justify-between items-center mb-6">
          <span>
            {/* Removed Film icon */}
            Posted on{" "}
            {movie.created_at ? new Date(movie.created_at).toLocaleDateString() : "Unknown"}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("🔗 Link copied!");
            }}
            className="text-blue-400 hover:text-white transition text-sm flex items-center gap-1.5 font-medium p-1 rounded-md hover:bg-blue-600/30"
          >
            <Share2 className="w-4 h-4" /> Share Page
          </button>
        </div>

        {/* Poster & Details */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={movie.poster || "https://via.placeholder.com/400x600?text=No+Image"}
            alt={movie.title || "Movie Poster"}
            className="rounded-xl shadow-2xl w-full max-w-xs border-4 border-blue-900"
          />
        </div>

        {/* Hiring Banner (Styled for dark theme) */}
        <div className="bg-blue-900/30 border border-blue-600 p-3 rounded-lg text-center text-blue-200 mb-6 text-sm shadow-inner">
          <h2 className="text-lg font-bold text-blue-400">We’re Hiring Trusted Uploaders</h2>
          <p className="mt-2">
            Interested? Email us at{" "}
            <a href="mailto:AnchorMovies@proton.me" className="underline font-semibold text-blue-300 hover:text-blue-100 break-all transition">
                AnchorMovies@proton.me
            </a>
          </p>
        </div>

        {/* Downloads Section */}
        <h2 className="text-2xl font-bold text-red-400 mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
            <Download className="w-6 h-6" /> Download Links
        </h2>
        <div className="space-y-6">
          {movie.downloads?.map((download, index) => {
            const quality = download.quality || "Unknown";
            const format = download.format || "Unknown Format";
            const filename = `${quality}_${format}_${movie.slug}.torrent`.replace(/[^a-z0-9_\-\.]/gi, "_");

            const isPlayable = /\.(mp4|webm|ogg|mp3|wav)$/i.test(download.url);
            let embedUrl = null;
            const ytMatch = download.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
            if (ytMatch) {
              embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
            }
            const isTorrent = /\.torrent$/i.test(download.url);
            const isMagnet = download.magnet;

            // ✅ ENHANCEMENT: Unified Download Box Styling
            return (
              <React.Fragment key={index}>
                <div className="bg-gray-700 border border-blue-700 p-4 rounded-lg shadow-xl shadow-gray-900/50 text-sm space-y-3">
                  {/* Quality + Format Header */}
                  <div className="font-extrabold text-lg mb-2 text-yellow-300 border-b border-gray-600 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        {/* Removed Monitor icon */}
                        {quality} 
                    </span>
                    <span className="bg-red-500 text-xs text-white px-2 py-0.5 rounded-full font-semibold">
                        {format}
                    </span>
                  </div>

                  {/* Media Content Area */}
                  {(embedUrl || isPlayable) && (
                      <div className="mb-4">
                          <p className="text-sm font-semibold mb-2 text-gray-300 flex items-center gap-1">
                              <Tv className="w-4 h-4" /> Watch/Preview:
                          </p>
                          {embedUrl ? (
                              <div className="mt-2 aspect-video">
                                <iframe
                                  src={embedUrl}
                                  title="YouTube video player"
                                  className="w-full h-full rounded-md shadow-lg"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  referrerPolicy="strict-origin-when-cross-origin"
                                  allowFullScreen
                                ></iframe>
                              </div>
                          ) : isPlayable ? (
                              <div className="mt-2">
                                  {/\.(mp4|webm|ogg)$/i.test(download.url) ? (
                                      <video src={download.url} controls className="w-full rounded-md shadow-lg" />
                                  ) : (
                                      <audio src={download.url} controls className="w-full rounded-md shadow-lg" />
                                  )}
                              </div>
                          ) : null}
                      </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap gap-3 justify-center pt-2 border-t border-gray-600">
                    
                    {/* Torrent / External Link */}
                    {isTorrent ? (
                      <button
                        onClick={() => handleDownload(download.url, filename, index)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition transform hover:scale-[1.02]"
                      >
                        <Download className="w-5 h-5"/> Download Torrent
                      </button>
                    ) : (
                      <a
                        href={download.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition transform hover:scale-[1.02]"
                      >
                        🌐 External Link
                      </a>
                    )}

                    {/* Magnet Link */}
                    {isMagnet && (
                      <a
                        href={download.magnet}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition transform hover:scale-[1.02]"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🧲 Magnet Link
                      </a>
                    )}
                    
                    {/* Direct Download */}
                    {download.directUrl && (
                        <a
                        href={download.directUrl}
                        download={download.filename}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition transform hover:scale-[1.02]"
                        >
                        ⬇️ Direct Download
                        {download.size && (
                            <span className="text-green-200 text-xs font-normal">
                            ({download.size})
                            </span>
                        )}
                        </a>
                    )}

                    {/* Copy Link */}
                    <button
                        onClick={() => {
                        navigator.clipboard.writeText(download.url);
                        toast.success("✅ Original download link copied!");
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                    >
                        <Copy className="w-4 h-4"/> Copy URL
                    </button>
                  </div>
                  
                  {/* Seedr Notice (Styled for dark theme) */}
                  {(isTorrent || isMagnet) && (
                    <div className="flex items-center justify-center my-2 pt-3 border-t border-gray-600">
                      <p className="text-gray-300 font-semibold text-xs text-center">
                        🙏 Please seed after downloading torrent/magnet via{" "}
                        <a
                          href="https://www.seedr.cc/?r=4619221"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-bold text-blue-400 hover:text-blue-300 transition"
                        >
                          Seedr
                        </a>
                        .
                      </p>
                    </div>
                  )}

                  {/* Telegram Link (Styled for dark theme) */}
                  <div className="mt-2 text-center text-xs text-gray-400">
                    Stay updated —{" "}
                    <a
                      href="https://t.me/AnchorMovies"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline hover:text-cyan-300 font-semibold transition"
                    >
                      join our Telegram Channel
                    </a>
                  </div>
                </div>

                {/* Optional GIF (Kept the logic) */}
                {download.showGifAfter && (
                  <div className="flex justify-center my-3">
                    <img
                      src="/torrent1.gif"
                      alt="Torrent GIF"
                      className="w-full max-w-[400px] h-auto object-contain rounded-md shadow-lg"
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* GP Links Section (Styled for dark theme) */}
        {movie.downloads?.some((d) => d.gpLink) && (
          <div className="bg-gray-700 border border-gray-600 p-4 rounded-lg text-white text-sm mt-8 shadow-lg">
            <h3 className="font-bold text-xl text-yellow-500 mb-3 border-b border-gray-600 pb-2">
                📂 GP Links (Premium)
            </h3>
            <div className="space-y-3">
              {movie.downloads
                .filter((d) => d.gpLink)
                .map((d, idx) => (
                  <div key={idx} className="flex flex-col items-start bg-gray-600 p-3 rounded-md">
                    <span className="font-semibold text-yellow-300 mb-1">{d.size || 'Link'}</span>
                    <a
                      href={d.gpLink}
                      className="text-blue-400 underline hover:text-blue-300 break-all text-xs sm:text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {d.gpLink}
                    </a>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <hr className="border-t-2 border-gray-700 my-10" />
        <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center flex items-center justify-center gap-2">
            <MessageSquare className="w-6 h-6"/> Community Comments
        </h2>

        <div className="max-w-2xl mx-auto w-full">
          {/* Comment List */}
          {comments.length > 0 ? (
            <div className="space-y-6 mb-8">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="border border-gray-600 rounded-lg overflow-hidden shadow-xl shadow-gray-900/40"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center px-4 py-2">
                    <span className="font-semibold text-sm sm:text-base">{c.username}</span>
                    <span className="text-xs text-blue-200">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col sm:flex-row p-4 bg-gray-700 items-start text-left">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold mb-3 sm:mb-0 sm:mr-4 flex-shrink-0">
                      {c.username?.charAt(0).toUpperCase()}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/\.(gif|jpg|jpeg|png)$/i.test(c.content.trim()) ? (
                        <img
                          src={c.content.trim()}
                          alt="User media"
                          className="max-w-xs rounded mt-1 sm:mt-0 max-h-48 object-contain"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap break-words mt-1 text-gray-200">
                          {c.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Admin Delete */}
                  {userData?.email === "sanjusanjay0444@gmail.com" && (
                    <div className="px-4 pb-3 bg-gray-700 text-right border-t border-gray-600">
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-red-500 hover:text-red-400 text-sm flex items-center justify-end gap-1 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-8 text-center">
              Be the first to leave a comment!
            </p>
          )}

          {/* Post Comment Form */}
          {isLoggedIn ? (
            <div className="flex flex-col gap-3 relative p-4 bg-gray-700 rounded-lg border border-gray-600">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={`Comment as ${userData.name || 'User'}...`}
                className="border border-gray-500 rounded p-3 w-full bg-gray-800 text-white focus:border-blue-500 outline-none resize-none"
                rows={3}
              />
              <div className="flex gap-3 justify-end items-center">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="bg-gray-500 px-3 py-2 rounded-lg hover:bg-gray-600 text-white transition flex items-center gap-1"
                >
                  {/* Removed Monitor icon */}
                  Emoji
                </button>
                <button
                  onClick={postComment}
                  disabled={commentLoading}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-500 font-semibold transition flex items-center gap-2"
                >
                  {commentLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Posting...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5"/> Post Comment
                    </>
                  )}
                </button>
              </div>
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-[105px] right-0 z-50 bg-gray-800 shadow-xl border border-gray-600 rounded-lg overflow-hidden max-w-[280px]"
                >
                  <EmojiPicker
                    onEmojiClick={(emojiObject) =>
                      setNewComment((prev) => prev + emojiObject.emoji)
                    }
                    width="100%"
                    theme="dark"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
              <p className="text-gray-300 mb-4">You must be logged in to post a comment.</p>
              <Link
                to="/login"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md shadow-lg hover:bg-blue-700 transition duration-200 font-semibold"
              >
                Log in to comment
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
};

export default MovieDetail;