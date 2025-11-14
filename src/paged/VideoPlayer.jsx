// src/components/VideoPlayer.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Minimize,
  Maximize,
  Loader2,
  ChevronLeft,
  FastForward,
  Rewind,
  Check,
  Equal,
  Music,
  Star,
  Settings,
} from "lucide-react";

// Utility function to format seconds into HH:MM:SS
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity || seconds < 0) return "0:00";
  const date = new Date(0);
  date.setSeconds(Math.floor(seconds));
  const timeString = date.toISOString().substr(11, 8);
  return timeString.startsWith("00:") ? timeString.substring(3) : timeString;
};

// --------------------
// Persistence helpers
// --------------------
const STORAGE_KEY_PREFIX = "video_last_time_v1:"; // versioned key so you can change format later
const getStorageKey = (slugOrSrc) => `${STORAGE_KEY_PREFIX}${slugOrSrc}`;

const getLastPlaybackTime = (src, slug) => {
  try {
    const key = getStorageKey(slug || src);
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.time === "number") return parsed.time;
    return 0;
  } catch (e) {
    console.warn("Failed to read last playback time:", e);
    return 0;
  }
};

const setLastPlaybackTime = (src, slug, time) => {
  try {
    const key = getStorageKey(slug || src);
    const payload = { time: Number(time) || 0, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed to save last playback time:", e);
  }
};

// Keep recently watched in sync so the watchlist page can show it
const updateRecentlyWatched = (meta = {}) => {
  try {
    const existing = JSON.parse(localStorage.getItem("recently_watched") || "[]");
    // meta should contain at least slug and title; poster/cover/titleLogo are optional
    if (!meta || !meta.slug) return;
    const filtered = existing.filter((m) => m.slug !== meta.slug);
    const updatedEntry = {
      slug: meta.slug,
      title: meta.title || meta.slug,
      poster: meta.poster || meta.cover_poster || meta.titleLogoUrl || "",
      cover_poster: meta.cover_poster || meta.poster || "",
      title_logo: meta.titleLogoUrl || "",
      lastSeenAt: Date.now(),
    };
    const updated = [updatedEntry, ...filtered].slice(0, 20); // keep up to 20
    localStorage.setItem("recently_watched", JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to update recently_watched:", e);
  }
};

// --------------------
// VideoPlayer
// --------------------
const VideoPlayer = ({ src, title = "Video Title", onBackClick, playerOverlayData = {}, language }) => {
  const videoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const playerContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const savedTimeRef = useRef(null); // used when switching quality/audio
  const periodicSaveRef = useRef(null); // interval id for periodic save

  // --- Player State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false); // quick flash on play/pause clicks
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isHlsSource, setIsHlsSource] = useState(false);

  // --- HLS Track State ---
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudioTrackId, setCurrentAudioTrackId] = useState(-1);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1);

  // 🔑 STATES for right-side panels
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [showAudioPanel, setShowAudioPanel] = useState(false);

  // ⭐️ State for the Netflix-style metadata overlay (PAUSE OVERLAY)
  const [showMetadataOverlay, setShowMetadataOverlay] = useState(false);

  // 📱 Mobile View Detection
  const [isMobileView, setIsMobileView] = useState(window.matchMedia("(max-width: 768px)").matches);

  // Resize / media query handler
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobileView(e.matches);
    setIsMobileView(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Helper to compute storage key id (slug preferred)
  const getKeyId = () => {
    return (playerOverlayData && playerOverlayData.slug) ? playerOverlayData.slug : src;
  };

  // --- Player Actions ---
  const togglePlayPause = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.pause();
    } else {
      videoEl.play().catch((e) => console.error("Play failed:", e));
    }

    // small feedback overlay
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 400);
  }, [isPlaying]);

  const toggleMute = (e) => {
    e?.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (showVolumeSlider) {
      videoEl.muted = !isMuted;
      setIsMuted(!isMuted);
      setVolume(isMuted ? videoEl.volume || 1 : 0);
      setShowVolumeSlider(false);
    } else {
      if (isMuted) {
        videoEl.muted = false;
        setIsMuted(false);
        setVolume(volume || 1);
      }
      setShowVolumeSlider(true);
    }
  };

  const handleVolumeChange = (e) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const newVolume = parseFloat(e.target.value);
    videoEl.volume = newVolume;
    setVolume(newVolume);

    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      videoEl.muted = false;
    } else if (newVolume === 0 && !isMuted) {
      setIsMuted(true);
      videoEl.muted = true;
    }
  };

  const handleSeek = (e) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const seekTime = parseFloat(e.target.value);
    videoEl.currentTime = seekTime;
    setCurrentTime(seekTime);

    // Save immediately on user seek
    try {
      setLastPlaybackTime(src, getKeyId(), seekTime);
    } catch (e) {}
  };

  const seekRelative = useCallback(
    (seconds) => {
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.currentTime = Math.max(0, Math.min(duration, videoEl.currentTime + seconds));
        setCurrentTime(videoEl.currentTime);

        // Save after seeking
        try {
          setLastPlaybackTime(src, getKeyId(), videoEl.currentTime);
        } catch (e) {}
      }
    },
    [duration, src]
  );

  const toggleFullScreen = useCallback(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // --- Improved handlers for audio & quality switching (smooth) ---
  const handleAudioTrackChange = useCallback(
    (newTrackId) => {
      const hls = hlsInstanceRef.current;
      const videoEl = videoRef.current;
      if (!hls || newTrackId === currentAudioTrackId) return;

      // Save pos
      savedTimeRef.current = videoEl?.currentTime || 0;
      setIsLoading(true);

      try {
        hls.audioTrack = newTrackId;
      } catch (err) {
        console.error("Audio track switch error:", err);
        setIsLoading(false);
      }

      setShowAudioPanel(false);
      setShowControls(true);
    },
    [currentAudioTrackId]
  );

  const handleQualityChange = useCallback(
    (newLevel) => {
      const hls = hlsInstanceRef.current;
      const videoEl = videoRef.current;
      if (!hls || newLevel === currentQualityLevel) {
        setShowQualityPanel(false);
        return;
      }

      savedTimeRef.current = videoEl?.currentTime || 0;
      setIsLoading(true);

      try {
        if (newLevel === -1) {
          hls.currentLevel = -1;
          setCurrentQualityLevel(-1);
        } else {
          hls.currentLevel = newLevel;
          setCurrentQualityLevel(newLevel);
        }
      } catch (err) {
        console.error("Quality switch error:", err);
        setIsLoading(false);
      }

      setShowQualityPanel(false);
      setShowControls(true);
    },
    [currentQualityLevel]
  );

  // --- Controls visibility logic ---
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityPanel && !showAudioPanel && !showVolumeSlider) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, showQualityPanel, showAudioPanel, showVolumeSlider]);

  useEffect(() => {
    showControlsTemporarily();

    const handleClickOutside = (event) => {
      if (playerContainerRef.current && !playerContainerRef.current.contains(event.target)) {
        setShowQualityPanel(false);
        setShowAudioPanel(false);
        setShowVolumeSlider(false);
      } else if (showVolumeSlider) {
        const target = event.target;
        const isVolumeControl = target && target.closest && target.closest(".volume-control-area");
        if (!isVolumeControl) setShowVolumeSlider(false);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) setShowControls(true);
    };

    const playerContainer = playerContainerRef.current;
    if (playerContainer) {
      playerContainer.addEventListener("mousemove", showControlsTemporarily);

      const handleMouseLeave = () => {
        if (isPlaying && !showQualityPanel && !showAudioPanel && !showVolumeSlider) {
          setShowControls(false);
        }
      };
      playerContainer.addEventListener("mouseleave", handleMouseLeave);

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("fullscreenchange", handleFullscreenChange);
    }

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playerContainer) {
        playerContainer.removeEventListener("mousemove", showControlsTemporarily);
        const handleMouseLeave = () => {
          if (isPlaying && !showQualityPanel && !showAudioPanel && !showVolumeSlider) {
            setShowControls(false);
          }
        };
        playerContainer.removeEventListener("mouseleave", handleMouseLeave);
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      }
    };
  }, [isPlaying, showControlsTemporarily, showQualityPanel, showAudioPanel, showVolumeSlider]);

  // --- PAUSE / PLAY overlay logic (immediate) ---
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handlePause = () => {
      setShowMetadataOverlay(true);
      setShowControls(false);

      // Save playback time on pause
      try {
        const v = videoRef.current;
        if (v && src) {
          setLastPlaybackTime(src, getKeyId(), v.currentTime || 0);
        }
      } catch (e) {}

      // Update recently watched metadata so main page can surface this movie
      try {
        updateRecentlyWatched({
          slug: playerOverlayData?.slug,
          title: playerOverlayData?.title || title,
          poster: playerOverlayData?.poster || playerOverlayData?.titleLogoUrl || "",
          cover_poster: playerOverlayData?.cover_poster || "",
          titleLogoUrl: playerOverlayData?.titleLogoUrl || "",
        });
      } catch (e) {}
    };

    const handlePlay = () => {
      setShowMetadataOverlay(false);
      showControlsTemporarily();
    };

    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("play", handlePlay);

    return () => {
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("play", handlePlay);
    };
  }, [showControlsTemporarily, playerOverlayData, src, title]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;

      if (event.code === "Space") event.preventDefault();

      switch (event.key) {
        case " ":
          togglePlayPause();
          break;
        case "ArrowRight":
          seekRelative(10);
          showControlsTemporarily();
          break;
        case "ArrowLeft":
          seekRelative(-10);
          showControlsTemporarily();
          break;
        default:
          return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, seekRelative, showControlsTemporarily]);

  // --- Core HLS and direct video setup (with resume restore/save) ---
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !src) return;

    // cleanup previous HLS instance
    if (hlsInstanceRef.current) {
      try {
        hlsInstanceRef.current.destroy();
      } catch (e) {
        console.warn("Failed to destroy previous HLS instance:", e);
      }
      hlsInstanceRef.current = null;
    }

    // element handlers
    const handleTimeUpdate = () => {
      setCurrentTime(videoEl.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(videoEl.duration || 0);
      setIsLoading(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleVolumeChangeUpdate = () => {
      setVolume(videoEl.volume);
      setIsMuted(videoEl.muted);
    };
    const handleError = (e) => {
      console.error("Video element error:", e);
      setIsLoading(false);
    };

    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("waiting", handleWaiting);
    videoEl.addEventListener("playing", handlePlaying);
    videoEl.addEventListener("volumechange", handleVolumeChangeUpdate);
    videoEl.addEventListener("error", handleError);

    const isHls = typeof src === "string" && src.toLowerCase().includes(".m3u8");
    setIsHlsSource(isHls);

    setIsLoading(true);

    // restore saved time
    const savedTime = getLastPlaybackTime(src, getKeyId()) || 0;

    // start periodic save every 5 seconds while mounted
    if (periodicSaveRef.current) {
      clearInterval(periodicSaveRef.current);
      periodicSaveRef.current = null;
    }
    periodicSaveRef.current = setInterval(() => {
      try {
        const v = videoRef.current;
        if (v && src) {
          // only save when user has progressed a bit (avoid saving 0 frequently)
          setLastPlaybackTime(src, getKeyId(), v.currentTime || 0);
        }
      } catch (e) {}
    }, 5000);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hlsInstanceRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setIsLive(!!data?.live);
        const levels = (data?.levels || []).map((level, index) => ({
          id: index,
          bitrate: Math.round((level?.bitrate || 0) / 1000),
          resolution: level?.height ? `${level.height}p` : level?.name || `${level?.width || "?"}x${level?.height || "?"}`,
          fullResolution: `${level?.width || "?"}x${level?.height || "?"}`,
        }));
        setQualityLevels(levels);
        setAudioTracks(hls.audioTracks || []);
        setCurrentQualityLevel(hls.currentLevel ?? -1);
        setCurrentAudioTrackId(hls.audioTrack ?? -1);
        setIsLoading(false);
      });

      hls.on(Hls.Events.LEVEL_LOADING, () => setIsLoading(true));
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        const v = videoRef.current;
        if (savedTimeRef.current != null && v) {
          try {
            v.currentTime = Math.min(savedTimeRef.current, v.duration || savedTimeRef.current);
          } catch (e) {}
        }
        setTimeout(() => setIsLoading(false), 150);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => setCurrentQualityLevel(data.level));
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => setAudioTracks(data.audioTracks || []));
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => {
        setCurrentAudioTrackId(data.id);
        const v = videoRef.current;
        if (savedTimeRef.current != null && v) {
          try {
            v.currentTime = Math.min(savedTimeRef.current, v.duration || savedTimeRef.current);
          } catch (e) {}
        }
        setTimeout(() => setIsLoading(false), 120);
      });

      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        try {
          hls.loadSource(src);
        } catch (err) {
          console.error("HLS loadSource error:", err);
        }

        videoEl.addEventListener(
          "loadeddata",
          () => {
            // restore saved playback position (from localStorage)
            if (savedTime > 0 && savedTime < (videoEl.duration || Infinity) - 5) {
              try {
                videoEl.currentTime = savedTime;
                setCurrentTime(savedTime);
              } catch (e) {}
            }
            videoEl.play().catch(() => {});
          },
          { once: true }
        );
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS.js Error:", event, data);
        if (data && data.fatal) {
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            try { hls.recoverMediaError(); } catch (e) {}
          } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            try { hls.startLoad(); } catch (e) {}
          } else {
            try { hls.destroy(); } catch (e) {}
            hlsInstanceRef.current = null;
            setIsLoading(false);
          }
        }
      });
    } else if (isHls && videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = src;
      videoEl.addEventListener(
        "loadeddata",
        () => {
          if (savedTime > 0 && savedTime < (videoEl.duration || Infinity) - 5) {
            try { videoEl.currentTime = savedTime; setCurrentTime(savedTime); } catch (e) {}
          }
          videoEl.play().catch(() => {});
        },
        { once: true }
      );
    } else {
      setQualityLevels([]);
      setAudioTracks([]);
      setCurrentQualityLevel(-1);
      setCurrentAudioTrackId(-1);

      videoEl.src = src;
      videoEl.load();

      videoEl.addEventListener(
        "loadeddata",
        () => {
          if (savedTime > 0 && savedTime < (videoEl.duration || Infinity) - 5) {
            try { videoEl.currentTime = savedTime; setCurrentTime(savedTime); } catch (e) {}
          }
          videoEl.play().catch(() => {});
        },
        { once: true }
      );
    }

    // save on unload (tab close / refresh)
    const handleBeforeUnload = () => {
      try {
        const v = videoRef.current;
        if (v && src) setLastPlaybackTime(src, getKeyId(), v.currentTime || 0);
      } catch (e) {}
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // final save
      try {
        const v = videoRef.current;
        if (v && src) setLastPlaybackTime(src, getKeyId(), v.currentTime || 0);
      } catch (e) {}

      // ensure we add to recently watched on unmount as well (with last saved time)
      try {
        updateRecentlyWatched({
          slug: playerOverlayData?.slug,
          title: playerOverlayData?.title || title,
          poster: playerOverlayData?.poster || playerOverlayData?.titleLogoUrl || "",
          cover_poster: playerOverlayData?.cover_poster || "",
          titleLogoUrl: playerOverlayData?.titleLogoUrl || "",
        });
      } catch (e) {}

      // clear periodic save
      if (periodicSaveRef.current) {
        clearInterval(periodicSaveRef.current);
        periodicSaveRef.current = null;
      }

      if (hlsInstanceRef.current) {
        try { hlsInstanceRef.current.destroy(); } catch (e) {}
        hlsInstanceRef.current = null;
      }

      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("waiting", handleWaiting);
      videoEl.removeEventListener("playing", handlePlaying);
      videoEl.removeEventListener("volumechange", handleVolumeChangeUpdate);
      videoEl.removeEventListener("error", handleError);

      try {
        videoEl.src = "";
        videoEl.load();
      } catch (e) {}

      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, playerOverlayData?.slug]);

  // --- Helper Labels ---
  const getCurrentQualityLabel = () => {
    if (!isHlsSource || qualityLevels.length === 0) return "Default";
    if (currentQualityLevel === -1) return "Auto";
    const level = qualityLevels.find((l) => l.id === currentQualityLevel);
    return level ? level.resolution : "Custom";
  };

  const getCurrentAudioLabel = () => {
    if (!isHlsSource || audioTracks.length === 0) return "Default";
    if (currentAudioTrackId === -1) return "Default";
    const track = audioTracks.find((t) => t.id === currentAudioTrackId);
    return track ? track.name || track.lang || `Track ${track.id}` : "Unknown";
  };

  // --- Overlay data from props ---
  const { logoUrl, year, overview, slug, genres } = playerOverlayData || {};
  const displayName = playerOverlayData?.title || title;
  const displaySlug = slug
    ? slug.toUpperCase()
    : (displayName || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toUpperCase() || "SLUG-UNKNOWN";

  const has16Plus = true;
  const hasSub = true;
  const has4k = true;
  const hasDolby = true;

  // Panels classes
  const panelBaseClasses = "absolute p-4 bg-black/95 shadow-2xl text-white z-[70] transition-all duration-300 transform";
  const mobilePanelClasses = "inset-x-0 rounded-t-lg shadow-2xl p-6 h-1/2 overflow-y-auto custom-scroll touch-pan-y";
  const desktopPanelClasses = "right-4 bottom-24 mr-4 w-64 rounded-lg max-h-[60vh] overflow-y-auto";
  const qualityPanelClasses = isMobileView ? `${panelBaseClasses} ${mobilePanelClasses}` : `${panelBaseClasses} ${desktopPanelClasses}`;
  const audioPanelClasses = isMobileView ? `${panelBaseClasses} ${mobilePanelClasses}` : `${panelBaseClasses} ${desktopPanelClasses}`;
  const mobilePanelBottom = isMobileView && showControls ? "88px" : "0";

  // Quality / Audio panels
  const QualityPanel = () => (
    <div role="dialog" aria-label="Video quality settings" className={qualityPanelClasses} style={isMobileView ? { bottom: mobilePanelBottom } : undefined} onClick={(e) => e.stopPropagation()}>
      <h3 className={`text-lg font-bold mb-3 ${isMobileView ? "text-center text-lg" : "text-left"}`}>Video Quality</h3>
      <ul className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
        <li onClick={() => { handleQualityChange(-1); setShowControls(true); }} className={`flex items-center justify-between p-3 cursor-pointer rounded transition ${currentQualityLevel === -1 ? "bg-blue-600 font-bold" : "hover:bg-gray-700"}`}>
          <span>Auto (Best available)</span>
          {currentQualityLevel === -1 && <Check className="w-4 h-4" />}
        </li>

        {qualityLevels.slice().reverse().map((level) => (
          <li key={level.id} onClick={() => { handleQualityChange(level.id); setShowControls(true); }} className={`flex items-center justify-between p-3 cursor-pointer rounded transition ${currentQualityLevel === level.id ? "bg-blue-600 font-bold" : "hover:bg-gray-700"}`}>
            <span className="break-words">{level.resolution} ({level.bitrate} kbps)</span>
            {currentQualityLevel === level.id && <Check className="w-4 h-4" />}
          </li>
        ))}
      </ul>

      {audioTracks.length > 0 && (
        <button onClick={() => { setShowQualityPanel(false); setShowAudioPanel(true); setShowControls(true); }} className="mt-3 text-cyan-400 hover:text-cyan-300 transition text-sm flex items-center w-full justify-between pt-2 border-t border-gray-700">
          Change Audio & Subtitles <Music className="w-4 h-4 ml-1" />
        </button>
      )}
    </div>
  );

  const AudioPanel = () => (
    <div role="dialog" aria-label="Audio and subtitles settings" className={audioPanelClasses} style={isMobileView ? { bottom: mobilePanelBottom } : undefined} onClick={(e) => e.stopPropagation()}>
      <h3 className={`font-bold mb-3 border-b border-gray-700 pb-2 flex justify-between items-center ${isMobileView ? "text-center text-lg" : "text-left"}`}>Audio <span className="text-sm font-medium text-gray-400">({getCurrentAudioLabel()})</span></h3>
      <ul className="space-y-2 max-h-48 overflow-y-auto custom-scroll border-b border-gray-700 pb-3">
        {audioTracks.map((track) => {
          const trackName = track.name || track.lang || `Track ${track.id}`;
          const isCurrent = currentAudioTrackId === track.id;
          return (
            <li key={track.id} className={`cursor-pointer hover:bg-gray-700/50 p-3 rounded transition ${isCurrent ? "text-cyan-400 font-bold" : ""}`} onClick={() => { handleAudioTrackChange(track.id); setShowControls(true); }}>
              <span className={`flex items-center ${isCurrent ? "text-cyan-400 font-bold" : ""}`}>{isCurrent && <Check className="w-4 h-4 mr-2" />}{trackName}</span>
            </li>
          );
        })}
        {audioTracks.length === 0 && <li className="text-gray-500 p-3">No audio tracks found.</li>}
      </ul>

      <div className="mt-4 pt-0">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Subtitles</h4>
        <ul className="space-y-2 max-h-32 overflow-y-auto custom-scroll">
          <li className="flex items-center justify-between p-3 cursor-pointer rounded transition bg-gray-700/50"><span className="text-cyan-400 font-bold">Off</span></li>
          <li className="flex items-center justify-between p-3 cursor-pointer rounded transition hover:bg-gray-700/50"><span>English</span></li>
          <li className="flex items-center justify-between p-3 cursor-pointer rounded transition hover:bg-gray-700/50"><span>{language || "Local"}</span></li>
        </ul>
      </div>

      {qualityLevels.length > 1 && (
        <button onClick={() => { setShowAudioPanel(false); setShowQualityPanel(true); setShowControls(true); }} className="mt-3 text-cyan-400 hover:text-cyan-300 transition text-sm flex items-center w-full justify-between pt-2 border-t border-gray-700">
          Change Video Quality <Equal className="w-4 h-4 ml-1" />
        </button>
      )}
    </div>
  );

  // --- Render ---
  const PlayPauseIcon = isPlaying ? <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white" /> : <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white" />;
  const MuteVolumeIcon = isMuted || volume === 0 ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />;
  const FullscreenIcon = isFullScreen ? <Minimize className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <Maximize className="w-5 h-5 sm:w-6 sm:h-6 text-white" />;

  return (
    <div
      ref={playerContainerRef}
      className="w-full max-w-full mx-auto rounded-xl overflow-hidden shadow-2xl bg-black relative border-4 border-gray-800 group transition-all duration-300"
      style={{ aspectRatio: isFullScreen ? "unset" : "16/9", height: isFullScreen ? "100vh" : "auto" }}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      aria-label="Video player container"
    >
      {/* Video Element */}
      <video ref={videoRef} className="w-full h-full object-contain bg-black" onClick={togglePlayPause} autoPlay playsInline tabIndex={-1} />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
          <span className="ml-4 text-white text-lg">Loading Stream...</span>
        </div>
      )}

      {/* Quick Play/Pause Feedback */}
      {showOverlay && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="text-white p-4 rounded-full bg-black/50 transition-opacity duration-100 ease-in-out">
            {isPlaying ? <Pause className="w-12 h-12 sm:w-16 sm:h-16 text-white" /> : <Play className="w-12 h-12 sm:w-16 sm:h-16 text-white" />}
          </div>
        </div>
      )}

      {/* === PAUSED METADATA OVERLAY (IMMEDIATE, RELIABLE) === */}
      {showMetadataOverlay && !isLoading && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-40 flex flex-col justify-end p-8 sm:p-16">
          <div className="max-w-3xl">
            <div className="mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt={`${displayName} Logo`} className="h-24 max-w-full object-contain object-left" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : (
                <h1 className="text-5xl sm:text-7xl font-extrabold text-white drop-shadow-lg">{displayName}</h1>
              )}
              <span className="text-xl font-bold text-white block -mt-2 ml-1 uppercase">{displaySlug}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base text-gray-300 mb-4">
              <span className="font-semibold text-white">{language || "Language Unknown"}</span>
              <span className="text-gray-400">•</span>
              <span className="text-cyan-400 font-medium">Ekka</span>
              <span className="text-gray-400">|</span>
              <span className="truncate">{Array.isArray(genres) ? genres.join(", ") : (genres || "")}</span>
              <span className="text-gray-400">|</span>
              <span>{year || "2025"}</span>
              <span className="text-gray-400">|</span>
              <span>— mins</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm mb-6">
              {has16Plus && <span className="border border-white/80 px-1.5 py-0.5 text-white font-medium">16+</span>}
              {hasSub && <span className="border border-white/80 px-1.5 py-0.5 text-white font-medium bg-gray-500/50">SUB</span>}
              {has4k && <span className="border border-white/80 px-1.5 py-0.5 text-white font-medium bg-gray-500/50">4K</span>}
              {hasDolby && <span className="font-bold text-blue-400"><span className="text-xs">D</span>Dolby Audio</span>}
            </div>

            {overview && <p className="text-sm sm:text-lg text-gray-200 mb-8 line-clamp-3 leading-relaxed max-w-xl">{overview}</p>}

            <div className="flex gap-3">
              <button onClick={togglePlayPause} className="inline-flex items-center px-6 py-3 bg-white hover:bg-gray-100 text-black font-semibold rounded-lg shadow-xl transition transform hover:scale-[1.02] active:scale-95 text-base sm:text-xl">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-3 fill-black" />
                Resume
              </button>

              {playerOverlayData?.downloadUrl && (
                <a href={playerOverlayData.downloadUrl} className="inline-flex items-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-xl transition" title="Download">
                  <Star className="w-4 h-4 mr-2" /> Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logo top-right */}
      <div className="absolute top-0 right-0 p-4 pt-6 z-40 transition-opacity duration-300" onClick={(e) => e.stopPropagation()}>
        <img src="/logo_39.png" alt="Brand Logo" className="h-6 sm:h-8 w-auto opacity-75" />
      </div>

      {/* TOP CONTROL BAR */}
      <div className={`absolute top-0 inset-x-0 p-4 pt-6 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-40 transition-opacity duration-300 ${showControls || showQualityPanel || showAudioPanel ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={onBackClick} className="text-white p-1 sm:p-2 rounded-full hover:bg-white/20 transition" title="Back">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <span className="text-white text-base sm:text-lg font-semibold truncate max-w-[150px] sm:max-w-[200px]">{title}</span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {qualityLevels.length > 1 && (
            <button onClick={() => { setShowQualityPanel((p) => !p); setShowAudioPanel(false); setShowVolumeSlider(false); setShowControls(true); }} className={`text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/50 bg-white/10 transition ${showQualityPanel ? "bg-white/30" : "hover:bg-white/30"}`} title="Video Quality">
              <Settings className="w-4 h-4 inline mr-1" />
              {getCurrentQualityLabel()}
            </button>
          )}
          {audioTracks.length > 0 && (
            <button onClick={() => { setShowAudioPanel((p) => !p); setShowQualityPanel(false); setShowVolumeSlider(false); setShowControls(true); }} className={`text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/50 bg-white/10 transition ${showAudioPanel ? "bg-white/30" : "hover:bg-white/30"}`} title="Audio & Subtitles">
              <Music className="w-4 h-4 inline mr-1" />
              Audio & Subtitles
            </button>
          )}
        </div>
      </div>

      {/* Panels */}
      {showQualityPanel && <QualityPanel />}
      {showAudioPanel && <AudioPanel />}

      {/* BOTTOM CONTROL BAR */}
      <div className={`absolute inset-x-0 bottom-0 z-40 transition-opacity duration-300 ${showControls || showVolumeSlider ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={(e) => e.stopPropagation()}>
        <div className="w-full h-2 flex items-center px-4 pb-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full bg-blue-600 appearance-none cursor-pointer range-with-custom-thumb"
            style={{
              background: `linear-gradient(to right, #22D3EE 0%, #22D3EE ${(duration ? (currentTime / duration) * 100 : 0)}%, #ffffff40 ${(duration ? (currentTime / duration) * 100 : 0)}%, #ffffff40 100%)`,
            }}
          />
        </div>

        <div className="p-4 pt-0 pb-6 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center space-x-3 sm:space-x-6">
            <button onClick={() => seekRelative(-10)} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition flex items-center relative" title="Rewind 10s">
              <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">10</span>
              <Rewind className="w-6 h-6 sm:w-7 sm:h-7 opacity-70" />
            </button>

            <button onClick={togglePlayPause} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition" title={isPlaying ? "Pause" : "Play"}>
              {PlayPauseIcon}
            </button>

            <button onClick={() => seekRelative(10)} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition flex items-center relative" title="Fast Forward 10s">
              <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">10</span>
              <FastForward className="w-6 h-6 sm:w-7 sm:h-7 opacity-70" />
            </button>

            <div className="text-white text-sm sm:text-base font-medium ml-4">
              {formatTime(currentTime)} / {isLive ? "LIVE" : formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative volume-control-area">
              <button onClick={toggleMute} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition" title={isMuted || volume === 0 ? "Unmute" : "Mute"}>
                {MuteVolumeIcon}
              </button>

              <div className={`absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 p-2 bg-black/80 rounded-lg shadow-xl transition-opacity duration-200 ${showVolumeSlider ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  orient="vertical"
                  className="h-24 w-1 appearance-none cursor-pointer bg-gray-600 volume-slider"
                  style={{
                    background: `linear-gradient(to top, #22D3EE 0%, #22D3EE ${(isMuted ? 0 : volume) * 100}%, #ffffff40 ${(isMuted ? 0 : volume) * 100}%, #ffffff40 100%)`,
                  }}
                />
              </div>
            </div>

            <button onClick={toggleFullScreen} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition" title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
              {FullscreenIcon}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
