import React, { useEffect } from "react";
import { Radio, X } from "lucide-react";

/* Plays without leaving the site.
 *
 * The stream itself is the player's problem, not this page's: these CDNs want
 * headers a browser will not set, a token that rotates hourly, and for two of
 * them an Indian address — all of which the player and its proxy already
 * handle. Reimplementing that here would mean maintaining it twice and having
 * it break in two places. So the player runs in a frame, addressed by the tab
 * link, and the viewer stays on AnchorHD. */
const LiveViewer = ({ open, title, src, onClose }) => {
  /* Escape closes it, the page behind must not scroll while it is up, and the
     player closes it too: in solo mode anything that would have dropped the
     viewer back onto the player's own launcher sends this instead, so the end
     of a match leaves AnchorHD rather than someone else's channel list. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onMsg = (e) => { if (e.data && e.data.type === "anchor:close") onClose(); };
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483000] bg-black/95 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5
                         text-[10px] font-black uppercase tracking-widest text-white">
          <Radio className="w-3 h-3" aria-hidden="true" /> Live
        </span>
        <p className="text-sm font-bold text-white truncate">{title}</p>
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

      <div className="flex-1 min-h-0 px-2 sm:px-6 pb-4 sm:pb-6">
        <iframe
          key={src}
          src={src}
          title={title}
          className="w-full h-full rounded-xl bg-black ring-1 ring-white/10"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default LiveViewer;
