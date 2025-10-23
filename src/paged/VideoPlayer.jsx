import React, { useEffect, useRef, useState } from "react";
// Ensure hls.js is installed: npm install hls.js
import Hls from "hls.js"; 
// Ensure framer-motion is installed: npm install framer-motion
import { motion, AnimatePresence } from "framer-motion";
// Ensure lucide-react is installed: npm install lucide-react
import {
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
} from "lucide-react";

// 💡 Define your specific HLS URL here
const HLS_STREAM_URL = 'https://vz-fdc974fc-344.b-cdn.net/45a9ffc2-b123-4a31-8570-44919ed4ed51/playlist.m3u8';

// =========================================================
// VIDEO PLAYER COMPONENT
// =========================================================
const VideoPlayer = ({ url }) => {
  const videoRef = useRef();
  const containerRef = useRef();

  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hlsInstance, setHlsInstance] = useState(null);

  // States for quality control
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(-1); // -1 = Auto

  // ---------------- Load Video (Mount & URL Change) ----------------
  useEffect(() => {
    if (!url) return;
    const video = videoRef.current;
    let hls;

    // Clean up previous
    if (hlsInstance) {
      hlsInstance.destroy();
      setHlsInstance(null);
    }

    if (url.endsWith(".m3u8") && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        autoStartLoad: true,
        startLevel: -1, // Auto
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      // Manifest parsed → quality and audio info available
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setLevels(data.levels || []);
        setAudioTracks(hls.audioTracks || []);
        video.play().catch(e => console.log("Auto-play blocked:", e));
        setIsPlaying(true);
      });

      // Handle duration updates
      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        if (!data.details.live) { 
            setDuration(data.details.totalduration || video.duration);
        } else {
            setDuration(0); 
        }
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        setAudioTracks(data.audioTracks || []);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      setHlsInstance(hls);
    } else {
      // MP4 fallback or native HLS (Safari)
      video.src = url;
      video.load();
      video.play().catch(e => console.log("Auto-play blocked:", e));
      setIsPlaying(true);
      setDuration(video.duration || 0);
    }

    // Video events
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleDurationChange = () => setDuration(video.duration);
    const handleLoadedMetadata = () => setDuration(video.duration);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);


    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (hls) hls.destroy();
    };
  }, [url]);

  // ---------------- Audio Track Switching (Effect) ----------------
  useEffect(() => {
    if (hlsInstance && audioTracks.length > 0) {
      hlsInstance.audioTrack = selectedAudio;
    }
  }, [selectedAudio, hlsInstance, audioTracks]);

  // ---------------- Quality Switching (Effect) ----------------
  useEffect(() => {
    if (hlsInstance && levels.length > 0) {
      hlsInstance.currentLevel = selectedLevel;
    }
  }, [selectedLevel, hlsInstance, levels]);

  // ---------------- Controls Handlers ----------------
  const togglePlay = () => {
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    const video = videoRef.current;
    video.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullScreen = () => {
    const el = containerRef.current;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  };

  const restartVideo = () => {
    const video = videoRef.current;
    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
  };

  const changeSpeed = (value) => {
    const rate = parseFloat(value);
    videoRef.current.playbackRate = rate;
    setSpeed(rate);
  };

  const formatTime = (t) => {
    if (!t || isNaN(t)) return "0:00";
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  };
  
  const handleAudioChange = (e) => {
    setSelectedAudio(parseInt(e.target.value, 10));
  };

  const handleLevelChange = (e) => {
    setSelectedLevel(parseInt(e.target.value, 10));
  };

  // ---------------- Auto-hide Controls ----------------
  useEffect(() => {
    let timer;
    const show = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), 3000);
    };
    const container = containerRef.current;
    container.addEventListener("mousemove", show);
    container.addEventListener("mouseup", show); 
    return () => {
      clearTimeout(timer);
      container.removeEventListener("mousemove", show);
      container.removeEventListener("mouseup", show);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center rounded-lg overflow-hidden select-none"
      style={{ aspectRatio: '16/9' }} 
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
        preload="auto"
      />

      {/* Loading Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-t-transparent border-white rounded-full animate-spin" />
        </div>
      )}

      {/* Center Play Overlay */}
      <AnimatePresence>
        {!isPlaying && !isBuffering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <button
              onClick={togglePlay}
              className="bg-white/20 hover:bg-white/40 p-6 rounded-full transition"
            >
              <Play size={50} className="text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 text-white"
          >
            {/* Seek Bar */}
            {duration > 0 && (
              <>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-sm mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </>
            )}

            {/* Controls Row */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay}>
                  {isPlaying ? <Pause /> : <Play />}
                </button>

                <button onClick={toggleMute}>
                  {isMuted ? <VolumeX /> : <Volume2 />}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-blue-500 cursor-pointer"
                />

                <button onClick={restartVideo}>
                  <RotateCcw size={18} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Audio Tracks (Language) */}
                {audioTracks.length > 1 && (
                  <select
                    value={selectedAudio}
                    onChange={handleAudioChange}
                    className="bg-black/70 rounded px-2 py-1 text-sm appearance-none"
                  >
                    {audioTracks.map((track, i) => (
                      <option key={i} value={i}>
                        {track.name || track.lang || `Track ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                {/* Quality Selector */}
                {levels.length > 0 && (
                  <select
                    value={selectedLevel}
                    onChange={handleLevelChange}
                    className="bg-black/70 rounded px-2 py-1 text-sm appearance-none"
                  >
                    <option value={-1}>Auto</option>
                    {levels.map((lvl, i) => (
                      <option key={i} value={i}>
                        {lvl.height ? `${lvl.height}p` : `Level ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                {/* Speed */}
                <select
                  value={speed}
                  onChange={(e) => changeSpeed(e.target.value)}
                  className="bg-black/70 rounded px-2 py-1 text-sm appearance-none"
                >
                  {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                    <option key={s} value={s}>
                      {s}x
                    </option>
                  ))}
                </select>

                <button onClick={toggleFullScreen}>
                  <Maximize2 />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================
// MAIN APPLICATION COMPONENT (App.jsx)
// =========================================================
export default function App() {
  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-center">HLS Player with Quality/Audio Switching</h1>
      
      <div className="w-full max-w-4xl mx-auto shadow-xl rounded-lg" style={{ height: '500px' }}>
        {/* Pass the HLS URL defined at the top */}
        <VideoPlayer url={HLS_STREAM_URL} />
      </div>

      <p className="mt-6 text-sm text-gray-600 text-center">
        The Quality and Audio Track selectors will appear if the stream contains multiple options.
      </p>
    </div>
  );
}