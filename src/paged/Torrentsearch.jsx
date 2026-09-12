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

/* One fallback index, not a menu. The picker used to offer a choice between
   two, which promised the reader control over something that changes nothing
   they can see — and named sources the page cannot always reach. */
const WEB_SOURCE = "1tamilmv";

const isReal = (v) => !!v && v !== "Not Available" && v !== "No Magnet Found";

/* ── Matching a query against our own titles ──────────────────────────────
   Release names are long and noisy — "Kantara Chapter 1 (2026) Kannada TRUE
   WEB-DL - 1080p - AVC - DD5.1 - ESub". A plain substring test means the
   reader has to type a fragment of that exact string, so ordinary searches
   ("kantara 2", "kgf chapter2", "vikram hindi") missed everything we hold and
   fell through to a web index that answers with nothing.

   So: normalise both sides, strip the release furniture, and require every
   word of the query to appear. A trailing sequel number is treated as a hint
   rather than a requirement — "kantara 2" should still surface every Kantara
   we have, with the numbered one ranked first, because the reader can see
   which is which far better than a string comparison can. */
const NOISE = new RegExp(
  "\\b(true|web|dl|webdl|webrip|hdrip|bluray|brrip|dvdrip|predvd|hq|hd|uncut|" +
  "x264|x265|hevc|avc|aac|dd|ddp|atmos|esub|esubs|msub|subs|dual|audio|org|" +
  "untouched|proper|repack|remastered|extended|1080p|720p|480p|2160p|4k|" +
  "kbps|gb|mb|part|vol)\\b", "g");

const norm = (s = "") =>
  String(s).toLowerCase()
    .replace(/[\[\](){}]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();

/* Sequel numbering is written every which way: "2", "II", "Chapter 2",
   "Part 2". Fold them all to a bare digit so they compare. */
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
const foldNumbers = (tokens) =>
  tokens.map((t) => (ROMAN[t] ? String(ROMAN[t]) : t))
        .filter((t) => t !== "chapter" && t !== "season");

const tokensOf = (s) => foldNumbers(norm(s).split(" ").filter(Boolean));

/* One query word matches one title word on an exact hit, a prefix ("kanta"
   → "kantara"), or a single typo in a word long enough for that to be a slip
   rather than a different word. */
const editDistanceAtMostOne = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

const wordMatches = (q, hay) =>
  hay.some((h) => h === q || h.startsWith(q) ||
    (q.length >= 5 && h.length >= 5 && editDistanceAtMostOne(q, h)));

/* 0 = no match. Higher is a better match; the caller sorts on it. */
export function matchScore(query, entry) {
  const q = norm(query);
  if (!q) return 0;
  const hayRaw = `${entry.title || ""} ${entry.cleanTitle || ""} ${entry.displayTitle || ""}`;
  const hayNorm = norm(hayRaw);
  const hay = foldNumbers(hayNorm.split(" ").filter(Boolean));
  const qTokens = tokensOf(query);
  if (!qTokens.length) return 0;

  const words = qTokens.filter((t) => !/^\d+$/.test(t));
  const numbers = qTokens.filter((t) => /^\d+$/.test(t));

  // A query of nothing but digits ("2") is not something to match titles on —
  // checked before the substring test below, which would otherwise hand back
  // every title with a 2 anywhere in it.
  if (!words.length) return 0;

  // The whole query as typed, sitting inside the title — the strongest signal.
  if (hayNorm.includes(q)) return 1000 - hayNorm.length;
  if (!words.every((w) => wordMatches(w, hay))) return 0;

  let score = 500 + words.length * 20 - hayNorm.length / 10;
  // A year or sequel number that also appears ranks above one that doesn't,
  // but its absence never disqualifies an otherwise matching title.
  if (numbers.length && numbers.every((n) => hay.includes(n))) score += 120;
  return score;
}

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

  /* Our own titles matching the query, best match first — see matchScore. */
  const libraryMatches = useMemo(() => {
    const q = submitted.trim();
    if (!q) return [];
    return catalog
      .filter((e) => e.downloadable)
      .map((e) => ({ e, score: matchScore(q, e) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ e }) => e);
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
      const url = `${backendUrl}/search?movie=${encodeURIComponent(movie)}&source=${WEB_SOURCE}`;
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
  }, [backendUrl, submitted]);

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

    // Same matcher the results list uses — otherwise the page can decide it
    // has nothing while the section below is showing matches, or vice versa.
    const hit = catalog.some((e) => e.downloadable && matchScore(q, e) > 0);
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
            Everything we host, searchable by name
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
                  <Globe className="w-3.5 h-3.5" /> Search the web as well
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
            <p className="text-gray-600 font-mono uppercase tracking-widest text-[10px]">Searching the web…</p>
          </div>
        )}

        {webSearched && !webLoading && !error && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Web results</h2>
              <span className="text-[10px] font-bold text-gray-700">{webResults.length} found</span>
              <div className="flex-1 h-px bg-gray-900" />
            </div>

            {webResults.length === 0 ? (
              <div className="py-12 px-6 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                <Globe className="w-7 h-7 text-gray-800 mx-auto mb-3" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">
                  The web search came back empty
                </p>
                <p className="text-gray-600 text-[11px] mt-2 max-w-sm mx-auto leading-relaxed">
                  External indexes move and go dark without warning, so this often returns nothing
                  even for titles that exist. Our own library is the reliable half of this page —
                  try a shorter query, or browse everything we host.
                </p>
                <Link to="/latest"
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95">
                  <Library className="w-3.5 h-3.5" /> Browse the library
                </Link>
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
              Type a film or series name. Anything we host answers straight from our own library.
            </p>
          </div>
        )}

        {/* Nothing anywhere — library missed and the web search came back empty */}
        {/* Library missed and the web search has not started or has been skipped.
            This used to be a bare spinner that span forever when nothing was
            coming — say what happened instead. */}
        {submitted && !hasLibrary && !webSearched && !webLoading && !error && (
          <div className="py-16 px-6 text-center">
            {catalogReady ? (
              <>
                <Search className="w-10 h-10 text-gray-800 mx-auto mb-4" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">
                  Nothing in our library for “{submitted}”
                </p>
                <p className="text-gray-600 text-[11px] mt-2 max-w-sm mx-auto leading-relaxed">
                  We may not have uploaded it yet, or it may be filed under a different name.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                  <button onClick={() => runWebSearch()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95">
                    <Globe className="w-3.5 h-3.5" /> Search the web
                  </button>
                  <Link to="/latest"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95">
                    <Library className="w-3.5 h-3.5" /> Browse the library
                  </Link>
                </div>
              </>
            ) : (
              <Loader2 className="w-6 h-6 text-gray-700 animate-spin mx-auto" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TorrentSearch;
