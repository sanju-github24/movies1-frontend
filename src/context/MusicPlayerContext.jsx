import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

export const MusicPlayerContext = createContext(null);

export function useMusicPlayer() {
  return useContext(MusicPlayerContext);
}

export function MusicPlayerProvider({ children }) {
  // ── Single persistent native Audio element — never unmounts ──
  const audioRef = useRef(null);
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.8;
    audioRef.current.preload = 'auto';
  }

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [volume,       setVolume]       = useState(0.8);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isMinimized,  setIsMinimized]  = useState(false);

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
      // Restore state so mini-player shows the track
      setCurrentTrack(saved);
      setIsMinimized(true);
      // Load audio but don't play; seek once buffered
      audio.src = saved.streamUrl;
      audio.load();
      audio.addEventListener('canplay', () => {
        audio.currentTime = resumeTime;
      }, { once: true });
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
    const onPlay          = () => setIsPlaying(true);
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

    // Load new source
    audio.pause();
    audio.src = trackInfo.streamUrl;
    audio.load();

    // Auto-play once enough data is buffered
    const tryPlay = () => {
      audio.play().catch(err => {
        console.warn('[MusicPlayer] Autoplay blocked:', err);
      });
    };

    audio.addEventListener('canplay', tryPlay, { once: true });
  }, []);

  // ── Toggle play / pause ───────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (audio.paused) {
      audio.play().catch(() => {});
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
    audioRef.current.pause();
    audioRef.current.src = '';
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsMinimized(false);
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
