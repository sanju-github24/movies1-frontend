import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, Radio } from "lucide-react";

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

const fmtBehind = (s) => {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return `${m}m ${String(r).padStart(2, "0")}s`;
};

export default function AnchorPlayer({ source, title, poster, onPlaying, onError }) {
  const wrap = useRef(null);
  const vid = useRef(null);
  const engine = useRef(null);            // { kind, inst }
  const [state, setState] = useState("loading");   // loading | playing | error
  const [err, setErr] = useState("");
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [behind, setBehind] = useState(0);
  const [chrome, setChrome] = useState(true);
  const hideTimer = useRef(null);

  const fail = useCallback((msg) => {
    setErr(msg); setState("error");
    if (onError) onError(msg);
  }, [onError]);

  /* ── attach ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!source?.url) return;
    let dead = false;
    const v = vid.current;
    setState("loading"); setErr(""); setBehind(0);

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
              lowLatencyMode: true,
              /* Two segments back, pulled forward at six. At a four second
                 target that is eight behind rather than twelve, corrected at
                 twenty-four rather than forty. */
              liveSyncDurationCount: 2,
              liveMaxLatencyDurationCount: 6,
              maxBufferLength: 30,
              backBufferLength: 60,
            });
            engine.current = { kind: "hls", inst: hls };
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (!data.fatal) return;
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                fail("The stream stopped answering — its token may have expired, or the proxy could not reach it.");
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                try { hls.recoverMediaError(); } catch { fail("This stream could not be decoded."); }
              } else {
                fail("This stream could not be played.");
              }
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
            const code = ev.detail?.code;
            fail(code >= 6000 && code < 7000
              ? `Could not decrypt this stream (Shaka ${code}) — its key may be wrong or out of date.`
              : `This stream could not be played (Shaka ${code}).`);
          });

          await player.load(source.url);
          if (dead) return;

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
  }, [source, fail]);

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
    hideTimer.current = setTimeout(() => { if (!vid.current?.paused) setChrome(false); }, 3000);
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

      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
          <Loader2 className="w-9 h-9 animate-spin text-white/85" aria-hidden="true" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Starting live stream</p>
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
                    ${chrome || paused ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-5 pt-10">
          <button type="button" onClick={toggle} aria-label={paused ? "Play" : "Pause"}
            className="p-2 rounded-full text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {paused ? <Play className="w-6 h-6 fill-white" /> : <Pause className="w-6 h-6 fill-white" />}
          </button>

          <button type="button" onClick={mute} aria-label={muted ? "Unmute" : "Mute"}
            className="p-2 rounded-full text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Live, or how far behind — and a way back when it is not. */}
          <button type="button" onClick={goLive} disabled={atLive}
            title={atLive ? "Watching live" : "Jump to live"}
            className={`ml-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-black
                        uppercase tracking-widest transition-colors
                        ${atLive ? "bg-red-600 text-white cursor-default"
                                 : "bg-white/15 text-white hover:bg-white/25"}`}>
            <Radio className="w-3 h-3" aria-hidden="true" />
            {atLive ? "Live" : "Go live"}
          </button>
          {!atLive && (
            <span className="text-[11px] font-bold text-gray-300 tabular-nums">
              {fmtBehind(behind)} behind
            </span>
          )}

          <span className="ml-auto hidden sm:block text-xs font-semibold text-white/80 truncate max-w-[40%]">
            {title}
          </span>

          <button type="button" onClick={fullscreen} aria-label={full ? "Exit full screen" : "Full screen"}
            className="p-2 rounded-full text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {full ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
