import React, { useEffect, useState } from "react";
import { Download, Loader2, HardDrive } from "lucide-react";
import { backendUrl as apiBase } from "../utils/api";

/* More downloads for a title, from BollyFlix: the post that matches it, each
   quality it carries with its size, and the Google Drive button for each —
   the other mirrors are left out. The button opens in the viewer's own
   browser; the file host only answers a real browser.

   useBollyflix() fetches; the parent holds it, so its download button can
   appear for titles we hold nothing for. */

const norm = (s) => String(s || "").toLowerCase().replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const nameOf = (t) => norm(String(t || "").split(/\(|dual audio|multi audio|hindi|movie|season|web series/i)[0]);

/* The post that is this title: same name, and the same year when we know it. */
function pickPost(results, title, year) {
  const want = nameOf(title);
  if (!want) return null;
  const scored = results.map((r) => {
    const have = nameOf(r.title);
    let score = have === want ? 3 : have.startsWith(want) || want.startsWith(have) ? 1 : 0;
    if (score && year && r.year) score += String(r.year) === String(year) ? 2 : -2;
    return { r, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored[0]?.r || null;
}

/** The matching post's Google Drive files: { loading, post, files }. */
export function useBollyflix(title, year = "") {
  const [state, setState] = useState({ loading: !!title, post: null, files: [] });

  useEffect(() => {
    if (!title) { setState({ loading: false, post: null, files: [] }); return; }
    let alive = true;
    setState({ loading: true, post: null, files: [] });
    (async () => {
      try {
        const s = await fetch(`${apiBase}/api/bollyflix/search?q=${encodeURIComponent(nameOf(title))}`).then((r) => r.json());
        const post = pickPost(s.results || [], title, year);
        if (!post) { if (alive) setState({ loading: false, post: null, files: [] }); return; }
        const p = await fetch(`${apiBase}/api/bollyflix/post?url=${encodeURIComponent(post.url)}`).then((r) => r.json());
        /* Google Drive where there is one. A series post has none — each
           quality is a "Download Links" page listing its episodes — so a file
           without one keeps its own link rather than vanishing, which left
           every series with nothing. */
        const isDrive = (l) => /google\s*drive|gdrive|g-?drive/i.test(l.name);
        const files = (p.files || [])
          .map((f) => {
            const drive = (f.links || []).filter(isDrive);
            return drive.length ? { ...f, links: drive, kind: "Google Drive" } : { ...f, links: (f.links || []).slice(0, 1), kind: f.links?.[0]?.name || "Download" };
          })
          .filter((f) => f.links.length);
        if (alive) setState({ loading: false, post, files });
      } catch {
        if (alive) setState({ loading: false, post: null, files: [] });
      }
    })();
    return () => { alive = false; };
  }, [title, year]);

  return state;
}

/* `empty` is what to say when nothing turned up — given only when there is
   nothing else in the dialog either. */
export default function BollyflixDownloads({ state, empty = "" }) {
  // Still looking: say so, in the shape of what is coming.
  if (state.loading) return (
    <div className="space-y-3" aria-busy="true">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> Loading more download links…
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[66px] rounded-xl border border-white/[0.05] bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    </div>
  );
  if (!state.files.length) return empty
    ? <p className="py-8 text-center text-sm text-gray-500">{empty}</p>
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-sky-600/10 border border-sky-500/10"><HardDrive size={18} className="text-sky-400" /></div>
        <div className="min-w-0">
          <h3 className="text-base font-black uppercase tracking-[0.15em] text-white">{state.files.every((f) => f.kind === "Google Drive") ? "Google Drive" : "More downloads"}</h3>
          <p className="text-[11px] text-gray-500 font-semibold truncate">{state.post?.title}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {state.files.map((f, i) => (
          <a key={i} href={f.links[0].url} target="_blank" rel="noopener noreferrer nofollow"
            className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-sky-500/30 hover:bg-sky-500/5 transition flex items-center gap-3">
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20"><Download size={14} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-gray-200 group-hover:text-white">
                {f.quality || "Download"}{/10\s*bit/i.test(f.label) ? " · 10-bit" : ""}
              </span>
              <span className="block text-[11px] text-gray-500 truncate">{[f.size, f.series ? "Episodes" : "", f.kind].filter(Boolean).join(" · ")}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
