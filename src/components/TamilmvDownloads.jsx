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

/** The title's files: { loading, files }. A title from the latest releases
    is known by its TMDB id; any other is searched for by name and year. */
export function useTamilmv(tmdbId, contentType, title = "", year = "") {
  const [state, setState] = useState({ loading: !!(tmdbId || title), files: [] });
  useEffect(() => {
    if (!tmdbId && !title) { setState({ loading: false, files: [] }); return; }
    let alive = true;
    setState({ loading: true, files: [] });
    const type = contentType === "tv" ? "tv" : "movie";
    const qs = new URLSearchParams({ tmdb: `${type}:${tmdbId || 0}`, title: title || "", year: String(year || "") });
    fetch(`${apiBase}/api/fresh/files?${qs}`)
      .then((r) => r.json())
      .then((d) => alive && setState({ loading: false, files: Array.isArray(d?.files) ? d.files : [] }))
      .catch(() => alive && setState({ loading: false, files: [] }));
    return () => { alive = false; };
  }, [tmdbId, contentType, title, year]);
  return state;
}

/* The release name, read down to what a viewer cares about:
   "Sardar 2 (2026) TRUE WEB-DL - 4K SDR - HEVC - [Tam + Tel + Hin] - (DD+5.1 …) - 15GB - ESub.mkv"
     → { title: "Sardar 2 (2026)", episode: "", print: "TRUE WEB-DL", langs: ["Tamil", "Telugu", "Hindi"] }
   Codecs, audio formats and sizes are left out — quality and size have
   their own line. */
const LANG = {
  tam: "Tamil", tamil: "Tamil", tel: "Telugu", telugu: "Telugu", hin: "Hindi", hindi: "Hindi",
  mal: "Malayalam", malayalam: "Malayalam", kan: "Kannada", kannada: "Kannada", eng: "English", english: "English",
  ben: "Bengali", bengali: "Bengali", mar: "Marathi", marathi: "Marathi", pun: "Punjabi", punjabi: "Punjabi",
  guj: "Gujarati", gujarati: "Gujarati", jap: "Japanese", japanese: "Japanese", kor: "Korean", korean: "Korean",
  chi: "Chinese", spa: "Spanish", fre: "French",
};
const PRINT = /\b(TRUE\s+WEB-?DL|WEB-?DL|WEB-?Rip|Blu-?Ray|BDRip|HQ\s+HDRip|HDRip|HDTV|HQ\s+PreDVD|PreDVD|Pre-?HD|HQ\s+HDTC|HDTC|HDTS|HDCAM|DVDScr|DVDRip|UHD|HD)\b/i;
const PRINT_NAME = (p) => p.replace(/\s+/g, " ").replace(/web-?dl/i, "WEB-DL").replace(/web-?rip/i, "WEBRip")
  .replace(/blu-?ray/i, "BluRay").replace(/predvd/i, "PreDVD").replace(/pre-?hd/i, "PreHD").replace(/\btrue\b/i, "TRUE").replace(/\bhq\b/i, "HQ");

export function releaseLabel(name) {
  const raw = String(name || "").replace(/\.(mkv|mp4|avi|torrent)$/i, "").trim();
  const ym = raw.match(/^(.*?\((?:19|20)\d{2}\))/);
  const title = (ym ? ym[1] : raw.split(" - ")[0]).replace(/\s+/g, " ").trim();
  const rest = ym ? raw.slice(ym[1].length) : raw.slice(title.length);
  const ep = rest.match(/\bS(\d{1,3})\s*(?:EP?|E)\s*\(?\s*(\d{1,4}(?:\s*-\s*\d{1,4})?)\s*\)?/i);
  const episode = ep ? `S${ep[1].padStart(2, "0")} EP${ep[2].replace(/\s+/g, "")}` : "";
  const pm = rest.match(PRINT);
  const print = pm ? PRINT_NAME(pm[1]) : "";
  /* Languages: a bracketed list — "[Tam + Tel]" or "(Tamil + Hindi + Eng)" —
     or else a single one named before the print ("Tamil PreDVD"). */
  const toLangs = (s) => [...new Set(String(s).toLowerCase().split(/[^a-z]+/).map((w) => LANG[w]).filter(Boolean))];
  const group = [...rest.matchAll(/[[(]([^\])]+)[\])]/g)].map((m) => toLangs(m[1])).find((l) => l.length > 0);
  const langs = group || toLangs(rest.slice(0, pm ? pm.index : rest.length));
  return { title, episode, print, langs };
}

function FileRow({ file }) {
  const label = releaseLabel(file.name);
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
          <p className="text-[12px] text-gray-300 font-semibold truncate" title={file.name}>
            {label.title}{label.episode ? ` · ${label.episode}` : ""}
          </p>
          {(label.print || label.langs.length > 0) && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              {label.print && (
                <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded
                  ${CAM_PRINT.test(label.print) ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                  {label.print}
                </span>
              )}
              {label.langs.length > 0 && <span className="text-[11px] text-gray-500">{label.langs.join(", ")}</span>}
            </p>
          )}
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

/* Season, then episode, then the best quality first. The posts come newest
   first, so a series read "EP 97–100" before episode 1. */
const QUALITY_RANK = { "2160p": 4, "1080p": 3, "720p": 2, "480p": 1, "360p": 0 };
const CAM_PRINT = /PreDVD|PreHD|HDTC|HDTS|HDCAM|DVDScr/i;
const sizeInMB = (s) => { const m = String(s || "").match(/([\d.]+)\s*([GM])B/i); return m ? Number(m[1]) * (/g/i.test(m[2]) ? 1024 : 1) : 0; };
function orderFiles(files) {
  return files
    .map((f) => {
      const l = releaseLabel(f.name);
      const m = l.episode.match(/^S(\d+) EP(\d+)/);
      return { f, l, season: m ? Number(m[1]) : 0, ep: m ? Number(m[2]) : 0 };
    })
    .sort((a, b) => a.season - b.season || a.ep - b.ep
      // A clean print before a camera one of the same language.
      || Number(CAM_PRINT.test(a.l.print)) - Number(CAM_PRINT.test(b.l.print))
      || (QUALITY_RANK[b.f.quality] ?? -1) - (QUALITY_RANK[a.f.quality] ?? -1)
      || sizeInMB(b.f.size) - sizeInMB(a.f.size));
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
      {/* A series is grouped under each episode, in order. A film posted once
          per language gets one block per language — single languages first,
          then the multi-language versions — each in quality order. */}
      {(() => {
        const ordered = orderFiles(state.files);
        const series = ordered.some((x) => x.l.episode);
        const LANG_ORDER = ["Tamil", "Telugu", "Kannada", "Malayalam", "Hindi", "English"];
        const langKey = (l) => (l.langs.length ? l.langs.join(" + ") : "Other");
        const langRank = (key) => {
          const parts = key.split(" + ");
          const first = LANG_ORDER.indexOf(parts[0]);
          return (parts.length > 1 ? 100 : 0) + parts.length + (first < 0 ? 50 : first) / 10;
        };
        const groups = [];
        for (const x of ordered) {
          const key = series ? (x.l.episode || "") : langKey(x.l);
          const g = groups.find((y) => y.key === key);
          if (g) g.items.push(x.f); else groups.push({ key, items: [x.f] });
        }
        if (!series) groups.sort((a, b) => langRank(a.key) - langRank(b.key));
        return groups.map((g) => (
          <div key={g.key || "all"} className="space-y-2">
            {g.key && <p className="text-[11px] font-black uppercase tracking-[0.15em] text-violet-300/90 pt-1">{g.key}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {g.items.map((f, i) => <FileRow key={`${g.key}-${i}`} file={f} />)}
            </div>
          </div>
        ));
      })()}
    </div>
  );
}
