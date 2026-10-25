import React, { useEffect, useState } from "react";
import { Download, Loader2, Server, ChevronDown, ExternalLink } from "lucide-react";
import { backendUrl as apiBase } from "../utils/api";

/* VITE_DL_RELAY, when set, saves the file under a clean name: India4Movies
   stamps "…-india4Movies.ORG" on every file, its older posts
   "www.1Full4Movies.com - …". Only links that are the file itself go
   through the relay — MultiCloudLinks' Turbo (R2), an older file's Direct
   Download (a …workers.dev/download/ link) and HubCloud's 10Gbps — and it
   reads the name from the host, tag off. The mirrors are landing pages and
   open as they are. */
const RELAY = import.meta.env.VITE_DL_RELAY || "";
const viaRelay = (url) => {
  if (!RELAY) return url;
  try {
    const u = new URL(url);
    const file = /(^|\.)(multidownload\.lol|googleusercontent\.com|pixeldrain\.dev)$/i.test(u.hostname)
      || (/\.workers\.dev$/i.test(u.hostname) && /^\/download\//.test(u.pathname));
    if (!file) return url;
  } catch { return url; }
  return `${RELAY}?u=${encodeURIComponent(url)}`;
};
/* An older post's file: a full4drive page and, beside it, a HubCloud copy —
   each followed by the backend to the file itself. */
const RESOLVABLE = /^https:\/\/(?:[a-z0-9-]+\.)?(?:full4drive\.[a-z]+\/file|hubcloud\.[a-z]+\/(?:drive|video))\//i;
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, "").split(".").slice(-2, -1)[0] || "host"; } catch { return "host"; } };

/* More downloads for a title, from India4Movies: one post per language, each
   quality with its size. Newer posts put the files on MultiCloudLinks —
   opening one asks for its servers (Turbo R2, VikingFile, PixelDrain,
   GDFlix…). Older ones link a file host's page, opened as it is.

   useIndia4movies() fetches; the parent holds it, beside useHdhub. */

/** The title's posts: { loading, posts }. */
export function useIndia4movies(title, year = "", tv = false) {
  const [state, setState] = useState({ loading: !!title, posts: [] });

  useEffect(() => {
    if (!title) { setState({ loading: false, posts: [] }); return; }
    let alive = true;
    setState({ loading: true, posts: [] });
    /* A series is asked for as one: its posts are "… Season 1", which a
       film's search leaves out. tv "any" — a search box, which cannot tell —
       takes both. */
    const qs = new URLSearchParams({ q: title, year: String(year || ""), ...(tv ? { type: tv === "any" ? "any" : "tv" } : {}) });
    fetch(`${apiBase}/api/i4m/files?${qs}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, posts: (d.posts || []).filter((p) => p.files?.length) }))
      .catch(() => alive && setState({ loading: false, posts: [] }));
    return () => { alive = false; };
  }, [title, year, tv]);

  return state;
}

/* An older post lists one file twice ("Direct-Download", then
   "Instant-Download" on another host): one row, both links. */
const rowsOf = (files) => {
  const rows = [];
  for (const f of files) {
    const prev = rows[rows.length - 1];
    if (!f.code && prev && !prev.code && prev.quality === f.quality && prev.size === f.size)
      prev.links.push({ name: f.label || hostOf(f.url), url: f.url });
    else rows.push({ ...f, links: [{ name: f.label || hostOf(f.url), url: f.url }] });
  }
  return rows;
};

/* One quality. Its servers are asked for when it is opened — their links
   carry tokens that run out, so not before: a MultiCloudLinks file's list,
   or each copy an older post gives (full4drive, HubCloud), all asked at
   once, whichever answer kept. */
function FileRow({ file }) {
  const pages = file.code ? [] : file.links.map((l) => l.url).filter((u) => RESOLVABLE.test(u));
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState(file.code || pages.length ? null : file.links);   // null = not asked yet
  const [error, setError] = useState("");

  const toggle = () => {
    setOpen((o) => !o);
    if (servers || (!file.code && !pages.length)) return;
    setServers("loading");
    const asks = file.code ? [`code=${encodeURIComponent(file.code)}`] : pages.map((u) => `url=${encodeURIComponent(u)}`);
    Promise.all(asks.map((q) => fetch(`${apiBase}/api/i4m/servers?${q}`).then((r) => r.json()).catch(() => null)))
      .then((all) => {
        const seen = new Set();
        const list = all.flatMap((d) => d?.servers || []).filter((x) => x?.url && !seen.has(x.url) && seen.add(x.url));
        setServers(list);
        if (!list.length) setError(all.find((d) => d?.error)?.error || (all.every((d) => !d) ? "Couldn't reach the file host." : "No servers answered for this file."));
      });
  };

  const extra = file.label.replace(/\[|\]|\b(480|540|720|1080|2160)p\b|[\d.]+\s*[GM]B|download now|direct-download|–|-/gi, " ").replace(/\s+/g, " ").trim();
  return (
    <div className={`rounded-xl border transition ${open ? "border-orange-500/30 bg-orange-500/[0.04]" : "border-white/[0.05] bg-white/[0.02] hover:border-orange-500/30 hover:bg-orange-500/5"}`}>
      <button type="button" onClick={toggle} aria-expanded={open} className="group w-full p-4 flex items-center gap-3 text-left">
        <span className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20"><Download size={14} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-200 group-hover:text-white">
            {file.quality || "Download"}{extra ? ` · ${extra}` : ""}
          </span>
          <span className="block text-[11px] text-gray-500 truncate">{[file.size, file.info].filter(Boolean).join(" · ")}</span>
        </span>
        <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 -mt-1 space-y-2">
          {servers === "loading" && (
            <p className="flex items-center gap-2 text-xs text-gray-400 py-1"><Loader2 size={14} className="animate-spin text-orange-400" /> Finding servers…</p>
          )}
          {Array.isArray(servers) && servers.map((s, i) => (
            <a key={i} href={viaRelay(s.url)} target="_blank" rel="noopener noreferrer nofollow"
              className="flex items-center gap-2.5 rounded-lg bg-white/[0.05] border border-white/[0.06] px-3 py-2.5 text-sm font-semibold text-gray-200 hover:bg-orange-500/15 hover:border-orange-500/30 hover:text-white transition">
              <Server size={14} className="text-orange-400 shrink-0" />
              <span className="flex-1 truncate">{s.name}</span>
              <Download size={14} className="text-gray-500 shrink-0" />
            </a>
          ))}
          {Array.isArray(servers) && !servers.length && <p className="text-xs text-gray-500 py-1">{error}</p>}
          {Array.isArray(servers) && (file.code ? [file.url] : pages).map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 pt-1 mr-4">
              <ExternalLink size={12} /> Open file page
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* A series post's quality is a list page — a Batch/Zip and "Episode 1",
   "Episode 2"… each its own MultiCloudLinks file. Opened as it was, that
   list came back as the "servers", and an episode sent the viewer off to
   MultiCloudLinks. So a series is shown an episode at a time instead: each
   episode with its qualities, every one its own code whose servers are
   asked for when opened, like a film's file — and the Batch/Zip after,
   as the full season. */
const MCL = "https://new3.multicloudlinks.com";
const episodeGroups = (files, only) => {
  const by = new Map();
  for (const f of files) for (const e of f.episodes || []) {
    if (only && e.ep !== only) continue;
    if (!by.has(e.ep)) by.set(e.ep, []);
    by.get(e.ep).push({ ...f, label: f.quality || "", size: "", code: e.code, url: `${MCL}/view/${e.code}`, episodes: [] });
  }
  return [...by.keys()].sort((a, b) => a - b).map((ep) => ({ ep, files: by.get(ep) }));
};
/* The season in one file per quality — each list page's Batch/Zip. */
const zipFiles = (files) => files.filter((f) => f.zip?.code).map((f) => ({
  ...f, label: `${f.quality || ""} ZIP`, size: f.zip.size || "", info: "Full season", code: f.zip.code,
  url: `${MCL}/view/${f.zip.code}`, episodes: [], links: [{ name: "", url: `${MCL}/view/${f.zip.code}` }],
}));

/* The site's name is never shown — each post is "Server N", N its place. */
export default function India4moviesDownloads({ state, serverNo = 1, episode = null, season = null }) {
  if (state.loading) return (
    <div className="space-y-3" aria-busy="true">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin text-orange-400" /> Loading more servers…
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[0, 1].map((i) => <div key={i} className="h-[66px] rounded-xl border border-white/[0.05] bg-white/[0.03] animate-pulse" />)}
      </div>
    </div>
  );
  /* From an episode's button: that season's posts only, and in each, that
     episode — a post with no episode list (an older one) has nothing for it. */
  const posts = state.posts
    .filter((p) => !season || !p.season || Number(p.season) === Number(season))
    .filter((p) => !episode || p.files.some((f) => f.episodes?.length));
  if (!posts.length) return null;

  return (
    <div className="space-y-5">
      {posts.map((p, n) => (
        <div key={p.url} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-600/10 border border-orange-500/10"><Server size={18} className="text-orange-400" /></div>
            <div className="min-w-0">
              <h3 className="text-base font-black uppercase tracking-[0.15em] text-white">
                Server {serverNo + n}{p.lang ? <span className="text-orange-400"> · {p.lang}</span> : null}
              </h3>
              <p className="text-[11px] text-gray-500 font-semibold truncate">{p.title.replace(/\s*[|\-–]?\s*\b(india4movies|full4movies)\b(\.\w+)?/gi, "")}</p>
            </div>
          </div>
          {p.files.some((f) => f.episodes?.length)
            ? [...episodeGroups(p.files, episode), ...(zipFiles(p.files).length ? [{ ep: "zip", files: zipFiles(p.files) }] : [])].map((g) => (
              <div key={g.ep} className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 pt-1">{g.ep === "zip" ? "Full season · ZIP" : `Episode ${g.ep}`}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                  {g.files.map((f) => <FileRow key={f.code} file={{ ...f, links: [{ name: "", url: f.url }] }} />)}
                </div>
              </div>
            ))
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                {rowsOf(p.files).map((f, i) => <FileRow key={i} file={f} />)}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
