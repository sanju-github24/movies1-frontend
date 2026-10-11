import React from "react";
import { ListMusic } from "lucide-react";

/* A playlist's cover, made from its songs: four artworks in a square, or the
   one there is, or a plain tile while it is empty. */
export default function PlaylistCover({ covers = [], className = "", rounded = "rounded-xl" }) {
  const art = covers.filter(Boolean);
  return (
    <div className={`relative aspect-square overflow-hidden bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-fuchsia-500/20 ${rounded} ${className}`}>
      {art.length >= 4 ? (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
          {art.slice(0, 4).map((src, i) => <img key={i} src={src} alt="" loading="lazy" className="w-full h-full object-cover" />)}
        </div>
      ) : art.length ? (
        <img src={art[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/50">
          <ListMusic className="w-1/3 h-1/3" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
