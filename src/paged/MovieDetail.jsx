import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { backendUrl } from "../utils/api";
import { Helmet } from "react-helmet";
import { AppContext } from "../context/AppContext";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";

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
        window.location.href = url;
      }
    }, 300);
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  if (loading)
    return <div className="text-white text-center mt-20">Loading...</div>;

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
  const topTitle = `${movie.title || ""} - ${
    firstDownload?.format || "Format Unknown"
  }`;

  return (
    <div className="flex justify-center mt-4 px-2 sm:px-6 md:px-10 w-full bg-black">
    <Helmet>
  {/* Page Title */}
  <title>Download {movie.title} - Watch Online | AnchorMovies</title>

  {/* Meta Description */}
  <meta
    name="description"
    content={`Download ${movie.title} in HD (${movie.qualities?.join(', ')}). Fast and secure downloads on AnchorMovies.`}
  />

  {/* Canonical URL */}
  <link
    rel="canonical"
    href={`https://www.1anchormovies.live/movie/${code}`}
  />

  {/* Open Graph for Facebook / WhatsApp */}
  <meta property="og:title" content={`Download ${movie.title} - Watch Online`} />
  <meta
    property="og:description"
    content={`Download ${movie.title} in multiple qualities: ${movie.qualities?.join(', ')}. Available now on AnchorMovies.`}
  />
  <meta property="og:type" content="website" />
  <meta
    property="og:url"
    content={`https://www.1anchormovies.live/movie/${code}`}
  />
  <meta property="og:site_name" content="AnchorMovies" />
  {movie.poster && <meta property="og:image" content={movie.poster} />}

  {/* Twitter Cards */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={`Download ${movie.title} - Watch Online`} />
  <meta
    name="twitter:description"
    content={`Download ${movie.title} in HD (${movie.qualities?.join(', ')}). Available on AnchorMovies.`}
  />
  {movie.poster && <meta name="twitter:image" content={movie.poster} />}
</Helmet>

  
      <div className="bg-white text-black rounded-xl p-6 w-full max-w-7xl shadow-2xl">
{/* Title */}
<h1 className="text-center text-lg sm:text-xl md:text-2xl font-bold mb-2 break-words leading-snug px-1">
  {topTitle}
</h1>

{/* Posted date */}
<div className="w-full bg-blue-900 text-white text-xs sm:text-sm px-2 py-1 rounded-md shadow flex justify-between items-center mb-3">
  <span>
    Posted{" "}
    {movie.created_at
      ? new Date(movie.created_at).toLocaleString()
      : "Unknown"}
  </span>
  <button
    onClick={() => {
      navigator.clipboard.writeText(window.location.href);
      toast.success("🔗 Link copied!");
    }}
    className="text-blue-100 hover:text-white transition text-xs"
  >
    Share
  </button>
</div>

{/* Poster */}
<div className="flex justify-center mb-4">
  <img
    src={
      movie.poster ||
      "https://via.placeholder.com/400x600?text=No+Image"
    }
    alt={movie.title || "Movie Poster"}
    className="rounded-md shadow-md w-full max-w-xs"
  />
</div>

{/* Hiring Banner */}
<div className="bg-gray-100 border border-gray-300 p-2 rounded text-center text-gray-800 mb-4 text-xs">
  <h2 className="text-sm font-semibold">We’re Hiring Trusted Uploaders</h2>
  <p className="mt-1">
    Interested? Email us at{" "}
    <span className="underline">AnchorMovies@proton.me</span>
  </p>
</div>

{/* Torrent Animation */}
<div className="flex justify-center my-3">
  <img
    src="/torrent1.gif"
    alt="Torrent Animation"
    className="w-full max-w-[400px] h-auto object-contain rounded-md shadow"
  />
</div>

{/* Downloads */}
<div className="space-y-5">
  {movie.downloads?.map((download, index) => {
    const quality = download.quality || "Unknown";
    const format = download.format || "Unknown Format";
    const filename = `${quality}_${format}.torrent`.replace(
      /[^a-z0-9_\-\.]/gi,
      "_"
    );

    return (
      <React.Fragment key={index}>
        <div className="bg-gray-50 border border-gray-300 p-3 rounded text-center text-xs sm:text-sm text-black shadow-sm">
          {/* Quality + Format */}
          <div className="font-semibold text-sm mb-1 text-gray-800">
            {quality} - {format}
          </div>

          {/* Download Button */}
          <button
            onClick={() => handleDownload(download.url, filename, index)}
            className="text-blue-700 underline hover:text-blue-900 text-sm font-semibold"
          >
            📥 {download.quality}
          </button>

          {/* Copy Link */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(download.url);
              toast.success("✅ Original download link copied!");
            }}
            className="bg-gray-200 hover:bg-gray-300 text-black px-2 py-0.5 rounded text-xs ml-1"
          >
            Copy
          </button>

          {/* Telegram Link */}
          <div className="mt-2 text-center text-xs text-gray-700">
            Stay updated —{" "}
            <a
              href="https://t.me/AnchorMovies"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              join our Telegram
            </a>
          </div>

          {/* Direct Download */}
{download.directUrl && (
  <a
    href={download.directUrl}
    download={download.filename}
    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition"
  >
    ⬇️ Direct Download
    {download.size && (
      <span className="text-gray-200 text-[10px] font-normal">
        ({download.size})
      </span>
    )}
  </a>
)}


          {/* Seedr Notice */}
          <div className="flex items-center justify-center gap-2 my-2">
            <img src="/clapping.gif" alt="Seed GIF" className="w-6 h-6" />
            <p className="text-red-600 font-semibold text-[11px] text-center">
              🔺 Upload back here after downloading torrent —{" "}
              <a
                href="https://www.seedr.cc/?r=4619221"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-800"
              >
                seedr.cc
              </a>
            </p>
            <img src="/clapping.gif" alt="Seed GIF" className="w-6 h-6" />
          </div>

          {/* Magnet Link */}
          {download.magnet && (
            <a
              href={download.magnet}
              className="inline-block bg-red-300 hover:bg-red-500 text-black px-2 py-1 rounded font-semibold text-xs transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              🧲 Magnet
            </a>
          )}
        </div>

        {/* Optional GIF */}
        {download.showGifAfter && (
          <div className="flex justify-center my-3">
            <img
              src="/torrent1.gif"
              alt="Torrent GIF"
              className="w-full max-w-[400px] h-auto object-contain rounded-md shadow"
            />
          </div>
        )}
      </React.Fragment>
    );
  })}

  {/* GP Links */}
{movie.downloads?.some((d) => d.gpLink) && (
  <div className="bg-gray-50 border border-gray-300 p-4 rounded text-black text-xs mt-4 text-center">
    <h3 className="font-semibold text-sm mb-3">GP Links:</h3>
    <div className="space-y-2">
      {movie.downloads
        .filter((d) => d.gpLink)
        .map((d, idx) => (
          <p key={idx} className="flex flex-col items-center">
            <span className="font-semibold">{d.size}</span>
            <a
              href={d.gpLink}
              className="text-blue-600 underline hover:text-blue-800 break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {d.gpLink}
            </a>
          </p>
        ))}
    </div>
  </div>
  )}
</div>


{/* Comments */}
<hr className="border-t-2 border-gray-300 my-8" />
<h2 className="text-xl font-bold text-black mb-6 text-center">💬 Comments</h2>

<div className="max-w-2xl mx-auto w-full">
  {comments.length > 0 ? (
    <div className="space-y-6 mb-6">
      {comments.map((c) => (
        <div
          key={c.id}
          className="border border-gray-300 rounded-lg overflow-hidden shadow-sm"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white flex justify-between items-center px-4 py-2">
            <span className="font-semibold">{c.username}</span>
            <span className="text-sm">
              {new Date(c.created_at).toLocaleString()}
            </span>
          </div>

          {/* Body */}
          <div className="flex flex-col sm:flex-row p-4 bg-white items-center sm:items-start text-center sm:text-left">
            <div className="w-16 h-16 rounded bg-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-3 sm:mb-0 sm:mr-4">
              {c.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              {/\.(gif|jpg|jpeg|png)$/i.test(c.content.trim()) ? (
                <img
                  src={c.content.trim()}
                  alt="User GIF"
                  className="max-w-xs rounded mt-1 mx-auto sm:mx-0"
                />
              ) : (
                <p className="whitespace-pre-wrap break-words mt-1">
                  {c.content}
                </p>
              )}
            </div>
          </div>

          {/* Admin Delete */}
          {userData?.email === "sanjusanjay0444@gmail.com" && (
            <div className="px-4 pb-3 bg-white text-right">
              <button
                onClick={() => deleteComment(c.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                🗑 Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-gray-500 mb-6 text-center">
      No comments yet.
    </p>
  )}

  {/* Post Comment */}
  {isLoggedIn ? (
    <div className="flex flex-col gap-2 relative">
      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Write your comment..."
        className="border border-gray-300 rounded p-2 w-full"
        rows={3}
      />
      <div className="flex gap-2 justify-center">
        <button
          onClick={postComment}
          disabled={commentLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {commentLoading ? "Posting..." : "Post Comment"}
        </button>
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
        >
          😀 Emoji
        </button>
      </div>
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-[110%] left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg border rounded-lg overflow-hidden max-w-[280px]"
        >
          <EmojiPicker
            onEmojiClick={(emojiObject) =>
              setNewComment((prev) => prev + emojiObject.emoji)
            }
            width="100%"
          />
        </div>
      )}
    </div>
  ) : (
    <div className="text-center mt-6">
      <a
        href="/login"
        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition duration-200"
      >
        Log in to comment
      </a>
    </div>
  )}
</div>
      </div>
    </div>
  );
  
};

export default MovieDetail;
