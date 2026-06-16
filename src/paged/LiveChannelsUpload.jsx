import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";
import { AppContext } from "../context/AppContext";

const ADMIN_EMAIL = "sanjusanjay0444@gmail.com";

const _SK = "sx2025xjio";
function _xor(str, k) {
  let r = "";
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  return r;
}
function obf(s) {
  if (!s) return "";
  try {
    return btoa(_xor(unescape(encodeURIComponent(s)), _SK))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } catch { return btoa(s); }
}
function dob(s) {
  if (!s) return "";
  try {
    let t = s.replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    return decodeURIComponent(escape(_xor(atob(t), _SK)));
  } catch { try { return atob(s); } catch { return s; } }
}
function parseBundleUrl(bundleUrl) {
  try {
    const params = new URLSearchParams(new URL(bundleUrl).search);
    const encoded = params.get("bundle");
    if (!encoded) return null;
    const decoded = JSON.parse(dob(decodeURIComponent(encoded)));
    
    // Normalize: if ids-only format, fake a channels array with just names unknown
    // (count still works; names shown as IDs until resolved)
    if (decoded.ids && !decoded.channels) {
      decoded.channels = decoded.ids.map(id => ({ name: id, url: '' }));
    }
    return decoded;
  } catch { return null; }
}

// ── MODE within the single tab ────────────────────────────────────────────────
const MODE_SINGLE = "single";
const MODE_MERGE  = "merge";

const LiveChannelsUpload = () => {
  const { userData } = useContext(AppContext);
  const [sessionEmail, setSessionEmail] = useState("");

  // ── Single paste form ──────────────────────────────────────────────────────
  const [bundleName, setBundleName]       = useState("");
  const [bundleUrl, setBundleUrl]         = useState("");
  const [thumbnail, setThumbnail]         = useState("");
  const [category, setCategory]           = useState("Sports");
  const [isActive, setIsActive]           = useState(true);
  const [previewBundle, setPreviewBundle] = useState(null);

  // ── Merge (All Channels) mode ─────────────────────────────────────────────
  const [mode, setMode]                   = useState(MODE_SINGLE);
  const [mergeUrls, setMergeUrls]         = useState([{ id: 1, url: "" }]);
  const [mergeName, setMergeName]         = useState("");
  const [mergeThumb, setMergeThumb]       = useState("");
  const [mergeCat, setMergeCat]           = useState("Sports");
  const [mergeActive, setMergeActive]     = useState(true);
  const [mergePlayerUrl, setMergePlayerUrl] = useState("");
  const [mergeGeneratedUrl, setMergeGeneratedUrl] = useState("");

  // ── Shared ────────────────────────────────────────────────────────────────
  const [bundles, setBundles]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionEmail(session?.user?.email?.toLowerCase() || "");
    });
  }, []);

  const isAdmin = sessionEmail === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (isAdmin) fetchBundles();
  }, [isAdmin]);

  // ── decode single bundle URL ───────────────────────────────────────────────
  useEffect(() => {
    if (bundleUrl.trim()) {
      const p = parseBundleUrl(bundleUrl.trim());
      setPreviewBundle(p);
      if (p?.title && !bundleName) setBundleName(p.title);
    } else {
      setPreviewBundle(null);
    }
  }, [bundleUrl]);

  // ── derive parsed merge data — no useEffect, no state mutation loop ────
  const parsedMergeRows = mergeUrls.map((row) => ({
    ...row,
    parsed: row.url.trim() ? parseBundleUrl(row.url.trim()) : null,
  }));

  const mergePreview = (() => {
    const seen = new Set();
    const flat = [];
    parsedMergeRows.forEach(({ parsed }) => {
      parsed?.channels?.forEach((ch) => {
        if (!seen.has(ch.url)) { seen.add(ch.url); flat.push(ch); }
      });
    });
    return flat;
  })();

  // auto-fill player base URL once from first valid merge entry
  useEffect(() => {
    if (mergePlayerUrl) return;
    const firstValidUrl = mergeUrls.find((r) => r.url.trim())?.url;
    if (!firstValidUrl) return;
    try {
      const u = new URL(firstValidUrl);
      setMergePlayerUrl(`${u.origin}${u.pathname}`);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeUrls]);

  // ─────────────────────────────────────────────────────────────────────────
  const fetchBundles = async () => {
    const { data, error } = await supabase
      .from("live_channel_bundles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load bundles"); return; }
    setBundles(data || []);
  };

  // ── SUBMIT single paste ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bundleName.trim()) return toast.error("Bundle name is required");
    if (!bundleUrl.trim())  return toast.error("Bundle URL is required");
    if (!previewBundle)     return toast.error("Invalid bundle URL — could not decode channels");

    setLoading(true);
    const payload = {
      name: bundleName.trim(),
      bundle_url: bundleUrl.trim(),
      thumbnail: thumbnail.trim() || null,
      category: category.trim() || "Sports",
      is_active: isActive,
      channel_count: previewBundle?.channels?.length || 0,
      uploaded_by: userData?.email || sessionEmail || "admin",
    };

    const { error } = editingId
      ? await supabase.from("live_channel_bundles").update(payload).eq("id", editingId)
      : await supabase.from("live_channel_bundles").insert([payload]);

    if (error) { toast.error(editingId ? "Update failed" : "Upload failed"); console.error(error); }
    else { toast.success(editingId ? "Bundle updated ✅" : "Bundle added ✅"); resetForm(); fetchBundles(); }
    setLoading(false);
  };

  // ── SUBMIT merge (All Channels) ───────────────────────────────────────────
  const handleMergeSubmit = async () => {
    if (!mergeName.trim())        return toast.error("Bundle name is required");
    if (mergePreview.length === 0) return toast.error("No valid channels found in the pasted URLs");
    if (!mergePlayerUrl.trim())   return toast.error("StreamX player base URL is required");

    const channels = mergePreview.map((ch) => ({
      name: ch.name, url: ch.url,
      keyId: ch.keyId || "", key: ch.key || "",
      cookie: ch.cookie || "", logo: ch.logo || "",
    }));

    const payloadStr = JSON.stringify({ title: mergeName, channels });
    const encoded    = obf(payloadStr);
    const finalUrl   = `${mergePlayerUrl.replace(/\/$/, "")}?bundle=${encodeURIComponent(encoded)}`;
    setMergeGeneratedUrl(finalUrl);

    setLoading(true);
    const { error } = await supabase.from("live_channel_bundles").insert([{
      name: mergeName.trim(),
      bundle_url: finalUrl,
      thumbnail: mergeThumb.trim() || null,
      category: mergeCat,
      is_active: mergeActive,
      channel_count: channels.length,
      uploaded_by: userData?.email || sessionEmail || "admin",
    }]);
    if (error) { toast.error("Save failed"); console.error(error); }
    else { toast.success(`Merged bundle "${mergeName}" saved with ${channels.length} channels ✅`); fetchBundles(); }
    setLoading(false);
  };

  // ── Merge URL row helpers ─────────────────────────────────────────────────
  const addMergeRow = () =>
    setMergeUrls((prev) => [...prev, { id: Date.now(), url: "" }]);

  const removeMergeRow = (id) =>
    setMergeUrls((prev) => prev.filter((r) => r.id !== id));

  const updateMergeUrl = (id, val) =>
    setMergeUrls((prev) => prev.map((r) => r.id === id ? { ...r, url: val } : r));

  // ── EDIT ──────────────────────────────────────────────────────────────────
  const handleEdit = (b) => {
    setEditingId(b.id);
    setBundleName(b.name);
    setBundleUrl(b.bundle_url);
    setThumbnail(b.thumbnail || "");
    setCategory(b.category || "Sports");
    setIsActive(b.is_active ?? true);
    setMode(MODE_SINGLE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── DELETE ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bundle?")) return;
    const { error } = await supabase.from("live_channel_bundles").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Deleted"); fetchBundles(); }
  };

  const handleToggleActive = async (b) => {
    const { error } = await supabase.from("live_channel_bundles").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) toast.error("Toggle failed");
    else fetchBundles();
  };

  const resetForm = () => {
    setEditingId(null); setBundleName(""); setBundleUrl(""); setThumbnail("");
    setCategory("Sports"); setIsActive(true); setPreviewBundle(null);
  };

  // ── GUARD ─────────────────────────────────────────────────────────────────
  if (!isAdmin && sessionEmail) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-red-900/20 border border-red-600 rounded-2xl p-10 text-center max-w-sm">
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-gray-400 text-sm">Only the site admin can manage live channel bundles.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!sessionEmail) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto text-white">
        <h1 className="text-2xl font-bold mb-6">📺 Live Channel Bundles</h1>

        {/* ── MODE TOGGLE ── */}
        <div className="flex border border-gray-700 rounded-xl overflow-hidden mb-6">
          <button
            onClick={() => { setMode(MODE_SINGLE); resetForm(); }}
            className={`flex-1 py-3 text-sm font-semibold transition ${mode === MODE_SINGLE ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}
          >
            🔗 Paste Bundle URL
          </button>
          <button
            onClick={() => setMode(MODE_MERGE)}
            className={`flex-1 py-3 text-sm font-semibold transition ${mode === MODE_MERGE ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}
          >
            🔀 All Channels (Merge URLs)
          </button>
        </div>

        {/* ══════════════════════════════════════ MODE: SINGLE PASTE */}
        {mode === MODE_SINGLE && (
          <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-xl border border-gray-800">
            <div>
              <label className="text-xs text-gray-400 mb-1 block uppercase tracking-widest">Bundle Name *</label>
              <input
                type="text"
                placeholder="e.g. Star Sports Pack"
                className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block uppercase tracking-widest">
                Bundle URL * <span className="text-blue-400 normal-case">(from StreamX sidebar)</span>
              </label>
              <textarea
                rows={3}
                placeholder="https://your-streamx.com/player.html?bundle=..."
                className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none font-mono text-xs resize-none"
                value={bundleUrl}
                onChange={(e) => setBundleUrl(e.target.value)}
              />
              {bundleUrl && (
                <div className={`mt-2 p-3 rounded-lg text-xs border ${previewBundle ? "bg-green-900/20 border-green-700" : "bg-red-900/20 border-red-700"}`}>
                  {previewBundle ? (
                    <>
                      <p className="text-green-400 font-semibold mb-1">✅ Valid — {previewBundle.channels?.length || 0} channels</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewBundle.channels?.slice(0, 8).map((ch, i) => (
                          <span key={i} className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{ch.name}</span>
                        ))}
                        {previewBundle.channels?.length > 8 && (
                          <span className="text-gray-500">+{previewBundle.channels.length - 8} more</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-red-400">⚠ Could not decode this URL</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block uppercase tracking-widest">Thumbnail URL (optional)</label>
              <input
                type="text"
                placeholder="https://..."
                className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
              />
              {thumbnail && (
                <img src={thumbnail} alt="thumb" className="mt-2 h-14 w-24 object-cover rounded-lg border border-gray-700" onError={(e) => e.target.style.display = "none"} />
              )}
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block uppercase tracking-widest">Category</label>
                <select
                  className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {["Sports", "News", "Entertainment", "Movies", "Kids", "Music", "Other"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end pb-1">
                <label className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Active</label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-14 h-7 rounded-full relative transition-colors ${isActive ? "bg-green-600" : "bg-gray-600"}`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${isActive ? "left-7" : "left-0.5"}`} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !previewBundle}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold text-lg transition-colors"
            >
              {loading
                ? (editingId ? "Updating..." : "Uploading...")
                : (editingId ? "✅ Update Bundle" : "📤 Upload Bundle")}
            </button>
          </form>
        )}

        {editingId && (
          <button onClick={resetForm} className="mt-3 text-sm underline text-gray-400 hover:text-red-400">
            Cancel Edit
          </button>
        )}

        {/* ══════════════════════════════════════ MODE: MERGE (ALL CHANNELS) */}
        {mode === MODE_MERGE && (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-5">
            <p className="text-sm text-gray-400">
              Paste multiple bundle URLs below. All channels will be merged (duplicates removed) into one new bundle and saved to Supabase.
            </p>

            {/* URL rows */}
            <div className="space-y-3">
              {parsedMergeRows.map((row, index) => (
                <div key={row.id}>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Bundle URL {index + 1}</label>
                      <textarea
                        rows={2}
                        placeholder="https://your-streamx.com/player.html?bundle=..."
                        className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none font-mono text-xs resize-none"
                        value={row.url}
                        onChange={(e) => updateMergeUrl(row.id, e.target.value)}
                      />
                    </div>
                    {mergeUrls.length > 1 && (
                      <button
                        onClick={() => removeMergeRow(row.id)}
                        className="mt-6 text-red-500 hover:text-red-400 text-lg px-2"
                        title="Remove this URL"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {/* inline status for this row */}
                  {row.url.trim() && (
                    <div className={`mt-1.5 px-3 py-1.5 rounded-lg text-xs border ${row.parsed ? "bg-green-900/20 border-green-800 text-green-400" : "bg-red-900/20 border-red-800 text-red-400"}`}>
                      {row.parsed
                        ? `✅ ${row.parsed.channels?.length || 0} channels — ${row.parsed.title || "untitled"}`
                        : "⚠ Could not decode this URL"}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addMergeRow}
              className="text-sm px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition"
            >
              + Add Another URL
            </button>

            {/* Merged preview */}
            {mergePreview.length > 0 && (
              <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-xl">
                <p className="text-sm font-semibold text-blue-300 mb-2">
                  🔀 {mergePreview.length} unique channels across {mergeUrls.filter((r) => r.parsed).length} valid bundle(s)
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {mergePreview.map((ch, i) => (
                    <span key={i} className="text-xs bg-gray-700 text-gray-300 border border-gray-600 px-2 py-0.5 rounded-full">
                      {ch.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bundle details */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
              <div>
                <label className="text-xs text-gray-400 mb-1 block uppercase tracking-widest">Merged Bundle Name *</label>
                <input
                  type="text"
                  placeholder="e.g. All Channels Mega Pack"
                  className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                  value={mergeName}
                  onChange={(e) => setMergeName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block uppercase tracking-widest">StreamX Player Base URL *</label>
                <input
                  type="text"
                  placeholder="https://your-site.com/streamx.html"
                  className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none font-mono text-xs"
                  value={mergePlayerUrl}
                  onChange={(e) => setMergePlayerUrl(e.target.value)}
                />
                <p className="text-xs text-gray-600 mt-1">Your StreamX player HTML file URL — without query params. Auto-filled from first valid URL.</p>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block uppercase tracking-widest">Thumbnail URL (optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                  value={mergeThumb}
                  onChange={(e) => setMergeThumb(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block uppercase tracking-widest">Category</label>
                  <select
                    className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 outline-none"
                    value={mergeCat}
                    onChange={(e) => setMergeCat(e.target.value)}
                  >
                    {["Sports", "News", "Entertainment", "Movies", "Kids", "Music", "Other"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Active</label>
                  <button
                    type="button"
                    onClick={() => setMergeActive(!mergeActive)}
                    className={`w-14 h-7 rounded-full relative transition-colors ${mergeActive ? "bg-green-600" : "bg-gray-600"}`}
                  >
                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${mergeActive ? "left-7" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleMergeSubmit}
                disabled={loading || mergePreview.length === 0}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold text-lg transition-colors"
              >
                {loading ? "Saving..." : `🔀 Merge & Save Bundle (${mergePreview.length} channels)`}
              </button>

              {mergeGeneratedUrl && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs text-green-400 mb-2 font-semibold">Generated URL (also saved to Supabase):</p>
                  <p className="font-mono text-xs text-gray-400 break-all">{mergeGeneratedUrl}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(mergeGeneratedUrl); toast.success("Copied!"); }}
                    className="mt-2 text-xs px-3 py-1 bg-blue-600 rounded-full"
                  >
                    📋 Copy URL
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════ SAVED BUNDLES LIST */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">📡 Saved Bundles ({bundles.length})</h2>
          {bundles.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-gray-900 rounded-xl border border-gray-800">
              No bundles yet. Paste a URL above or merge multiple URLs.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bundles.map((b) => {
                const parsed    = parseBundleUrl(b.bundle_url);
                const isExpanded = expandedId === b.id;
                return (
                  <div
                    key={b.id}
                    className={`bg-gray-900 rounded-xl border ${b.is_active ? "border-gray-700" : "border-gray-800 opacity-60"} overflow-hidden`}
                  >
                    <div className="flex items-center gap-3 p-4">
                      {b.thumbnail ? (
                        <img
                          src={b.thumbnail}
                          alt={b.name}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-700 flex-shrink-0"
                          onError={(e) => e.target.style.display = "none"}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-xl flex-shrink-0">📺</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white truncate">{b.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800">{b.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${b.is_active ? "bg-green-900/30 text-green-400 border-green-800" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                            {b.is_active ? "🟢 Active" : "⚫ Off"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {b.channel_count} channels · {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <button onClick={() => setExpandedId(isExpanded ? null : b.id)} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg">{isExpanded ? "▲" : "▼"}</button>
                        <button onClick={() => handleToggleActive(b)} className={`text-xs px-2 py-1 rounded-lg ${b.is_active ? "bg-yellow-700 hover:bg-yellow-600" : "bg-green-700 hover:bg-green-600"}`}>{b.is_active ? "Off" : "On"}</button>
                        <button onClick={() => { navigator.clipboard.writeText(b.bundle_url); toast.success("Copied!"); }} className="text-xs px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded-lg">📋</button>
                        <button onClick={() => handleEdit(b)} className="text-xs px-2 py-1 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg">✏️</button>
                        <button onClick={() => handleDelete(b.id)} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded-lg">🗑️</button>
                      </div>
                    </div>
                    {isExpanded && parsed?.channels?.length > 0 && (
                      <div className="border-t border-gray-800 px-4 py-3">
                        <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Channels</p>
                        <div className="flex flex-wrap gap-2">
                          {parsed.channels.map((ch, i) => (
                            <span key={i} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-1 rounded-full">{ch.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SQL hint */}
        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-500">
          <p className="font-semibold text-gray-400 mb-2">📋 Supabase table: <code className="text-blue-400">live_channel_bundles</code></p>
          <pre className="bg-black p-3 rounded-lg overflow-x-auto text-green-400 leading-relaxed">{`create table live_channel_bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bundle_url text not null,
  thumbnail text,
  category text default 'Sports',
  is_active boolean default true,
  channel_count int default 0,
  uploaded_by text,
  created_at timestamptz default now()
);`}</pre>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LiveChannelsUpload;
