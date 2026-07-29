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

  const handleKeyDown = useCallback((e) => {
    if (showSettings) return;
    const v = videoRef.current;
    if (!v) return;
    switch (e.key.toLowerCase()) {
      case " ": e.preventDefault(); togglePlay(); break;
      case "f": e.preventDefault(); handleFullscreen(); break;
      case "m": setIsMuted(prev => !prev); break;
      case "arrowright": v.currentTime += 10; break;
      case "arrowleft": v.currentTime -= 10; break;
      case "n": if(hasNextEpisode) onEpisodeClick(nextEpData, currentIndex + 1); break;
      default: break;
    }
    setShowControls(true);
  }, [showSettings, isPlaying, hasNextEpisode, nextEpData, currentIndex, onEpisodeClick]);

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
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
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

      return () => hls.destroy();
    } else {
      // Native HLS (Safari): subtitles surface as the video's own textTracks.
      video.src = src;
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
    pv.muted = true;
    // "Prime" the decoder — a muted play→pause makes the element actually render
    // frames when we seek it (otherwise a never-played <video> can stay black).
    const prime = () => { pv.play().then(() => pv.pause()).catch(() => {}); };
    if (src && src.includes(".m3u8") && Hls.isSupported()) {
      const h = new Hls({ maxBufferLength: 4, startLevel: 0, capLevelToPlayerSize: false });
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
      onMouseMove={() => {
        setShowControls(true);
        clearTimeout(window.controlsTimeout);
        window.controlsTimeout = setTimeout(() => {
          if (isPlaying && !showSettings && !showVolumeSlider) setShowControls(false);
        }, 3000);
      }}
    >
      <video ref={videoRef} className="w-full h-full object-contain cursor-pointer bg-black" onClick={togglePlay} playsInline autoPlay
        onTimeUpdate={() => {
          const v = videoRef.current; if (!v) return;
          setCurrentTime(v.currentTime);
          if (onProgress) onProgress(v.currentTime, v.duration);
        }}
        onLoadedMetadata={() => {
          setDuration(videoRef.current.duration);
          videoRef.current.playbackRate = playbackRate;   // keep chosen speed across episodes
          // Resume: seek to the saved position once, if it's meaningfully into the video.
          if (startTime > 1 && !didSeekRef.current && startTime < videoRef.current.duration - 5) {
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
          <Loader2 className="w-14 h-14 text-blue-500 animate-spin" />
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
          <div className="flex items-center gap-3 sm:gap-6 md:gap-10 min-w-0">
            <button onClick={() => { videoRef.current.currentTime -= 10; }} className="hidden sm:inline-flex hover:text-blue-500 transition-colors"><RotateCcw size={24}/></button>
            <button onClick={togglePlay} className="hover:scale-110 transition-transform active:scale-90 shrink-0">
              {isPlaying ? <Pause className="w-7 h-7 sm:w-8 sm:h-8 text-white" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-0.5" fill="white" />}
            </button>
            <button onClick={() => { videoRef.current.currentTime += 10; }} className="hidden sm:inline-flex hover:text-blue-500 transition-colors"><RotateCw size={24}/></button>

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