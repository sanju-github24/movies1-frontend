import React, { useEffect, useState, useContext } from "react";
// Assuming you have a standard 'supabaseClient' setup for production
import { supabase } from "../utils/supabaseClient"; 
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import AdminLayout from "./AdminLayout";

// NOTE: Since I cannot import external libraries like 'react-quill' or 'tinymce',
// this component will use a placeholder for the HTML editor.
// You must install and replace the <QuillEditorPlaceholder /> with a real component.

const BlogEditor = () => {
  const { userData } = useContext(AppContext);
  const [form, setForm] = useState({
    title: "",
    tags: "",
    related_movie_ids: "", // Comma-separated string of IDs
    is_trending: false,
  });

  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blogContent, setBlogContent] = useState(""); 
  
  const [blogs, setBlogs] = useState([]);
  const [movies, setMovies] = useState([]);
  const [movieSearch, setMovieSearch] = useState(""); 

  useEffect(() => {
    fetchMovies();
    fetchBlogs();
  }, []);

  // --- Data Fetching ---
  const fetchMovies = async () => {
    const { data, error } = await supabase.from("watch_html").select("id, title, slug, cover_poster");
    if (error) toast.error("Failed to fetch movies");
    else setMovies(data || []);
  };

  const fetchBlogs = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch blogs");
    else setBlogs(data || []);
  };
  
  // --- Gemini API Handler ---
  const handleGenerateContent = async () => {
    
    // 1. Validate Selected Movies
    const relatedIds = form.related_movie_ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (relatedIds.length === 0) {
        toast.error("Please select at least one movie to generate content about. (Use Ctrl/Cmd+Click in the box below)");
        return;
    }
    
    // 2. Get Selected Movie Details
    const selectedMovies = movies
        .filter(m => relatedIds.includes(String(m.id)))
        .map(m => ({ 
            id: m.id, 
            title: m.title, 
            slug: m.slug, 
            cover_poster: m.cover_poster 
        }));

    if (selectedMovies.length === 0) {
        toast.error("Selected movies could not be found in the database list.");
        return;
    }

    // ⭐ CRITICAL UPDATE: Auto-set title if empty
    let finalBlogTitle = form.title.trim();
    if (!finalBlogTitle) {
        // Use the title of the first selected movie as the default title
        finalBlogTitle = `Blog Review: ${selectedMovies[0].title}`;
        
        // Update the state so the user sees the generated title in the input box
        setForm(prevForm => ({ 
            ...prevForm, 
            title: finalBlogTitle 
        }));
        toast.info(`Blog Title set to: "${finalBlogTitle}"`);
    }

    setIsGenerating(true);
    setBlogContent(""); // Clear previous content

    try {
        // 🎯 Call the new Express/Gemini Endpoint
        const response = await fetch('/api/gemini/generate-blog', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                // FIX: Change back to 'movieTitle' to match the backend's required field name
                movieTitle: finalBlogTitle, 
                selectedMovies: selectedMovies, 
                tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
            }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            toast.success("✨ Content generated successfully!");
            // Set the generated HTML content directly to the state
            setBlogContent(data.content); 
        } else {
            // Log the specific error from the server
            toast.error(`AI Generation Failed: ${data.error || 'Server error.'}`);
            console.error('AI Generation Error:', data.error);
        }
    } catch (error) {
        toast.error("Network error during content generation.");
        console.error("Network or Fetch Error:", error);
    } finally {
        setIsGenerating(false);
    }
  };

  // --- Payload and Submission ---
  const generateBlogPayload = (movieIds, title, tags, isTrending) => {
    const idArray = Array.isArray(movieIds) ? movieIds : String(movieIds).split(',').map(id => id.trim()).filter(Boolean);
    // Ensure we filter based on string ID array
    const selectedMovies = movies.filter((m) => idArray.includes(String(m.id))); 

    if (selectedMovies.length === 0) return null;

    const firstMovie = selectedMovies[0];

    let finalContent = blogContent; 
    
    // Fallback content if no content was generated or manually entered
    if (!finalContent) {
        finalContent = selectedMovies
          .map(
            (m) => `
<h2>${m.title}</h2>
<a href="/watch/${m.slug}">
  <img src="${m.cover_poster}" alt="${m.title}" style="width:200px;border-radius:8px;"/>
</a>
<p>Watch Here: <a href="/watch/${m.slug}">${m.title}</a></p>
<hr/>
`
          )
          .join("\n");
        toast.info("Using default movie links content as no AI draft was present.");
    }
    
    return {
      title,
      // Use the slug of the first movie as the blog slug
      slug: firstMovie.slug, 
      content: finalContent, // This is the HTML content from the editor/AI
      tags,
      related_movie_ids: idArray,
      is_trending: isTrending,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if title is empty at submission time
    if (!form.title.trim()) {
      toast.error("Blog Title is required for final submission.");
      return;
    }

    if (!blogContent && form.related_movie_ids.length === 0) {
        toast.error("Please generate content or select a movie to use the default payload.");
        return;
    }

    const related_movie_ids = form.related_movie_ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = generateBlogPayload(
      related_movie_ids,
      form.title,
      tags,
      form.is_trending
    );
    if (!payload) {
      toast.error("Error creating blog payload: Selected movies not found in data. Make sure you select at least one movie.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("blogs").insert([payload]);
    setLoading(false);

    if (error) toast.error("Error saving blog: " + error.message);
    else {
      toast.success("✅ Blog created successfully!");
      setForm({ title: "", tags: "", related_movie_ids: "", is_trending: false });
      setBlogContent(""); 
      setMovieSearch(""); 
      fetchBlogs();
    }
  };

  // Delete blog
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this blog?")) return; 
    const { error } = await supabase.from("blogs").delete().eq("id", id);
    if (error) toast.error("Failed to delete blog");
    else {
      toast.success("🗑 Blog deleted");
      fetchBlogs();
    }
  };

  const filteredMovies = movies.filter((movie) =>
    movie.title.toLowerCase().includes(movieSearch.toLowerCase())
  );
  
  const handleMovieSelectChange = (e) => {
    const selectedIds = Array.from(e.target.selectedOptions).map((o) => o.value);
    setForm({
      ...form,
      related_movie_ids: selectedIds.join(","),
    });
  };

  // Helper function to get selected movie titles for display feedback
  const getSelectedMovieTitles = () => {
    const relatedIds = form.related_movie_ids.split(",").filter(Boolean);
    return movies
      .filter(m => relatedIds.includes(String(m.id)))
      .map(m => m.title);
  };

  // Simple modal replacement for window.confirm
  const confirm = (message) => {
      return window.prompt(message + ' (Type "yes" to confirm)')?.toLowerCase() === 'yes';
  };


  // --- Component Render ---
  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto text-white">
        <h1 className="text-3xl font-extrabold mb-6 text-yellow-500">
          📝 AI-Powered Blog Creator
        </h1>
        <hr className="border-gray-700 mb-8" />

        {/* Blog Creation Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 mb-12 bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800"
        >
          {/* Title & Tags */}
          <input
            type="text"
            placeholder="Blog Title (e.g., 'The Rise of South Indian Cinema'). AUTO-FILLED if empty on generate."
            className="w-full p-4 rounded-lg bg-gray-800 text-white placeholder-gray-400 text-lg border border-gray-700 focus:border-blue-500 transition"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <input
            type="text"
            placeholder="Tags (e.g., action, tamil, review, trending)"
            className="w-full p-4 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:border-blue-500 transition"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />

          {/* Movie Selector (for related_movie_ids) */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold mb-3">1. Select Related Movies (REQUIRED for AI context and Blog Slug)</h3>
            <input
              type="text"
              placeholder="Search Movies to Filter..."
              className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400 border border-yellow-500/50 focus:border-yellow-400 transition mb-3"
              value={movieSearch}
              onChange={(e) => setMovieSearch(e.target.value)}
            />

            <select
              multiple
              // Ensure we bind the multi-select value correctly
              value={form.related_movie_ids.split(",").filter(Boolean)} 
              onChange={handleMovieSelectChange}
              className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400 h-40 border border-gray-700 focus:border-blue-500"
              size={filteredMovies.length < 5 ? 5 : 10}
            >
              {filteredMovies.map((m) => (
                // Important: Ensure value is a string if m.id can be a number
                <option key={m.id} value={String(m.id)} className="p-2 hover:bg-blue-600 cursor-pointer transition">
                  {m.title}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-400 mt-2">
              Showing **{filteredMovies.length}** of **{movies.length}** movies. **Click** or use **Ctrl/Cmd + Click** to select items from the box above.
            </p>
            
            {/* ⭐ Selection Feedback */}
            {getSelectedMovieTitles().length > 0 && (
                <div className="mt-3 p-3 bg-gray-700 rounded-lg border border-green-500/50">
                    <p className="text-sm font-semibold text-green-400 mb-1">
                        Selected Movies ({getSelectedMovieTitles().length}):
                    </p>
                    <p className="text-xs text-gray-300 italic">
                        {getSelectedMovieTitles().join(', ')}
                    </p>
                </div>
            )}
          </div>
          
          {/* AI Content Generation Block - REPLACED WITH HTML EDITOR AREA */}
          <div className="pt-2">
            <h3 className="text-lg font-semibold mb-3">2. AI Content Draft (HTML Editor)</h3>
            
            {/* ⭐ CRITICAL CHANGE: This is where you would place your actual HTML editor component 
              (e.g., <QuillEditor theme="snow" value={blogContent} onChange={setBlogContent} />)
              
              I am replacing the simple textarea with a div containing an instruction 
              and a custom-styled textarea to represent the editor's functionality.
            */}
            <div className="relative border border-gray-700 rounded-lg overflow-hidden">
                {/* Placeholder for a true rich text editor */}
                <div className="p-2 bg-gray-700 text-sm text-gray-300 font-semibold border-b border-gray-600">
                    Rich Text Editor Toolbar Placeholder (e.g., Bold, Italic, Link, Image)
                </div>
                
                <textarea
                  placeholder="AI content will appear here. Edit/format the HTML as needed before saving. NOTE: The AI will generate content based on the movies selected in Step 1."
                  className="w-full p-4 rounded-b-lg bg-gray-800 text-white placeholder-gray-500 h-64 focus:border-green-500 resize-y font-mono text-sm"
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  // The underlying textarea now holds the HTML content
                />
            </div>


            <button
              type="button"
              onClick={handleGenerateContent}
              // Button is disabled only if movie selection is missing
              disabled={isGenerating || getSelectedMovieTitles().length === 0} 
              className="mt-3 w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-bold transition disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Content...
                </>
              ) : (
                <>
                  <span role="img" aria-label="gemini">♊</span> Generate Content with AI (Auto-fills Title)
                </>
              )}
            </button>
          </div>

          {/* Submission and Options */}
          <div className="flex items-center space-x-4 border-t border-gray-700 pt-6">
            <input
              type="checkbox"
              id="isTrending"
              checked={form.is_trending}
              onChange={(e) =>
                setForm({ ...form, is_trending: e.target.checked })
              }
              className="form-checkbox h-5 w-5 text-yellow-600 bg-gray-700 border-gray-600 rounded"
            />
            <label htmlFor="isTrending" className="text-lg cursor-pointer">
              Mark as Trending
            </label>
            
            <button
              type="submit"
              disabled={loading || isGenerating}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold text-lg transition disabled:opacity-50 ml-auto"
            >
              {loading ? "Saving Blog..." : "3. 💾 Save Final Blog"}
            </button>
          </div>
        </form>
        
        {/* --- Display Existing Blogs --- */}
        <hr className="border-gray-700 mb-8" />
        <h2 className="text-2xl font-bold mb-4">📚 Existing Blogs ({blogs.length})</h2>
        {blogs.length === 0 ? (
          <p className="text-gray-400">No blogs found.</p>
        ) : (
          <div className="space-y-4">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-gray-800 p-4 rounded-xl shadow border border-gray-700"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-semibold flex items-center gap-3">
                    {blog.title}
                    {blog.is_trending && (
                      <span className="bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        TRENDING
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-400">Slug: {blog.slug}</span>
                    <span className="text-xs text-gray-500">ID: {blog.id}</span>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-b border-gray-700 py-3">
                    <p className="text-gray-400 text-xs mb-1">Content Preview (Scrollable):</p>
                    <div
                      className="text-gray-300 text-sm max-h-32 overflow-y-auto bg-gray-900 p-3 rounded"
                      dangerouslySetInnerHTML={{ __html: blog.content.substring(0, 300) + (blog.content.length > 300 ? '...' : '') }}
                    />
                </div>
                
                <button
                  onClick={() => handleDelete(blog.id)}
                  className="mt-3 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm text-white font-medium transition"
                >
                  🗑 Delete Blog
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default BlogEditor;