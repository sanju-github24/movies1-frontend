import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import PausedOverlay from "../components/PausedOverlay";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, RotateCw, Settings, ChevronLeft, Zap,
  Volume1, Loader2, Check, Music, Layers, Activity, Languages, 
  Timer, Captions, X as CloseIcon, UploadCloud, ListVideo, ChevronRight,
  SkipForward, Clock, Layers3
} from "lucide-react";

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Browsers only render WebVTT in a <track>. Convert an SRT (or a header-less VTT)
// to WebVTT: add the WEBVTT header and turn "00:00:01,000" comma timestamps into
// "00:00:01.000" periods. Leaves an already-valid VTT untouched.
const toVtt = (text) => {
  const body = (text || "").replace(/\r+/g, "");
  if (/^﻿?WEBVTT/i.test(body.trim())) return body;              // already VTT
  return "WEBVTT\n\n" + body.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
};

// Does an audio track match a preferred language (a name like "Hindi" or a code
// like "hin"/"hi")? Compares codes and names loosely so profile prefs "just work".
const NAME_TO_CODE = { hindi:"hin", tamil:"tam", telugu:"tel", kannada:"kan", malayalam:"mal", english:"eng", bengali:"ben", marathi:"mar", punjabi:"pan", gujarati:"guj", urdu:"urd" };
const audioMatchesLang = (track, pref) => {
  if (!track || !pref) return false;
  const p = String(pref).toLowerCase().trim();
  const code = NAME_TO_CODE[p] || p;                    // "hindi" → "hin"
  const lang = (track.lang || "").toLowerCase();
  const name = (track.name || "").toLowerCase();
  return lang === code || lang === p || lang.slice(0, 2) === code.slice(0, 2)
      || name === p || (NAME_TO_CODE[name] && NAME_TO_CODE[name] === code);
};
const AUDIO_PREF_KEY = "preferred_audio_lang";

const getLanguageName = (track) => {
  if (!track) return "Unknown Audio";
  // both 2- and 3-letter ISO codes (our HLS uses 3-letter: kan, hin, tam…)
const langMap = {
  en: 'English', eng: 'English',
  hi: 'हिंदी', hin: 'हिंदी',
  bn: 'বাংলা', ben: 'বাংলা',
  ta: 'தமிழ்', tam: 'தமிழ்',
  te: 'తెలుగు', tel: 'తెలుగు',
  kn: 'ಕನ್ನಡ', kan: 'ಕನ್ನಡ',
  ml: 'മലയാളം', mal: 'മലയാളം',
  mr: 'मराठी', mar: 'मराठी',
  pa: 'ਪੰਜਾਬੀ', pan: 'ਪੰਜਾਬੀ',
  ur: 'اردو', urd: 'اردو',
  gu: 'ગુજરાતી', guj: 'ગુજરાતી',
  kok: 'कोंकणी',
  or: 'ଓଡ଼ିଆ', ori: 'ଓଡ଼ିଆ',
  as: 'অসমীয়া', asm: 'অসমীয়া',
  ne: 'नेपाली', nep: 'नेपाली'
};
  const langCode = (track.lang || "").toLowerCase();
  const name = (track.name || "").trim();
  // ignore ffmpeg's generic labels like "audio_1" / "Track 2" / "und"
  const generic = !name || /^(audio|track|stream|und|unknown)[\s_-]*\d*$/i.test(name);
  if (!generic && isNaN(name)) return name;          // a real descriptive name wins
  if (langMap[langCode]) return langMap[langCode];   // else map the language code
  if (langCode && langCode !== "und") return langCode.toUpperCase();
  return `Track ${(track.id ?? 0) + 1}`;
};

const VideoPlayer = ({ 
  src, 
  title, 
  onBackClick, 
  episodes = [], 
  onEpisodeClick, 
  currentEpisodeIndex,
  genres = [],
  logoUrl = "",
  quality = "",
  imdbRating = "0.0", // Prop passed from parent movieMeta
  year = "",          // Prop passed from parent movieMeta
  poster = "",        // TMDB poster (our-HLS playback)
  backdrop = "",      // TMDB backdrop (our-HLS playback)
  description = "",   // TMDB overview (our-HLS playback)
  inline = false,     // true → fill parent container (embedded in watch overlay); false → full viewport
  onProgress,         // optional (currentTime, duration) callback for resume/continue-watching
  startTime = 0,      // resume position (seconds) — seek here once the media loads
  preferredAudioLang = ""  // profile language (e.g. "Hindi") → auto-pick that audio track
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const didSeekRef = useRef(false);   // seek to startTime only once per source
  const appliedAudioRef = useRef(false);   // auto-pick preferred audio once per source
  const appliedSubRef = useRef(false);     // auto-enable default subtitle once per source
  const langBarShownRef = useRef(false);   // show the audio-language bar once per source
  const langBarTimer = useRef(null);
  const previewRef = useRef(null);         // hidden <video> for scrub-thumbnail preview
  const previewHlsRef = useRef(null);
  const progressBarRef = useRef(null);
  const previewSeekTimer = useRef(null);
  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;   // read by the loader effect without re-running it
  const showControlsRef = useRef(true);      // read inside timers without re-binding
  const tapRef = useRef({ t: 0, x: 0, id: 0 });
  const holdTimer = useRef(null);
  const heldRef = useRef(false);             // long-press speed boost is active
  const prevRateRef = useRef(1);
  const hideTimer = useRef(null);
  const lastTouchRef = useRef(0);            // suppress the click that follows a tap
  
  // Basic State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // HLS/Track State
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudioTrackId, setCurrentAudioTrackId] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [currentSubtitleId, setCurrentSubtitleId] = useState(-1);
  const [externalSubUrl, setExternalSubUrl] = useState(null);
  const [showSettings, setShowSettings] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hoverTime, setHoverTime] = useState(null);   // scrub preview time (null = hidden)
  const [hoverPct, setHoverPct] = useState(0);
  const [previewHasFrame, setPreviewHasFrame] = useState(false);  // hide black until a frame decodes
  const [showLangBar, setShowLangBar] = useState(false);   // Hotstar-style audio-language chooser on load
  const [langIntro, setLangIntro] = useState(false);       // intro phase: only the bar shows, controls stay hidden
  const [selectedSeason, setSelectedSeason] = useState(null); // season tab in the episodes panel
  const [seekFlash, setSeekFlash] = useState(null);   // {side:'back'|'fwd', secs} double-tap ripple
  const [speedBoost, setSpeedBoost] = useState(false);// long-press 2x indicator

  // Normalization
  const currentIndex = Number(currentEpisodeIndex);
  const hasNextEpisode = Array.isArray(episodes) && currentIndex < episodes.length - 1;
  const epSeason = (ep, i) => ep.season_number || ep.season || 1;
  const seasonNumbers = [...new Set((episodes || []).map((e) => e.season_number || e.season || 1))].sort((a, b) => a - b);
  const currentSeason = episodes[currentIndex]?.season_number || episodes[currentIndex]?.season || 1;
  const activeSeason = selectedSeason != null ? selectedSeason : currentSeason;
  const nextEpData = hasNextEpisode ? episodes[currentIndex + 1] : null;

  // Current episode for the S·E badge (series only; movies show nothing).
  const isSeries = Array.isArray(episodes) && episodes.length > 0;
  const currentEp = isSeries ? (episodes[currentIndex] || null) : null;
  const currentEpNum = currentEp?.episodeNumberInSeason || currentEp?.episode || currentEp?.episode_number || (currentIndex + 1);

  // Per-episode TMDB still — same field logic as WatchPage. Returns "" when the
  // episode has no still, so we never fall back to the wrong series/movie poster.
  const epStill = (ep) => ep?.thumbnail
    || (ep?.still_path ? (ep.still_path.startsWith("http") ? ep.still_path : `https://image.tmdb.org/t/p/w300${ep.still_path}`) : "");

  // New Feature: Auto-Play Logic
  const handleVideoEnd = useCallback(() => {
    if (hasNextEpisode) {
      onEpisodeClick(nextEpData, currentIndex + 1);
    }
  }, [hasNextEpisode, nextEpData, currentIndex, onEpisodeClick]);

  /* ── Controls visibility ───────────────────────────────────────────────
     One helper for every input (mouse, touch, keyboard): show the HUD and
     re-arm the auto-hide. Kept in a ref too so timers can read it. */
  const bumpControls = useCallback((show = true) => {
    setShowControls(show);
    showControlsRef.current = show;
    clearTimeout(hideTimer.current);
    if (show) {
      hideTimer.current = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused) {
          setShowControls(false);
          showControlsRef.current = false;
        }
      }, 3200);
    }
  }, []);

  /** Relative seek that stays inside the media and flashes the ±10s ripple. */
  const nudgeSeek = useCallback((secs, side) => {
    const v = videoRef.current;
    if (!v) return;
    const max = (v.duration || Infinity) - 0.5;
    v.currentTime = Math.max(0, Math.min(max, v.currentTime + secs));
    if (side) {
      setSeekFlash({ side, secs: Math.abs(secs) });
      setTimeout(() => setSeekFlash(null), 550);
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (showSettings) return;
    const v = videoRef.current;
    if (!v) return;
    const k = e.key.toLowerCase();
    if (/^[0-9]$/.test(k) && v.duration) {          // 0-9 → jump to 0%…90%
      e.preventDefault();
      v.currentTime = (Number(k) / 10) * v.duration;
      bumpControls();
      return;
    }
    switch (k) {
      case " ": case "k": e.preventDefault(); togglePlay(); break;
      case "f": e.preventDefault(); handleFullscreen(); break;
      case "m": setIsMuted(prev => !prev); break;
      case "arrowright": case "l": nudgeSeek(10, "fwd"); break;
      case "arrowleft":  case "j": nudgeSeek(-10, "back"); break;
      case "arrowup":   e.preventDefault(); setVolume(v2 => Math.min(1, +(v2 + 0.1).toFixed(2))); setIsMuted(false); break;
      case "arrowdown": e.preventDefault(); setVolume(v2 => Math.max(0, +(v2 - 0.1).toFixed(2))); break;
      case "c": changeSubtitles(currentSubtitleId === -1 ? (subtitleTracks.length ? 0 : -1) : -1); break;
      case ">": case ".": applySpeed(Math.min(2, playbackRate + 0.25)); break;
      case "<": case ",": applySpeed(Math.max(0.5, playbackRate - 0.25)); break;
      case "n": if (hasNextEpisode) onEpisodeClick(nextEpData, currentIndex + 1); break;
      case "escape": if (onBackClick) onBackClick(); break;
      default: break;
    }
    bumpControls();
  }, [showSettings, isPlaying, hasNextEpisode, nextEpData, currentIndex, onEpisodeClick,
      bumpControls, nudgeSeek, currentSubtitleId, subtitleTracks, playbackRate, onBackClick]);

  /* ── Touch gestures (mobile) ───────────────────────────────────────────
     Tap #1 only reveals the controls — it never pauses, which is what makes
     a phone player feel right. Tap #2 (while they're visible) toggles play.
     Double-tap the left/right third seeks ±10s, and holding down plays at 2x
     until you let go. */
  const onVideoTouchStart = useCallback((e) => {
    heldRef.current = false;
    const v = videoRef.current;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      if (!v || v.paused) return;
      heldRef.current = true;
      prevRateRef.current = v.playbackRate;
      v.playbackRate = 2;
      setSpeedBoost(true);
    }, 550);
    tapRef.current.x = e.touches[0].clientX;
  }, []);

  const endHold = useCallback(() => {
    clearTimeout(holdTimer.current);
    if (!heldRef.current) return false;
    heldRef.current = false;
    const v = videoRef.current;
    if (v) v.playbackRate = prevRateRef.current || playbackRate;
    setSpeedBoost(false);
    return true;                     // swallow the tap that ended the hold
  }, [playbackRate]);

  const onVideoTouchEnd = useCallback((e) => {
    if (endHold()) return;
    if (showSettings) { setShowSettings(null); return; }

    const x = e.changedTouches?.[0]?.clientX ?? 0;
    const rect = containerRef.current?.getBoundingClientRect();
    const zone = rect && rect.width ? (x - rect.left) / rect.width : 0.5;
    const now = Date.now();
    const prev = tapRef.current;

    if (now - prev.t < 320 && Math.abs(x - prev.x) < 80) {   // ── double tap ──
      tapRef.current = { t: 0, x, id: 0 };
      if (zone < 0.35) nudgeSeek(-10, "back");
      else if (zone > 0.65) nudgeSeek(10, "fwd");
      else togglePlay();
      bumpControls();
      return;
    }

    const id = now;
    tapRef.current = { t: now, x, id };
    setTimeout(() => {
      if (tapRef.current.id !== id) return;      // a double tap consumed it
      if (!showControlsRef.current) bumpControls(true);      // tap 1 → just show
      else if (videoRef.current?.paused) { togglePlay(); bumpControls(true); }
      else { togglePlay(); bumpControls(true); }            // tap 2 → play/pause
    }, 300);
  }, [endHold, showSettings, nudgeSeek, bumpControls]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Always start playing. If the browser blocks unmuted autoplay, retry muted.
  const tryAutoplay = () => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p && p.catch) p.catch(() => { v.muted = true; setIsMuted(true); v.play().catch(() => {}); });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setIsBuffering(true);
    didSeekRef.current = false;        // new source → allow one resume-seek
    appliedAudioRef.current = false;   // new source → re-apply preferred audio
    appliedSubRef.current = false;     // new source → re-apply default subtitle
    langBarShownRef.current = false;   // new source → offer the language bar again
    // tear down the old scrub-preview so it re-inits against the new source
    if (previewHlsRef.current) { try { previewHlsRef.current.destroy(); } catch {} previewHlsRef.current = null; }
    if (previewRef.current) { try { previewRef.current.removeAttribute("src"); delete previewRef.current.dataset.ready; } catch {} }
    setHoverTime(null);
    setPreviewHasFrame(false);

    if (src.includes(".m3u8") && Hls.isSupported()) {
      // Some external CDNs put an auth token in the master URL's query (e.g. ?in=…)
      // and require it on EVERY request, but hls.js doesn't carry a playlist's query
      // onto its children — so audio renditions/segments would load without it and
      // fail. Append the master's query to any child request that has none. Our own
      // R2 children already carry ?t=… (worker-rewritten), so they're skipped.
      const q = src.includes("?") ? src.slice(src.indexOf("?") + 1) : "";

      /* ── Tuning ──────────────────────────────────────────────────────────
         Desktop was fast and phones weren't, because with the defaults hls.js
         buffers ~30s/60MB, keeps the whole back-buffer, and never caps the
         rendition to the screen — a phone would pull 1080p segments over a
         mobile link before it could show frame one. On small screens we cap
         the level to the player size, keep buffers phone-sized, start from a
         conservative bandwidth estimate and let ABR climb, and (crucially)
         hand hls.js the resume position up front so it fetches the segment we
         actually need instead of loading from 0 and then seeking. */
      const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 820
        || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const link = navigator.connection || {};
      const estimate = link.downlink
        ? Math.max(500e3, link.downlink * 1e6 * 0.7)     // 70% of the reported downlink
        : (smallScreen ? 900e3 : 2e6);

      const resumeAt = startTimeRef.current > 1 ? startTimeRef.current : 0;
      const cfg = {
        enableWorker: true,
        lowLatencyMode: false,             // VOD — LL-HLS part loading only adds work
        startPosition: resumeAt || -1,
        startFragPrefetch: true,           // fetch the first fragment during manifest parse
        testBandwidth: true,

        // Rendition selection
        startLevel: -1,
        abrEwmaDefaultEstimate: estimate,
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.6,         // climb carefully, don't overshoot and stall
        capLevelOnFPSDrop: true,           // auto-quality is capped to 720p on phones
                                           // in MANIFEST_PARSED (see autoLevelCapping)

        // Buffers — phone memory is the limit, not bandwidth
        maxBufferLength: smallScreen ? 20 : 40,
        maxMaxBufferLength: smallScreen ? 90 : 600,
        maxBufferSize: (smallScreen ? 24 : 60) * 1000 * 1000,
        backBufferLength: smallScreen ? 30 : 90,

        // Flaky mobile networks: retry hard instead of parking on the spinner
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 500,
        fragLoadingMaxRetryTimeout: 8000,
        nudgeMaxRetry: 10,
      };
      if (q) {
        class TokenLoader extends Hls.DefaultConfig.loader {
          load(context, config, callbacks) {
            if (context?.url && !context.url.includes("?")) context.url += "?" + q;
            super.load(context, config, callbacks);
          }
        }
        cfg.loader = TokenLoader;
      }
      const hls = new Hls(cfg);
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      const syncTracks = () => {
        setAudioTracks(hls.audioTracks || []);
        setCurrentAudioTrackId(hls.audioTrack);
        setSubtitleTracks(hls.subtitleTracks || []);
        setLevels(hls.levels || []);
      };

      // Turn ON the default embedded subtitle once, when tracks first appear. Streams
      // without subtitles simply stay off. The user can still switch/disable it.
      const maybeEnableDefaultSub = (h) => {
        if (appliedSubRef.current) return;
        const tracks = h.subtitleTracks || [];
        if (!tracks.length) return;
        const di = Math.max(0, tracks.findIndex((t) => t.default));
        h.subtitleTrack = di;
        h.subtitleDisplay = true;
        setCurrentSubtitleId(di);
        appliedSubRef.current = true;
      };

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Phones: never let ABR climb past 720p. 1080p/4K segments are several
        // times larger for no visible gain on a 6" screen and are what made the
        // first seconds crawl. Manual quality picks still override this.
        // Resume: make sure the very first fragment request is the one at the
        // saved position. Without this a re-attach can start at 0 and only seek
        // after metadata — which is exactly the "coming back is slow" delay.
        if (resumeAt > 1 && (videoRef.current?.currentTime || 0) < resumeAt - 2) {
          try { hls.startLoad(resumeAt); } catch {}
        }
        if (smallScreen) {
          const cap = (hls.levels || []).reduce(
            (best, l, i) => (l.height && l.height <= 720 &&
              (best < 0 || l.height > hls.levels[best].height) ? i : best), -1);
          if (cap >= 0) hls.autoLevelCapping = cap;
        }
        syncTracks();
        setIsBuffering(false);
        // Auto-enable the default embedded subtitle (SUBTITLE_TRACKS_UPDATED refines it).
        maybeEnableDefaultSub(hls);
        tryAutoplay();
      });
      hls.on(Hls.Events.LEVEL_LOADED, syncTracks);
      // Subtitle & audio track lists often arrive AFTER manifest parse — keep them fresh.
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => { setSubtitleTracks(hls.subtitleTracks || []); maybeEnableDefaultSub(hls); });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => setAudioTracks(hls.audioTracks || []));
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => setCurrentAudioTrackId(data.id));
      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => setCurrentSubtitleId(data.id));
      // Keep the quality menu honest about what's actually playing (-1 = Auto).
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level));

      /* Recovery — a dropped segment on mobile data used to leave the spinner up
         forever because nothing restarted the loader. */
      let netRetries = 0, mediaRetries = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data?.fatal) {
          // Non-fatal buffer stall → let hls.js re-seek into the buffered range.
          if (data?.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) setIsBuffering(true);
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && netRetries < 6) {
          netRetries++;
          setTimeout(() => { try { hls.startLoad(); } catch {} }, Math.min(2000, 300 * netRetries));
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 3) {
          mediaRetries++;
          try { mediaRetries === 1 ? hls.recoverMediaError() : hls.swapAudioCodec() || hls.recoverMediaError(); } catch {}
        } else {
          try { hls.destroy(); } catch {}
        }
      });
      // A successful fragment means we're healthy again — reset the retry budget.
      hls.on(Hls.Events.FRAG_BUFFERED, () => { netRetries = 0; mediaRetries = 0; });

      /* Watchdog: if playback hasn't advanced for 10s while we think we're
         playing, kick the loader (and nudge past a bad segment boundary). */
      let lastT = 0, stuck = 0;
      const watchdog = setInterval(() => {
        const v = videoRef.current;
        if (!v || v.paused || v.seeking || v.ended) { stuck = 0; return; }
        if (v.currentTime > lastT + 0.05) { lastT = v.currentTime; stuck = 0; return; }
        stuck += 1;
        if (stuck === 2) { try { hls.startLoad(v.currentTime); } catch {} }         // ~4s
        if (stuck >= 5) { try { v.currentTime = v.currentTime + 0.2; } catch {} stuck = 0; }
      }, 2000);

      /* Mobile browsers tear down the media pipeline when the tab/app goes to the
         background. On return, restart the loader at the current position right
         away instead of waiting for the watchdog. */
      const onWake = () => {
        if (document.visibilityState !== "visible") return;
        const v = videoRef.current;
        if (!v) return;
        if (v.readyState < 3) { try { hls.startLoad(v.currentTime); } catch {} }
        if (!v.paused) v.play().catch(() => {});
      };
      document.addEventListener("visibilitychange", onWake);
      window.addEventListener("pageshow", onWake);

      return () => {
        clearInterval(watchdog);
        document.removeEventListener("visibilitychange", onWake);
        window.removeEventListener("pageshow", onWake);
        hls.destroy();
      };
    } else {
      // Native HLS (iPhone Safari): let the OS player prefetch, and start at the
      // resume point via the media fragment so it doesn't load from 0 and seek.
      video.preload = "auto";
      video.src = startTimeRef.current > 1
        ? `${src}${src.includes("#") ? "" : `#t=${Math.floor(startTimeRef.current)}`}`
        : src;
      // subtitles surface as the video's own textTracks.
      video.onloadedmetadata = () => {
        setIsBuffering(false);
        const tt = Array.from(video.textTracks || []).map((t, i) => ({ id: i, name: t.label || t.language, lang: t.language }));
        setSubtitleTracks(tt);
        for (let i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = "disabled"; // default OFF
        setCurrentSubtitleId(-1);
        tryAutoplay();
      };
    }
  }, [src]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // When a subtitle is uploaded, wait for the <track> to mount, turn off any HLS
  // subtitle and show the uploaded one (it's always the last text track).
  useEffect(() => {
    if (!externalSubUrl) return;
    const t = setTimeout(() => {
      if (hlsRef.current) { hlsRef.current.subtitleDisplay = false; hlsRef.current.subtitleTrack = -1; }
      const tracks = videoRef.current?.textTracks;
      if (tracks && tracks.length) {
        for (let i = 0; i < tracks.length; i++) tracks[i].mode = "disabled";
        tracks[tracks.length - 1].mode = "showing";
      }
    }, 120);
    return () => clearTimeout(t);
  }, [externalSubUrl]);

  // Auto-pick the preferred audio track once tracks are known. A remembered manual
  // choice (localStorage) wins; otherwise the profile language. Applied once per
  // source, so the user can still switch freely afterwards.
  useEffect(() => {
    if (!audioTracks.length || appliedAudioRef.current || !hlsRef.current) return;
    let saved = "";
    try { saved = localStorage.getItem(AUDIO_PREF_KEY) || ""; } catch {}
    const pref = saved || preferredAudioLang;
    if (pref) {
      const idx = audioTracks.findIndex((t) => audioMatchesLang(t, pref));
      if (idx >= 0) { hlsRef.current.audioTrack = idx; setCurrentAudioTrackId(idx); }
    }
    appliedAudioRef.current = true;
  }, [audioTracks, preferredAudioLang]);

  // Switch audio track + remember the choice (used by the menu and the language bar).
  const changeAudio = (i) => {
    if (hlsRef.current) hlsRef.current.audioTrack = i;
    setCurrentAudioTrackId(i);
    try { localStorage.setItem(AUDIO_PREF_KEY, audioTracks[i]?.lang || audioTracks[i]?.name || ""); } catch {}
  };
  // End the intro: fade the language bar out, then let the player controls slide in.
  const endLangIntro = () => {
    if (langBarTimer.current) clearTimeout(langBarTimer.current);
    setShowLangBar(false);
    setLangIntro(false);
    setShowControls(true);
    showControlsRef.current = true;
  };
  const scheduleEndLangIntro = (ms) => {
    if (langBarTimer.current) clearTimeout(langBarTimer.current);
    langBarTimer.current = setTimeout(endLangIntro, ms);
  };
  // Hotstar-style intro: on load show ONLY the language bar (controls hidden); once it
  // dismisses, the player controls appear smoothly. Runs once per source.
  useEffect(() => {
    if (audioTracks.length > 1 && !langBarShownRef.current) {
      langBarShownRef.current = true;
      setLangIntro(true);
      setShowLangBar(true);
      setShowControls(false);
      showControlsRef.current = false;
      scheduleEndLangIntro(5000);
    }
  }, [audioTracks]);

  // Clean up the hidden scrub-preview hls + timer on unmount.
  useEffect(() => () => {
    if (previewSeekTimer.current) clearTimeout(previewSeekTimer.current);
    if (previewHlsRef.current) { try { previewHlsRef.current.destroy(); } catch {} }
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (v.paused) v.play().catch(() => {}); else v.pause();
    setIsPlaying(!v.paused);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  const applySpeed = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setShowSettings(null);
  };

  // ── Scrub thumbnail preview (Netflix/Hotstar style) ──────────────────────
  // A hidden <video> loads the same source (lazily) and is seeked to the hovered
  // position; its frame is shown above the progress bar.
  const ensurePreview = useCallback(() => {
    const pv = previewRef.current;
    if (!pv || pv.dataset.ready) return;
    // Phones: skip it. A second HLS instance means a second decoder + a parallel
    // segment download competing with playback — the main cause of slow, stuttery
    // scrubbing on mobile (and Hotstar/Netflix don't show scrub previews there).
    if (Math.min(window.innerWidth, window.innerHeight) <= 820) return;
    pv.muted = true;
    // "Prime" the decoder — a muted play→pause makes the element actually render
    // frames when we seek it (otherwise a never-played <video> can stay black).
    const prime = () => { pv.play().then(() => pv.pause()).catch(() => {}); };
    if (src && src.includes(".m3u8") && Hls.isSupported()) {
      const q = src.includes("?") ? src.slice(src.indexOf("?") + 1) : "";   // carry token to children
      const pcfg = { maxBufferLength: 4, startLevel: 0, capLevelToPlayerSize: false };
      if (q) {
        class PreviewTokenLoader extends Hls.DefaultConfig.loader {
          load(context, config, callbacks) {
            if (context?.url && !context.url.includes("?")) context.url += "?" + q;
            super.load(context, config, callbacks);
          }
        }
        pcfg.loader = PreviewTokenLoader;
      }
      const h = new Hls(pcfg);
      previewHlsRef.current = h;
      h.loadSource(src);
      h.attachMedia(pv);
      h.on(Hls.Events.MANIFEST_PARSED, () => { h.currentLevel = 0; prime(); });  // lowest quality → light
    } else if (src) {
      pv.src = src;
      pv.addEventListener("loadedmetadata", prime, { once: true });
    }
    pv.dataset.ready = "1";
  }, [src]);

  const pctFromEvent = (clientX) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const showScrubAt = (clientX) => {
    if (!duration) return;
    const pct = pctFromEvent(clientX);
    const t = pct * duration;
    setHoverPct(pct * 100);      // time label + box follow the cursor instantly
    setHoverTime(t);
    ensurePreview();
    // Debounce the actual seek so we only load the segment the pointer settles on,
    // instead of thrashing through every position as it drags.
    if (previewSeekTimer.current) clearTimeout(previewSeekTimer.current);
    previewSeekTimer.current = setTimeout(() => {
      const pv = previewRef.current;
      if (pv) { try { pv.currentTime = Math.max(0, Math.min(t, (pv.duration || duration) - 0.2)); } catch {} }
    }, 140);
  };
  const seekTo = (clientX) => { if (duration && videoRef.current) videoRef.current.currentTime = pctFromEvent(clientX) * duration; };

  const changeSubtitles = (id) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = id;
      hlsRef.current.subtitleDisplay = id !== -1;
    }
    const tracks = videoRef.current.textTracks;
    for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = (id === 999 && i === tracks.length - 1) || (id !== -1 && id !== 999 && i === id) ? 'showing' : 'disabled';
    }
    setCurrentSubtitleId(id);
    setShowSettings(null);
  };

  const handleSubtitleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const vtt = toVtt(raw);   // .srt → WebVTT (or pass a real .vtt through)
      const url = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
      setExternalSubUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      setCurrentSubtitleId(999);
      setShowSettings(null);
    } catch {
      /* ignore unreadable file */
    }
    e.target.value = "";   // allow re-uploading the same filename
  };

  return (
    <div 
      ref={containerRef}
      className={`${inline ? "relative w-full h-full" : "fixed inset-0 w-full h-[100dvh]"} bg-black group overflow-hidden font-sans text-white select-none transition-all`}
      style={{ touchAction: "manipulation" }}   /* no double-tap zoom stealing our gestures */
      onMouseMove={() => {
        if (showSettings || showVolumeSlider) { bumpControls(true); clearTimeout(hideTimer.current); return; }
        bumpControls(true);
      }}
    >
      <video ref={videoRef} className="w-full h-full object-contain cursor-pointer bg-black" playsInline autoPlay
        onTouchStart={(e) => { lastTouchRef.current = Date.now(); onVideoTouchStart(e); }}
        onTouchEnd={(e) => { lastTouchRef.current = Date.now(); onVideoTouchEnd(e); }}
        onTouchCancel={endHold}
        onClick={() => {
          // Touch devices emit a click after touchend — the gesture handler
          // already dealt with it.
          if (Date.now() - lastTouchRef.current < 700) return;
          togglePlay();
          bumpControls(true);
        }}
        onTimeUpdate={() => {
          const v = videoRef.current; if (!v) return;
          setCurrentTime(v.currentTime);
          if (onProgress) onProgress(v.currentTime, v.duration);
        }}
        onLoadedMetadata={() => {
          setDuration(videoRef.current.duration);
          videoRef.current.playbackRate = playbackRate;   // keep chosen speed across episodes
          // Resume: seek to the saved position once, if it's meaningfully into the video.
          if (startTime > 1 && !didSeekRef.current && startTime < videoRef.current.duration - 5
              && Math.abs(videoRef.current.currentTime - startTime) > 2) {
            try { videoRef.current.currentTime = startTime; } catch {}
          }
          didSeekRef.current = true;
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
        onEnded={handleVideoEnd}
      >
        {externalSubUrl && <track key={externalSubUrl} kind="subtitles" src={externalSubUrl} srcLang="en" label="Uploaded" default />}
      </video>

      {/* --- INTEGRATED DATABASE PAUSED OVERLAY --- */}
      <PausedOverlay
        isVisible={!isPlaying && !isBuffering}
        title={title}
        genres={genres}
        quality={quality}
        logoUrl={logoUrl}
        imdbRating={imdbRating}
        year={year}
        poster={poster}
        backdrop={backdrop}
        description={description}
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40 backdrop-blur-sm">
          <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Double-tap ±10s ripple */}
      {seekFlash && (
        <div className={`absolute inset-y-0 ${seekFlash.side === "back" ? "left-0" : "right-0"} w-2/5 z-40 flex items-center justify-center pointer-events-none
          bg-white/10 ${seekFlash.side === "back" ? "rounded-r-[50%]" : "rounded-l-[50%]"} animate-in fade-in duration-150`}>
          <div className="flex flex-col items-center gap-1 text-white drop-shadow-lg">
            {seekFlash.side === "back" ? <RotateCcw className="w-8 h-8" /> : <RotateCw className="w-8 h-8" />}
            <span className="text-xs font-black tracking-wide">{seekFlash.secs}s</span>
          </div>
        </div>
      )}

      {/* Hold-to-speed indicator */}
      {speedBoost && (
        <div className="absolute top-16 sm:top-24 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white text-xs font-black">
            <Zap className="w-3.5 h-3.5 text-blue-400" fill="currentColor" /> 2x SPEED
          </div>
        </div>
      )}

      {/* --- EPISODES PANEL — right-docked, season-separated (not full-screen) --- */}
      {showSettings === 'episodes' && (
        <div className="absolute top-0 right-0 bottom-0 z-[150] w-full sm:w-[400px] bg-black/92 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-[-16px_0_48px_rgba(0,0,0,0.6)] animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <div className="min-w-0">
              <h2 className="text-lg font-black uppercase italic tracking-tight text-white leading-none">Episodes</h2>
              <span className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest truncate mt-1">{title}</span>
            </div>
            <button onClick={() => setShowSettings(null)} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-red-600 transition-all shrink-0"><CloseIcon size={20}/></button>
          </div>

          {/* Season tabs (horizontal) */}
          {seasonNumbers.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3 border-b border-white/10 shrink-0 scrollbar-hide">
              {seasonNumbers.map((sn) => (
                <button
                  key={sn}
                  onClick={() => setSelectedSeason(sn)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeSeason === sn ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                >
                  Season {sn}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {episodes
              .map((ep, i) => ({ ep, i }))
              .filter(({ ep, i }) => epSeason(ep, i) === activeSeason)
              .map(({ ep, i }) => (
                <button
                  key={i}
                  onClick={() => { onEpisodeClick(ep, i); setShowSettings(null); }}
                  className={`w-full group flex gap-3 p-2 rounded-xl text-left transition-all border ${currentIndex === i ? 'bg-blue-600/20 border-blue-500' : 'border-transparent hover:bg-white/5'}`}
                >
                  <div className="relative w-28 shrink-0 aspect-video rounded-lg overflow-hidden bg-gray-900 border border-white/10">
                    {epStill(ep) && <img src={epStill(ep)} className="w-full h-full object-cover" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                    <span className="absolute left-1 top-1 text-[9px] font-black bg-black/70 px-1.5 py-0.5 rounded">E{ep.episodeNumberInSeason || ep.episode || (i + 1)}</span>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play size={20} fill="white"/></div>
                    {currentIndex === i && <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center"><Activity className="animate-pulse" size={18}/></div>}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className={`text-sm font-bold line-clamp-1 ${currentIndex === i ? 'text-blue-400' : 'text-white'}`}>{ep.title || `Episode ${i + 1}`}</h4>
                    <p className="text-gray-500 text-[11px] leading-snug line-clamp-2 mt-0.5">{ep.description || ''}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* --- SETTINGS — compact panel docked bottom-right (no full-screen overlay) --- */}
      {showSettings && showSettings !== 'episodes' && (
        <>
          <div className="absolute inset-0 z-[95]" onClick={() => setShowSettings(null)} />
          <div className="absolute bottom-24 right-6 z-[100] w-64 max-w-[80vw] bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-white animate-in slide-in-from-bottom-2 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">{{ subs: "Subtitles", audio: "Audio", quality: "Quality", speed: "Playback Speed" }[showSettings] || showSettings}</h3>
              <button onClick={() => setShowSettings(null)} className="p-1 text-white/60 hover:text-white transition-colors"><CloseIcon size={18}/></button>
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar py-1">
              {showSettings === 'subs' && (
                <>
                  <button onClick={() => changeSubtitles(-1)} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${currentSubtitleId === -1 ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                    <span className="text-sm font-medium">Off</span>{currentSubtitleId === -1 && <Check size={16} className="text-blue-400"/>}
                  </button>
                  {subtitleTracks.map((t, i) => (
                    <button key={i} onClick={() => changeSubtitles(i)} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${currentSubtitleId === i ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                      <span className="text-sm font-medium">{getLanguageName(t)}</span>{currentSubtitleId === i && <Check size={16} className="text-blue-400"/>}
                    </button>
                  ))}
                  {externalSubUrl && (
                    <button onClick={() => changeSubtitles(999)} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${currentSubtitleId === 999 ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                      <span className="text-sm font-medium">Uploaded subtitle</span>{currentSubtitleId === 999 && <Check size={16} className="text-blue-400"/>}
                    </button>
                  )}
                  {subtitleTracks.length === 0 && !externalSubUrl && (
                    <p className="px-4 py-2 text-xs text-white/40">No subtitles in this video — upload one below.</p>
                  )}
                  <label className="flex items-center gap-2 mx-3 my-2 px-3 py-2 rounded-lg border border-dashed border-white/15 hover:border-blue-500/50 cursor-pointer text-white/70 hover:text-white transition-all">
                    <UploadCloud size={16}/><span className="text-xs font-medium">Upload subtitle (.srt / .vtt)</span>
                    <input type="file" accept=".vtt,.srt,text/vtt,application/x-subrip" className="hidden" onChange={handleSubtitleUpload} />
                  </label>
                </>
              )}
              {showSettings === 'quality' && levels.length > 0 && (
                <button onClick={() => { hlsRef.current.currentLevel = -1; setShowSettings(null); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${currentLevel === -1 ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-sm font-medium">Auto</span>{currentLevel === -1 && <Check size={16} className="text-blue-400"/>}
                </button>
              )}
              {showSettings === 'quality' && (levels.length ? levels.map((l, i) => (
                <button key={i} onClick={() => { hlsRef.current.currentLevel = i; setShowSettings(null); }} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${currentLevel === i ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-sm font-medium">{l.height}p</span>{currentLevel === i && <Check size={16} className="text-blue-400"/>}
                </button>
              )) : <p className="px-4 py-3 text-sm text-white/40">Not available</p>)}
              {showSettings === 'audio' && (audioTracks.length ? audioTracks.map((t, i) => (
                <button key={i} onClick={() => { changeAudio(i); setShowSettings(null); }} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${currentAudioTrackId === i ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-sm font-medium">{getLanguageName(t)}</span>{currentAudioTrackId === i && <Check size={16} className="text-blue-400"/>}
                </button>
              )) : <p className="px-4 py-3 text-sm text-white/40">Not available</p>)}
              {showSettings === 'speed' && [0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                <button key={r} onClick={() => applySpeed(r)} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${playbackRate === r ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-sm font-medium">{r === 1 ? "Normal" : `${r}x`}</span>{playbackRate === r && <Check size={16} className="text-blue-400"/>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* --- HUD: TOP --- */}
      <div className={`absolute top-0 inset-x-0 p-3 sm:p-5 md:p-8 flex items-center justify-between bg-gradient-to-b from-black/95 via-black/20 to-transparent transition-all duration-500 z-50 ${showControls && !langIntro ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="flex items-center gap-2 sm:gap-4 md:gap-5">
          <button onClick={onBackClick} className="p-2 sm:p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all active:scale-90"><ChevronLeft size={26} /></button>
          <div className="flex flex-col text-left min-w-0">
            {logoUrl
              ? <img src={logoUrl} alt={title} className="h-8 md:h-11 max-w-[220px] md:max-w-md object-contain drop-shadow-2xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              : <h1 className="text-lg md:text-2xl font-bold truncate max-w-xs md:max-w-xl drop-shadow-2xl">{title}</h1>}
            {isSeries && (
              <span className="mt-1 text-[10px] md:text-xs font-black uppercase tracking-[0.15em] text-blue-400 truncate max-w-[220px] md:max-w-md drop-shadow">
                S{currentSeason} · E{currentEpNum}{currentEp?.title ? ` · ${currentEp.title}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center Play Indicator */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 z-30 ${!isPlaying && !isBuffering ? 'opacity-100 scale-100' : 'opacity-0 scale-125'}`}>
         <div className="p-8 rounded-full border border-white/10 bg-black/30 backdrop-blur-md shadow-2xl">
            {isPlaying ? <Pause size={40} fill="white" className="text-white" /> : <Play size={40} fill="white" className="text-white ml-1" />}
         </div>
      </div>

      {/* Audio-language chooser — slides up on load (Hotstar-style), default highlighted */}
      {showLangBar && audioTracks.length > 1 && (
        <div className="absolute inset-x-0 bottom-28 sm:bottom-32 z-[60] flex justify-center px-4">
          <div className="flex items-center gap-1 sm:gap-2 max-w-full overflow-x-auto no-scrollbar bg-black/70 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.15em] text-white/40 px-2 shrink-0">Audio</span>
            {audioTracks.map((t, i) => (
              <button key={i} onClick={() => { changeAudio(i); scheduleEndLangIntro(1200); }}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 ${currentAudioTrackId === i ? "bg-white text-black" : "text-white/80 hover:bg-white/10"}`}>
                {getLanguageName(t)}
              </button>
            ))}
            <button onClick={endLangIntro}
              className="ml-1 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 shrink-0"><CloseIcon size={16}/></button>
          </div>
        </div>
      )}

      {/* --- HUD: BOTTOM (CLEAN HUD) --- */}
      <div className={`absolute bottom-0 inset-x-0 p-3 sm:p-5 md:p-8 bg-gradient-to-t from-black via-black/80 to-transparent transition-all duration-500 z-50 ${showControls && !langIntro ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="relative mb-2 sm:mb-4">
            {/* Scrub thumbnail preview (like Netflix/Hotstar) */}
            <div className="absolute bottom-7 -translate-x-1/2 pointer-events-none z-10 transition-opacity duration-100" style={{ left: `${hoverPct}%`, opacity: hoverTime != null ? 1 : 0 }}>
                <div className="relative w-28 sm:w-40 aspect-video rounded-lg overflow-hidden border border-white/25 bg-black shadow-2xl">
                    {/* poster/backdrop fallback so the box is never black while the frame loads */}
                    {(backdrop || poster) && <img src={backdrop || poster} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                    <video ref={previewRef} muted playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150" style={{ opacity: previewHasFrame ? 1 : 0 }}
                        onSeeked={() => setPreviewHasFrame(true)} onLoadedData={() => setPreviewHasFrame(true)} />
                </div>
                <div className="text-center text-[11px] font-black text-white mt-1 drop-shadow">{formatTime(hoverTime || 0)}</div>
            </div>
            <div className="flex justify-between text-[10px] font-semibold mb-1.5 px-1 text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
            {/* thin progress bar with a taller invisible hit area for easy hover/drag */}
            <div ref={progressBarRef} className="relative py-2 cursor-pointer group/progress"
                onClick={(e) => seekTo(e.clientX)}
                onMouseMove={(e) => showScrubAt(e.clientX)}
                onMouseLeave={() => setHoverTime(null)}
                onTouchStart={(e) => showScrubAt(e.touches[0].clientX)}
                onTouchMove={(e) => showScrubAt(e.touches[0].clientX)}
                onTouchEnd={() => { if (hoverTime != null && videoRef.current) videoRef.current.currentTime = hoverTime; setHoverTime(null); }}>
              <div className="relative h-1 group-hover/progress:h-1.5 w-full bg-white/25 rounded-full transition-all">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }} />
                {hoverTime != null && <div className="absolute top-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full bg-white shadow-lg" style={{ left: `${hoverPct}%` }} />}
              </div>
            </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 sm:gap-6 md:gap-10 min-w-0">
            <button onClick={() => nudgeSeek(-10, "back")} aria-label="Back 10 seconds"
              className="inline-flex hover:text-blue-500 active:scale-90 transition-all"><RotateCcw className="w-6 h-6 sm:w-6 sm:h-6"/></button>
            <button onClick={togglePlay} className="hover:scale-110 transition-transform active:scale-90 shrink-0">
              {isPlaying ? <Pause className="w-7 h-7 sm:w-8 sm:h-8 text-white" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-0.5" fill="white" />}
            </button>
            <button onClick={() => nudgeSeek(10, "fwd")} aria-label="Forward 10 seconds"
              className="inline-flex hover:text-blue-500 active:scale-90 transition-all"><RotateCw className="w-6 h-6 sm:w-6 sm:h-6"/></button>

            {hasNextEpisode && (
                <button onClick={() => onEpisodeClick(nextEpData, currentIndex + 1)} className="p-1.5 sm:p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-lg hover:bg-blue-600 transition-all text-white flex items-center gap-2 shrink-0">
                    <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
                    <span className="hidden md:inline text-xs font-semibold">Next Episode</span>
                </button>
            )}

            <div className="relative flex items-center group/volume shrink-0" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                <button onClick={() => setIsMuted(!isMuted)} className="hover:text-blue-500 transition-colors">{isMuted ? <VolumeX className="w-6 h-6 sm:w-7 sm:h-7"/> : <Volume2 className="w-6 h-6 sm:w-7 sm:h-7"/>}</button>
                <div className={`hidden sm:flex items-center transition-all duration-300 overflow-hidden ${showVolumeSlider ? 'w-24 opacity-100 ml-2' : 'w-0 opacity-0'}`}>
                    <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1 bg-white/20 accent-blue-500 cursor-pointer" />
                </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {episodes.length > 0 && (
                <button onClick={() => setShowSettings('episodes')} className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-600 transition-all text-white flex items-center gap-2">
                    <ListVideo className="w-5 h-5" /><span className="hidden md:inline text-xs font-semibold">Episodes</span>
                </button>
            )}
            <button onClick={() => setShowSettings('speed')} className={`px-2 py-1.5 sm:px-2.5 sm:py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all text-xs font-black min-w-[34px] ${showSettings === 'speed' ? 'text-blue-400' : 'text-white'}`}>{playbackRate === 1 ? '1x' : `${playbackRate}x`}</button>
            <button onClick={() => setShowSettings('subs')} className={`p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all ${currentSubtitleId !== -1 ? 'text-blue-400' : 'text-white'}`}><Captions className="w-5 h-5" /></button>
            <button onClick={() => setShowSettings('audio')} className={`p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all ${showSettings === 'audio' ? 'text-blue-400' : 'text-white'}`}><Music className="w-5 h-5" /></button>
            <button onClick={() => setShowSettings('quality')} className={`hidden sm:inline-flex p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all ${showSettings === 'quality' ? 'text-blue-400' : 'text-white'}`}><Layers className="w-5 h-5" /></button>
            <button onClick={handleFullscreen} className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all text-white"><Maximize className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;