import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Radio, X, Loader2 } from "lucide-react";
import AnchorPlayer from "./AnchorPlayer";
import { parseSourceLink, resolveSource, forgetFeeds } from "../utils/liveSources";

/* Plays without leaving the site, in AnchorHD's own player.
 *
 * This used to frame player.html. It now resolves the stream itself and plays
 * it natively — see utils/liveSources for the rules and AnchorPlayer for the
 * engines. Its props are unchanged, so every page that opens it works as it
 * did: the links they pass still name a tab and an item, and that is all this
 * needs.
 *
 * `sources` is how one fixture reaches us from more than one publisher. When
 * one stalls the other usually does not, so the viewer offers the swap rather
 * than sending anyone back to hunt for the other card. */
const LiveViewer = ({ open, title, src, sources, poster, onClose }) => {
  const list = (sources && sources.length ? sources : (src ? [{ label: "Live", src }] : []));
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const current = list[idx] || list[0];
  const link = current?.src || "";

  /* A language picked in the player. Each commentary is a separate stream
     with its own id, so choosing one means resolving and loading that one.
     Held against the link it was chosen on, so moving to another source or
     another match does not carry Tamil across to something without it. */
  const [pick, setPick] = useState(null);     // { link, id }
  const pickedId = pick && pick.link === link ? pick.id : null;

  // A new fixture starts at its first source.
  useEffect(() => { setIdx(0); }, [src, open]);

  /* Players, by key. Normally one. Switching language, or recovering a
     stream that died, adds a second that loads silently behind the one on
     screen and takes its place once it is actually playing — so a switch
     never drops to a black spinner, and a failed one leaves the old
     commentary running. */
  const [slots, setSlots] = useState([]);   // [{ key, source }]
  const [live, setLive] = useState(null);   // key of the one on screen
  const liveRef = useRef(null);
  useEffect(() => { liveRef.current = live; }, [live]);
  const slotsLink = useRef("");

  /* A stream that stops answering is looked up again from the feed — a new
     token, a new proxy — up to twice in a row. Any successful start resets
     that, so a long match can recover as often as it needs to. */
  const [gen, setGen] = useState(0);
  const revived = useRef(0);

  /* Worked out afresh for each source. Tokens in these feeds expire in hours,
     so a stream is looked up at the moment it is asked for. */
  useEffect(() => {
    if (!open || !link) return;
    let dead = false;
    setErr(""); setNote("");

    // Another source or another match starts clean; a language or a revival
    // of the same one keeps the current picture up while it loads.
    if (slotsLink.current !== link) {
      slotsLink.current = link;
      revived.current = 0;
      setSlots([]); setLive(null); liveRef.current = null;
    } else if (liveRef.current) {
      setNote(pickedId ? "Switching language…" : "Reconnecting…");
    }

    const key = `${link}|${pickedId || ""}|${gen}`;
    (async () => {
      try {
        const ref = parseSourceLink(link);
        if (!ref) throw new Error("This link does not say what to play.");
        const source = await resolveSource(pickedId ? { ...ref, id: pickedId } : ref);
        if (dead) return;
        setSlots((prev) => [...prev.filter((x) => x.key === liveRef.current), { key, source }]);
        if (!liveRef.current) { liveRef.current = key; setLive(key); }
      } catch (e) {
        if (dead) return;
        if (liveRef.current) setNote(e.message || "Could not switch.");
        else setErr(e.message || "Could not start this stream.");
      }
    })();
    return () => { dead = true; };
  }, [open, link, pickedId, gen]);

  const promote = (key) => {
    revived.current = 0;
    if (liveRef.current === key) return;
    liveRef.current = key;
    setLive(key); setNote("");
    setSlots((prev) => prev.filter((x) => x.key === key));
  };

  const stalled = (key, msg) => {
    // A standby that dies is simply dropped; the picture on screen is fine.
    if (key !== liveRef.current) {
      setSlots((prev) => prev.filter((x) => x.key !== key));
      setNote("");
      return;
    }
    if (revived.current >= 2) { setErr(msg); return; }
    revived.current += 1;
    forgetFeeds();
    setGen((g) => g + 1);
  };

  const shown = slots.find((x) => x.key === live)?.source;

  /* onClose is written inline by every caller, so it is a new function on
     each of their renders. Held in a ref so the listener below reads the
     current one without being rebuilt for it. */
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // The lock, tied to nothing but whether this is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !link) return null;

  /* On the body, not where it is written. z-index only ranks siblings inside a
     stacking context, and this opens from pages that make their own — a fixed
     child of one is trapped in it, which is how a z-index of two billion lost
     to the phone's bottom bar at z-100. */
  return createPortal((
    <div
      className="fixed inset-0 z-[2147483000] bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 bg-black">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5
                         text-[10px] font-black uppercase tracking-widest text-white shrink-0">
          <Radio className="w-3 h-3" aria-hidden="true" /> Live
        </span>
        <p className="text-xs sm:text-sm font-bold text-white truncate">{title || shown?.title}</p>
        {note && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/60">{note}</span>
        )}
        <button
          type="button"
          onClick={() => onCloseRef.current()}
          aria-label="Close player"
          className="ml-auto shrink-0 rounded-lg p-2 text-gray-300 hover:bg-white/10 hover:text-white
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 sm:px-6 pb-2 shrink-0 bg-black">
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

      {/* The frame takes the space left over and keeps a 16:9 picture centred
          in it — letterboxed on a tall phone, pillarboxed on a wide screen —
          rather than stretching the video to whatever shape the window is. */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
        <div className="w-full max-h-full aspect-video">
          {err ? (
            <div className="w-full h-full flex items-center justify-center p-6">
              <p className="max-w-md text-center text-sm text-gray-200 leading-relaxed">{err}</p>
            </div>
          ) : slots.length ? (
            <div className="relative w-full h-full">
              {slots.map((x) => (
                <div
                  key={x.key}
                  className={`absolute inset-0 ${x.key === live ? "" : "opacity-0 pointer-events-none"}`}
                  aria-hidden={x.key === live ? undefined : true}
                >
                  <AnchorPlayer
                    source={x.source}
                    title={title || x.source.title}
                    poster={poster || x.source.poster}
                    languages={x.source.languages}
                    lang={x.source.lang}
                    standby={x.key !== live}
                    onPlaying={() => promote(x.key)}
                    onStall={(msg) => stalled(x.key, msg)}
                    onLanguage={(id) => setPick({ link, id })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-9 h-9 animate-spin text-white/85" aria-hidden="true" />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Finding the stream</p>
            </div>
          )}
        </div>
      </div>
    </div>
  ), document.body);
};

export default LiveViewer;
