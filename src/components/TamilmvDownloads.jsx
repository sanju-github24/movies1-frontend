import React, { useEffect, useState } from "react";
import { Download, Loader2, Magnet, Zap } from "lucide-react";
import { backendUrl as apiBase } from "../utils/api";

/* Downloads for a title from the latest releases (backend /api/fresh): every
   file its posts carry, named without the site's prefix, with its quality
   and size. Download follows the post's direct link on the backend at the
   moment it is pressed — what it leads to stops working after a few hours —
   and hands the browser the file itself. A post without a direct link
   offers its magnet only.

   VITE_DL_RELAY, when set, is a relay that streams the file under its clean
   name; the file host names every download after the site otherwise. */

const RELAY = import.meta.env.VITE_DL_RELAY || "";

/** The title's files: { loading, files }. Empty for anything not in the list. */
export function useTamilmv(tmdbId, contentType) {
  const [state, setState] = useState({ loading: !!tmdbId, files: [] });
  useEffect(() => {
    if (!tmdbId) { setState({ loading: false, files: [] }); return; }
    let alive = true;
    setState({ loading: true, files: [] });
    const type = contentType === "tv" ? "tv" : "movie";
    fetch(`${apiBase}/api/fresh/files?tmdb=${type}:${tmdbId}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, files: Array.isArray(d?.files) ? d.files : [] }))
      .catch(() => alive && setState({ loading: false, files: [] }));
    return () => { alive = false; };
  }, [tmdbId, contentType]);
  return state;
}

function FileRow({ file }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const download = async () => {
    setBusy(true); setError("");
    try {
      const d = await fetch(`${apiBase}/api/fresh/direct?key=${encodeURIComponent(file.direct)}`).then((r) => r.json());
      if (!d?.url) throw new Error(d?.error || "No link came back");
      const ext = (d.url.split("?")[0].match(/\.(mkv|mp4|avi)$/i) || [".mkv"])[0];
      const name = /\.(mkv|mp4|avi)$/i.test(d.name || "") ? d.name : `${d.name || "video"}${ext}`;
      // The file is sent as an attachment, so this downloads without leaving the page.
      window.location.href = RELAY
        ? `${RELAY}?u=${encodeURIComponent(d.url)}&n=${encodeURIComponent(name)}`
        : d.url;
    } catch (e) {
      setError(e.message || "Couldn't get the file");
    } finally { setBusy(false); }
  };
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-2.5">
      <div className="flex items-start gap-3 min-w-0">
        <span className="p-2 rounded-lg bg-violet-500/10 text-violet-300 shrink-0"><Zap size={14} /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-200">{[file.quality, file.size].filter(Boolean).join(" · ") || "File"}</p>
          <p className="text-[11px] text-gray-500 line-clamp-2 break-all">{file.name}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {file.direct && (
          <button type="button" onClick={download} disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-bold py-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {busy ? "Getting the file…" : "Download"}
          </button>
        )}
        {file.magnet && (
          <a href={file.magnet} className={`${file.direct ? "" : "flex-1"} inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold py-2 px-3`}>
            <Magnet size={14} /> Magnet
          </a>
        )}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export default function TamilmvDownloads({ state }) {
  if (state.loading) return (
    <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-400" aria-busy="true">
      <Loader2 className="w-4 h-4 animate-spin text-violet-400" /> Loading direct downloads…
    </div>
  );
  if (!state.files.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-600/10 border border-violet-500/10"><Zap size={18} className="text-violet-300" /></div>
        <div>
          <h3 className="text-base font-black uppercase tracking-[0.15em] text-white">Direct downloads</h3>
          <p className="text-[11px] text-gray-500 font-semibold">{state.files.length} file{state.files.length === 1 ? "" : "s"} · newest release</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[28rem] overflow-y-auto pr-1">
        {state.files.map((f, i) => <FileRow key={i} file={f} />)}
      </div>
    </div>
  );
}
