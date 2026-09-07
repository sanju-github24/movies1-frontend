// src/components/LatestUploads.jsx
/* The Latest page.

   It used to hard-filter to the last 7 days, which meant a quiet week showed
   "No new uploads this week" on a catalogue of 978 titles, and every card
   opened the download page. Now it shows the catalogue newest-first, grouped
   by the day it went up, and a card opens the title's watch page. */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Calendar, RefreshCw, LayoutGrid, AlertCircle } from "lucide-react";
import { loadCatalog, groupByDay } from "../utils/catalog";
import CatalogCard from "./CatalogCard";

const PAGE_SIZE = 60;

const LatestUploads = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  /* Re-render each minute so "3 minutes ago" doesn't sit frozen on a tab
     that's been left open. */
  const [, setTick] = useState(0);

  const load = useCallback(async ({ force = false } = {}) => {
    if (force) setRefreshing(true);
    setError(null);
    try {
      const rows = await loadCatalog({ force });
      setEntries(rows);
    } catch (err) {
      console.error("[LatestUploads]", err);
      setError("Couldn't load the latest uploads. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const visible = useMemo(() => entries.slice(0, shown), [entries, shown]);
  const groups = useMemo(() => groupByDay(visible), [visible]);
  const newestAt = entries[0]?.createdAt || null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 bg-gray-950 min-h-screen" aria-labelledby="latest-uploads">
      <Helmet>
        <title>Latest Uploads | 1AnchorMovies</title>
        <meta name="description" content="Every title added to 1AnchorMovies, newest first — stream or download in Tamil, Telugu, Kannada, Malayalam, Hindi and English." />
      </Helmet>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-6 h-6 text-blue-500" />
            <h1 id="latest-uploads" className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter italic">
              Latest Uploads
            </h1>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
            {loading
              ? "Loading the catalogue…"
              : `${entries.length.toLocaleString()} titles · newest first`}
          </p>
        </div>

        <button
          onClick={() => load({ force: true })}
          disabled={refreshing || loading}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 px-4 py-2 rounded-xl border border-white/5 transition-colors">
          <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? "animate-spin" : ""}`} />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
            {refreshing ? "Refreshing" : "Refresh"}
          </span>
        </button>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-gray-500 font-mono tracking-widest uppercase text-[10px]">Loading uploads…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-500/70" />
          <p className="text-gray-400 font-bold">{error}</p>
          <button onClick={() => load({ force: true })}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-black text-white uppercase tracking-widest">
            Retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutGrid className="w-16 h-16 text-gray-800 mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Nothing uploaded yet.</p>
        </div>
      ) : (
        <>
          {newestAt && (
            <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-6">
              Most recent addition · {newestAt.toLocaleString()}
            </p>
          )}

          {groups.map((group) => (
            <div key={group.key} className="mb-12">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-sm font-black text-blue-400 uppercase tracking-widest">{group.label}</h2>
                <span className="text-[10px] font-bold text-gray-700">{group.items.length} title{group.items.length > 1 ? "s" : ""}</span>
                <div className="flex-1 h-px bg-gray-900" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                {group.items.map((entry) => (
                  <CatalogCard key={entry.key} entry={entry} showAge />
                ))}
              </div>
            </div>
          ))}

          {shown < entries.length && (
            <div className="flex justify-center pt-4 pb-10">
              <button
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="px-10 py-3.5 bg-white text-black hover:bg-blue-600 hover:text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95">
                Load more · {entries.length - shown} left
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default LatestUploads;
