import React, { useEffect, useState } from "react";
import { Download, Loader2, Server, ChevronDown, ExternalLink } from "lucide-react";
import { backendUrl as apiBase } from "../utils/api";

/* VITE_DL_RELAY, when set, saves the file under a clean name: India4Movies
   stamps "…-india4Movies.ORG" on every file. Only MultiCloudLinks' Turbo
   (R2) link is a file the relay can stream; the relay reads the name from
   the host itself, tag off. The mirrors are landing pages and open as they
   are. */
const RELAY = import.meta.env.VITE_DL_RELAY || "";
const viaRelay = (url) => {
  if (!RELAY) return url;
  try { if (!/(^|\.)multidownload\.lol$/i.test(new URL(url).hostname)) return url; } catch { return url; }
  return `${RELAY}?u=${encodeURIComponent(url)}`;
};
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, "").split(".").slice(-2, -1)[0] || "host"; } catch { return "host"; } };

/* More downloads for a title, from India4Movies: one post per language, each
   quality with its size. Newer posts put the files on MultiCloudLinks —
   opening one asks for its servers (Turbo R2, VikingFile, PixelDrain,
   GDFlix…). Older ones link a file host's page, opened as it is.

   useIndia4movies() fetches; the parent holds it, beside useHdhub. */

/** The title's posts: { loading, posts }. */
export function useIndia4movies(title, year = "") {
  const [state, setState] = useState({ loading: !!title, posts: [] });

  useEffect(() => {
    if (!title) { setState({ loading: false, posts: [] }); return; }
    let alive = true;
    setState({ loading: true, posts: [] });
    const qs = new URLSearchParams({ q: title, year: String(year || "") });
    fetch(`${apiBase}/api/i4m/files?${qs}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, posts: (d.posts || []).filter((p) => p.files?.length) }))
      .catch(() => alive && setState({ loading: false, posts: [] }));
    return () => { alive = false; };
  }, [title, year]);

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

/* One quality. A MultiCloudLinks file's servers are asked for when it is
   opened — their links carry tokens that run out, so not before. */
function FileRow({ file }) {
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState(file.code ? null : file.links);   // null = not asked yet
  const [error, setError] = useState("");

  const toggle = () => {
    setOpen((o) => !o);
    if (servers || !file.code) return;
    setServers("loading");
    fetch(`${apiBase}/api/i4m/servers?code=${encodeURIComponent(file.code)}`)
      .then((r) => r.json())
      .then((d) => { setServers(d.servers || []); if (!d.servers?.length) setError(d.error || "No servers answered for this file."); })
      .catch(() => { setServers([]); setError("Couldn't reach the file host."); });
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
          {file.code && Array.isArray(servers) && (
            <a href={file.url} target="_blank" rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 pt-1">
              <ExternalLink size={12} /> Open on MultiCloudLinks
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function India4moviesDownloads({ state }) {
  if (state.loading) return (
    <div className="space-y-3" aria-busy="true">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin text-orange-400" /> Loading India4Movies links…
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[0, 1].map((i) => <div key={i} className="h-[66px] rounded-xl border border-white/[0.05] bg-white/[0.03] animate-pulse" />)}
      </div>
    </div>
  );
  if (!state.posts.length) return null;

  return (
    <div className="space-y-5">
      {state.posts.map((p) => (
        <div key={p.url} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-600/10 border border-orange-500/10"><Server size={18} className="text-orange-400" /></div>
            <div className="min-w-0">
              <h3 className="text-base font-black uppercase tracking-[0.15em] text-white">
                India4Movies{p.lang ? <span className="text-orange-400"> · {p.lang}</span> : null}
              </h3>
              <p className="text-[11px] text-gray-500 font-semibold truncate">{p.title}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
            {rowsOf(p.files).map((f, i) => <FileRow key={i} file={f} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
