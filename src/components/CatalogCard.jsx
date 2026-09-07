/* One catalogue tile, shared by the Latest page and the language pages so the
   two can't drift apart again. Landscape artwork and a title logo where we
   have one — the same visual language as the watch page's rows, rather than
   the plain portrait grid these pages used to render.

   Where it goes matters: a title we stream opens the watch page, and a
   download-only title (about a quarter of the catalogue has no streaming row
   at all) opens the torrent page pre-searched for it, which is where our
   stored download links now live. The card says which it is before you
   click. */
import React from "react";
import { Link } from "react-router-dom";
import { Play, Download, Clock3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const langLabel = (langs) => {
  if (!langs || langs.length === 0) return "Multi Audio";
  return langs.length > 1 ? `${langs.length} Languages` : langs[0];
};

const CatalogCard = ({ entry, showAge = false }) => {
  const to = entry.streamable
    ? `/watch/${entry.watchSlug}`
    : `/search-torrent?q=${encodeURIComponent(entry.cleanTitle || entry.title)}`;
  const age = showAge && entry.createdAtMs
    ? formatDistanceToNow(entry.createdAt, { addSuffix: true })
    : null;

  return (
    <Link to={to} className="group block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/5 shadow-xl transition-all duration-300 group-hover:border-blue-500/60 group-hover:scale-[1.03] group-hover:shadow-blue-900/40">
        <img
          src={entry.cover}
          alt={entry.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { e.currentTarget.src = "/default-cover.jpg"; }}
        />

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-20 pointer-events-none">
          {entry.imdbRating && entry.imdbRating !== "NaN" && (
            <span className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
              <span className="bg-[#f5c518] text-black px-1 rounded-[2px] font-black text-[7px] leading-none">IMDb</span>
              <span className="text-[9px] font-black text-white">{entry.imdbRating}</span>
            </span>
          )}
          <span className="bg-blue-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-tighter">
            {langLabel(entry.language)}
          </span>
          {entry.contentType === "tv" && (
            <span className="bg-purple-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-tighter">
              Series
            </span>
          )}
        </div>

        {/* Download-only titles say so up front, so the card never pretends to stream. */}
        {!entry.streamable && (
          <span className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter pointer-events-none">
            <Download className="w-2.5 h-2.5" /> Download
          </span>
        )}

        {/* Hover plate */}
        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent flex flex-col justify-end p-3">
          {entry.titleLogo ? (
            <img src={entry.titleLogo} alt="" className="h-7 w-auto max-w-[70%] object-contain object-left mb-1.5 drop-shadow-2xl" />
          ) : (
            <p className="text-[11px] font-black text-white uppercase italic truncate mb-1 drop-shadow-md">
              {entry.title}
            </p>
          )}
          <span className="flex items-center gap-1.5 text-[9px] font-black text-white uppercase tracking-tighter">
            {entry.streamable
              ? <><Play className="w-3 h-3 fill-current" /> {entry.contentType === "tv" ? "Stream Series" : "Watch Now"}</>
              : <><Download className="w-3 h-3" /> Get Links</>}
          </span>
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <h3 className="text-[12px] sm:text-[13px] font-bold text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-1">
          {entry.title}
        </h3>
        {age && (
          <p className="flex items-center gap-1 text-[10px] font-bold text-gray-600 mt-0.5">
            <Clock3 className="w-2.5 h-2.5" /> {age}
          </p>
        )}
      </div>
    </Link>
  );
};

export default CatalogCard;
