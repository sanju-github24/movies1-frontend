import { useState } from "react";
import { Search, Loader2, Check } from "lucide-react";
import { backendUrl as apiBase } from "../utils/api";

/* "Search subtitles online" — for AnchorHD's subtitle panels.
 *
 * Asks our /api/subs (SubDL, by the title's TMDB or IMDb id, and the
 * episode for a series) in the language chosen, lists what it has — this
 * episode's own files first, season packs after — and hands the chosen one
 * to the player as WebVTT text. The backend unzips it, picks the episode's
 * file out of a pack and converts it, so the player only ever gets VTT. */

const LANGS = [
  ["EN", "English"], ["HI", "Hindi"], ["TA", "Tamil"], ["TE", "Telugu"], ["ML", "Malayalam"],
  ["KN", "Kannada"], ["BN", "Bengali"], ["AR", "Arabic"], ["ES", "Spanish"], ["FR", "French"],
  ["ID", "Indonesian"], ["MS", "Malay"], ["KO", "Korean"], ["JA", "Japanese"], ["ZH", "Chinese"],
];
const LANG_KEY = "anchorhd:sub-lang";
const savedLang = () => { try { return localStorage.getItem(LANG_KEY) || "EN"; } catch { return "EN"; } };

export default function OnlineSubtitles({ tmdbId, imdbId, isSeries, season, episode, activeId, onPick }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(savedLang);
  const [state, setState] = useState({ loading: false, subs: null, error: "" });
  const [loadingId, setLoadingId] = useState("");

  if (!tmdbId && !imdbId) return null;

  const search = async (code = lang) => {
    setState({ loading: true, subs: null, error: "" });
    const qs = new URLSearchParams({ tmdb: String(tmdbId || ""), imdb: String(imdbId || ""), lang: code });
    if (isSeries) { qs.set("type", "tv"); qs.set("season", String(season || 1)); qs.set("episode", String(episode || 1)); }
    try {
      const r = await fetch(`${apiBase}/api/subs/search?${qs}`);
      const d = await r.json();
      setState({ loading: false, subs: d.subs || [], error: r.ok ? "" : d.error || "Search failed" });
    } catch {
      setState({ loading: false, subs: [], error: "Could not reach the subtitle search" });
    }
  };

  const pickLang = (code) => {
    setLang(code);
    try { localStorage.setItem(LANG_KEY, code); } catch { /* private mode */ }
    search(code);
  };

  const choose = async (s) => {
    setLoadingId(s.id);
    const qs = new URLSearchParams({ id: s.id });
    if (isSeries) { qs.set("season", String(season || 1)); qs.set("episode", String(episode || 1)); }
    try {
      const r = await fetch(`${apiBase}/api/subs/file?${qs}`);
      if (!r.ok) throw new Error(await r.text());
      onPick(await r.text(), `${s.language || s.lang} · online`, s.id);
    } catch {
      setState((st) => ({ ...st, error: "That one could not be loaded — try another" }));
    }
    setLoadingId("");
  };

  if (!open) {
    return (
      <button type="button" onClick={() => { setOpen(true); search(); }}
        className="flex w-[calc(100%-1.5rem)] items-center gap-2 mx-3 mb-2 px-3 py-2 rounded-lg border border-white/15 hover:border-blue-500/50 text-white/70 hover:text-white transition-all">
        <Search size={16} /><span className="text-xs font-medium">Search subtitles online</span>
      </button>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <Search size={14} className="text-white/50 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">Online</span>
        <select value={lang} onChange={(e) => pickLang(e.target.value)}
          className="ml-auto bg-white/10 text-white text-xs font-medium rounded-md px-2 py-1 outline-none border border-white/10">
          {LANGS.map(([c, n]) => <option key={c} value={c} className="bg-[#16181f]">{n}</option>)}
        </select>
      </div>
      <div className="max-h-56 overflow-y-auto pb-1">
        {state.loading && (
          <p className="flex items-center gap-2 px-3 py-2 text-xs text-white/50"><Loader2 size={14} className="animate-spin" /> Searching…</p>
        )}
        {!state.loading && state.subs?.length === 0 && (
          <p className="px-3 py-2 text-xs text-white/40">{state.error || "None in this language — try another."}</p>
        )}
        {!state.loading && state.subs?.length > 0 && state.error && <p className="px-3 pb-1 text-xs text-red-300/80">{state.error}</p>}
        {!state.loading && (state.subs || []).map((s) => (
          <button key={s.id} type="button" onClick={() => choose(s)} disabled={!!loadingId}
            className={`w-full flex items-start gap-2 px-3 py-1.5 text-left transition-colors disabled:opacity-60 ${activeId === s.id ? "text-blue-400" : "text-white/80 hover:text-white hover:bg-white/5"}`}>
            <span className="w-[15px] shrink-0 pt-0.5">
              {loadingId === s.id ? <Loader2 size={14} className="animate-spin" /> : activeId === s.id ? <Check size={15} /> : null}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium leading-snug break-words line-clamp-2">{s.release}</span>
              <span className="block text-[10px] text-white/40 mt-0.5">
                {s.language}{s.hi ? " · HI" : ""}{s.pack ? " · season pack" : ""}{s.author ? ` · ${s.author}` : ""}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
