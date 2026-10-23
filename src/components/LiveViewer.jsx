import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
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

  /* Commentaries that would not play, by id, for this link. A feed can list a
     language whose URL the CDN refuses outright — SonyLiv's Tamil and Telugu
     did, from every address — so one that dies is taken off the menu, and if
     it was the one being watched the next is started in its place. */
  const [failed, setFailed] = useState({ link: "", ids: [] });
  const failedIds = failed.link === link ? failed.ids : [];
  const markFailed = (id) => setFailed((f) => ({
    link, ids: [...(f.link === link ? f.ids : []), id],
  }));

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
        // A live added in the admin can be a stream's own address, played as it is.
        const direct = !ref && /\.(m3u8|mpd)(\?|$)/i.test(link)
          ? { kind: /\.mpd(\?|$)/i.test(link) ? "dash" : "hls", url: link, title } : null;
        if (!ref && !direct) throw new Error("This link does not say what to play.");
        const source = direct || await resolveSource(pickedId ? { ...ref, id: pickedId } : ref);
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

  // The commentary a source plays, when it is one of several.
  const langOf = (source) => source?.languages?.find((l) => l.code === source.lang);

  const stalled = (key, msg) => {
    const source = slots.find((x) => x.key === key)?.source;
    const lang = langOf(source);
    // A standby that dies is simply dropped; the picture on screen is fine.
    if (key !== liveRef.current) {
      setSlots((prev) => prev.filter((x) => x.key !== key));
      if (lang) { markFailed(lang.id); setNote(`${lang.label} is not available right now`); }
      else setNote("");
      return;
    }
    if (revived.current >= 2) {
      /* Out of retries. If this match has another commentary nobody has seen
         fail, play that rather than stopping on an error. */
      const next = lang && source.languages.find((l) => l.id !== lang.id && !failedIds.includes(l.id));
      if (next) {
        markFailed(lang.id);
        revived.current = 0;
        setPick({ link, id: next.id });
        setNote(`${lang.label} is not available — playing ${next.label}`);
        return;
      }
      setErr(msg);
      return;
    }
    revived.current += 1;
    forgetFeeds();
    setGen((g) => g + 1);
  };


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
      style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* The player is the whole screen, as Hotstar's is: its own top bar
          carries the way back, the title and the menus — nothing sits over
          the picture but them, and they fade with the rest of the controls. */}
      <div className="flex-1 min-h-0 w-full h-full">
        {err ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
            <p className="max-w-md text-center text-sm text-gray-200 leading-relaxed">{err}</p>
            <button type="button" onClick={() => onCloseRef.current()} className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-bold text-white">Go back</button>
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
                  languages={x.source.languages?.filter((l) => l.code === x.source.lang || !failedIds.includes(l.id))}
                  lang={x.source.lang}
                  standby={x.key !== live}
                  onPlaying={() => promote(x.key)}
                  onStall={(msg) => stalled(x.key, msg)}
                  onLanguage={(id) => setPick({ link, id })}
                  onBack={() => onCloseRef.current()}
                  note={note}
                  autoFull
                  topExtra={(list.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto mt-2 pointer-events-auto">
                      {list.map((s, i) => (
                        <button key={s.src} type="button" onClick={() => setIdx(i)}
                          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider transition-colors
                            ${i === idx ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : null)}
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
  ), document.body);
};

export default LiveViewer;
