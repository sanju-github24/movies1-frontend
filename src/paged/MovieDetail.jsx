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
        <h1 className="text-center text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 break-words px-2">
          {topTitle}
        </h1>

        {/* Posted date */}
        <div className="w-full bg-blue-900 text-white text-sm sm:text-base px-4 py-3 rounded-md shadow flex justify-between items-center mb-6">
          <span className="font-semibold">
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
            className="text-blue-100 hover:text-white transition"
          >
            Share
          </button>
        </div>

        {/* Poster */}
        <div className="flex justify-center mb-8">
          <img
            src={
              movie.poster ||
              "https://via.placeholder.com/400x600?text=No+Image"
            }
            alt={movie.title || "Movie Poster"}
            className="rounded-lg shadow-lg w-full max-w-md"
          />
        </div>

        {/* Downloads */}
        <div className="space-y-10">
          {movie.downloads?.map((download, index) => {
            const quality = download.quality || "Unknown";
            const format = download.format || "Unknown Format";
            const filename = `${quality}_${format}.torrent`.replace(
              /[^a-z0-9_\-\.]/gi,
              "_"
            );
            return (
              <div
                key={index}
                className="bg-gray-100 border border-gray-300 p-6 rounded text-center text-black shadow-md"
              >
                <div className="font-semibold text-sm mb-2 text-gray-800">
                  {quality} - {format}
                </div>
                <button
                  onClick={() => handleDownload(download.url, filename, index)}
                  className="text-blue-800 underline hover:text-blue-900 text-lg font-bold"
                >
                  📥 {download.quality}
                </button>
              </div>
            );
          })}
        </div>

  {/* Comments */}
<hr className="border-t-2 border-gray-300 my-8" />
<h2 className="text-xl font-bold text-black mb-4">💬 Comments</h2>

{comments.length > 0 ? (
  <div className="space-y-6 mb-6">
    {comments.map((c) => (
      <div key={c.id} className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">

        {/* Header bar */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white flex justify-between items-center px-4 py-2">
          <span className="font-semibold">{c.username}</span>
          <span className="text-sm">{new Date(c.created_at).toLocaleString()}</span>
        </div>

        <div className="flex p-4 bg-white">
          {/* Left: Avatar + info */}
          <div className="w-24 flex flex-col items-center text-center border-r border-gray-200 pr-4">
            <div className="w-16 h-16 rounded bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {c.username?.charAt(0).toUpperCase()}
            </div>
            
           
          </div>

          {/* Right: Comment */}
          <div className="flex-1 pl-4">
            {/\.(gif|jpg|jpeg|png)$/i.test(c.content.trim()) ? (
              <img
                src={c.content.trim()}
                alt="User GIF"
                className="max-w-xs rounded mt-1"
              />
            ) : (
              <p className="whitespace-pre-wrap break-words mt-1">{c.content}</p>
            )}
          </div>
        </div>

        {/* Admin delete */}
        {userData?.email === "sanjusanjay0444@gmail.com" && (
          <div className="px-4 pb-3 bg-white">
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
  <p className="text-sm text-gray-500 mb-6">No comments yet.</p>
)}

{/* Post comment */}
{isLoggedIn ? (
  <div className="flex flex-col gap-2 relative">
    <textarea
      value={newComment}
      onChange={(e) => setNewComment(e.target.value)}
      placeholder="Write your comment... (You can paste GIF URL too)"
      className="border border-gray-300 rounded p-2 w-full"
      rows={3}
    />
    <div className="flex gap-2">
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
        className="absolute bottom-[110%] left-0 z-50 bg-white shadow-lg border rounded-lg overflow-hidden max-w-[280px]"
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
  );
};

export default MovieDetail;
