import React, { useEffect, useState } from "react";
import { Download, Loader2, Server, ChevronDown, ExternalLink } from "lucide-react";
import { backendUrl as apiBase } from "../utils/api";

/* VITE_DL_RELAY, when set, streams the file under its clean name — HDHub4u
   stamps "…-HDHub4u.Ms" on every file. Only the direct-file hosts the relay
   allows are sent through it; a landing page (Buzz/fuckingfast) or a host it
   has rotated to is left to open straight, under the host's own name. */
const RELAY = import.meta.env.VITE_DL_RELAY || "";
const RELAY_HOSTS = /(^|\.)(pixeldrain\.dev|cloudflarestorage\.com|googleusercontent\.com)$/i;
const viaRelay = (url, name) => {
  if (!RELAY || !name) return url;
  try { if (!RELAY_HOSTS.test(new URL(url).hostname)) return url; } catch { return url; }
  return `${RELAY}?u=${encodeURIComponent(url)}&n=${encodeURIComponent(name)}`;
};

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
  const [name, setName] = useState("");            // the file's real name, for the relay
  const [error, setError] = useState("");
  const link = file.links[0]?.url;

  const toggle = () => {
    setOpen((o) => !o);
    if (servers || !link) return;
    setServers("loading");
    fetch(`${apiBase}/api/hdhub/servers?url=${encodeURIComponent(link)}`)
      .then((r) => r.json())
      .then((d) => { setName(d.name || ""); setServers(d.servers || []); if (!d.servers?.length) setError(d.error || "No servers answered for this file."); })
      .catch(() => { setServers([]); setError("Couldn't reach the file host."); });
  };

  return (
    <div className={`rounded-xl border transition ${open ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/[0.05] bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/5"}`}>
      <button type="button" onClick={toggle} aria-expanded={open} className="group w-full p-4 flex items-center gap-3 text-left">
        <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20"><Download size={14} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-200 group-hover:text-white">
            {file.quality || "Download"}{!file.episode && file.series === false && /pack|zip/i.test(file.label) ? " · ZIP" : ""}{/10\s*bit/i.test(file.label) ? " · 10-bit" : ""}{/hevc|x265/i.test(file.label) ? " · HEVC" : ""}
          </span>
          <span className="block text-[11px] text-gray-500 truncate">{[file.size, file.series && !file.episode ? "Episodes" : "", file.episode ? `Episode ${file.episode}` : "", file.label.replace(/[–-]\s*drive\s*\|\s*instant/i, "").replace(/\[.*?\]|\b(480|540|720|1080|2160)p\b|\b10\s*bit\b|\bhevc\b|\bx265\b|⚡/gi, " ").replace(/\s+/g, " ").trim()].filter(Boolean).join(" · ")}</span>
        </span>
        <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 -mt-1 space-y-2">
          {servers === "loading" && (
            <p className="flex items-center gap-2 text-xs text-gray-400 py-1"><Loader2 size={14} className="animate-spin text-emerald-400" /> Finding servers…</p>
          )}
          {Array.isArray(servers) && servers.map((s, i) => (
            <a key={i} href={viaRelay(s.url, name)} target="_blank" rel="noopener noreferrer nofollow"
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
              <ExternalLink size={12} /> Open file page
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* The site's name is never shown — a source is "Server N", N its place in
   the dialog. Its post title can carry the name too, so that is taken out. */
const SITE_NAMES = /\s*[|\-–]?\s*\b(hdhub4u|india4movies|1?tamilmv|bollyflix|multicloudlinks)\b(\.\w+)?/gi;

/* A series is downloaded an episode at a time: a post that lists its episodes
   gives only those (its season packs left out), grouped under each episode —
   or just the one asked for, from that episode's own download button. */
export default function HdhubDownloads({ state, serverNo = 1, episode = null }) {
  if (state.loading) return (
    <div className="space-y-3" aria-busy="true">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Loading more servers…
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[0, 1].map((i) => <div key={i} className="h-[66px] rounded-xl border border-white/[0.05] bg-white/[0.03] animate-pulse" />)}
      </div>
    </div>
  );
  const perEpisode = state.files.some((f) => f.episode > 0);
  const files = perEpisode ? state.files.filter((f) => f.episode > 0 && (!episode || f.episode === episode)) : state.files;
  if (!files.length) return null;
  // The season's packs — what the post lists before its episodes — go last, as the full season.
  const packs = perEpisode ? state.files.filter((f) => !f.episode) : [];
  const groups = perEpisode
    ? [...[...new Set(files.map((f) => f.episode))].sort((a, b) => a - b).map((ep) => ({ ep, files: files.filter((f) => f.episode === ep) })),
       ...(packs.length ? [{ ep: "zip", files: packs }] : [])]
    : [{ ep: 0, files }];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-600/10 border border-emerald-500/10"><Server size={18} className="text-emerald-400" /></div>
        <div className="min-w-0">
          <h3 className="text-base font-black uppercase tracking-[0.15em] text-white">Server {serverNo}</h3>
          <p className="text-[11px] text-gray-500 font-semibold truncate">{(state.post?.title || "").replace(SITE_NAMES, "")}</p>
        </div>
      </div>
      {groups.map((g) => (
        <div key={g.ep} className="space-y-2">
          {g.ep !== 0 && <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 pt-1">{g.ep === "zip" ? "Full season · ZIP" : `Episode ${g.ep}`}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
            {g.files.map((f, i) => <FileRow key={i} file={f} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
