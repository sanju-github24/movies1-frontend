/* A language page — /category/Kannada and friends.

   Rebuilt for three reasons: it rendered "**Kannada**" literally on screen
   (markdown asterisks in JSX do nothing), it pulled all 978 rows on every
   visit and filtered them in the browser, and every card opened the download
   page. It now reads the shared catalogue, so a card knows whether we stream
   the title and links accordingly. */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Loader2, Frown, Film, AlertCircle } from "lucide-react";
import { loadCatalog } from "../utils/catalog";
import { absUrl, jsonLd } from "../utils/seo";
import CatalogCard from "./CatalogCard";

const PAGE_SIZE = 60;

const CategoryPage = () => {
  const { name } = useParams();
  const pageName = decodeURIComponent(name || "");

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSub, setActiveSub] = useState("All");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await loadCatalog());
    } catch (err) {
      console.error("[CategoryPage]", err);
      setError("Couldn't load this collection. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Tell the prerenderer when this page is worth snapshotting.

     Its readiness test is "there is a canonical and the root has text", and
     both are true the instant this component paints — while it still says
     "Loading Kannada collection…". Crawlers were being handed an empty
     collection page. The flag goes up only once the catalogue has arrived. */
  useEffect(() => {
    document.documentElement.dataset.prerender = loading ? "loading" : "ready";
    return () => { delete document.documentElement.dataset.prerender; };
  }, [loading]);

  // A new language means a fresh set of filters.
  useEffect(() => { setActiveSub("All"); setSearch(""); setShown(PAGE_SIZE); }, [pageName]);

  const inLanguage = useMemo(() => {
    const want = pageName.toLowerCase();
    return entries.filter((e) => e.language.some((l) => l.toLowerCase() === want));
  }, [entries, pageName]);

  const subCategories = useMemo(() => {
    const subs = new Set();
    inLanguage.forEach((e) => e.subCategory.forEach((s) => s && subs.add(s)));
    return ["All", ...Array.from(subs).sort()];
  }, [inLanguage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inLanguage.filter((e) => {
      const matchesSub = activeSub === "All" ||
        e.subCategory.some((s) => s.toLowerCase() === activeSub.toLowerCase());
      if (!matchesSub) return false;
      if (!q) return true;
      return e.title.toLowerCase().includes(q)
        || (e.displayTitle || "").toLowerCase().includes(q)
        || e.description.toLowerCase().includes(q);
    });
  }, [inLanguage, activeSub, search]);

  // Any filter change starts the list from the top again.
  useEffect(() => { setShown(PAGE_SIZE); }, [activeSub, search]);

  const visible = useMemo(() => filtered.slice(0, shown), [filtered, shown]);
  const streamCount = useMemo(() => filtered.filter((e) => e.streamable).length, [filtered]);

  return (
    <div className="min-h-screen bg-gray-950 px-4 sm:px-8 py-10 text-white">
      <Helmet>
        <title>{`${pageName} Movies & Web Series — Watch Online in HD | AnchorMovies`}</title>
        <meta
          name="description"
          content={`${filtered.length || ""} ${pageName} movies and web series to watch online in HD`
            + ` — new releases added daily, with download links.`}
        />
        <link rel="canonical" href={absUrl(`/category/${encodeURIComponent(pageName)}`)} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${pageName} Movies & Web Series in HD`} />
        <meta property="og:url" content={absUrl(`/category/${encodeURIComponent(pageName)}`)} />
        {/* The first screenful, so the collection can show as a list result
            rather than a single blue link. */}
        <script type="application/ld+json">{jsonLd({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${pageName} Movies & Web Series`,
          url: absUrl(`/category/${encodeURIComponent(pageName)}`),
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: filtered.length,
            itemListElement: visible.slice(0, 20).map((e, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: e.displayTitle || e.cleanTitle || e.title,
              url: absUrl(e.streamable ? `/watch/${e.watchSlug}` : `/movie/${e.movieSlug}`),
            })),
          },
        })}</script>
      </Helmet>

      {/* ── Header ── */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-gray-900 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Film className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter italic">
            {pageName} Collection
          </h1>
        </div>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
          {loading
            ? "Loading…"
            : `${filtered.length.toLocaleString()} titles · ${streamCount} streamable`}
        </p>
      </header>

      {/* ── Search ── */}
      <div className="max-w-xl mx-auto mb-8 relative">
        <input
          type="text"
          placeholder={`Search in ${pageName}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-900 text-white border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-lg placeholder:text-gray-600"
        />
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>

      {/* ── Sub-category pills ── */}
      {subCategories.length > 1 && (
        <div className="max-w-5xl mx-auto overflow-x-auto pb-4 mb-8 scrollbar-hide">
          <div className="flex gap-2 w-max px-1">
            {subCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className={`px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition border ${
                  activeSub === sub
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/25"
                    : "bg-gray-900 hover:bg-gray-800 text-gray-400 border-white/5"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-gray-500 font-mono tracking-widest uppercase text-[10px]">
            Loading {pageName} collection…
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-500/70" />
          <p className="text-gray-400 font-bold">{error}</p>
          <button onClick={load}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-black uppercase tracking-widest">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500">
          <Frown className="w-10 h-10 mb-3 text-gray-700" />
          <p className="font-black uppercase tracking-widest text-sm">No titles found</p>
          <p className="text-xs mt-1 text-gray-600">
            {search ? "Try a different search term." : `Nothing in ${pageName} under this filter yet.`}
          </p>
        </div>
      ) : (
        <>
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {visible.map((entry) => (
              <CatalogCard key={entry.key} entry={entry} showAge />
            ))}
          </div>

          {shown < filtered.length && (
            <div className="flex justify-center pt-10 pb-4">
              <button
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="px-10 py-3.5 bg-white text-black hover:bg-blue-600 hover:text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95">
                Load more · {filtered.length - shown} left
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryPage;
