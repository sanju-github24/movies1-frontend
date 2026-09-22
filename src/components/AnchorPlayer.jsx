import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, Radio, Settings, Check, Languages } from "lucide-react";

/* AnchorHD's own live player.
 *
 * Plays a source descriptor from utils/liveSources: HLS through hls.js, DASH
 * with ClearKey through Shaka. Everything unusual in here is ported from
 * player.html, where each was learned the hard way — see the notes.
 *
 * The libraries are loaded when something plays, not with the page: together
 * they are most of a megabyte, and most visitors to a sports page never press
 * play. */

const PROXY_EXTRAS = (p) =>
  (p.cookie ? "&cookie=" + encodeURIComponent(p.cookie) : "") +
  (p.ref ? "&ref=" + encodeURIComponent(p.ref) : "") +
  (p.ua ? "&ua=" + encodeURIComponent(p.ua) : "");

const viaProxy = (p, url) => p.base + "?url=" + encodeURIComponent(url) + PROXY_EXTRAS(p);

/* How close counts as live. Measured against the true edge, a stream sitting
   exactly where its engine wants it is still several seconds back — about
   eight for HLS — and calling that "behind" would light GO LIVE on a stream
   doing nothing wrong. */
const LIVE_THRESH = 15;

/* One rung per picture height. A stream often offers the same height at two
   bitrates, and a menu listing "720p" twice asks the viewer to choose between
   things they cannot tell apart — so the better of each is kept. */
function rungs(items) {
  const byH = new Map();
  items.forEach((it) => {
    if (!it.height) return;
    const had = byH.get(it.height);
    if (!had || it.bitrate > had.bitrate) byH.set(it.height, it);
  });
  return [...byH.values()].sort((a, b) => b.height - a.height);
}

/* A menu opens upward from the control bar, and on a phone the whole player
   is about two hundred pixels tall — a list of five languages would run off
   its top and be cut by the frame. Held to the room there is, and scrolled. */
const MENU_MAX = "min(18rem, calc(56.25vw - 4.5rem), calc(100dvh - 9rem))";

const qLabel = (h) => (h >= 2160 ? "4K" : `${h}p`);

const fmtBehind = (s) => {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return `${m}m ${String(r).padStart(2, "0")}s`;
};

/* Every load gets this long and this many tries. The proxy, when the public
   address it was using dies, searches the pool for another before it answers,
   and that search takes seconds — a timeout tuned for a CDN would give up on
   a segment that was about to arrive. */
const LOAD_POLICY = (maxLoadTimeMs) => ({
  default: {
    maxTimeToFirstByteMs: maxLoadTimeMs,
    maxLoadTimeMs,
    timeoutRetry: { maxNumRetry: 4, retryDelayMs: 0, maxRetryDelayMs: 0 },
    errorRetry: { maxNumRetry: 6, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
  },
});

/* After hls.js has spent its own retries, the stream is kicked this many more
   times, further apart each time, before the viewer is told it has stopped. */
const REVIVES = 5;

/* A stream read through the proxy is not the same stream read from its CDN,
   and tuning for the CDN is what makes the proxied ones late and stuttery.
   Measured against the Mumbai function: a quarter to half a second added to
   every single request, and an exit whose throughput sits around what a
   1080p live feed needs — so the defaults, which chase the live edge two
   segments back and let ABR climb to the top rung, leave it with nothing in
   hand and it spends the match rebuffering.
 *
 * Proxied, it is told to do the opposite: start on the lowest rung so the
 * picture appears at once, climb only when the bandwidth is really there, and
 * keep a deeper buffer further from the edge. The cost is a few more seconds
 * behind live. The gain is that it plays.  */
const TUNING = {
  direct: {
    lowLatencyMode: true,
    liveSyncDurationCount: 2,
    liveMaxLatencyDurationCount: 6,
    maxBufferLength: 30,
    backBufferLength: 60,
    startLevel: -1,
  },
  proxied: {
    /* Four segments back, pulled forward at twelve: at a four second target
       that is sixteen seconds of cushion, which is about what one slow
       segment through a public exit costs. */
    lowLatencyMode: false,
    liveSyncDurationCount: 4,
    liveMaxLatencyDurationCount: 12,
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    backBufferLength: 30,
    /* The lowest rung first. Auto still climbs within seconds if the line can
       take it, but the first picture arrives in one small segment rather than
       after a 1080p one has crawled through the proxy. */
    startLevel: 0,
    /* hls.js otherwise assumes 500kbps and steps up on a single fast segment.
       Through a proxy that is how you get a rung that cannot be sustained and
       a stall ten seconds later — so it starts from what the path actually
       gives and needs real headroom before it climbs. */
    abrEwmaDefaultEstimate: 2_000_000,
    abrBandWidthFactor: 0.8,
    abrBandWidthUpFactor: 0.6,
    /* A gap through a proxy is jitter, not a hole in the stream: nudge harder
       before giving up on it. */
    nudgeMaxRetry: 8,
  },
};

export default function AnchorPlayer({
  source, title, poster, onPlaying, onError, onStall, languages, lang, onLanguage, standby = false,
}) {
  const wrap = useRef(null);
  const vid = useRef(null);
  const engine = useRef(null);            // { kind, inst }
  const [state, setState] = useState("loading");   // loading | playing | reconnecting | error
  const [err, setErr] = useState("");
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [behind, setBehind] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [levels, setLevels] = useState([]);      // [{ ref, height, bitrate }]
  const [choice, setChoice] = useState("auto");  // "auto" or a height
  const [playingH, setPlayingH] = useState(0);   // what Auto has actually picked
  const [qOpen, setQOpen] = useState(false);
  const [lOpen, setLOpen] = useState(false);
  const hideTimer = useRef(null);
  const menuOpen = useRef(false);
  useEffect(() => {
    menuOpen.current = qOpen || lOpen;
    if (qOpen || lOpen) setChrome(true);
  }, [qOpen, lOpen]);

  const fail = useCallback((msg) => {
    setErr(msg); setState("error");
    if (onError) onError(msg);
  }, [onError]);

  /* Given up on this copy of the stream. A caller that can look it up again
     — with a fresh token, through a fresh proxy — is asked to; only one that
     cannot shows the error. */
  const onStallRef = useRef(onStall);
  useEffect(() => { onStallRef.current = onStall; }, [onStall]);
  const giveUp = useCallback((msg) => {
    if (onStallRef.current) onStallRef.current(msg);
    else fail(msg);
  }, [fail]);

  /* A standby player is loading a stream the viewer has not switched to yet,
     behind the one they are watching. It stays silent until it takes over. */
  useEffect(() => {
    const v = vid.current;
    if (v) v.muted = standby;
  }, [standby]);

  /* ── attach ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!source?.url) return;
    let dead = false;
    const v = vid.current;
    setState("loading"); setErr(""); setBehind(0);
    setLevels([]); setChoice("auto"); setPlayingH(0); setQOpen(false);

    const teardown = () => {
      const e = engine.current;
      engine.current = null;
      try { if (e?.kind === "hls") e.inst.destroy(); } catch { /* already gone */ }
      try { if (e?.kind === "dash") e.inst.destroy(); } catch { /* already gone */ }
      try { v.removeAttribute("src"); v.load(); } catch { /* nothing loaded */ }
    };

    (async () => {
      try {
        if (source.kind === "hls") {
          const { default: Hls } = await import("hls.js");
          if (dead) return;
          /* An HLS playlist through the proxy is rewritten line by line on the
             way out, so its segments already point back at the proxy with the
             headers attached. Only the first URL needs building here. */
          const url = source.proxy ? viaProxy(source.proxy, source.url) : source.url;

          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              ...(source.proxy ? TUNING.proxied : TUNING.direct),
              fragLoadPolicy: LOAD_POLICY(25000),
              playlistLoadPolicy: LOAD_POLICY(20000),
              manifestLoadPolicy: LOAD_POLICY(25000),
            });
            engine.current = { kind: "hls", inst: hls };

            /* A fatal network error on a live stream is usually one dead
               proxy or one slow segment, not the end of it: loading is
               restarted with a growing pause, and every segment that does
               arrive resets the count. */
            let revives = 0, reviveTimer = null;
            hls.on(Hls.Events.FRAG_LOADED, () => {
              if (revives) { revives = 0; setState((s) => (s === "reconnecting" ? "playing" : s)); }
            });
            hls.on(Hls.Events.DESTROYING, () => clearTimeout(reviveTimer));
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (!data.fatal) return;
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                if (revives >= REVIVES) {
                  giveUp("The stream stopped answering — its token may have expired, or the proxy could not reach it.");
                  return;
                }
                revives += 1;
                setState("reconnecting");
                clearTimeout(reviveTimer);
                reviveTimer = setTimeout(() => {
                  if (dead) return;
                  // Before anything has loaded there is no level to resume, so
                  // the playlist is asked for again from the top.
                  if (!hls.levels?.length) hls.loadSource(url);
                  else hls.startLoad();
                }, Math.min(1000 * 2 ** (revives - 1), 8000));
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                try { hls.recoverMediaError(); } catch { fail("This stream could not be decoded."); }
              } else {
                fail("This stream could not be played.");
              }
            });
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setLevels(rungs(hls.levels.map((l, i) => ({ ref: i, height: l.height, bitrate: l.bitrate }))));
            });
            hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
              setPlayingH(hls.levels[d.level]?.height || 0);
            });
            hls.loadSource(url);
            hls.attachMedia(v);
          } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
            v.src = url;        // Safari plays HLS natively
          } else {
            throw new Error("This browser cannot play HLS.");
          }
        } else if (source.kind === "dash") {
          const shaka = (await import("shaka-player/dist/shaka-player.compiled.js")).default;
          if (dead) return;
          shaka.polyfill.installAll();
          if (!shaka.Player.isBrowserSupported()) throw new Error("This browser cannot play DASH.");

          const player = new shaka.Player();
          await player.attach(v);
          engine.current = { kind: "dash", inst: player };

          player.configure({
            streaming: {
              bufferingGoal: 12, rebufferingGoal: 3, bufferBehind: 60,
              retryParameters: { maxAttempts: 6, baseDelay: 800, backoffFactor: 2 },
              ignoreTextStreamFailures: true,
            },
            manifest: {
              retryParameters: { maxAttempts: 6, baseDelay: 800 },
              /* These manifests ask to be played most of a minute behind the
                 edge. Shaka honours that, so its "live" is already a minute
                 late and a seek to two seconds behind it lands a minute
                 behind in fact. Ignored; the distance is ours to choose. */
              defaultPresentationDelay: 6,
              dash: { ignoreSuggestedPresentationDelay: true },
            },
            ...(source.drm
              ? { drm: { clearKeys: { [source.drm.keyId.toLowerCase()]: source.drm.key.toLowerCase() } } }
              : {}),
          });

          const net = player.getNetworkingEngine();

          /* DASH through the proxy needs every request rewritten, not just the
             manifest: there is no line-by-line pass for a .mpd the way there
             is for a playlist. The proxy gives each manifest an absolute
             BaseURL, so a segment resolves to a real Hotstar address first
             and is wrapped here on its way out. */
          if (source.proxy) {
            const P = source.proxy;
            net.registerRequestFilter((_type, req) => {
              req.uris = req.uris.map((u) => {
                if (u.startsWith(P.base)) return u;
                if (!/^https?:/i.test(u)) return u;
                return viaProxy(P, u);
              });
            });
          }

          /* Jio signs each request, and on the URL a token signs the manifest
             and nothing after it — the manifest loads and the picture never
             starts. Added to every request to Jio's CDN instead. */
          if (source.jioCookie) {
            const tok = source.jioCookie;
            net.registerRequestFilter((_type, req) => {
              req.uris = req.uris.map((u) => {
                if (!/cdn\.jio\.com/i.test(u) || u.includes("__hdnea__")) return u;
                return u + (u.includes("?") ? "&" : "?") + "__hdnea__=" + tok;
              });
            });
          }

          player.addEventListener("error", (ev) => {
            // Shaka reports what it is already retrying; only a critical
            // error has stopped playback.
            if (ev.detail?.severity !== shaka.util.Error.Severity.CRITICAL) return;
            const code = ev.detail?.code;
            if (code >= 1000 && code < 2000) {       // network: look it up again
              giveUp(`The stream stopped answering (Shaka ${code}).`);
              return;
            }
            fail(code >= 6000 && code < 7000
              ? `Could not decrypt this stream (Shaka ${code}) — its key may be wrong or out of date.`
              : `This stream could not be played (Shaka ${code}).`);
          });

          await player.load(source.url);
          if (dead) return;

          /* Variants for the audio already playing only. A channel carrying
             several languages lists each height once per language, and
             picking a height must not quietly swap the commentary. */
          const readLadder = () => {
            const all = player.getVariantTracks();
            const active = all.find((t) => t.active);
            const same = active ? all.filter((t) => t.language === active.language) : all;
            setLevels(rungs(same.map((t) => ({ ref: t.id, height: t.height, bitrate: t.bandwidth }))));
            if (active?.height) setPlayingH(active.height);
          };
          readLadder();
          player.addEventListener("adaptation", readLadder);
          player.addEventListener("variantchanged", readLadder);

          /* Far enough back to have something buffered, near enough to be
             live. Two seconds left nothing in hand and stalled on the first
             slow segment. */
          if (player.isLive()) {
            const sk = v.seekable;
            if (sk.length) v.currentTime = Math.max(sk.start(0), sk.end(sk.length - 1) - 4);
          }
        } else {
          throw new Error("Unknown stream type.");
        }

        v.play().catch(() => setPaused(true));   // autoplay can be refused
      } catch (e) {
        if (!dead) fail(e.message || "This stream could not be played.");
      }
    })();

    return () => { dead = true; teardown(); };
  }, [source, fail, giveUp]);

  /* ── element events ─────────────────────────────────────────────────── */
  useEffect(() => {
    const v = vid.current;
    const onPlay = () => { setPaused(false); };
    const onPause = () => setPaused(true);
    const onPlayingEv = () => { setState("playing"); if (onPlaying) onPlaying(); };
    const onVol = () => setMuted(v.muted);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("playing", onPlayingEv);
    v.addEventListener("volumechange", onVol);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("playing", onPlayingEv);
      v.removeEventListener("volumechange", onVol);
    };
  }, [onPlaying]);

  /* How far behind live, against the true edge. Not hls.js's
     liveSyncPosition: that is where it aims to sit, and measuring against it
     compares where we are with where we meant to be — it reads about zero
     however far back we really are. */
  useEffect(() => {
    const t = setInterval(() => {
      const v = vid.current;
      const sk = v?.seekable;
      if (!sk || !sk.length) return;
      setBehind(Math.max(0, sk.end(sk.length - 1) - v.currentTime));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const goLive = () => {
    const v = vid.current;
    const e = engine.current;
    const sk = v.seekable;
    if (!sk.length) return;
    // Where the engine wants to sit, not the edge itself — the last segment
    // is still being written, and seeking onto it stalls.
    const target = e?.kind === "hls" && e.inst.liveSyncPosition
      ? e.inst.liveSyncPosition
      : sk.end(sk.length - 1) - 3;
    v.currentTime = target;
    v.play().catch(() => {});
  };

  /* Auto hands the choice back to the engine. A fixed height turns the
     engine's own switching off, or it would move off the choice on the next
     change in bandwidth and the menu would be lying. */
  const pickQuality = (h) => {
    const e = engine.current;
    setChoice(h); setQOpen(false);
    if (!e) return;

    if (e.kind === "hls") {
      if (h === "auto") { e.inst.currentLevel = -1; return; }
      const lvl = levels.find((l) => l.height === h);
      if (lvl) e.inst.currentLevel = lvl.ref;   // switches now, not at the next segment
      return;
    }

    if (e.kind === "dash") {
      if (h === "auto") { e.inst.configure({ abr: { enabled: true } }); return; }
      const lvl = levels.find((l) => l.height === h);
      const track = e.inst.getVariantTracks().find((t) => t.id === lvl?.ref);
      if (!track) return;
      e.inst.configure({ abr: { enabled: false } });
      // Clearing the buffer makes the change visible at once instead of after
      // the dozen seconds already downloaded at the old height.
      e.inst.selectVariantTrack(track, true);
    }
  };

  const toggle = () => { const v = vid.current; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const mute = () => { vid.current.muted = !vid.current.muted; };

  const fullscreen = async () => {
    const el = wrap.current;
    try {
      if (!document.fullscreenElement) { await el.requestFullscreen(); setFull(true); }
      else { await document.exitFullscreen(); setFull(false); }
    } catch {
      // iPhone Safari has no element fullscreen; the video element does.
      try { vid.current.webkitEnterFullscreen?.(); } catch { /* not available */ }
    }
  };

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* Controls fade after a few seconds of stillness, the way every player's
     do, and come back on any movement or touch. */
  const wake = () => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      // Not while a menu is open: it lives in the bar, and fading the bar
      // took the menu away under a finger that was still scrolling it.
      if (!vid.current?.paused && !menuOpen.current) setChrome(false);
    }, 3000);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const atLive = behind <= LIVE_THRESH;

  return (
    <div
      ref={wrap}
      onMouseMove={wake}
      onTouchStart={wake}
      className="relative w-full h-full bg-black overflow-hidden select-none"
      style={{ cursor: chrome ? "default" : "none" }}
    >
      <video
        ref={vid}
        playsInline
        poster={poster || undefined}
        onClick={toggle}
        className="absolute inset-0 w-full h-full object-contain bg-black"
      />

      {(state === "loading" || state === "reconnecting") && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3
                         ${state === "loading" ? "bg-black/60" : "bg-black/30"}`}>
          <Loader2 className="w-9 h-9 animate-spin text-white/85" aria-hidden="true" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
            {state === "loading" ? "Starting live stream" : "Reconnecting"}
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-6">
          <p className="max-w-md text-center text-sm text-gray-200 leading-relaxed">{err}</p>
        </div>
      )}

      {/* ── controls ── */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300
                    ${chrome || paused || qOpen || lOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
        <div className="relative flex flex-nowrap items-center gap-1 sm:gap-3 px-2 sm:px-5 pt-6 sm:pt-10">
          <button type="button" onClick={toggle} aria-label={paused ? "Play" : "Pause"}
            className="shrink-0 p-1.5 sm:p-2 rounded-full text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {paused ? <Play className="w-6 h-6 fill-white" /> : <Pause className="w-6 h-6 fill-white" />}
          </button>

          <button type="button" onClick={mute} aria-label={muted ? "Unmute" : "Mute"}
            className="shrink-0 p-1.5 sm:p-2 rounded-full text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Live, or how far behind — and a way back when it is not. */}
          <button type="button" onClick={goLive} disabled={atLive}
            title={atLive ? "Watching live" : "Jump to live"}
            className={`shrink-0 ml-1 inline-flex items-center gap-1.5 rounded-md px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-black
                        uppercase tracking-widest transition-colors
                        ${atLive ? "bg-red-600 text-white cursor-default"
                                 : "bg-white/15 text-white hover:bg-white/25"}`}>
            <Radio className="w-3 h-3" aria-hidden="true" />
            {atLive ? "Live" : "Go live"}
          </button>
          {!atLive && (
            <span className="min-w-0 truncate text-[10px] sm:text-[11px] font-bold text-gray-300 tabular-nums">
              {fmtBehind(behind)} behind
            </span>
          )}

          {/* Pushes the rest to the right edge. The title shares it only where
              there is room; on a phone the buttons need every pixel. */}
          <span className="flex-1 min-w-0 hidden sm:block text-right text-xs font-semibold text-white/80 truncate">
            {title}
          </span>
          <span className="flex-1 sm:hidden" aria-hidden="true" />

          {/* Commentary language. Each is a separate stream, so choosing one
              loads it afresh — a live stream has no place to resume from, and
              the new one starts at its own live edge. Shown only when the
              match really is available in more than one. */}
          {languages?.length > 1 && (
            <div className="relative shrink-0">
              <button type="button" onClick={() => { setQOpen(false); setLOpen((o) => !o); }}
                aria-haspopup="menu" aria-expanded={lOpen} aria-label="Commentary language"
                className="inline-flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-full text-white hover:bg-white/15
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <Languages className="w-5 h-5" aria-hidden="true" />
                <span className="text-[11px] font-black">{lang}</span>
              </button>

              {lOpen && (
                <div role="menu"
                  className="absolute bottom-full right-0 mb-2 w-40 sm:w-44 rounded-xl bg-gray-900/95
                             ring-1 ring-white/10 shadow-2xl p-1 backdrop-blur overflow-y-auto overscroll-contain"
                  style={{ maxHeight: MENU_MAX, touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
                  onTouchMove={(e) => e.stopPropagation()}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Commentary
                  </p>
                  {languages.map((l) => (
                    <button key={l.code} type="button" role="menuitemradio" aria-checked={l.code === lang}
                      onClick={() => { setLOpen(false); if (l.code !== lang && onLanguage) onLanguage(l.id); }}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-1.5 sm:py-2 text-left text-sm text-white
                                 hover:bg-white/10">
                      <span className="w-4 shrink-0">
                        {l.code === lang && <Check className="w-4 h-4" aria-hidden="true" />}
                      </span>
                      <span className="flex-1">{l.label}</span>
                      <span className="text-[10px] text-gray-500">{l.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Only when there is a choice to make — a single-rung stream would
              offer a menu with one entry in it. */}
          {levels.length > 1 && (
            <div className="relative shrink-0">
              <button type="button" onClick={() => { setLOpen(false); setQOpen((o) => !o); }}
                aria-haspopup="menu" aria-expanded={qOpen} aria-label="Quality"
                className="inline-flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-full text-white hover:bg-white/15
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <Settings className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline text-[11px] font-black tabular-nums">
                  {choice === "auto" ? (playingH ? `Auto · ${qLabel(playingH)}` : "Auto") : qLabel(choice)}
                </span>
              </button>

              {/* Inside the player rather than on the body: in fullscreen only
                  the player is on screen, and a menu drawn anywhere else would
                  open where nobody can see it. */}
              {qOpen && (
                <div role="menu"
                  className="absolute bottom-full right-0 mb-2 w-40 sm:w-44 rounded-xl bg-gray-900/95
                             ring-1 ring-white/10 shadow-2xl p-1 backdrop-blur overflow-y-auto overscroll-contain"
                  style={{ maxHeight: MENU_MAX, touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
                  onTouchMove={(e) => e.stopPropagation()}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Quality</p>
                  {[{ key: "auto" }, ...levels.map((l) => ({ key: l.height, l }))].map(({ key, l }) => (
                    <button key={key} type="button" role="menuitemradio" aria-checked={choice === key}
                      onClick={() => pickQuality(key)}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-1.5 sm:py-2 text-left text-sm text-white
                                 hover:bg-white/10">
                      <span className="w-4 shrink-0">
                        {choice === key && <Check className="w-4 h-4" aria-hidden="true" />}
                      </span>
                      <span className="flex-1">
                        {key === "auto" ? "Auto" : qLabel(key)}
                        {key === "auto" && playingH ? (
                          <span className="ml-1.5 text-[11px] text-gray-400">({qLabel(playingH)})</span>
                        ) : null}
                      </span>
                      {l?.bitrate ? (
                        <span className="text-[10px] text-gray-500 tabular-nums">
                          {(l.bitrate / 1e6).toFixed(1)} Mb/s
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={fullscreen} aria-label={full ? "Exit full screen" : "Full screen"}
            className="shrink-0 p-1.5 sm:p-2 rounded-full text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {full ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
