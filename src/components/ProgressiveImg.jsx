import React, { useMemo, useState } from "react";

/* A poster that never pops in. A TMDB image has sibling sizes at the same
   path, so a tiny w92 is fetched first (a few KB), shown blurred, and the
   full image fades in over it once it has loaded. For a non-TMDB URL there
   is no cheap low-res, so it just fades in from the card's background.

   Both <img> fill the positioned parent the card already provides (the
   aspect box), so this adds no wrapper and does not change layout. The full
   image keeps whatever className the card gave it — object-cover, the
   hover-scale, and so on. */
const tmdbLow = (src) => src.replace(/\/t\/p\/w\d+\//, "/t/p/w92/");
const isTmdb = (src) => /image\.tmdb\.org\/t\/p\/w\d+\//.test(src || "");

export default function ProgressiveImg({ src, alt = "", className = "", eager = false, fallback, onError, ...rest }) {
  const low = useMemo(() => (isTmdb(src) ? tmdbLow(src) : null), [src]);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {low && !loaded && (
        <img src={low} alt="" aria-hidden="true"
          className={`${className} absolute inset-0 z-0 blur-md scale-105`} />
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => { if (fallback) e.currentTarget.src = fallback; setLoaded(true); onError?.(e); }}
        className={`${className} relative z-[1] transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        {...rest}
      />
    </>
  );
}
