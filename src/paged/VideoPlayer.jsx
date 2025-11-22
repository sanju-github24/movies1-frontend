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
const STORAGE_KEY_PREFIX = "video_last_time_v1:";
const getStorageKey = (slugOrSrc) => `${STORAGE_KEY_PREFIX}${slugOrSrc}`;

// Quality Persistence Helpers
const QUALITY_STORAGE_KEY = "video_default_quality_v1";

const getDefaultQualityLevel = () => {
    try {
        const raw = localStorage.getItem(QUALITY_STORAGE_KEY);
        // Default is -1 (Auto)
        return raw ? parseInt(raw, 10) : -1; 
    } catch (e) {
        console.warn("Failed to read default quality level:", e);
        return -1;
    }
};

const setDefaultQualityLevel = (levelId) => {
    try {
        localStorage.setItem(QUALITY_STORAGE_KEY, String(levelId));
    } catch (e) {
        console.warn("Failed to save default quality level:", e);
    }
};

// Playback Time Persistence Helpers
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

const updateRecentlyWatched = (meta = {}) => {
  try {
    const existing = JSON.parse(localStorage.getItem("recently_watched") || "[]");
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
    const updated = [updatedEntry, ...filtered].slice(0, 20);
    localStorage.setItem("recently_watched", JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to update recently_watched:", e);
  }
};

// --------------------
// VideoPlayer Component
// --------------------
const VideoPlayer = ({ src, title = "Video Title", onBackClick, playerOverlayData = {}, language }) => {
  const videoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const playerContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const savedTimeRef = useRef(null);
  const periodicSaveRef = useRef(null);
  const lastInteractionTimeRef = useRef(Date.now());

  // --- Player State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLive, setIsLive] = useState(false); 
  const [showOverlay, setShowOverlay] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isHlsSource, setIsHlsSource] = useState(false);

  // --- HLS Track State ---
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudioTrackId, setCurrentAudioTrackId] = useState(-1);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [defaultQualityLevel, setDefaultQualityLevelState] = useState(getDefaultQualityLevel()); 
  const [currentQualityLevel, setCurrentQualityLevel] = useState(defaultQualityLevel); 

  // --- Panels State ---
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [showAudioPanel, setShowAudioPanel] = useState(false);

  // Mobile View Detection
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
    
    lastInteractionTimeRef.current = Date.now();

    if (isPlaying) {
      videoEl.pause();
    } else {
      videoEl.play().catch((e) => console.error("Play failed:", e));
    }

    // Show quick play/pause feedback overlay
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
    if (isLive) return; 

    const seekTime = parseFloat(e.target.value);
    videoEl.currentTime = seekTime;
    setCurrentTime(seekTime);

    try {
      setLastPlaybackTime(src, getKeyId(), seekTime);
    } catch (e) {}
  };

  const seekRelative = useCallback(
    (seconds) => {
      const videoEl = videoRef.current;
      if (isLive) return; 
      
      lastInteractionTimeRef.current = Date.now();

      if (videoEl) {
        videoEl.currentTime = Math.max(0, Math.min(duration, videoEl.currentTime + seconds));
        setCurrentTime(videoEl.currentTime);

        try {
          setLastPlaybackTime(src, getKeyId(), videoEl.currentTime);
        } catch (e) {}
      }
    },
    [duration, src, isLive]
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

  const handleAudioTrackChange = useCallback(
    (newTrackId) => {
      const hls = hlsInstanceRef.current;
      const videoEl = videoRef.current;
      if (!hls || newTrackId === currentAudioTrackId) return;

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

  // MODIFIED: Quality Change handler now saves the preference
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
      
      // SAVE new default quality level
      setDefaultQualityLevel(newLevel);
      setDefaultQualityLevelState(newLevel);

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


  // Persistence and metadata update on pause/unmount
  useEffect(() => {
      if (!isPlaying) {
          const v = videoRef.current;
          
          if (v && v.readyState >= 2 && (v.duration > 0 || isLive)) {
            // Save playback time on pause
            try {
              if (v && src && !isLive) {
                setLastPlaybackTime(src, getKeyId(), v.currentTime || 0);
              }
            } catch (e) {}

            // Update recently watched metadata
            try {
              updateRecentlyWatched({
                slug: playerOverlayData?.slug,
                title: playerOverlayData?.title || title,
                poster: playerOverlayData?.poster || playerOverlayData?.titleLogoUrl || "",
                cover_poster: playerOverlayData?.cover_poster || "",
                titleLogoUrl: playerOverlayData?.titleLogoUrl || "",
              });
            } catch (e) {}
          }
      } 
      else {
          showControlsTemporarily();
      }
      
  }, [isPlaying, isLive, showControlsTemporarily, playerOverlayData, src, title]); 

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore keypresses if the user is focused on an input field
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;

      // Prevent the spacebar from scrolling the page
      if (event.code === "Space") event.preventDefault();

      switch (event.key) {
        case " ":
          togglePlayPause();
          break;
        case "ArrowRight":
          // Only seek if not live
          if (!isLive) seekRelative(10);
          showControlsTemporarily();
          break;
        case "ArrowLeft":
          // Only seek if not live
          if (!isLive) seekRelative(-10);
          showControlsTemporarily();
          break;
        default:
          return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, seekRelative, showControlsTemporarily, isLive]); 

  // --- Core HLS and direct video setup ---
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !src) return;

    if (hlsInstanceRef.current) {
      try {
        hlsInstanceRef.current.destroy();
      } catch (e) {
        console.warn("Failed to destroy previous HLS instance:", e);
      }
      hlsInstanceRef.current = null;
    }

    // element handlers
    const handleTimeUpdate = () => { setCurrentTime(videoEl.currentTime); };
    const handleLoadedMetadata = () => { setDuration(videoEl.duration || 0); setIsLoading(false); };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true); 
    const handlePlaying = () => setIsLoading(false);
    const handleVolumeChangeUpdate = () => { setVolume(videoEl.volume); setIsMuted(videoEl.muted); };
    const handleError = (e) => { console.error("Video element error:", e); setIsLoading(false); };

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
    setIsLive(false); 
    setIsLoading(true);

    const savedTime = getLastPlaybackTime(src, getKeyId()) || 0;

    // Periodic Save Setup
    if (periodicSaveRef.current) { clearInterval(periodicSaveRef.current); periodicSaveRef.current = null; }
    periodicSaveRef.current = setInterval(() => {
      try {
        const v = videoRef.current;
        if (v && src && !isLive) { 
          setLastPlaybackTime(src, getKeyId(), v.currentTime || 0);
        }
      } catch (e) {}
    }, 5000);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hlsInstanceRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        // LIVE Detection
        setIsLive(!!data?.live);
        
        const levels = (data?.levels || []).map((level, index) => ({
          id: index,
          bitrate: Math.round((level?.bitrate || 0) / 1000),
          resolution: level?.height ? `${level.height}p` : level?.name || `${level?.width || "?"}x${level?.height || "?"}`,
          fullResolution: `${level?.width || "?"}x${level?.height || "?"}`,
        }));
        setQualityLevels(levels);
        setAudioTracks(hls.audioTracks || []);
        
        // APPLY DEFAULT QUALITY LEVEL LOGIC
        const defaultLevel = getDefaultQualityLevel();
        if (defaultLevel !== -1 && defaultLevel < levels.length) {
            hls.currentLevel = defaultLevel;
            setCurrentQualityLevel(defaultLevel);
        } else {
            hls.currentLevel = -1; 
            setCurrentQualityLevel(-1); 
            // If the saved level is not found, revert default to Auto
            if(defaultLevel !== -1) setDefaultQualityLevel(-1); 
        }

        setCurrentAudioTrackId(hls.audioTrack ?? -1);
        setIsLoading(false);
      });

      hls.on(Hls.Events.LEVEL_LOADING, () => setIsLoading(true));
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        const v = videoRef.current;
        if (!isLive && savedTimeRef.current != null && v) {
          try { v.currentTime = Math.min(savedTimeRef.current, v.duration || savedTimeRef.current); } catch (e) {}
        }
        setTimeout(() => setIsLoading(false), 150);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => setCurrentQualityLevel(data.level));
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => setAudioTracks(data.audioTracks || []));
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => {
        setCurrentAudioTrackId(data.id);
        const v = videoRef.current;
        if (!isLive && savedTimeRef.current != null && v) {
          try { v.currentTime = Math.min(savedTimeRef.current, v.duration || savedTimeRef.current); } catch (e) {}
        }
        setTimeout(() => setIsLoading(false), 120);
      });

      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        try { hls.loadSource(src); } catch (err) { console.error("HLS loadSource error:", err); }

        videoEl.addEventListener(
          "loadeddata",
          () => {
            if (!isLive && savedTime > 0 && savedTime < (videoEl.duration || Infinity) - 5) {
              try { videoEl.currentTime = savedTime; setCurrentTime(savedTime); } catch (e) {}
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
      // Native HLS fallback
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
      // Non-HLS setup
      setQualityLevels([]);
      setAudioTracks([]);
      setCurrentQualityLevel(-1);
      setCurrentAudioTrackId(-1);
      setIsLive(false); 

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

    const handleBeforeUnload = () => {
      try {
        const v = videoRef.current;
        if (v && src && !isLive) setLastPlaybackTime(src, getKeyId(), v.currentTime || 0);
      } catch (e) {}
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      try {
        const v = videoRef.current;
        if (v && src && !isLive) setLastPlaybackTime(src, getKeyId(), v.currentTime || 0);
      } catch (e) {}

      try {
        updateRecentlyWatched({
          slug: playerOverlayData?.slug,
          title: playerOverlayData?.title || title,
          poster: playerOverlayData?.poster || playerOverlayData?.titleLogoUrl || "",
          cover_poster: playerOverlayData?.cover_poster || "",
          titleLogoUrl: playerOverlayData?.titleLogoUrl || "",
        });
      } catch (e) {}

      if (periodicSaveRef.current) { clearInterval(periodicSaveRef.current); periodicSaveRef.current = null; }

      if (hlsInstanceRef.current) { try { hlsInstanceRef.current.destroy(); } catch (e) {} hlsInstanceRef.current = null; }

      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("waiting", handleWaiting);
      videoEl.removeEventListener("playing", handlePlaying);
      videoEl.removeEventListener("volumechange", handleVolumeChangeUpdate);
      videoEl.removeEventListener("error", handleError);

      try { videoEl.src = ""; videoEl.load(); } catch (e) {}

      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, playerOverlayData?.slug, isLive]); 

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

  // Panels classes
  const panelBaseClasses = "absolute p-4 bg-black/95 shadow-2xl text-white z-[70] transition-all duration-300 transform";
  const mobilePanelClasses = "inset-x-0 rounded-t-lg shadow-2xl p-6 h-1/2 overflow-y-auto custom-scroll touch-pan-y";
  const desktopPanelClasses = "right-4 bottom-24 mr-4 w-64 rounded-lg max-h-[60vh] overflow-y-auto";
  const qualityPanelClasses = isMobileView ? `${panelBaseClasses} ${mobilePanelClasses}` : `${panelBaseClasses} ${desktopPanelClasses}`;
  const audioPanelClasses = isMobileView ? `${panelBaseClasses} ${mobilePanelClasses}` : `${panelBaseClasses} ${desktopPanelClasses}`;
  const mobilePanelBottom = isMobileView && showControls ? "88px" : "0";

  // Quality Panel
  const QualityPanel = () => (
    <div role="dialog" aria-label="Video quality settings" className={qualityPanelClasses} style={isMobileView ? { bottom: mobilePanelBottom } : undefined} onClick={(e) => e.stopPropagation()}>
      <h3 className={`text-lg font-bold mb-3 ${isMobileView ? "text-center text-lg" : "text-left"}`}>Video Quality</h3>
      <ul className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
        
        {/* Auto (Best available) Option */}
        <li onClick={() => { handleQualityChange(-1); setShowControls(true); }} className={`flex items-center justify-between p-3 cursor-pointer rounded transition ${currentQualityLevel === -1 ? "bg-blue-600 font-bold" : "hover:bg-gray-700"}`}>
          <span>Auto (Best available)</span>
          {currentQualityLevel === -1 && <Check className="w-4 h-4" />}
        </li>

        {/* Quality Levels */}
        {qualityLevels.slice().reverse().map((level) => {
          const isCurrent = currentQualityLevel === level.id;
          const isDefault = defaultQualityLevel === level.id;
          return (
            <li key={level.id} onClick={() => { handleQualityChange(level.id); setShowControls(true); }} className={`flex items-center justify-between p-3 cursor-pointer rounded transition ${isCurrent ? "bg-blue-600 font-bold" : "hover:bg-gray-700"}`}>
              <span className="break-words">
                {level.resolution} ({level.bitrate} kbps)
                {isDefault && !isCurrent && <span className="text-gray-400 text-xs ml-2">(Default)</span>} 
              </span>
              {isCurrent && <Check className="w-4 h-4" />}
            </li>
          );
        })}
      </ul>

      {audioTracks.length > 0 && (
        <button onClick={() => { setShowQualityPanel(false); setShowAudioPanel(true); setShowControls(true); }} className="mt-3 text-cyan-400 hover:text-cyan-300 transition text-sm flex items-center w-full justify-between pt-2 border-t border-gray-700">
          Change Audio & Subtitles <Music className="w-4 h-4 ml-1" />
        </button>
      )}
    </div>
  );

  // Audio Panel
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

      {/* Top Bar for Back Button */}
      <div className="absolute top-0 left-0 right-0 p-3 z-60 transition-opacity duration-300">
        <button
          onClick={onBackClick}
          className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Play/Pause Feedback */}
      {showOverlay && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="text-white p-4 rounded-full bg-black/50 transition-opacity duration-100 ease-in-out">
            {isPlaying ? <Pause className="w-12 h-12 sm:w-16 sm:h-16 text-white" /> : <Play className="w-12 h-12 sm:w-16 sm:h-16 text-white" />}
          </div>
        </div>
      )}

      {/* Controls Bar (Bottom) */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-5 bg-gradient-to-t from-black/80 to-transparent z-60 transition-all duration-300 transform ${
          showControls ? "translate-y-0" : "translate-y-full opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        aria-hidden={!showControls}
      >
        {/* Scrubber / Progress Bar (Hidden for Live Streams) */}
        {!isLive && (
          <div className="mb-2 sm:mb-3 flex items-center gap-3">
            <span className="text-white text-xs sm:text-sm font-mono w-12 text-right">{formatTime(currentTime)}</span>
            
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg range-red-500"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
              }}
            />
            
            <span className="text-white text-xs sm:text-sm font-mono w-12 text-left">{formatTime(duration)}</span>
          </div>
        )}

        {/* Main Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left Controls (Play/Pause, Seek, Volume, LIVE Badge) */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            <button onClick={togglePlayPause} className="p-1 rounded-full hover:bg-white/20 transition">
              {PlayPauseIcon}
            </button>
            
            {/* Quick Seek buttons (Hidden for Live) */}
            {!isLive && (
              <>
                <button onClick={() => seekRelative(-30)} className="p-1 rounded-full hover:bg-white/20 transition hidden sm:block">
                  <Rewind className="w-6 h-6 text-white" />
                </button>
                <button onClick={() => seekRelative(30)} className="p-1 rounded-full hover:bg-white/20 transition hidden sm:block">
                  <FastForward className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {/* LIVE Badge */}
            {isLive && (
                <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-md animate-pulse">
                    LIVE
                </span>
            )}
            
            {/* Volume Control */}
            <div className="relative flex items-center volume-control-area">
              <button onClick={toggleMute} className="p-1 rounded-full hover:bg-white/20 transition">
                {MuteVolumeIcon}
              </button>

              {showVolumeSlider && (
                <div className="absolute bottom-full mb-3 p-3 rounded-lg bg-black/70 shadow-lg flex flex-col items-center w-10 h-32">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-full appearance-none bg-transparent transform rotate-[-90deg] origin-center"
                    style={{
                        WebkitAppearance: 'slider-vertical',
                        MozAppearance: 'none',
                        height: '100px',
                        width: '100px',
                        cursor: 'pointer'
                    }}
                  />
                </div>
              )}
            </div>
            
          </div>

          {/* Right Controls (Settings, Fullscreen) */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Settings Button (Quality/Audio) */}
            {(qualityLevels.length > 0 || audioTracks.length > 0) && (
              <button
                onClick={() => {
                  setShowQualityPanel(!showQualityPanel);
                  setShowAudioPanel(false); 
                  setShowControls(true); 
                }}
                className="p-1 rounded-full hover:bg-white/20 transition relative"
              >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <span className="absolute top-0 right-0 text-[10px] bg-red-600 text-white rounded-full px-1">
                    {getCurrentQualityLabel()}
                </span>
              </button>
            )}

            {/* Fullscreen Button */}
            <button onClick={toggleFullScreen} className="p-1 rounded-full hover:bg-white/20 transition">
              {FullscreenIcon}
            </button>
          </div>
        </div>
      </div>
      
      {/* Quality and Audio Panels */}
      {showQualityPanel && <QualityPanel />}
      {showAudioPanel && <AudioPanel />}
      
    </div>
  );
};

export default VideoPlayer;