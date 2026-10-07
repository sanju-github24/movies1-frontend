import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import AnchorPlayer from "./AnchorPlayer";
import { backendUrl } from "../utils/api";

/* A match highlight in our own player rather than someone else's page.

   BCCI's video pages carry a Mux stream (an HLS master with a day-long
   token, open to any site), which the backend reads out of the page on
   request: /api/bcci/play. Given a bcci.tv page, this asks for it; given a
   stream, it plays that. */

export async function bcciStream(pageUrl) {
  const r = await fetch(`${backendUrl}/api/bcci/play?url=${encodeURIComponent(pageUrl)}`);
  const d = await r.json().catch(() => null);
  if (!d?.success || !d.url) throw new Error(d?.error || "This highlight could not be opened.");
  return d.url;
}

export default function HighlightPlayer({ title, page, stream, accent = "#38bdf8", onClose }) {
  const [url, setUrl] = useState(stream || "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (stream) { setUrl(stream); return; }
    if (!page) return;
    let alive = true;
    setUrl(""); setError("");
    bcciStream(page).then((u) => alive && setUrl(u), (e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [page, stream]);

  // Esc closes; the page behind does not scroll.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-black/70 shrink-0">
        <span className="text-[11px] font-black uppercase tracking-[0.15em] truncate" style={{ color: accent }}>▶ {title}</span>
        <button type="button" onClick={onClose} aria-label="Close"
          className="w-8 h-8 shrink-0 rounded-lg border border-white/15 bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="w-full max-w-6xl aspect-video max-h-full">
          {url ? (
            <AnchorPlayer source={{ kind: "hls", url }} title={title} />
          ) : error ? (
            <p className="text-center text-sm text-gray-400 px-6">{error}</p>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
