import React, { useEffect, useState } from "react";
import { Radio, X, Loader2 } from "lucide-react";

/* Plays without leaving the site.
 *
 * The stream itself is the player's problem, not this page's: these CDNs want
 * headers a browser will not set, a token that rotates hourly, and for two of
 * them an Indian address — all of which the player and its proxy already
 * handle. Reimplementing that here would mean maintaining it twice and having
 * it break in two places. So the player runs in a frame, addressed by the tab
 * link, and the viewer stays on AnchorHD.
 *
 * `sources` is how the same fixture reaches us from more than one place. Two
 * publishers often carry one match, and when one stalls the other usually
 * does not, so the viewer offers the swap rather than making someone go back
 * and hunt for the other card. A single source renders no switcher at all. */
const LiveViewer = ({ open, title, src, sources, poster, onClose }) => {
  const list = (sources && sources.length ? sources : (src ? [{ label: "Live", src }] : []));
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);

  const current = list[idx] || list[0];
  const currentSrc = current?.src || "";

  // A new fixture starts at its first source, and covered again.
  useEffect(() => { setIdx(0); }, [src, open]);

  /* Covered again for each source, but never indefinitely.
     The cover lifts when the player says the picture is up, when it says it
     failed, or after this long regardless — a signal that never arrives must
     not leave someone watching a spinner over a frame that has either started
     or given a reason, both of which are worth seeing. */
  useEffect(() => {
    setReady(false);
    if (!currentSrc) return;
    const t = setTimeout(() => setReady(true), 12000);
    return () => clearTimeout(t);
  }, [currentSrc]);

  /* Escape closes it, the page behind must not scroll while it is up, and the
     player talks back: it says when the picture is actually up, and — in solo
     mode — when anything would have dropped the viewer onto its own launcher,
     which closes this instead of showing someone else's page. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onMsg = (e) => {
      const t = e.data && e.data.type;
      if (t === "anchor:close") onClose();
      // Uncover on either outcome: the reason it failed is behind this.
      if (t === "anchor:playing" || t === "anchor:error") setReady(true);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("message", onMsg);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMsg);
    };
  }, [open, onClose]);

  if (!open || !currentSrc) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483000] bg-black/95 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5
                         text-[10px] font-black uppercase tracking-widest text-white shrink-0">
          <Radio className="w-3 h-3" aria-hidden="true" /> Live
        </span>
        <p className="text-xs sm:text-sm font-bold text-white truncate">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player"
          className="ml-auto shrink-0 rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 sm:px-6 pb-2 shrink-0">
          {list.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setIdx(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider
                          transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white
                          ${i === idx
                            ? "bg-white text-black"
                            : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 px-2 sm:px-6 pb-3 sm:pb-6">
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-black ring-1 ring-white/10">
          <iframe
            key={currentSrc}
            src={currentSrc}
            title={title}
            className="w-full h-full"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />

          {/* Covers the frame until the picture is up. The player behind it is
              another site, and however briefly its chrome shows while a feed
              resolves, it reads as someone else's page inside this one. */}
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
              {poster && (
                <img
                  src={poster}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover opacity-25"
                />
              )}
              <Loader2 className="relative w-8 h-8 animate-spin text-white/80" aria-hidden="true" />
              <p className="relative text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
                Starting live stream
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveViewer;
