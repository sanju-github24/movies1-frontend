import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const tokens = {
  bg: {
    base:    "#07070f",
    surface: "rgba(255,255,255,0.03)",
    glass:   "rgba(255,255,255,0.055)",
    overlay: "rgba(7,7,15,0.96)",
  },
  border: {
    subtle:  "rgba(255,255,255,0.06)",
    default: "rgba(255,255,255,0.10)",
    strong:  "rgba(255,255,255,0.18)",
  },
  text: {
    primary:   "#f4f4f6",
    secondary: "rgba(244,244,246,0.55)",
    muted:     "rgba(244,244,246,0.28)",
  },
  accent: {
    red:        "#f03e3e",
    redDim:     "rgba(240,62,62,0.14)",
    redBorder:  "rgba(240,62,62,0.32)",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadow: {
    card:  "0 4px 24px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset",
    glow:  "0 0 0 2px rgba(240,62,62,0.2), 0 4px 24px rgba(240,62,62,0.12)",
    modal: "0 24px 80px rgba(0,0,0,0.7)",
  },
};

// ─── Category Palette ─────────────────────────────────────────────────────────
const CAT_CONFIG = {
  Sports:        { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.28)" },
  News:          { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.28)" },
  Entertainment: { color: "#a855f7", bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.28)" },
  Movies:        { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.28)" },
  Kids:          { color: "#ec4899", bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.28)" },
  Music:         { color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.28)" },
  Other:         { color: "#6b7280", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.28)" },
};
function getCat(cat) { return CAT_CONFIG[cat] || CAT_CONFIG.Other; }

// ─── SVG Icon Library ─────────────────────────────────────────────────────────
const Icon = {
  Back: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  Search: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  X: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  Tv: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="2"/><path d="M17 2l-5 5-5-5"/>
    </svg>
  ),
  Play: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  Channels: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  ChevronDown: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  Signal: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01M7 20v-4M12 20V10M17 20V4M22 20v-8"/>
    </svg>
  ),
  Sports: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
    </svg>
  ),
  News: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>
    </svg>
  ),
  Film: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>
    </svg>
  ),
  Music: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  Kids: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zM4 22c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
    </svg>
  ),
  AlertCircle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

const CAT_ICONS = { Sports: Icon.Sports, News: Icon.News, Entertainment: Icon.Film, Movies: Icon.Film, Music: Icon.Music, Kids: Icon.Kids };
function getCatIcon(cat) { return CAT_ICONS[cat] || Icon.Tv; }

// ─── XOR helpers ──────────────────────────────────────────────────────────────
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

/**
 * Decode a bundle URL into { title, channels, ids, _format }
 * Handles both:
 *   - Legacy:   { title, channels: [{name,url,keyId,key,cookie,logo}] }
 *   - Permanent:{ title, ids: ["ch_id_1", ...] }  ← needs live feed resolution
 */
function parseBundleUrl(bundleUrl) {
  try {
    const params = new URLSearchParams(new URL(bundleUrl).search);
    const encoded = params.get("bundle");
    if (!encoded) return null;
    const decoded = JSON.parse(dob(decodeURIComponent(encoded)));
    if (!decoded) return null;

    if (decoded.channels && decoded.channels.length > 0) {
      return { ...decoded, _format: "legacy" };
    }
    if (decoded.ids && decoded.ids.length > 0) {
      return { ...decoded, _format: "permanent", channels: [] }; // channels resolved later
    }
    return null;
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

// ─── Live feed fetchers ───────────────────────────────────────────────────────
const OLD_JSON = "https://binge-giotv.pages.dev/data/id.json";
const NEW_JSON  = "https://jtv-proxy.sanjusanjay0444.workers.dev/";

let _chMapCache = null;
let _chMapPromise = null;

/**
 * Returns a map of { [channelId]: channelObject }
 * Shared across all callers so the feed is only fetched once per session.
 */
async function getChMap() {
  if (_chMapCache) return _chMapCache;
  if (_chMapPromise) return _chMapPromise;
  _chMapPromise = (async () => {
    const map = {};
    const [r1, r2] = await Promise.allSettled([
      fetch(OLD_JSON + "?_=" + Date.now()).then((r) => (r.ok ? r.json() : null)),
      fetch(NEW_JSON  + "?_=" + Date.now()).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (r1.status === "fulfilled" && r1.value) {
      const raw = Array.isArray(r1.value) ? r1.value : (r1.value.channels || []);
      raw.forEach((ch) => {
        if (ch.id) map[ch.id] = {
          id: ch.id, name: ch.name || "Channel",
          url: ch.url || "", keyId: ch.keyId || "",
          key: ch.key || "", cookie: ch.cookie || "",
          logo: ch.logo || "",
        };
      });
    }
    if (r2.status === "fulfilled" && r2.value) {
      const raw = Array.isArray(r2.value) ? r2.value : (r2.value.channels || []);
      raw.forEach((ch) => {
        let url = ch.channel_url || "";
        if (url.includes("?")) url = url.split("?")[0];
        if (ch.channel_id) map[ch.channel_id] = {
          id: ch.channel_id, name: ch.channel_name || "Channel",
          url, keyId: ch.keyId || "", key: ch.key || "",
          cookie: ch.cookie || "", logo: ch.channel_logo || "",
        };
      });
    }
    _chMapCache = map;
    return map;
  })();
  return _chMapPromise;
}

/**
 * Build a logo map keyed by channel name for enriching legacy bundles.
 */
async function fetchLogoMap() {
  const map = {};
  try {
    const chMap = await getChMap();
    Object.values(chMap).forEach((ch) => {
      if (ch.name && ch.logo) map[ch.name.trim()] = ch.logo;
    });
  } catch (e) { console.warn("fetchLogoMap failed", e); }
  return map;
}

function enrichChannels(channels, logoMap) {
  return channels.map((ch) => ({ ...ch, logo: ch.logo || logoMap[ch.name?.trim()] || "" }));
}

/**
 * Resolve a parsed bundle:
 * - legacy format:   enrich logos from the live feed
 * - permanent format: look up each ID in the live feed for fresh keys + logos
 */
async function resolveBundle(parsed, logoMap) {
  if (!parsed) return null;

  if (parsed._format === "legacy") {
    // Try to refresh keys from live feed by name match
    let nameMap = {};
    try {
      const chMap = await getChMap();
      Object.values(chMap).forEach((ch) => { nameMap[ch.name] = ch; });
    } catch {}
    const refreshed = parsed.channels.map((ch) => {
      const live = nameMap[ch.name];
      return live ? { ...live, logo: live.logo || ch.logo } : ch;
    });
    return { ...parsed, channels: enrichChannels(refreshed, logoMap) };
  }

  if (parsed._format === "permanent") {
    const chMap = await getChMap();
    const channels = parsed.ids.map((id) => chMap[id]).filter(Boolean);
    return { ...parsed, channels };
  }

  return null;
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes spin       { to { transform: rotate(360deg) } }
  @keyframes pulse-dot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
  @keyframes fade-up    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer    { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
  @keyframes slide-down { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

  ::-webkit-scrollbar        { width:4px;height:4px }
  ::-webkit-scrollbar-track  { background:transparent }
  ::-webkit-scrollbar-thumb  { background:rgba(255,255,255,0.1);border-radius:4px }

  .ch-card {
    transition: transform 0.18s cubic-bezier(.34,1.56,.64,1),
                box-shadow 0.18s ease,
                border-color 0.18s ease,
                background 0.18s ease !important;
    cursor: pointer;
  }
  .ch-card:hover:not(.active) {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 12px 32px rgba(0,0,0,0.5) !important;
    border-color: rgba(255,255,255,0.14) !important;
    background: rgba(255,255,255,0.07) !important;
  }
  .ch-card:active { transform: scale(0.97) !important; }

  .cat-pill { transition: all 0.15s ease; cursor: pointer; }
  .cat-pill:hover { filter: brightness(1.15); transform: translateY(-1px); }
  .cat-pill:active { transform: scale(0.96); }

  .strip-ch { transition: background 0.13s, border-color 0.13s; cursor: pointer; }
  .strip-ch:hover:not(.active) { background: rgba(255,255,255,0.08) !important; }

  .watch-btn {
    transition: transform 0.15s cubic-bezier(.34,1.56,.64,1), filter 0.15s;
    cursor: pointer;
  }
  .watch-btn:hover { transform: scale(1.05); filter: brightness(1.12); }
  .watch-btn:active { transform: scale(0.97); }

  .collapse-btn { transition: all 0.15s; cursor: pointer; }
  .collapse-btn:hover { background: rgba(255,255,255,0.1) !important; color: #f4f4f6 !important; }

  .nav-input:focus {
    outline: none;
    border-color: rgba(240,62,62,0.55) !important;
    background: rgba(255,255,255,0.09) !important;
    box-shadow: 0 0 0 3px rgba(240,62,62,0.08);
  }

  .shimmer-block {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%);
    background-size: 600px 100%;
    animation: shimmer 1.4s ease infinite;
  }
`;

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const SkeletonGrid = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 10 }}>
    {Array.from({ length: 16 }).map((_, i) => (
      <div key={i} className="shimmer-block" style={{ borderRadius: 14, height: 100 }} />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const LiveChannelsPage = () => {
  const navigate = useNavigate();

  const [bundles, setBundles]               = useState([]);
  // resolvedBundles: Map<row.id, { ...parsedBundle, channels: [...] }>
  const [resolvedBundles, setResolvedBundles] = useState({});
  const [allChannels, setAllChannels]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [feedError, setFeedError]           = useState(false);
  const [logoMap, setLogoMap]               = useState({});

  const [activeBundle, setActiveBundle]         = useState(null);
  const [activeBundleMeta, setActiveBundleMeta] = useState(null);
  const [activeChannel, setActiveChannel]       = useState(null);
  const [playerUrl, setPlayerUrl]               = useState("");
  const [iframeLoading, setIframeLoading]       = useState(false);
  const [channelListOpen, setChannelListOpen]   = useState(false);

  const [searchTerm, setSearchTerm]         = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const iframeRef  = useRef(null);
  const playerRef  = useRef(null);
  const searchRef  = useRef(null);

  // ── Boot: fetch feed + bundles in parallel ──────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Kick off both in parallel
        const [map, { data: rows, error }] = await Promise.all([
          fetchLogoMap(),
          supabase
            .from("live_channel_bundles")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
        ]);

        if (error) throw error;
        setLogoMap(map);

        const bundleRows = rows || [];
        setBundles(bundleRows);

        // Resolve all bundles (ID-based and legacy) against the live feed
        const resolved = {};
        const flat = [];

        await Promise.all(
          bundleRows.map(async (row) => {
            const parsed = parseBundleUrl(row.bundle_url);
            if (!parsed) return;

            const fullBundle = await resolveBundle(parsed, map);
            if (!fullBundle || !fullBundle.channels.length) return;

            resolved[row.id] = fullBundle;
            fullBundle.channels.forEach((ch) =>
              flat.push({ ...ch, _bundleMeta: row, _parsedBundle: fullBundle })
            );
          })
        );

        setResolvedBundles(resolved);
        setAllChannels(flat);
      } catch (e) {
        console.error("LiveChannelsPage boot error:", e);
        setFeedError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = ["All", ...Array.from(new Set(bundles.map((b) => b.category).filter(Boolean)))];

  const filteredBundles = bundles.filter((b) => {
    const matchCat    = activeCategory === "All" || b.category === activeCategory;
    const matchSearch = !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Only show bundles that resolved successfully
    return matchCat && matchSearch && !!resolvedBundles[b.id];
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
    setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  const playBundle = useCallback((row) => {
    const fullBundle = resolvedBundles[row.id];
    if (!fullBundle?.channels?.length) return;
    playChannel(fullBundle.channels[0], row, fullBundle);
  }, [resolvedBundles, playChannel]);

  const catInfo = activeChannel ? getCat(activeBundleMeta?.category) : null;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100dvh", background: tokens.bg.base, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", width: 56, height: 56 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(240,62,62,0.2)", animation: "pulse-dot 1.4s ease infinite" }} />
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(240,62,62,0.2), rgba(240,62,62,0.05))",
            border: "1px solid rgba(240,62,62,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon.Tv width={24} height={24} style={{ color: tokens.accent.red }} />
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: tokens.text.primary, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Loading Live TV</p>
          <p style={{ color: tokens.text.muted, fontSize: 12, marginTop: 4 }}>Fetching channels & resolving bundles…</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: tokens.bg.base, color: tokens.text.primary, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(7,7,15,0.88)", backdropFilter: "blur(24px) saturate(160%)",
        borderBottom: `1px solid ${tokens.border.subtle}`,
        padding: "0 20px", height: 64,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          style={{
            background: "none", border: `1px solid ${tokens.border.subtle}`,
            color: tokens.text.secondary, cursor: "pointer",
            width: 38, height: 38, borderRadius: tokens.radius.full,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = tokens.bg.glass; e.currentTarget.style.color = tokens.text.primary; e.currentTarget.style.borderColor = tokens.border.default; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = tokens.text.secondary; e.currentTarget.style.borderColor = tokens.border.subtle; }}
        >
          <Icon.Back width={16} height={16} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: tokens.radius.md,
            background: "linear-gradient(135deg, rgba(240,62,62,0.28), rgba(240,62,62,0.08))",
            border: `1px solid ${tokens.accent.redBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon.Tv width={17} height={17} style={{ color: tokens.accent.red }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>Live TV</span>
              <span style={{
                fontSize: 9, fontWeight: 700, color: tokens.accent.red,
                background: tokens.accent.redDim, border: `1px solid ${tokens.accent.redBorder}`,
                padding: "2px 6px", borderRadius: tokens.radius.full, letterSpacing: "0.08em",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: tokens.accent.red, animation: "pulse-dot 1.5s ease infinite", display: "inline-block" }} />
                LIVE
              </span>
            </div>
          </div>
        </div>

        {allChannels.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, color: tokens.text.muted,
            background: tokens.bg.surface, border: `1px solid ${tokens.border.subtle}`,
            padding: "4px 10px", borderRadius: tokens.radius.full, flexShrink: 0,
          }}>
            <Icon.Signal width={10} height={10} style={{ opacity: 0.5 }} />
            {allChannels.length} channels
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ position: "relative", maxWidth: 280, width: "100%" }}>
          <Icon.Search width={14} height={14} style={{
            position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
            color: tokens.text.muted, pointerEvents: "none",
          }} />
          <input
            ref={searchRef}
            className="nav-input"
            type="text"
            placeholder="Search channels…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search channels"
            style={{
              width: "100%",
              background: tokens.bg.glass,
              border: `1px solid ${tokens.border.default}`,
              color: tokens.text.primary,
              borderRadius: tokens.radius.full,
              padding: "9px 36px 9px 38px",
              fontSize: 13, fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              style={{
                position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
                background: tokens.bg.glass, border: `1px solid ${tokens.border.subtle}`,
                color: tokens.text.muted,
                width: 20, height: 20, borderRadius: "50%", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = tokens.bg.glass}
            >
              <Icon.X width={9} height={9} />
            </button>
          )}
        </div>
      </nav>

      {/* ══ FEED ERROR BANNER ════════════════════════════════════════════════ */}
      {feedError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 20px",
          background: "rgba(240,62,62,0.08)", borderBottom: `1px solid rgba(240,62,62,0.2)`,
          fontSize: 13, color: "rgba(248,113,113,0.9)",
        }}>
          <Icon.AlertCircle width={15} height={15} style={{ flexShrink: 0 }} />
          Could not reach the channel feed. Some bundles may not load. Check your connection and refresh.
        </div>
      )}

      {/* ══ PLAYER ZONE ═════════════════════════════════════════════════════════ */}
      {playerUrl && (
        <div ref={playerRef} style={{ background: "#000", borderBottom: `1px solid ${tokens.border.subtle}` }}>
          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
            {iframeLoading && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 5,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "#000", gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: "2.5px solid rgba(255,255,255,0.07)",
                  borderTop: "2.5px solid rgba(255,255,255,0.7)",
                  animation: "spin 0.75s linear infinite",
                }} />
                <span style={{ fontSize: 12, color: tokens.text.muted, letterSpacing: "0.02em" }}>Loading stream…</span>
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
            padding: "12px 18px", gap: 12,
            background: "linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.6))",
            borderTop: `1px solid ${catInfo ? catInfo.border : tokens.border.subtle}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, flex: 1 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {activeChannel?.logo ? (
                  <img
                    src={activeChannel.logo} alt={activeChannel.name}
                    style={{ width: 36, height: 36, borderRadius: tokens.radius.md, objectFit: "cover", border: `1px solid ${tokens.border.default}`, display: "block" }}
                    onError={(e) => { e.target.style.display = "none"; e.target.nextElementSibling.style.display = "flex"; }}
                  />
                ) : null}
                <div style={{
                  width: 36, height: 36, borderRadius: tokens.radius.md,
                  background: catInfo?.bg, border: `1px solid ${catInfo?.border}`,
                  display: activeChannel?.logo ? "none" : "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {React.createElement(getCatIcon(activeBundleMeta?.category), { width: 16, height: 16, style: { color: catInfo?.color } })}
                </div>
                <div style={{
                  position: "absolute", top: -3, right: -3,
                  width: 10, height: 10, borderRadius: "50%",
                  background: tokens.accent.red,
                  border: "2px solid #000",
                  animation: "pulse-dot 1.5s ease infinite",
                }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: tokens.text.primary, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                  {activeChannel?.name}
                </div>
                {activeBundleMeta && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    {React.createElement(getCatIcon(activeBundleMeta.category), { width: 11, height: 11, style: { color: catInfo?.color, flexShrink: 0 } })}
                    <span style={{ fontSize: 11, color: catInfo?.color, fontWeight: 500 }}>{activeBundleMeta.category}</span>
                    <span style={{ fontSize: 11, color: tokens.text.muted }}>·</span>
                    <span style={{ fontSize: 11, color: tokens.text.muted }}>{activeBundleMeta.name}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setChannelListOpen(!channelListOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                background: channelListOpen ? tokens.accent.redDim : tokens.bg.glass,
                border: channelListOpen ? `1px solid ${tokens.accent.redBorder}` : `1px solid ${tokens.border.default}`,
                color: channelListOpen ? tokens.accent.red : tokens.text.secondary,
                borderRadius: tokens.radius.full, padding: "7px 14px",
                fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.18s",
              }}
            >
              <Icon.Channels width={13} height={13} />
              <span>{activeBundle?.channels?.length} ch</span>
              <Icon.ChevronDown width={12} height={12} style={{ transform: channelListOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
          </div>

          {/* Channel drawer */}
          {channelListOpen && activeBundle?.channels && (
            <div style={{ background: "rgba(5,5,12,0.98)", borderTop: `1px solid ${tokens.border.subtle}`, animation: "slide-down 0.18s ease" }}>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 16px 8px", scrollbarWidth: "none" }}>
                {activeBundle.channels.map((ch, i) => {
                  const isActive = activeChannel?.name === ch.name;
                  return (
                    <button
                      key={i}
                      className={`strip-ch${isActive ? " active" : ""}`}
                      onClick={() => playChannel(ch, activeBundleMeta, activeBundle)}
                      style={{
                        flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                        background: isActive ? tokens.accent.redDim : tokens.bg.surface,
                        border: isActive ? `1px solid ${tokens.accent.redBorder}` : `1px solid ${tokens.border.subtle}`,
                        color: isActive ? tokens.accent.red : tokens.text.secondary,
                        borderRadius: tokens.radius.full, padding: "5px 12px 5px 6px",
                        fontSize: 12, fontWeight: isActive ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      {ch.logo ? (
                        <img src={ch.logo} alt="" style={{ width: 18, height: 18, borderRadius: 5, objectFit: "cover" }} onError={(e) => e.target.style.display = "none"} />
                      ) : (
                        <div style={{ width: 18, height: 18, borderRadius: 5, background: tokens.bg.glass, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon.Tv width={10} height={10} style={{ color: tokens.text.muted }} />
                        </div>
                      )}
                      {ch.name}
                      {isActive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: tokens.accent.red, animation: "pulse-dot 1.5s ease infinite" }} />}
                    </button>
                  );
                })}
              </div>

              <div style={{ maxHeight: 290, overflowY: "auto", padding: "8px 16px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
                {activeBundle.channels.map((ch, i) => {
                  const isActive = activeChannel?.name === ch.name;
                  return (
                    <button
                      key={i}
                      onClick={() => playChannel(ch, activeBundleMeta, activeBundle)}
                      style={{
                        background: isActive ? tokens.accent.redDim : tokens.bg.surface,
                        border: isActive ? `1px solid ${tokens.accent.redBorder}` : `1px solid ${tokens.border.subtle}`,
                        borderRadius: tokens.radius.md, padding: "10px 6px",
                        cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                        transition: "all 0.14s",
                      }}
                      onMouseEnter={e => !isActive && (e.currentTarget.style.background = tokens.bg.glass)}
                      onMouseLeave={e => !isActive && (e.currentTarget.style.background = tokens.bg.surface)}
                    >
                      {ch.logo ? (
                        <img src={ch.logo} alt={ch.name} style={{ width: 38, height: 38, borderRadius: 9, objectFit: "cover" }} onError={(e) => e.target.style.display = "none"} />
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: 9, background: tokens.bg.glass, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon.Tv width={18} height={18} style={{ color: tokens.text.muted }} />
                        </div>
                      )}
                      <span style={{ fontSize: 10, color: isActive ? "#f87171" : tokens.text.secondary, lineHeight: 1.3, textAlign: "center", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", width: "100%", fontWeight: isActive ? 600 : 400 }}>
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
        display: "flex", gap: 6, overflowX: "auto", padding: "14px 20px 12px",
        borderBottom: `1px solid ${tokens.border.subtle}`,
        position: "sticky", top: 64, zIndex: 50,
        background: "rgba(7,7,15,0.94)", backdropFilter: "blur(16px)",
        scrollbarWidth: "none",
      }}>
        {categories.map((cat) => {
          const isActive = cat === activeCategory;
          const cfg = getCat(cat);
          const CatIcon = getCatIcon(cat);
          return (
            <button
              key={cat}
              className="cat-pill"
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                background: isActive ? cfg.bg : tokens.bg.surface,
                border: isActive ? `1px solid ${cfg.border}` : `1px solid ${tokens.border.subtle}`,
                color: isActive ? cfg.color : tokens.text.secondary,
                borderRadius: tokens.radius.full, padding: "7px 15px",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
              }}
            >
              {cat !== "All" && <CatIcon width={13} height={13} />}
              {cat === "All" && <Icon.Signal width={11} height={11} />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* ══ CONTENT AREA ══════════════════════════════════════════════════════ */}
      <div style={{ padding: "24px 20px 72px", maxWidth: 1440, margin: "0 auto" }}>

        {/* Search results */}
        {searchTerm && (
          <div style={{ marginBottom: 36, animation: "fade-up 0.22s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: tokens.text.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {filteredChannels.length} result{filteredChannels.length !== 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: tokens.text.primary, background: tokens.bg.glass, border: `1px solid ${tokens.border.default}`, padding: "2px 10px", borderRadius: tokens.radius.full }}>
                "{searchTerm}"
              </span>
            </div>
            {filteredChannels.length === 0 ? (
              <EmptySearch term={searchTerm} />
            ) : (
              <ChannelGrid channels={filteredChannels} activeChannel={activeChannel}
                onPlay={(ch) => playChannel(ch, ch._bundleMeta, ch._parsedBundle)} />
            )}
          </div>
        )}

        {!searchTerm && filteredBundles.length === 0 && <EmptyState />}

        {!searchTerm && filteredBundles.map((row) => {
          const fullBundle = resolvedBundles[row.id];
          if (!fullBundle?.channels?.length) return null;
          return (
            <BundleSection
              key={row.id}
              row={row}
              parsed={fullBundle}
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
// EMPTY STATES
// ─────────────────────────────────────────────────────────────────────────────
const EmptySearch = ({ term }) => (
  <div style={{ padding: "64px 24px", textAlign: "center", animation: "fade-up 0.2s ease" }}>
    <div style={{ width: 56, height: 56, borderRadius: "50%", background: tokens.bg.glass, border: `1px solid ${tokens.border.default}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
      <Icon.Search width={22} height={22} style={{ color: tokens.text.muted }} />
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 700, color: tokens.text.secondary, marginBottom: 6 }}>No channels found</h3>
    <p style={{ fontSize: 13, color: tokens.text.muted }}>No results for "{term}". Try a different name.</p>
  </div>
);

const EmptyState = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 24px", textAlign: "center" }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20,
      background: "linear-gradient(135deg, rgba(240,62,62,0.14), rgba(240,62,62,0.04))",
      border: `1px solid rgba(240,62,62,0.32)`,
      display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
    }}>
      <Icon.Tv width={30} height={30} style={{ color: "#f03e3e" }} />
    </div>
    <h3 style={{ fontSize: 18, fontWeight: 700, color: tokens.text.secondary, marginBottom: 8 }}>No channels available</h3>
    <p style={{ fontSize: 13, color: tokens.text.muted, maxWidth: 320, lineHeight: 1.6 }}>
      Bundles will appear here once published. Check back soon.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BUNDLE SECTION
// ─────────────────────────────────────────────────────────────────────────────
const BundleSection = ({ row, parsed, activeChannel, onPlayChannel, onPlayBundle }) => {
  const [expanded, setExpanded] = useState(true);
  const channels  = parsed.channels || [];
  const cfg       = getCat(row.category);
  const CatIcon   = getCatIcon(row.category);
  const hasActive = channels.some((ch) => ch.name === activeChannel?.name);

  return (
    <div style={{ marginBottom: 40, animation: "fade-up 0.22s ease" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap",
        padding: "14px 18px",
        background: tokens.bg.surface,
        border: `1px solid ${tokens.border.subtle}`,
        borderRadius: tokens.radius.lg,
      }}>
        {row.thumbnail ? (
          <img src={row.thumbnail} alt={row.name}
            style={{ width: 40, height: 40, borderRadius: tokens.radius.md, objectFit: "cover", border: `1px solid ${tokens.border.default}`, flexShrink: 0 }}
            onError={(e) => e.target.style.display = "none"}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: tokens.radius.md,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <CatIcon width={18} height={18} style={{ color: cfg.color }} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: tokens.text.primary }}>{row.name}</h2>
            <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 8px", borderRadius: tokens.radius.full, display: "flex", alignItems: "center", gap: 4 }}>
              <CatIcon width={10} height={10} />
              {row.category}
            </span>
            {hasActive && (
              <span style={{ fontSize: 10, fontWeight: 700, color: tokens.accent.red, background: tokens.accent.redDim, border: `1px solid ${tokens.accent.redBorder}`, padding: "2px 8px", borderRadius: tokens.radius.full, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: tokens.accent.red, animation: "pulse-dot 1.5s ease infinite" }} />
                Now Playing
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: tokens.text.muted, marginTop: 3 }}>{channels.length} channels</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            className="watch-btn"
            onClick={() => onPlayBundle(row)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "linear-gradient(135deg, #f03e3e, #c92a2a)",
              boxShadow: "0 2px 12px rgba(240,62,62,0.35)",
              border: "none", color: "#fff", borderRadius: tokens.radius.full,
              padding: "8px 18px", fontSize: 12, fontWeight: 700,
            }}
          >
            <Icon.Play width={11} height={11} />
            Watch
          </button>
          <button
            className="collapse-btn"
            onClick={() => setExpanded(!expanded)}
            style={{
              background: tokens.bg.glass, border: `1px solid ${tokens.border.default}`,
              color: tokens.text.secondary, borderRadius: tokens.radius.full,
              padding: "8px 14px", fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <Icon.ChevronDown width={12} height={12} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            {expanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.border} 0%, transparent 70%)`, marginBottom: 16 }} />

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
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }}>
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
    className={`ch-card${isActive ? " active" : ""}`}
    onClick={onClick}
    aria-label={`Watch ${ch.name}`}
    aria-pressed={isActive}
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      padding: "12px 8px 10px",
      background: isActive
        ? "linear-gradient(135deg, rgba(240,62,62,0.16), rgba(240,62,62,0.06))"
        : tokens.bg.surface,
      border: isActive
        ? `1px solid ${tokens.accent.redBorder}`
        : `1px solid ${tokens.border.subtle}`,
      borderRadius: tokens.radius.lg,
      boxShadow: isActive ? tokens.shadow.glow : tokens.shadow.card,
      textAlign: "center",
    }}
  >
    <div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
      {ch.logo ? (
        <img
          src={ch.logo} alt={ch.name}
          style={{ width: 46, height: 46, borderRadius: 11, objectFit: "cover", display: "block", border: `1px solid ${tokens.border.subtle}` }}
          onError={(e) => { e.target.style.display = "none"; e.target.nextElementSibling.style.display = "flex"; }}
        />
      ) : null}
      <div style={{
        width: 46, height: 46, borderRadius: 11,
        background: isActive ? tokens.accent.redDim : tokens.bg.glass,
        border: `1px solid ${isActive ? tokens.accent.redBorder : tokens.border.subtle}`,
        display: ch.logo ? "none" : "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <Icon.Tv width={20} height={20} style={{ color: isActive ? tokens.accent.red : tokens.text.muted }} />
      </div>
      {isActive && (
        <div style={{
          position: "absolute", top: -3, right: -3,
          width: 11, height: 11, borderRadius: "50%",
          background: tokens.accent.red,
          border: "2px solid #07070f",
          animation: "pulse-dot 1.5s ease infinite",
          boxShadow: "0 0 8px rgba(240,62,62,0.7)",
        }} />
      )}
    </div>
    <span style={{
      fontSize: 10.5, lineHeight: 1.35,
      color: isActive ? "#f87171" : tokens.text.secondary,
      fontWeight: isActive ? 600 : 400,
      overflow: "hidden",
      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      width: "100%", letterSpacing: "-0.01em",
    }}>
      {ch.name}
    </span>
  </button>
);

export default LiveChannelsPage;