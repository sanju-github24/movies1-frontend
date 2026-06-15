import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";

// ── XOR helpers ───────────────────────────────────────────────────────────────
const _SK = "sx2025xjio";
function _xor(str, k) {
  let r = "";
  for (let i = 0; i < str.length; i++)
    r += String.fromCharCode(str.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  return r;
}
function obf(s) {
  if (!s) return "";
  try { return btoa(_xor(unescape(encodeURIComponent(s)), _SK)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); }
  catch { return btoa(s); }
}
function dob(s) {
  if (!s) return "";
  try { let t = s.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return decodeURIComponent(escape(_xor(atob(t), _SK))); }
  catch { try { return atob(s); } catch { return s; } }
}
function parseBundleUrl(bundleUrl) {
  try {
    const params = new URLSearchParams(new URL(bundleUrl).search);
    const encoded = params.get("bundle");
    if (!encoded) return null;
    return JSON.parse(dob(decodeURIComponent(encoded)));
  } catch { return null; }
}
function buildChannelUrl(basePlayerUrl, channel) {
  const params = new URLSearchParams();
  params.set("src", obf(channel.url));
  params.set("t",   obf(channel.name || ""));
  if (channel.keyId)  params.set("k1", obf(channel.keyId));
  if (channel.key)    params.set("k2", obf(channel.key));
  if (channel.cookie) params.set("k3", obf(channel.cookie));
  if (channel.logo)   params.set("lg", obf(channel.logo));
  return `${basePlayerUrl}?${params}`;
}
function extractBaseUrl(bundleUrl) {
  try { const u = new URL(bundleUrl); return `${u.origin}${u.pathname}`; }
  catch { return bundleUrl.split("?")[0]; }
}

// ── Logo sources ──────────────────────────────────────────────────────────────
const OLD_JSON = "https://binge-giotv.pages.dev/data/id.json";
const NEW_JSON  = "https://jtv-proxy.sanjusanjay0444.workers.dev/";

async function fetchLogoMap() {
  const map = {};
  try {
    const [r1, r2] = await Promise.allSettled([
      fetch(OLD_JSON + "?_=" + Date.now()).then((r) => (r.ok ? r.json() : null)),
      fetch(NEW_JSON  + "?_=" + Date.now()).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (r1.status === "fulfilled" && r1.value) {
      const raw = Array.isArray(r1.value) ? r1.value : (r1.value.channels || []);
      raw.forEach((ch) => { if (ch.name && ch.logo) map[ch.name.trim()] = ch.logo; });
    }
    if (r2.status === "fulfilled" && r2.value) {
      const raw = Array.isArray(r2.value) ? r2.value : (r2.value.channels || []);
      raw.forEach((ch) => { const n = ch.channel_name?.trim(); if (n && ch.channel_logo) map[n] = ch.channel_logo; });
    }
  } catch (e) { console.warn("fetchLogoMap failed", e); }
  return map;
}

function enrichChannels(channels, logoMap) {
  return channels.map((ch) => ({ ...ch, logo: ch.logo || logoMap[ch.name?.trim()] || "" }));
}

// ── Category config ───────────────────────────────────────────────────────────
const CAT_CONFIG = {
  Sports:        { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", icon: "🏏" },
  News:          { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  icon: "📰" },
  Entertainment: { color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", icon: "🎬" },
  Movies:        { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", icon: "🎥" },
  Kids:          { color: "#ec4899", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.3)", icon: "🧸" },
  Music:         { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", icon: "🎵" },
  Other:         { color: "#6b7280", bg: "rgba(107,114,128,0.12)",border: "rgba(107,114,128,0.3)",icon: "📺" },
};
function getCat(cat) { return CAT_CONFIG[cat] || CAT_CONFIG.Other; }

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const LiveChannelsPage = () => {
  const navigate = useNavigate();

  const [bundles, setBundles]         = useState([]);
  const [allChannels, setAllChannels] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [logoMap, setLogoMap]         = useState({});

  const [activeBundle, setActiveBundle]         = useState(null);
  const [activeBundleMeta, setActiveBundleMeta] = useState(null);
  const [activeChannel, setActiveChannel]       = useState(null);
  const [playerUrl, setPlayerUrl]               = useState("");
  const [iframeLoading, setIframeLoading]       = useState(false);
  const [channelListOpen, setChannelListOpen]   = useState(false);

  const [searchTerm, setSearchTerm]         = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchFocused, setSearchFocused]   = useState(false);

  const iframeRef     = useRef(null);
  const playerRef     = useRef(null);
  const searchRef     = useRef(null);

  useEffect(() => {
    fetchLogoMap().then((map) => { setLogoMap(map); fetchBundles(map); });
  }, []);

  const fetchBundles = async (map = logoMap) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("live_channel_bundles").select("*").eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    const rows = data || [];
    setBundles(rows);
    const flat = [];
    rows.forEach((row) => {
      const parsed = parseBundleUrl(row.bundle_url);
      if (parsed?.channels) {
        const enriched = enrichChannels(parsed.channels, map);
        enriched.forEach((ch) => flat.push({ ...ch, _bundleMeta: row, _parsedBundle: { ...parsed, channels: enriched } }));
      }
    });
    setAllChannels(flat);
    setLoading(false);
  };

  const categories = ["All", ...Array.from(new Set(bundles.map((b) => b.category).filter(Boolean)))];

  const filteredBundles = bundles.filter((b) => {
    const matchCat    = activeCategory === "All" || b.category === activeCategory;
    const matchSearch = !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });
  const filteredChannels = allChannels.filter((ch) => {
    const matchCat    = activeCategory === "All" || ch._bundleMeta?.category === activeCategory;
    const matchSearch = !searchTerm || ch.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const playChannel = useCallback((ch, bundleMeta, parsedBundle) => {
    const base = extractBaseUrl(bundleMeta.bundle_url);
    const url = buildChannelUrl(base, ch);
    setActiveBundle(parsedBundle);
    setActiveBundleMeta(bundleMeta);
    setActiveChannel(ch);
    setPlayerUrl(url);
    setIframeLoading(true);
    setChannelListOpen(false);
    // Smooth scroll to player
    setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  const playBundle = (row) => {
    const parsed = parseBundleUrl(row.bundle_url);
    if (!parsed?.channels?.length) return;
    const enriched = enrichChannels(parsed.channels, logoMap);
    playChannel(enriched[0], row, { ...parsed, channels: enriched });
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, border: "3px solid rgba(255,255,255,0.08)", borderTop: "3px solid #e53e3e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, letterSpacing: "0.05em" }}>Loading channels…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const catInfo = activeChannel ? getCat(activeBundleMeta?.category) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .ch-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important; }
        .ch-card { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease !important; }
        .cat-pill:hover { opacity: 0.85; transform: scale(0.97); }
        .cat-pill { transition: opacity 0.12s, transform 0.12s; }
        .strip-ch:hover { background: rgba(255,255,255,0.08) !important; }
        .strip-ch { transition: background 0.12s; }
        .watch-btn:hover { transform: scale(1.03); filter: brightness(1.1); }
        .watch-btn { transition: transform 0.15s, filter 0.15s; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }
        * { box-sizing: border-box; }
        .nav-search:focus { outline: none; border-color: rgba(229,62,62,0.6) !important; background: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,8,16,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 20px", height: 60,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        {/* Back */}
        <button onClick={() => navigate(-1)} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer",
          width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "background 0.15s, color 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#e53e3e",
            animation: "pulse 2s ease infinite", flexShrink: 0,
          }} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Live TV</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#e53e3e",
            background: "rgba(229,62,62,0.12)", border: "1px solid rgba(229,62,62,0.25)",
            padding: "1px 7px", borderRadius: 20, letterSpacing: "0.06em",
          }}>LIVE</span>
        </div>

        {/* Channel count pill */}
        {allChannels.length > 0 && (
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)", padding: "3px 10px", borderRadius: 20,
            flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}>
              <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
            </svg>
            {allChannels.length} channels
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 260, width: "100%" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            ref={searchRef}
            className="nav-search"
            type="text"
            placeholder="Search channels…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", color: "#fff",
              borderRadius: 24, padding: "8px 36px 8px 36px",
              fontSize: 13, fontFamily: "inherit", transition: "border-color 0.2s, background 0.2s",
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)",
              width: 18, height: 18, borderRadius: "50%", cursor: "pointer", fontSize: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          )}
        </div>
      </nav>

      {/* ══ PLAYER ZONE ═════════════════════════════════════════════════════════ */}
      {playerUrl && (
        <div ref={playerRef} style={{ background: "#000", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

          {/* 16:9 iframe */}
          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000" }}>
            {iframeLoading && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", background: "#000", zIndex: 5, gap: 12,
              }}>
                <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.08)", borderTop: "3px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Loading stream…</span>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={playerUrl}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              title={activeChannel?.name || "Live TV"}
              onLoad={() => setIframeLoading(false)}
            />
          </div>

          {/* Now-playing bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", gap: 12,
            background: "rgba(0,0,0,0.6)", borderTop: `1px solid ${catInfo?.border || "rgba(255,255,255,0.06)"}`,
          }}>
            {/* Left: logo + name + badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
              {activeChannel?.logo ? (
                <img src={activeChannel.logo} alt={activeChannel.name}
                  style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }}
                  onError={(e) => e.target.style.display = "none"} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: catInfo?.bg, border: `1px solid ${catInfo?.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  {getCat(activeBundleMeta?.category).icon}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e53e3e", animation: "pulse 1.5s ease infinite", flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                    {activeChannel?.name}
                  </span>
                </div>
                {activeBundleMeta && (
                  <div style={{ fontSize: 11, color: catInfo?.color, marginTop: 1 }}>
                    {getCat(activeBundleMeta.category).icon} {activeBundleMeta.category}
                  </div>
                )}
              </div>
            </div>

            {/* Right: channel list toggle */}
            <button
              onClick={() => setChannelListOpen(!channelListOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                background: channelListOpen ? "rgba(229,62,62,0.15)" : "rgba(255,255,255,0.06)",
                border: channelListOpen ? "1px solid rgba(229,62,62,0.35)" : "1px solid rgba(255,255,255,0.1)",
                color: channelListOpen ? "#e53e3e" : "rgba(255,255,255,0.7)",
                borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
              </svg>
              {activeBundle?.channels?.length} channels
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ transform: channelListOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
          </div>

          {/* Channel list drawer */}
          {channelListOpen && activeBundle?.channels && (
            <div style={{ background: "rgba(6,6,12,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)", animation: "fadeIn 0.15s ease" }}>
              {/* Horizontal pill strip for quick switching */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 16px 6px", scrollbarWidth: "none" }}>
                {activeBundle.channels.map((ch, i) => {
                  const isActive = activeChannel?.name === ch.name;
                  return (
                    <button
                      key={i}
                      className="strip-ch"
                      onClick={() => playChannel(ch, activeBundleMeta, activeBundle)}
                      style={{
                        flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                        background: isActive ? "rgba(229,62,62,0.18)" : "rgba(255,255,255,0.05)",
                        border: isActive ? "1px solid rgba(229,62,62,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        color: isActive ? "#e53e3e" : "rgba(255,255,255,0.65)",
                        borderRadius: 20, padding: "5px 12px 5px 6px", fontSize: 12, fontWeight: isActive ? 600 : 400,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      {ch.logo ? (
                        <img src={ch.logo} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }} onError={(e) => e.target.style.display = "none"} />
                      ) : (
                        <span style={{ fontSize: 12 }}>📺</span>
                      )}
                      {ch.name}
                      {isActive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#e53e3e", animation: "pulse 1.5s ease infinite" }} />}
                    </button>
                  );
                })}
              </div>
              {/* Full list — grid of cards */}
              <div className="sidebar-scroll" style={{ maxHeight: 280, overflowY: "auto", padding: "8px 16px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                {activeBundle.channels.map((ch, i) => {
                  const isActive = activeChannel?.name === ch.name;
                  return (
                    <button
                      key={i}
                      onClick={() => playChannel(ch, activeBundleMeta, activeBundle)}
                      style={{
                        background: isActive ? "rgba(229,62,62,0.1)" : "rgba(255,255,255,0.03)",
                        border: isActive ? "1px solid rgba(229,62,62,0.35)" : "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 10, padding: "8px 6px", cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={e => !isActive && (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                      onMouseLeave={e => !isActive && (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    >
                      {ch.logo ? (
                        <img src={ch.logo} alt={ch.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} onError={(e) => e.target.style.display = "none"} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📺</div>
                      )}
                      <span style={{ fontSize: 10, color: isActive ? "#f87171" : "rgba(255,255,255,0.6)", lineHeight: 1.3, textAlign: "center", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {ch.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ CATEGORY FILTER BAR ═══════════════════════════════════════════════ */}
      <div style={{
        display: "flex", gap: 6, overflowX: "auto", padding: "14px 20px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.05)", scrollbarWidth: "none",
        position: "sticky", top: 60, zIndex: 40,
        background: "rgba(8,8,16,0.95)", backdropFilter: "blur(12px)",
      }}>
        {categories.map((cat) => {
          const isActive = cat === activeCategory;
          const cfg = getCat(cat);
          return (
            <button
              key={cat}
              className="cat-pill"
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                background: isActive ? cfg.bg : "rgba(255,255,255,0.04)",
                border: isActive ? `1px solid ${cfg.border}` : "1px solid rgba(255,255,255,0.08)",
                color: isActive ? cfg.color : "rgba(255,255,255,0.45)",
                borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {cat !== "All" && <span style={{ fontSize: 12 }}>{cfg.icon}</span>}
              {cat}
            </button>
          );
        })}
      </div>

      {/* ══ CONTENT AREA ══════════════════════════════════════════════════════ */}
      <div style={{ padding: "20px 20px 60px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Search results */}
        {searchTerm && (
          <div style={{ marginBottom: 32, animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {filteredChannels.length} result{filteredChannels.length !== 1 ? "s" : ""} for
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.08)", padding: "2px 10px", borderRadius: 12 }}>
                "{searchTerm}"
              </span>
            </div>
            {filteredChannels.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
                No channels found. Try a different name.
              </div>
            ) : (
              <ChannelGrid channels={filteredChannels} activeChannel={activeChannel}
                onPlay={(ch) => playChannel(ch, ch._bundleMeta, ch._parsedBundle)} />
            )}
          </div>
        )}

        {/* Empty state */}
        {!searchTerm && filteredBundles.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>No channels available</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", margin: 0 }}>Check back soon — bundles will appear here once published.</p>
          </div>
        )}

        {/* Bundle sections */}
        {!searchTerm && filteredBundles.map((row) => {
          const parsed = parseBundleUrl(row.bundle_url);
          if (!parsed?.channels?.length) return null;
          const enriched = enrichChannels(parsed.channels, logoMap);
          return (
            <BundleSection
              key={row.id}
              row={row}
              parsed={{ ...parsed, channels: enriched }}
              activeChannel={activeChannel}
              onPlayChannel={playChannel}
              onPlayBundle={playBundle}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BUNDLE SECTION
// ─────────────────────────────────────────────────────────────────────────────
const BundleSection = ({ row, parsed, activeChannel, onPlayChannel, onPlayBundle }) => {
  const [expanded, setExpanded] = useState(true);
  const channels  = parsed.channels || [];
  const cfg       = getCat(row.category);
  const hasActive = channels.some((ch) => ch.name === activeChannel?.name);

  return (
    <div style={{ marginBottom: 36, animation: "fadeIn 0.2s ease" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        {/* Thumbnail or category icon */}
        {row.thumbnail ? (
          <img src={row.thumbnail} alt={row.name}
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}
            onError={(e) => e.target.style.display = "none"} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            {cfg.icon}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{row.name}</h2>
            <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 8px", borderRadius: 20 }}>
              {cfg.icon} {row.category}
            </span>
            {hasActive && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#e53e3e", background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.25)", padding: "2px 8px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#e53e3e", animation: "pulse 1.5s ease infinite" }} />
                Now playing
              </span>
            )}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{channels.length} channels</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            className="watch-btn"
            onClick={() => onPlayBundle(row)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: `linear-gradient(135deg, #e53e3e, #c53030)`,
              border: "none", color: "#fff", borderRadius: 20, padding: "7px 16px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            Watch
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.45)", borderRadius: 20, padding: "7px 12px",
              fontSize: 12, cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
          >
            {expanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* Horizontal rule */}
      <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.border}, transparent)`, marginBottom: 14 }} />

      {expanded && (
        <ChannelGrid
          channels={channels}
          activeChannel={activeChannel}
          onPlay={(ch) => onPlayChannel(ch, row, parsed)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL GRID
// ─────────────────────────────────────────────────────────────────────────────
const ChannelGrid = ({ channels, activeChannel, onPlay }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
    {channels.map((ch, i) => (
      <ChannelCard key={i} ch={ch} isActive={activeChannel?.name === ch.name} onClick={() => onPlay(ch)} />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL CARD
// ─────────────────────────────────────────────────────────────────────────────
const ChannelCard = ({ ch, isActive, onClick }) => (
  <button
    className="ch-card"
    onClick={onClick}
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      padding: "10px 6px 8px",
      background: isActive ? "rgba(229,62,62,0.1)" : "rgba(255,255,255,0.03)",
      border: isActive ? "1px solid rgba(229,62,62,0.4)" : "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, cursor: "pointer", textAlign: "center",
      boxShadow: isActive ? "0 0 0 2px rgba(229,62,62,0.15)" : "none",
    }}
  >
    {/* Logo container */}
    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
      {ch.logo ? (
        <img
          src={ch.logo}
          alt={ch.name}
          style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", display: "block" }}
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextElementSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.05)",
        display: ch.logo ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
      }}>📺</div>
      {/* Live dot overlay */}
      {isActive && (
        <div style={{
          position: "absolute", top: -3, right: -3, width: 10, height: 10,
          borderRadius: "50%", background: "#e53e3e", border: "2px solid #080810",
          animation: "pulse 1.5s ease infinite",
        }} />
      )}
    </div>

    {/* Name */}
    <span style={{
      fontSize: 10, lineHeight: 1.3, color: isActive ? "#f87171" : "rgba(255,255,255,0.65)",
      fontWeight: isActive ? 600 : 400,
      overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      width: "100%",
    }}>
      {ch.name}
    </span>
  </button>
);

export default LiveChannelsPage;