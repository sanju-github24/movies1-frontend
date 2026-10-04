import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../utils/supabaseClient";
import AnchorPlayer from "../components/AnchorPlayer";
import { resolveChannelSource } from "../utils/liveSources";
import LiveTvBrowse from "../components/livetv/LiveTvBrowse";
import LiveViewer from "../components/LiveViewer";
import { categoryOf, languageOf, displayName, isHD } from "../utils/channelMeta";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const tokens = {
  bg: {
    base: "#07070f",
    surface: "rgba(255,255,255,0.03)",
    glass: "rgba(255,255,255,0.055)",
    overlay: "rgba(7,7,15,0.96)",
  },
  border: {
    subtle: "rgba(255,255,255,0.06)",
    default: "rgba(255,255,255,0.10)",
    strong: "rgba(255,255,255,0.18)",
  },
  text: {
    primary: "#f4f4f6",
    secondary: "rgba(244,244,246,0.55)",
    muted: "rgba(244,244,246,0.28)",
  },
  accent: {
    red: "#f03e3e",
    redDim: "rgba(240,62,62,0.14)",
    redBorder: "rgba(240,62,62,0.32)",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadow: {
    card: "0 4px 24px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset",
    glow: "0 0 0 2px rgba(240,62,62,0.2), 0 4px 24px rgba(240,62,62,0.12)",
    modal: "0 24px 80px rgba(0,0,0,0.7)",
  },
};

// ─── Category Palette ─────────────────────────────────────────────────────────
const CAT_CONFIG = {
  Sports: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.28)" },
  News: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.28)" },
  Entertainment: { color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.28)" },
  Movies: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)" },
  Kids: { color: "#ec4899", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.28)" },
  Music: { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.28)" },
  Other: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.28)" },
};
function getCat(cat) { return CAT_CONFIG[cat] || CAT_CONFIG.Other; }

// ─── SVG Icon Library ─────────────────────────────────────────────────────────
const Icon = {
  Back: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  Search: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  X: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Tv: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="2" /><path d="M17 2l-5 5-5-5" />
    </svg>
  ),
  Play: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Channels: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  ChevronDown: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Signal: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01M7 20v-4M12 20V10M17 20V4M22 20v-8" />
    </svg>
  ),
  Sports: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" />
    </svg>
  ),
  News: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
    </svg>
  ),
  Film: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" /><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
    </svg>
  ),
  Music: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  ),
  Kids: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zM4 22c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  ),
  AlertCircle: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
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
    const raw = String(bundleUrl || "").trim();
    if (!raw) return null;

    if (raw.includes("tab=live")) {
      return { title: "Live TV", _format: "tab_live", channels: [] };
    }

    const params = new URLSearchParams(new URL(raw).search);
    const encoded = params.get("bundle");
    /* A ?tab=sony / ?tab=fc row names a fixture feed, not a channel list —
       LiveTabsSection renders those. Nothing for this page to decode. */
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

/* Every link this builds is loaded in our own iframe, so it always asks for
   solo: the player then shows the video alone and keeps its own launcher —
   the "paste a stream URL or pick a channel" screen — out of the frame. That
   screen is what appeared while a channel was still loading, and again when
   one was closed, looking like the player had dumped you on a home page. In
   solo it tells us to close the frame instead. */
const PLAYER = "https://m3u8-player-orcin.vercel.app/";
const solo = (qs) => `${PLAYER}?${qs}${qs ? "&" : ""}solo=1`;

function buildChannelUrl(basePlayerUrl, channel) {
  if (!channel) return solo("");

  const rawUrl = String(channel.url || "");

  // 1. Tab-based links (e.g. ?tab=willow&id=... or ?tab=bb&id=...)
  if (rawUrl.includes("tab=") && rawUrl.includes("id=")) {
    try {
      const u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://dummy.com${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`);
      const tab = u.searchParams.get("tab");
      const id = u.searchParams.get("id");
      if (tab && id) {
        return solo(`tab=${encodeURIComponent(tab)}&id=${encodeURIComponent(id)}`);
      }
    } catch {}
  }

  // Live TV channels from live feed (tab=live)
  if (channel.id && (channel._format === "tab_live" || !rawUrl)) {
    return solo(`tab=live&id=${encodeURIComponent(channel.id)}`);
  }

  // 2. Direct stream URL (?url=...&title=...)
  if (rawUrl) {
    const params = new URLSearchParams();
    params.set("url", rawUrl);
    if (channel.name) params.set("title", channel.name);
    if (channel.keyId) params.set("keyId", channel.keyId);
    if (channel.key) params.set("key", channel.key);
    if (channel.cookie) params.set("cookie", channel.cookie);
    if (channel.logo) params.set("logo", channel.logo);

    return solo(params.toString());
  }

  if (channel.id) {
    return solo(`tab=live&id=${encodeURIComponent(channel.id)}`);
  }

  return solo("");
}

function extractBaseUrl(bundleUrl) {
  try { const u = new URL(bundleUrl); return `${u.origin}${u.pathname}`; }
  catch { return bundleUrl.split("?")[0]; }
}

// ─── Live feed fetchers ───────────────────────────────────────────────────────
const OLD_JSON = "https://binge-giotv.pages.dev/data/id.json";
const NEW_JSON = "https://jtv-proxy.sanjusanjay0444.workers.dev/";

function normalizeFeedChannel(ch) {
  const clean = (v) => v == null || String(v).toLowerCase() === "null" ? "" : String(v);
  return {
    id: clean(ch.channel_id || ch.id),
    name: ch.channel_name || ch.name || "Channel",
    url: ch.channel_url || ch.stream_url || ch.url || "",
    keyId: clean(ch.keyId || ch.key_id),
    key: clean(ch.key), cookie: clean(ch.cookie),
    logo: ch.channel_logo || ch.logo || "",
  };
}

let _chMapCache = null;
let _chMapPromise = null;
let _chMapFetchedAt = 0;

async function getChMap(force = false) {
  if (!force && _chMapCache && Date.now() - _chMapFetchedAt < 60_000) return _chMapCache;
  if (_chMapPromise) return _chMapPromise;
  _chMapPromise = (async () => {
    const results = await Promise.allSettled([OLD_JSON, NEW_JSON].map(async (url) => {
      const response = await fetch(url + "?_=" + Date.now(), {
        cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Feed HTTP ${response.status}`);
      const data = await response.json();
      const rows = Array.isArray(data) ? data : data.channels;
      if (!Array.isArray(rows)) throw new Error("Invalid channel feed");
      return rows.map(normalizeFeedChannel).filter(ch => ch.id && ch.url);
    }));
    const map = {};
    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const ch of result.value) map[ch.id] = ch;
      }
    }
    if (!Object.keys(map).length) throw new Error("Unable to fetch channel feed. Please retry.");
    _chMapCache = map;
    _chMapFetchedAt = Date.now();
    return map;
  })();
  try { return await _chMapPromise; }
  finally { _chMapPromise = null; }
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

  if (parsed._format === "tab_live") {
    try {
      const chMap = await getChMap();
      const channels = Object.values(chMap || {}).map((ch) => ({
        ...ch,
        _format: "tab_live",
      }));
      return { ...parsed, channels: enrichChannels(channels, logoMap) };
    } catch (e) {
      console.error("Failed to resolve tab_live channels:", e);
      return null;
    }
  }

  if (parsed._format === "legacy") {
    // Try to refresh keys from live feed by name match
    let nameMap = {};
    try {
      const chMap = await getChMap();
      Object.values(chMap).forEach((ch) => { nameMap[ch.name] = ch; });
    } catch { }
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
/* Scoped to this page, not the document.
 *
 * The reset below used to be written as a bare `*`, which reaches everything
 * on screen — including the nav rail, which is rendered outside this page and
 * positioned fixed. Zeroing its padding and margin left the rail collapsed and
 * the page appearing to run over it, but only while this route was open, which
 * made it look like a layout bug here rather than a stylesheet reaching out.
 *
 * Everything is prefixed with .lc-page so it stops at this page's own subtree.
 * The font import stays at the top: @import is only valid before other rules. */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  /* In Tailwind's base layer: a reset outside any layer beats every utility,
     whatever its specificity, and wiped the spacing of the Tailwind parts. */
  @layer base {
    .lc-page, .lc-page *, .lc-page *::before, .lc-page *::after { box-sizing: border-box; margin: 0; padding: 0; }
  }

  @keyframes spin       { to { transform: rotate(360deg) } }
  @keyframes pulse-dot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
  @keyframes fade-up    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer    { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
  @keyframes slide-down { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

  .lc-page ::-webkit-scrollbar        { width:4px;height:4px }
  .lc-page ::-webkit-scrollbar-track  { background:transparent }
  .lc-page ::-webkit-scrollbar-thumb  { background:rgba(255,255,255,0.1);border-radius:4px }

  .lc-page .ch-card {
    transition: transform 0.18s cubic-bezier(.34,1.56,.64,1),
                box-shadow 0.18s ease,
                border-color 0.18s ease,
                background 0.18s ease !important;
    cursor: pointer;
  }
  .lc-page .ch-card:hover:not(.active) {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 12px 32px rgba(0,0,0,0.5) !important;
    border-color: rgba(255,255,255,0.14) !important;
    background: rgba(255,255,255,0.07) !important;
  }
  .lc-page .ch-card:active { transform: scale(0.97) !important; }

  .lc-page .cat-pill { transition: all 0.15s ease; cursor: pointer; }
  .lc-page .cat-pill:hover { filter: brightness(1.15); transform: translateY(-1px); }
  .lc-page .cat-pill:active { transform: scale(0.96); }

  .lc-page .strip-ch { transition: background 0.13s, border-color 0.13s; cursor: pointer; }
  .lc-page .strip-ch:hover:not(.active) { background: rgba(255,255,255,0.08) !important; }

  .lc-page .watch-btn {
    transition: transform 0.15s cubic-bezier(.34,1.56,.64,1), filter 0.15s;
    cursor: pointer;
  }
  .lc-page .watch-btn:hover { transform: scale(1.05); filter: brightness(1.12); }
  .lc-page .watch-btn:active { transform: scale(0.97); }

  .lc-page .collapse-btn { transition: all 0.15s; cursor: pointer; }
  .lc-page .collapse-btn:hover { background: rgba(255,255,255,0.1) !important; color: #f4f4f6 !important; }

  .lc-page .nav-input:focus {
    outline: none;
    border-color: rgba(240,62,62,0.55) !important;
    background: rgba(255,255,255,0.09) !important;
    box-shadow: 0 0 0 3px rgba(240,62,62,0.08);
  }

  .lc-page .shimmer-block {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%);
    background-size: 600px 100%;
    animation: shimmer 1.4s ease infinite;
  }
`;

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const LiveChannelsPage = () => {
  const [bundles, setBundles] = useState([]);
  // resolvedBundles: Map<row.id, { ...parsedBundle, channels: [...] }>
  const [resolvedBundles, setResolvedBundles] = useState({});
  const [allChannels, setAllChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [logoMap, setLogoMap] = useState({});

  const [activeBundle, setActiveBundle] = useState(null);
  const [activeBundleMeta, setActiveBundleMeta] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeSource, setActiveSource] = useState(null);
  const [playerUrl, setPlayerUrl] = useState("");
  const [iframeLoading, setIframeLoading] = useState(false);
  const [channelListOpen, setChannelListOpen] = useState(false);


  const iframeRef = useRef(null);
  const playRequestRef = useRef(0);
  const playerRef = useRef(null);

  /* In solo the player has no launcher to fall back to, so when a viewer
     closes a stream it tells us instead. Without this the frame would simply
     go black and stay there. */
  useEffect(() => {
    const onMessage = (e) => {
      /* Ad scripts post messages constantly and some carry an origin that is
         not a URL at all ("null" for a sandboxed frame), so this must never
         throw — an exception here would surface as a page error on every one. */
      let host = "";
      try { host = new URL(e.origin).host; } catch { return; }
      if (host !== "m3u8-player-orcin.vercel.app") return;
      if (e.data?.type === "anchor:close") {
        setPlayerUrl(null);
        setActiveChannel(null);
        setIframeLoading(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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

        /* Live TV is not an admin's bundle — it is the whole channel feed, the
           same one the player's own Live TV tab reads. It used to depend on
           somebody remembering to publish a ?tab=live row, and there is no such
           row in the table, so the page offered everything EXCEPT live TV while
           being called the Live TV page. It is always present now, and costs
           nothing extra: resolveBundle reads a feed the page already fetches. */
        const bundleRows = [...(rows || [])];
        if (!bundleRows.some((r) => String(r?.bundle_url || "").includes("tab=live"))) {
          bundleRows.unshift({
            id: "__live_tv__",
            title: "Live TV",
            bundle_url: "https://m3u8-player-orcin.vercel.app/?tab=live",
            is_active: true,
            _builtin: true,
          });
        }
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

  const playChannel = useCallback(async (ch, bundleMeta, parsedBundle) => {
    const requestId = ++playRequestRef.current;
    try {
      const map = await getChMap(true);
      if (requestId !== playRequestRef.current) return;
      const fresh = map[ch.id] || Object.values(map).find(item => item.name === ch.name);
      if (fresh) ch = { ...ch, ...fresh };
    } catch (error) {
      if (requestId !== playRequestRef.current) return;
    }
    const base = "https://m3u8-player-orcin.vercel.app/";
    const url = buildChannelUrl(base, ch);
    setActiveBundle(parsedBundle);
    setActiveBundleMeta(bundleMeta);
    setActiveChannel(ch);
    setPlayerUrl(url);
    setIframeLoading(true);
    setChannelListOpen(false);

    setTimeout(() => setIframeLoading(false), 1200);
    setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  const playBundle = useCallback((row) => {
    const fullBundle = resolvedBundles[row.id];
    if (!fullBundle?.channels?.length) return;
    playChannel(fullBundle.channels[0], row, fullBundle);
  }, [resolvedBundles, playChannel]);

  const catInfo = activeChannel ? getCat(activeBundleMeta?.category) : null;

  /* ── One list for the page: JioTV and Hotstar together ──────────────────
     Hotstar's channels play through the player's own Hotstar tab by id — the
     same link the Bigg Boss card uses — and JioTV's as they always have. Each
     is given a category and a language from its name (utils/channelMeta). */
  const [hotstar, setHotstar] = useState([]);
  useEffect(() => {
    fetch(`${NEW_JSON}?feed=hotstar`)
      .then((r) => r.json())
      .then((b) => setHotstar(Array.isArray(b?.channels) ? b.channels : []))
      .catch(() => { /* the JioTV channels still fill the page */ });
  }, []);
  const [activeKey, setActiveKey] = useState(null);
  /* Channels play in AnchorHD's own live player — the one live sports uses —
     given the same player link the cards elsewhere pass: ?tab=bb&id= for
     Hotstar, ?tab=live&id= for JioTV. It resolves the stream natively. */
  const [viewer, setViewer] = useState(null);   // { title, src, poster }
  const watch = useCallback((title, src, poster) => setViewer({ title, src, poster }), []);


  const liveTv = useMemo(() => {
    const hs = hotstar.filter((c) => c?.id && c?.url).map((c) => ({
      key: `hs:${c.id}`, name: displayName(c.name), rawName: c.name, logo: c.logo, group: c.group,
      play: () => watch(displayName(c.name), `${PLAYER}?tab=bb&id=${encodeURIComponent(c.id)}`, c.logo),
    }));
    // The whole JioTV feed, whether it came as the built-in row or a saved ?tab=live one.
    const jio = allChannels.filter((ch) => ch._parsedBundle?._format === "tab_live").map((ch) => ({
      key: `jio:${ch.id}`, name: ch.name, rawName: ch.name, logo: ch.logo, group: "",
      /* Our worker's channels (numeric ids) play in AnchorHD's player; the
         few that come only from the second feed keep the player page. */
      play: /^\d+$/.test(String(ch.id))
        ? () => watch(ch.name, `${PLAYER}?tab=live&id=${encodeURIComponent(ch.id)}`, ch.logo)
        : () => playChannel(ch, ch._bundleMeta, ch._parsedBundle),
    }));
    return [...hs, ...jio].map((c) => ({
      ...c, category: categoryOf(c.rawName, c.group), lang: languageOf(c.rawName), hd: isHD(c.rawName),
    }));
  }, [hotstar, allChannels, playChannel, watch]);
  const playTile = useCallback((c) => { setActiveKey(c.key); c.play(); }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="lc-page" style={{ minHeight: "100dvh", background: tokens.bg.base, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
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
    <div className="lc-page" style={{ minHeight: "100dvh", background: tokens.bg.base, color: tokens.text.primary, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

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

      {/* ══ BROWSE ══════════════════════════════════════════════════════════
          The hero while nothing plays; the player takes its place when
          something does. Then Live TV by category, narrowed by language, and
          any admin bundles. Live sports fixtures have their own page. */}
      <LiveTvBrowse channels={liveTv} activeKey={activeKey} onPlay={playTile} showHero={!playerUrl}>
        {bundles.filter((b) => !b._builtin && !b.bundle_url?.includes("tab=live") && resolvedBundles[b.id]?.channels?.length).map((row) => (
          <BundleSection key={row.id} row={row} parsed={resolvedBundles[row.id]} activeChannel={activeChannel}
            onPlayChannel={playChannel} onPlayBundle={playBundle} />
        ))}
      </LiveTvBrowse>

      <LiveViewer open={!!viewer} title={viewer?.title || ""} src={viewer?.src || ""} poster={viewer?.poster}
        onClose={() => { setViewer(null); setActiveKey(null); }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATES
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// BUNDLE SECTION
// ─────────────────────────────────────────────────────────────────────────────
const BundleSection = ({ row, parsed, activeChannel, onPlayChannel, onPlayBundle }) => {
  const [expanded, setExpanded] = useState(true);
  const channels = parsed.channels || [];
  const cfg = getCat(row.category);
  const CatIcon = getCatIcon(row.category);
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
