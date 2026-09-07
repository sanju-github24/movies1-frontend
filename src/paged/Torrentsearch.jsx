/* The torrent page.

   Two changes of substance over the old version. First, it searches OUR
   catalogue before it searches the web: every title we've uploaded already
   carries its magnet and direct links, so a query that matches the library
   is answered from the library instead of round-tripping to 1TamilMV for
   links we already hold. Only when nothing matches does it fall through to
   the scrapers, which behave exactly as they always did.

   Second, the download links that used to live on /movie/:slug are surfaced
   here, so a download-only title in the catalogue has somewhere to land.
   Catalogue cards link in with ?q=<title>, which runs the search on arrival.
*/
import React, { useState, useContext, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search, Loader2, Magnet, Download, ExternalLink, Copy, Check,
  Play, Globe, Library, AlertCircle, HardDrive, Users, HardDriveDownload,
} from "lucide-react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { loadCatalog } from "../utils/catalog";

const LANGUAGES = ["Tamil", "Telugu", "Kannada", "Malayalam", "Hindi", "Bengali", "Marathi", "Punjabi", "English"];
const SOURCES = [
  { id: "1TamilMV", param: "1tamilmv" },
  { id: "PirateBay", param: "piratebay" },
];

const isReal = (v) => !!v && v !== "Not Available" && v !== "No Magnet Found";

/* ── Copy-to-clipboard pill ── */
function CopyBtn({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  if (!isReal(text)) return null;
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard blocked — the link is still on screen */ }
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
        copied
          ? "bg-green-500/10 border-green-500/40 text-green-400"
          : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/25"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ── Link button, greyed out when the source didn't supply one ── */
function LinkBtn({ href, label, icon, tone = "blue" }) {
  const tones = {
    green: "bg-green-500/10 border-green-500/40 text-green-400 hover:bg-green-500/20",
    blue:  "bg-blue-500/10 border-blue-500/40 text-blue-400 hover:bg-blue-500/20",
    amber: "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20",
  };
  if (!isReal(href)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider border border-white/[0.04] bg-white/[0.01] text-gray-700 cursor-default">
        {icon} {label}
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all active:scale-95 ${tones[tone]}`}>
      {icon} {label}
    </a>
  );
}

/* ── One of our own catalogue titles, with the links we already hold ── */
function LibraryCard({ entry, signedLinks = {} }) {
  // A lapsed signed link is replaced by a freshly minted one where we got it.
  const liveUrl = (l) => (l.path && signedLinks[l.path]) || l.url || null;
  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.03] overflow-hidden">
      <div className="flex gap-4 p-4">
        <img
          src={entry.poster}
          alt=""
          loading="lazy"
          className="w-[68px] sm:w-[86px] aspect-[2/3] object-cover rounded-lg border border-white/10 shrink-0 bg-gray-900"
          onError={(e) => { e.currentTarget.src = "/default-poster.jpg"; }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2">{entry.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {entry.language.slice(0, 4).map((l) => (
              <span key={l} className="text-[9px] font-black uppercase tracking-wider text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded">{l}</span>
            ))}
            {entry.imdbRating && entry.imdbRating !== "NaN" && (
              <span className="text-[9px] font-black text-gray-400">★ {entry.imdbRating}</span>
            )}
          </div>
          {entry.streamable && (
            <Link to={`/watch/${entry.watchSlug}`}
              className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-2 rounded-lg bg-white text-black hover:bg-blue-600 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95">
              <Play className="w-3 h-3 fill-current" /> Watch Now
            </Link>
          )}
        </div>
      </div>

      {/* Our own drive — the copies we host ourselves, ahead of any torrent. */}
      {entry.driveLinks.length > 0 && (
        <div className="border-t border-white/5 bg-green-500/[0.03]">
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <HardDriveDownload className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Our drive</span>
            <span className="text-[9px] font-bold text-gray-700">direct · no torrent client</span>
          </div>
          <div className="divide-y divide-white/5">
            {entry.driveLinks.map((block) => (
              <div key={block.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <p className="text-[12px] font-bold text-gray-300 leading-snug flex-1">{block.quality}</p>
                  {block.size && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-gray-500 uppercase">
                      <HardDrive className="w-3 h-3" /> {block.size}
                    </span>
                  )}
                </div>
                {/* One link for a movie, one per episode for a series. */}
                <div className="flex flex-wrap gap-2">
                  {block.links.map((l, i) => (
                    <LinkBtn
                      key={`${block.id}-${i}`}
                      href={liveUrl(l)}
                      label={l.label}
                      tone="green"
                      icon={<Download className="w-3 h-3" />}
                    />
                  ))}
                  {block.links.length === 1 && <CopyBtn text={liveUrl(block.links[0])} label="Copy Link" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Torrent / mirror options stored against the catalogue entry */}
      <div className="border-t border-white/5 divide-y divide-white/5">
        {entry.downloads.map((d) => (
          <div key={d.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <p className="text-[12px] font-bold text-gray-300 leading-snug flex-1">{d.label}</p>
              {d.size && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-gray-500 uppercase">
                  <HardDrive className="w-3 h-3" /> {d.size}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkBtn href={d.magnet} label="Magnet" tone="green" icon={<Magnet className="w-3 h-3" />} />
              <LinkBtn href={d.direct} label="Direct" tone="blue" icon={<Download className="w-3 h-3" />} />
              {d.gpLink && <LinkBtn href={d.gpLink} label="Mirror" tone="amber" icon={<ExternalLink className="w-3 h-3" />} />}
              <CopyBtn text={d.magnet || d.direct} label="Copy Link" />
            </div>
          </div>
        ))}
        {entry.downloads.length === 0 && entry.driveLinks.length === 0 && entry.downloadPageUrl && (
          <div className="px-4 py-3">
            <LinkBtn href={entry.downloadPageUrl} label="Download Page" tone="amber" icon={<ExternalLink className="w-3 h-3" />} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── A scraped result from 1TamilMV / PirateBay ── */
function WebResultCard({ item }) {
  const seeders = Number(item.seeders);
  const seedTone = !Number.isFinite(seeders) || seeders === 0
    ? "text-gray-600" : seeders > 200 ? "text-green-400" : seeders > 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-bold text-gray-200 leading-snug flex-1">
          {item.quality || item.title || "Unknown"}
        </h3>
        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border ${
          item.source === "1TamilMV"
            ? "bg-red-500/10 text-red-400 border-red-500/25"
            : "bg-sky-500/10 text-sky-400 border-sky-500/25"
        }`}>
          {item.source}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-3.5 text-[11px] font-bold">
        {item.seeders && item.seeders !== "N/A" && (
          <span className={`inline-flex items-center gap-1.5 ${seedTone}`}>
            <Users className="w-3 h-3" /> {item.seeders} seeders
          </span>
        )}
        {item.leechers && item.leechers !== "N/A" && item.leechers !== "0" && (
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <Users className="w-3 h-3" /> {item.leechers} leechers
          </span>
        )}
        {item.info && <span className="text-gray-600 truncate max-w-[280px]">{item.info}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkBtn href={item.magnet} label="Magnet" tone="green" icon={<Magnet className="w-3 h-3" />} />
        <LinkBtn href={item.torrent_file} label="Torrent" tone="blue" icon={<Download className="w-3 h-3" />} />
        {isReal(item.direct_link) && (
          <LinkBtn href={item.direct_link} label="Direct" tone="amber" icon={<ExternalLink className="w-3 h-3" />} />
        )}
        <CopyBtn text={item.magnet} label="Copy Magnet" />
      </div>
    </div>
  );
}

const TorrentSearch = () => {
  const { backendUrl } = useContext(AppContext);
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get("q") || "");
  const [language, setLanguage] = useState("Kannada");
  const [source, setSource] = useState("1TamilMV");

  const [catalog, setCatalog] = useState([]);
  /* Separate from `catalog.length` so a failed load still releases the
     ?q= auto-search instead of leaving the page waiting forever. */
  const [catalogReady, setCatalogReady] = useState(false);
  const [webResults, setWebResults] = useState([]);
  const [webLoading, setWebLoading] = useState(false);
  const [webSearched, setWebSearched] = useState(false);
  const [submitted, setSubmitted] = useState(params.get("q") || "");
  const [signedLinks, setSignedLinks] = useState({});   // drive path → fresh signed url
  const [error, setError] = useState("");

  // The catalogue loads in the background; the web search never waits on it.
  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((err) => console.warn("[TorrentSearch] catalogue unavailable", err))
      .finally(() => setCatalogReady(true));
  }, []);

  /* Our own titles matching the query. Both the release name and its cleaned
     form are searched, so "kantara" finds "Kantara (2022) TRUE WEB-DL - […]". */
  const libraryMatches = useMemo(() => {
    const q = submitted.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((e) => e.downloadable &&
        (e.title.toLowerCase().includes(q) || e.cleanTitle.toLowerCase().includes(q)))
      .slice(0, 12);
  }, [catalog, submitted]);

  /* Stored drive links can be time-signed and long since lapsed, so mint a
     fresh one per path — exactly what the watch page does for its download
     section. A failure is harmless: the button keeps the stored URL. The cap
     keeps a series with dozens of episodes from firing dozens of requests. */
  useEffect(() => {
    const paths = [...new Set(
      libraryMatches.flatMap((e) => e.driveLinks.flatMap((b) => b.links.map((l) => l.path)))
        .filter(Boolean)
    )].slice(0, 60);
    if (!paths.length || !backendUrl) return;

    let alive = true;
    (async () => {
      const pairs = await Promise.all(paths.map(async (path) => {
        try {
          const { data } = await axios.get(`${backendUrl}/api/download-link`, {
            params: { path, hours: 24 }, timeout: 10000,
          });
          return data?.success && data.url ? [path, data.url] : null;
        } catch { return null; }
      }));
      if (alive) setSignedLinks((prev) => ({ ...prev, ...Object.fromEntries(pairs.filter(Boolean)) }));
    })();
    return () => { alive = false; };
  }, [libraryMatches, backendUrl]);

  const runWebSearch = useCallback(async (term) => {
    const movie = (term ?? submitted).trim();
    if (!movie) return;
    setWebLoading(true);
    setWebSearched(true);
    setError("");
    setWebResults([]);
    try {
      const param = SOURCES.find((s) => s.id === source)?.param || "1tamilmv";
      const url = `${backendUrl}/search?movie=${encodeURIComponent(movie)}&lang=${encodeURIComponent(language)}&source=${param}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data?.[0]?.error) throw new Error(data[0].error);
      setWebResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Search failed. Check your server connection.");
    } finally {
      setWebLoading(false);
    }
  }, [backendUrl, language, source, submitted]);

  /* A search resolves against the library first. Only a miss goes to the
     scrapers — matching the library means we already hold the links. */
  const handleSearch = useCallback((term) => {
    const q = (term ?? query).trim();
    if (!q) return;
    setSubmitted(q);
    setParams(q ? { q } : {}, { replace: true });
    setWebResults([]);
    setWebSearched(false);
    setError("");

    const lower = q.toLowerCase();
    const hit = catalog.some((e) => e.downloadable &&
      (e.title.toLowerCase().includes(lower) || e.cleanTitle.toLowerCase().includes(lower)));
    if (!hit) runWebSearch(q);
  }, [query, catalog, runWebSearch, setParams]);

  /* Arriving from a catalogue card (?q=…) runs the search once the catalogue
     is in hand, so a library title isn't sent to the scrapers by mistake. */
  const autoRan = useRef(false);
  useEffect(() => {
    const q = params.get("q");
    if (!q || autoRan.current || !catalogReady) return;
    autoRan.current = true;
    setQuery(q);
    handleSearch(q);
  }, [params, catalogReady, handleSearch]);

  const hasLibrary = libraryMatches.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 sm:px-8 py-10">
      <Helmet><title>Torrent Search | 1AnchorMovies</title></Helmet>

      <div className="max-w-4xl mx-auto">
        {/* ── Header ── */}
        <header className="mb-8 border-b border-gray-900 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <Magnet className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic">Torrent Search</h1>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
            Our library first · then 1TamilMV &amp; PirateBay
          </p>
        </header>

        {/* ── Search panel ── */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                placeholder="Movie or series name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-11 pr-4 py-3 bg-gray-950 border border-white/5 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition placeholder:text-gray-700"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={webLoading || !query.trim()}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 flex items-center justify-center gap-2">
              {webLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning</> : "Search"}
            </button>
          </div>

          {/* Web-source controls — only relevant to the fallback search */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest mr-1">Web source:</span>
            {SOURCES.map((s) => (
              <button key={s.id} onClick={() => setSource(s.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition ${
                  source === s.id
                    ? "bg-red-500/10 text-red-400 border-red-500/40"
                    : "bg-white/[0.02] text-gray-600 border-white/5 hover:text-gray-400"
                }`}>
                {s.id}
              </button>
            ))}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="ml-auto bg-gray-950 border border-white/5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-gray-400 outline-none focus:border-blue-500">
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* ── Library results ── */}
        {hasLibrary && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Library className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-black text-blue-400 uppercase tracking-widest">From our library</h2>
              <span className="text-[10px] font-bold text-gray-700">{libraryMatches.length} match{libraryMatches.length > 1 ? "es" : ""}</span>
              <div className="flex-1 h-px bg-gray-900" />
            </div>

            <div className="flex flex-col gap-4">
              {libraryMatches.map((entry) => (
                <LibraryCard key={entry.key} entry={entry} signedLinks={signedLinks} />
              ))}
            </div>

            {/* The web is still one click away when our copy isn't what they want. */}
            {!webSearched && (
              <div className="flex justify-center mt-6">
                <button onClick={() => runWebSearch()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95">
                  <Globe className="w-3.5 h-3.5" /> Search {source} as well
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold mb-6">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Web results ── */}
        {webLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <p className="text-gray-600 font-mono uppercase tracking-widest text-[10px]">Scanning {source}…</p>
          </div>
        )}

        {webSearched && !webLoading && !error && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">{source} results</h2>
              <span className="text-[10px] font-bold text-gray-700">{webResults.length} found</span>
              <div className="flex-1 h-px bg-gray-900" />
            </div>

            {webResults.length === 0 ? (
              <div className="py-14 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No results found</p>
                <p className="text-gray-700 text-[11px] mt-1.5">Try a different title, source or language.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {webResults.map((item, i) => <WebResultCard key={`${item.magnet || item.title || i}-${i}`} item={item} />)}
              </div>
            )}
          </section>
        )}

        {/* ── Idle state ── */}
        {!submitted && (
          <div className="py-16 text-center">
            <Magnet className="w-12 h-12 text-gray-800 mx-auto mb-4" />
            <p className="text-gray-600 font-black uppercase tracking-widest text-xs">Search for a title</p>
            <p className="text-gray-700 text-[11px] mt-1.5 max-w-sm mx-auto">
              Titles we host answer straight from our own library. Anything else goes out to {source}.
            </p>
          </div>
        )}

        {/* Nothing anywhere — library missed and the web search came back empty */}
        {submitted && !hasLibrary && !webSearched && !webLoading && !error && (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 text-gray-700 animate-spin mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TorrentSearch;
