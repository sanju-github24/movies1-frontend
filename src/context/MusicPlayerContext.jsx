import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';

export const MusicPlayerContext = createContext(null);

export function useMusicPlayer() {
  return useContext(MusicPlayerContext);
}

// Gaana tracks stream over HLS (.m3u8); Pendujatt tracks are plain MP3 files.
// The backend HLS proxy path is also treated as HLS regardless of extension.
const isHlsUrl = (url) =>
  typeof url === 'string' && (/\.m3u8(\?|#|$)/i.test(url) || /\/api\/gaana\/hls\b/i.test(url));

export function MusicPlayerProvider({ children }) {
  // ── Single persistent native Audio element — never unmounts ──
  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.8;
    audioRef.current.preload = 'auto';
  }

  // Active hls.js instance (only used for .m3u8 streams); torn down on each new load.
  const hlsRef = useRef(null);
  // Interval that watches HLS playback for a mid-song freeze and un-sticks it.
  const stallWatchdogRef = useRef(null);

  const clearStallWatchdog = () => {
    if (stallWatchdogRef.current) {
      clearInterval(stallWatchdogRef.current);
      stallWatchdogRef.current = null;
    }
  };

  // ── Attach a stream to the audio element ──────────────────────
  // Plain MP3 → native <audio> src. HLS (.m3u8) → hls.js (or native src on
  // Safari, which plays HLS directly). `onReady` fires when playback can begin.
  const attachSource = useCallback((url, onReady) => {
    const audio = audioRef.current;

    // Tear down any previous hls.js session before switching sources.
    clearStallWatchdog();
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch (_) {}
      hlsRef.current = null;
    }

    if (isHlsUrl(url) && !audio.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
      // Tuned to behave like a progressive MP3 download: buffer the whole track
      // far ahead so brief segment-load hiccups never interrupt playback, jump
      // small gaps instead of stalling, and retry/nudge aggressively rather than
      // giving up after a few attempts (hls.js defaults stop after ~3 nudges).
      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 90,
        maxBufferLength: 300,               // seconds buffered ahead (default 30)
        maxMaxBufferLength: 600,
        maxBufferSize: 100 * 1000 * 1000,   // ~100 MB cap — a whole song fits easily
        maxBufferHole: 0.5,                 // skip tiny gaps between segments
        highBufferWatchdogPeriod: 1,
        nudgeMaxRetry: 20,                  // keep nudging past stalls (default 3)
        nudgeOffset: 0.2,
        fragLoadingMaxRetry: 8,
        fragLoadingMaxRetryTimeout: 64000,
        levelLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 6,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(audio);
      if (onReady) hls.once(Hls.Events.MANIFEST_PARSED, onReady);
      // Keep playback alive: nudge past a stalled buffer, and self-heal fatal
      // errors instead of dying permanently.
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data) return;
        // Non-fatal stall (buffer ran dry for a moment) — nudge forward slightly.
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          try {
            if (audio.buffered.length && !audio.paused) {
              audio.currentTime = audio.currentTime + 0.1;
            }
          } catch (_) {}
          return;
        }
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          console.warn('[MusicPlayer] HLS network error — retrying load:', data.details);
          try { hls.startLoad(); } catch (_) {}
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.warn('[MusicPlayer] HLS media error — recovering:', data.details);
          try { hls.recoverMediaError(); } catch (_) {}
        } else {
          console.warn('[MusicPlayer] HLS unrecoverable error — tearing down:', data.details);
          try { hls.destroy(); } catch (_) {}
          if (hlsRef.current === hls) hlsRef.current = null;
        }
      });

      // ── Stall watchdog ──
      // If the track is supposed to be playing but the clock hasn't moved for
      // ~1.5s, un-stick it: nudge past a buffer hole when audio is buffered
      // ahead, otherwise kick the segment loader (and resume if it silently
      // paused). This is what keeps a Gaana HLS track from dying mid-song.
      let lastTime = 0;
      let frozenTicks = 0;
      stallWatchdogRef.current = setInterval(() => {
        if (audio.paused || audio.ended || audio.readyState === 0) {
          frozenTicks = 0; lastTime = audio.currentTime; return;
        }
        const t = audio.currentTime;
        let bufferedAhead = false;
        for (let i = 0; i < audio.buffered.length; i++) {
          if (audio.buffered.start(i) <= t + 0.1 && audio.buffered.end(i) > t + 0.5) {
            bufferedAhead = true; break;
          }
        }
        if (Math.abs(t - lastTime) < 0.05) {
          frozenTicks++;
          if (frozenTicks >= 3) {                 // ~1.5s with no progress
            try {
              if (bufferedAhead) {
                audio.currentTime = t + 0.15;      // jump the hole
              } else if (hlsRef.current) {
                hlsRef.current.startLoad();         // refill the buffer
              }
            } catch (_) {}
            if (audio.paused) audio.play().catch(() => {});
            frozenTicks = 0;
          }
        } else {
          frozenTicks = 0;
        }
        lastTime = t;
      }, 500);
    } else {
      audio.src = url;
      audio.load();
      if (onReady) audio.addEventListener('canplay', onReady, { once: true });
    }
  }, []);

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [volume,       setVolume]       = useState(0.8);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isMinimized,  setIsMinimized]  = useState(false);
  // True when the current track was restored from a previous visit (localStorage)
  // rather than actively played this session. A restored session's mini player is
  // only shown on /music pages; it becomes a live session once the user plays it.
  const [isRestoredSession, setIsRestoredSession] = useState(false);

  // Ref mirrors currentTrack so event handlers never have stale closures
  const currentTrackRef = useRef(null);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // ── Restore last session from localStorage on boot ─────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('music_session'));
      if (!saved?.streamUrl || !saved?.id) return;
      const audio = audioRef.current;
      const resumeTime = saved.currentTime || 0;
      if (saved.volume != null) audio.volume = saved.volume;
      // Restore state so mini-player shows the track (music pages only,
      // until the user actually resumes playback)
      setCurrentTrack(saved);
      setIsMinimized(true);
      setIsRestoredSession(true);
      // Load audio but don't play; seek once buffered. Handles both MP3 and
      // HLS sources (a restored Gaana token may have expired — that just fails
      // to buffer, the same as any stale stream, and the user can re-open it).
      attachSource(saved.streamUrl, () => { audio.currentTime = resumeTime; });
    } catch (_) {}
  }, []); // eslint-disable-line

  // ── Wire up native audio events once ──────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      setCurrentTime(t);
      // Persist session so page reload can resume
      try {
        if (audio.src && currentTrackRef.current) {
          localStorage.setItem('music_session', JSON.stringify({
            ...currentTrackRef.current,
            currentTime: t,
            volume: audio.volume,
          }));
        }
      } catch (_) {}
    };
    const onLoadedMeta    = () => setDuration(audio.duration || 0);
    // Playing makes a restored session live again (mini player everywhere)
    const onPlay          = () => { setIsPlaying(true); setIsRestoredSession(false); };
    const onPause         = () => setIsPlaying(false);
    const onEnded         = () => { setIsPlaying(false); setCurrentTime(0); };
    const onVolumeChange  = () => { setVolume(audio.volume); setIsMuted(audio.muted); };

    audio.addEventListener('timeupdate',    onTimeUpdate);
    audio.addEventListener('loadedmetadata',onLoadedMeta);
    audio.addEventListener('durationchange',onLoadedMeta);
    audio.addEventListener('play',          onPlay);
    audio.addEventListener('pause',         onPause);
    audio.addEventListener('ended',         onEnded);
    audio.addEventListener('volumechange',  onVolumeChange);

    return () => {
      audio.removeEventListener('timeupdate',    onTimeUpdate);
      audio.removeEventListener('loadedmetadata',onLoadedMeta);
      audio.removeEventListener('durationchange',onLoadedMeta);
      audio.removeEventListener('play',          onPlay);
      audio.removeEventListener('pause',         onPause);
      audio.removeEventListener('ended',         onEnded);
      audio.removeEventListener('volumechange',  onVolumeChange);
    };
  }, []);

  // ── Load a new track and auto-play ────────────────────────────
  const loadTrack = useCallback((trackInfo) => {
    const audio = audioRef.current;

    // Reset UI state immediately
    setCurrentTrack(trackInfo);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsMinimized(false);
    setIsRestoredSession(false);

    // Auto-play once enough data is buffered
    const tryPlay = () => {
      audio.play().catch(err => {
        console.warn('[MusicPlayer] Autoplay blocked:', err);
      });
    };

    // Load new source (MP3 via native <audio>, HLS via hls.js) and auto-play.
    audio.pause();
    attachSource(trackInfo.streamUrl, tryPlay);
  }, [attachSource]);

  // ── Toggle play / pause ───────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src && !hlsRef.current) return;
    if (audio.paused) {
      audio.play().catch(() => {
        // If an HLS stream stalled into a media error, recover then retry once
        // so a paused-and-stuck track can resume from the play button.
        if (hlsRef.current) {
          try { hlsRef.current.recoverMediaError(); } catch (_) {}
          audio.play().catch(() => {});
        }
      });
    } else {
      audio.pause();
    }
  }, []);

  // ── Seek ──────────────────────────────────────────────────────
  const seekTo = useCallback((t) => {
    const audio = audioRef.current;
    if (!audio.src) return;
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  // ── Volume / mute ─────────────────────────────────────────────
  const changeVolume = useCallback((v) => {
    audioRef.current.volume = v;
  }, []);

  const toggleMute = useCallback(() => {
    audioRef.current.muted = !audioRef.current.muted;
  }, []);

  // ── Minimize / expand / close ─────────────────────────────────
  const minimize = useCallback(() => setIsMinimized(true),  []);
  const restore  = useCallback(() => setIsMinimized(false), []);

  const close = useCallback(() => {
    clearStallWatchdog();
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch (_) {}
      hlsRef.current = null;
    }
    audioRef.current.pause();
    audioRef.current.src = '';
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsMinimized(false);
    setIsRestoredSession(false);
    // User dismissed the player — forget the saved session so it does not
    // reappear on the next reload or visit.
    try { localStorage.removeItem('music_session'); } catch (_) {}
  }, []);

  const [trackCache, setTrackCache] = useState({});

  const updateTrackCache = useCallback((trackId, data) => {
    setTrackCache(prev => ({
      ...prev,
      [trackId]: {
        ...(prev[trackId] || {}),
        ...data
      }
    }));
  }, []);

  // Atomic per-singer update — safe for concurrent fetches, never clobbers siblings
  const addArtistRec = useCallback((trackId, singer, songs) => {
    setTrackCache(prev => ({
      ...prev,
      [trackId]: {
        ...(prev[trackId] || {}),
        artistRecs: {
          ...(prev[trackId]?.artistRecs || {}),
          [singer]: songs,
        }
      }
    }));
  }, []);

  const value = {
    currentTrack,
    isPlaying,
    currentTime,
    setCurrentTime,
    duration,
    volume,
    isMuted,
    isMinimized, setIsMinimized,
    isRestoredSession,
    audioRef,
    trackCache,
    updateTrackCache,
    addArtistRec,
    loadTrack,
    togglePlay,
    seekTo,
    changeVolume,
    toggleMute,
    minimize,
    restore,
    close,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}
