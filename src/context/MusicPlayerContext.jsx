import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { resolveStream } from "../utils/playlists";
import { fetchRadio } from "../utils/saavn";

export const MusicPlayerContext = createContext(null);

/* Whether one song should be followed by another is a preference, not a
   property of the song, so it outlives the track and lives here. */
const AUTOPLAY_PREF = 'music_autoplay_radio';

export function useMusicPlayer() {
  return useContext(MusicPlayerContext);
}

// Every music stream goes through the backend proxy (saavncdn needs a
// jiosaavn.com Referer the browser can't send), so the proxy path alone says
// nothing about the format: it may wrap an HLS manifest or a plain audio file,
// which is what a JioSaavn track is (a .mp4). Judge by what it wraps, or hls.js
// gets handed an MP4 and the track never plays.
const isHlsUrl = (url) => {
  if (typeof url !== 'string') return false;
  if (/\.m3u8(\?|#|$)/i.test(url)) return true;
  if (/\/api\/(music\/stream|gaana\/hls|mux\/hls)\b/i.test(url)) {
    try {
      const inner = new URL(url, window.location.href).searchParams.get('url');
      // No ?url= to inspect — assume a manifest, as the path name implies.
      return inner ? /\.m3u8(\?|#|$)/i.test(inner) : true;
    } catch (_) {
      return true;
    }
  }
  return false;
};

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
        backBufferLength: 30,
        maxBufferLength: 60,                // ~1 min ahead — smooth, but doesn't
        maxMaxBufferLength: 120,            // pull the whole song through the
        maxBufferSize: 30 * 1000 * 1000,   // proxy at once (keeps backend RAM low)
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
      // paused). This is what keeps an HLS track from dying mid-song.
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

  /* The queue, and the order it is played in.
   *
   * Two arrays rather than one shuffled copy: the queue keeps the order the
   * songs were given in, and `order` holds indexes into it. Shuffling rebuilds
   * only the second, so turning shuffle off returns to the album's own order
   * from wherever you are, rather than to a list that has been rearranged
   * under you. */
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");   // off | all | one

  /* The radio: when a song ends with nothing queued behind it, more in the
     same language are fetched and play on, until the listener says otherwise.
     On by default — a song ending in silence is the thing being fixed. */
  const [autoplay, setAutoplay] = useState(() => {
    try { return localStorage.getItem(AUTOPLAY_PREF) !== 'off'; } catch { return true; }
  });

  /* The audio element's listeners are wired once, so they cannot see state —
     they read these. */
  const queueRef  = useRef([]);
  const orderRef  = useRef([]);
  const posRef    = useRef(-1);
  const repeatRef = useRef("off");
  const shuffleRef = useRef(false);
  const advanceRef = useRef(null);
  /* Consecutive songs that would not resolve. Moving past a dead one is right;
     moving past every one of them in turn, forever, is not — with repeat on,
     a queue nothing in it resolves would circle and ask the server again for
     each, as fast as the requests came back. */
  const failRef = useRef(0);

  const autoplayRef = useRef(true);
  useEffect(() => { autoplayRef.current = autoplay; }, [autoplay]);

  /* Everything played this session, so the radio goes somewhere new rather
     than round the top of the same chart. */
  const playedRef = useRef(new Set());
  /* One refill at a time: `ended` and a failed resolve can both reach for the
     radio at once, and two answers would queue the same songs twice. */
  const radioBusyRef = useRef(false);


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
      // HLS sources (a restored token may have expired — that just fails
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
    /* Held in a ref because these listeners are wired once and would
       otherwise keep calling the first version of next() forever. */
    const onEnded         = () => {
      setIsPlaying(false); setCurrentTime(0);
      if (advanceRef.current) advanceRef.current();
    };
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
  /* `minimized` decides whether anything is left on screen.
   *
   * This was written for the track page, which draws a full player of its own,
   * so it always expanded. A song started from a card or a playlist plays on
   * the music page, where nothing draws one — so the audio ran with no player
   * visible anywhere and no way to pause it. Those paths ask for the mini
   * player; the track page still asks for the full one. */
  const loadTrack = useCallback(async (trackInfo, { minimized = false } = {}) => {
    const audio = audioRef.current;

    // Reset UI state immediately
    setCurrentTrack(trackInfo);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsMinimized(minimized);
    setIsRestoredSession(false);

    // Auto-play once enough data is buffered
    const tryPlay = () => {
      audio.play().catch(err => {
        console.warn('[MusicPlayer] Autoplay blocked:', err);
      });
    };

    audio.pause();

    /* A song from a playlist arrives with an id and no stream, because none is
       stored — a saved URL carries a token that dies within hours, so it is
       asked for at the moment of playing instead. A track opened directly
       already has one and skips this entirely.
     
       If the answer is no, the queue moves on rather than stopping: one
       unavailable song should not end the listening. */
    if (trackInfo?.id) playedRef.current.add(trackInfo.id);

    let src = trackInfo.streamUrl;
    if (!src && trackInfo.id) {
      const wanted = trackInfo.id;
      try {
        const { streamUrl, metadata } = await resolveStream(wanted);
        // Another song may have been chosen while this was in flight.
        if (currentTrackRef.current?.id !== wanted) return;
        src = streamUrl;
        setCurrentTrack((t) => (t && t.id === wanted
          ? { ...t, streamUrl,
              poster: t.poster || metadata.cover_image || null,
              // What the radio picks its next songs by.
              language: t.language || metadata.language || '' }
          : t));
      } catch (e) {
        console.warn('[MusicPlayer] could not resolve', wanted, e.message);
        failRef.current += 1;
        /* One pass and no further: once every song in the queue has been tried
           there is nothing left to move on to, and going round again only
           repeats the same requests. A single track gets one attempt. */
        const limit = Math.max(1, queueRef.current.length);
        if (failRef.current < limit && advanceRef.current) advanceRef.current();
        else audioRef.current.pause();
        return;
      }
    }
    if (!src) return;

    // Something played, so the run of failures is over.
    failRef.current = 0;

    // Load new source (MP3 via native <audio>, HLS via hls.js) and auto-play.
    attachSource(src, tryPlay);
  }, [attachSource]);

  /* Shuffled once per queue, not per song: a fresh order each time would let
     the same track come round twice in a row and never reach others. Fisher
     Yates, with the song playing now pinned to the front so shuffling does not
     interrupt it. */
  const buildOrder = useCallback((len, keepFirst, shuffled) => {
    const idx = Array.from({ length: len }, (_, i) => i);
    if (!shuffled) return idx;
    for (let i = len - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (keepFirst >= 0) {
      const at = idx.indexOf(keepFirst);
      if (at > 0) { idx.splice(at, 1); idx.unshift(keepFirst); }
    }
    return idx;
  }, []);

  const playQueue = useCallback((tracks, startIndex = 0) => {
    if (!Array.isArray(tracks) || !tracks.length) return;
    failRef.current = 0;
    // Choosing a list to play starts the history over: what was heard before
    // it should not decide what the radio plays after it.
    playedRef.current = new Set();
    const order = buildOrder(tracks.length, startIndex, shuffleRef.current);
    const pos = Math.max(0, order.indexOf(startIndex));
    setQueue(tracks); queueRef.current = tracks;
    orderRef.current = order;
    posRef.current = pos; setQueueIndex(order[pos]);
    loadTrack(tracks[order[pos]], { minimized: true });
  }, [buildOrder, loadTrack]);

  /* More songs to follow this one: same language, chart order, nothing already
     heard. Appended to the queue rather than replacing it, so whatever was
     playing keeps its place and its history.

     A song played on its own has no queue at all, so one is started here with
     it at the front — which is what makes a single track picked out of search
     carry on into a session rather than ending in silence.

     Returns whether there is now something to move on to. */
  const extendRadio = useCallback(async () => {
    if (!autoplayRef.current || radioBusyRef.current) return false;
    const seed = currentTrackRef.current;
    if (!seed?.id) return false;

    radioBusyRef.current = true;
    try {
      let more = await fetchRadio(seed.language, [...playedRef.current]);
      if (!more.length) {
        /* Every chart we can reach has been heard. The listener has not asked
           to stop, so start the history over and go round again rather than
           going quiet — minus the song playing now, which must not repeat
           straight into itself. */
        playedRef.current = new Set([seed.id]);
        more = await fetchRadio(seed.language, [seed.id]);
        if (!more.length) return false;
      }

      const hadQueue = queueRef.current.length > 0 && orderRef.current.length > 0;
      const base = hadQueue ? queueRef.current : [seed];
      const tracks = [...base, ...more];
      const added = Array.from({ length: more.length }, (_, i) => base.length + i);
      if (shuffleRef.current) {
        for (let i = added.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [added[i], added[j]] = [added[j], added[i]];
        }
      }

      setQueue(tracks);
      queueRef.current = tracks;
      // A queue that already existed keeps its order and its position; a single
      // song becomes position 0 of a new one.
      orderRef.current = hadQueue ? [...orderRef.current, ...added] : [0, ...added];
      if (!hadQueue) { posRef.current = 0; setQueueIndex(0); }
      return true;
    } catch (e) {
      console.warn('[MusicPlayer] radio could not extend:', e.message);
      return false;
    } finally {
      radioBusyRef.current = false;
    }
  }, []);

  /* step(+1) at the end of the queue stops unless repeat says otherwise;
     step(-1) within the first few seconds of a song goes back, otherwise it
     restarts the one playing — the behaviour every music app has. */
  const step = useCallback(async (delta) => {
    if (delta > 0 && repeatRef.current === "one") {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }

    /* Running past the end is where the radio comes in — and so is a song
       playing on its own, which reaches here with no queue behind it at all.
       Only forwards: stepping back off the front is not a reason to fetch. */
    if (delta > 0
        && repeatRef.current !== "all"
        && posRef.current + delta >= orderRef.current.length) {
      if (!(await extendRadio())) { audioRef.current.pause(); return; }
    }

    const tracks = queueRef.current, order = orderRef.current;
    if (!tracks.length || !order.length) return;

    let pos = posRef.current + delta;
    if (pos >= order.length) {
      if (repeatRef.current !== "all") { audioRef.current.pause(); return; }
      pos = 0;
    }
    if (pos < 0) {
      if (repeatRef.current !== "all") { audioRef.current.currentTime = 0; return; }
      pos = order.length - 1;
    }
    posRef.current = pos;
    setQueueIndex(order[pos]);
    loadTrack(tracks[order[pos]], { minimized: true });
  }, [loadTrack, extendRadio]);

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => {
    if (audioRef.current.currentTime > 4) { audioRef.current.currentTime = 0; return; }
    step(-1);
  }, [step]);

  /* The one control the radio needs: it runs until it is told not to. The
     choice is remembered, since it is about how someone likes to listen rather
     than about this song. */
  const toggleAutoplay = useCallback(() => {
    setAutoplay((on) => {
      try { localStorage.setItem(AUTOPLAY_PREF, on ? 'off' : 'on'); } catch { /* not remembered */ }
      return !on;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      const now = !on;
      shuffleRef.current = now;
      const tracks = queueRef.current;
      if (tracks.length) {
        const playing = orderRef.current[posRef.current];
        orderRef.current = buildOrder(tracks.length, playing, now);
        posRef.current = Math.max(0, orderRef.current.indexOf(playing));
      }
      return now;
    });
  }, [buildOrder]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => {
      const nextMode = r === "off" ? "all" : r === "all" ? "one" : "off";
      repeatRef.current = nextMode;
      return nextMode;
    });
  }, []);

  useEffect(() => { advanceRef.current = next; }, [next]);

  /* What the phone shows while the screen is off.
   *
   * Without this the lock screen falls back to the tab: our logo and whatever
   * the page is called, which tells nobody what is playing. Given the metadata
   * it shows the song, the artist and the cover art instead, the way a music
   * app does — and its buttons drive the queue rather than only the audio
   * element, so skip moves to the next song instead of doing nothing. */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!currentTrack) { navigator.mediaSession.metadata = null; return; }

    const art = currentTrack.poster;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title || "Unknown track",
      artist: currentTrack.artist || "",
      album: currentTrack.album || "AnchorHD",
      /* Several sizes because each platform picks its own, and one that has
         to be scaled up looks like a thumbnail on a lock screen. They are the
         same file — the CDN serves whatever it has — so this costs nothing. */
      artwork: art ? [96, 128, 192, 256, 384, 512].map((px) => ({
        src: art, sizes: `${px}x${px}`, type: "image/jpeg",
      })) : [],
    });
  }, [currentTrack]);

  /* The buttons on the lock screen and in the notification. Set once the
     handlers exist; passing null to one removes it, which is how the platform
     knows to grey it out rather than show a control that does nothing. */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const audio = audioRef.current;
    const set = (action, fn) => { try { ms.setActionHandler(action, fn); } catch { /* unsupported here */ } };

    set("play",  () => audio.play().catch(() => {}));
    set("pause", () => audio.pause());
    set("nexttrack",     () => next());
    set("previoustrack", () => previous());
    set("seekbackward", (d) => { audio.currentTime = Math.max(0, audio.currentTime - (d?.seekOffset || 10)); });
    set("seekforward",  (d) => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (d?.seekOffset || 10)); });
    set("seekto", (d) => { if (d?.seekTime != null) audio.currentTime = d.seekTime; });
    set("stop", () => { audio.pause(); audio.currentTime = 0; });

    return () => {
      ["play","pause","nexttrack","previoustrack","seekbackward","seekforward","seekto","stop"]
        .forEach((a) => set(a, null));
    };
  }, [next, previous]);

  /* Keeps the scrubber on the lock screen honest. Without it the bar sits at
     zero and never moves, whatever the audio is doing. */
  useEffect(() => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!duration || !isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current.playbackRate || 1,
        position: Math.min(currentTime, duration),
      });
    } catch { /* some builds reject a position past duration mid-seek */ }
  }, [currentTime, duration]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

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

    // ── Queue, shuffle and repeat ──
    queue, queueIndex, shuffle, repeat,
    playQueue, next, previous, toggleShuffle, cycleRepeat,
    /* The radio: keeps songs coming in the same language once the queue runs
       dry, until this is turned off. */
    autoplay, toggleAutoplay,
    /* The song playing now, as an index into the queue, so a list can mark it
       without comparing objects. -1 when what is playing did not come from
       one — a single track opened on its own. */
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
