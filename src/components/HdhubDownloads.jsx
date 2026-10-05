import React, { useEffect, useState } from "react";
import { Download, Loader2, Server, ChevronDown, ExternalLink } from "lucide-react";
import { backendUrl as apiBase } from "../utils/api";

/* More downloads for a title, from HDHub4u: each quality the matching post
   carries, with its size. The site's wait pages are skipped by the backend,
   so each one is the file host's page; opening one asks for its servers
   (10Gbps, PixelDrain, Buzz…), which are the file itself — one tap and the
   download starts. The host's own page stays as a fallback.

   useHdhub() fetches; the parent holds it, beside useBollyflix. */

/** The matching post's files: { loading, post, files }. */
export function useHdhub(title, year = "", imdb = "") {
  const [state, setState] = useState({ loading: !!(title || imdb), post: null, files: [] });

  useEffect(() => {
    if (!title && !imdb) { setState({ loading: false, post: null, files: [] }); return; }
    let alive = true;
    setState({ loading: true, post: null, files: [] });
    const qs = new URLSearchParams({ q: title || "", year: String(year || ""), imdb: imdb || "" });
    fetch(`${apiBase}/api/hdhub/files?${qs}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, post: d.post || null, files: d.files || [] }))
      .catch(() => alive && setState({ loading: false, post: null, files: [] }));
    return () => { alive = false; };
  }, [title, year, imdb]);

  return state;
}

/* One quality. Its servers are asked for when it is opened — their links
   carry tokens that run out, so not before. */
function FileRow({ file }) {
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState(null);   // null = not asked yet
  const [error, setError] = useState("");
  const link = file.links[0]?.url;

  const toggle = () => {
    setOpen((o) => !o);
    if (servers || !link) return;
    setServers("loading");
    fetch(`${apiBase}/api/hdhub/servers?url=${encodeURIComponent(link)}`)
      .then((r) => r.json())
      .then((d) => { setServers(d.servers || []); if (!d.servers?.length) setError(d.error || "No servers answered for this file."); })
      .catch(() => { setServers([]); setError("Couldn't reach the file host."); });
  };

  return (
    <div className={`rounded-xl border transition ${open ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/[0.05] bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/5"}`}>
      <button type="button" onClick={toggle} aria-expanded={open} className="group w-full p-4 flex items-center gap-3 text-left">
        <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20"><Download size={14} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-200 group-hover:text-white">
            {file.quality || "Download"}{/10\s*bit/i.test(file.label) ? " · 10-bit" : ""}{/hevc|x265/i.test(file.label) ? " · HEVC" : ""}
          </span>
          <span className="block text-[11px] text-gray-500 truncate">{[file.size, file.series ? "Episodes" : "", file.label.replace(/\[.*?\]|\b(480|540|720|1080|2160)p\b|\b10\s*bit\b|\bhevc\b|\bx265\b|⚡/gi, " ").replace(/\s+/g, " ").trim()].filter(Boolean).join(" · ")}</span>
        </span>
        <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 -mt-1 space-y-2">
          {servers === "loading" && (
            <p className="flex items-center gap-2 text-xs text-gray-400 py-1"><Loader2 size={14} className="animate-spin text-emerald-400" /> Finding servers…</p>
          )}
          {Array.isArray(servers) && servers.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer nofollow"
              className="flex items-center gap-2.5 rounded-lg bg-white/[0.05] border border-white/[0.06] px-3 py-2.5 text-sm font-semibold text-gray-200 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-white transition">
              <Server size={14} className="text-emerald-400 shrink-0" />
              <span className="flex-1 truncate">{s.name}</span>
              <Download size={14} className="text-gray-500 shrink-0" />
            </a>
          ))}
          {Array.isArray(servers) && !servers.length && <p className="text-xs text-gray-500 py-1">{error}</p>}
          {link && Array.isArray(servers) && (
            <a href={link} target="_blank" rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 pt-1">
              <ExternalLink size={12} /> Open on {file.kind}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function HdhubDownloads({ state }) {
  if (state.loading) return (
    <div className="space-y-3" aria-busy="true">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Loading HDHub4u links…
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[0, 1].map((i) => <div key={i} className="h-[66px] rounded-xl border border-white/[0.05] bg-white/[0.03] animate-pulse" />)}
      </div>
    </div>
  );
  if (!state.files.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-600/10 border border-emerald-500/10"><Server size={18} className="text-emerald-400" /></div>
        <div className="min-w-0">
          <h3 className="text-base font-black uppercase tracking-[0.15em] text-white">HDHub4u</h3>
          <p className="text-[11px] text-gray-500 font-semibold truncate">{state.post?.title}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
        {state.files.map((f, i) => <FileRow key={i} file={f} />)}
      </div>
    </div>
  );
}
