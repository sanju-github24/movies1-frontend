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

const getLanguageName = (track) => {
  if (!track) return "Unknown Audio";
  const langMap = {
    'en': 'English', 'hi': 'Hindi', 'bn': 'Bengali', 'ta': 'Tamil',
    'te': 'Telugu', 'kn': 'Kannada', 'ml': 'Malayalam', 'mr': 'Marathi'
  };
  const name = track.name || "";
  const langCode = (track.lang || "").toLowerCase();
  if (name.trim() && !name.toLowerCase().includes("und") && isNaN(name)) return name;
  if (langMap[langCode]) return langMap[langCode];
  return langCode.toUpperCase() || `Track ${track.id + 1}`;
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
  onProgress          // optional (currentTime, duration) callback for resume/continue-watching
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  
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
  const [selectedSeason, setSelectedSeason] = useState(null); // season tab in the episodes panel

  // Normalization
  const currentIndex = Number(currentEpisodeIndex);
  const hasNextEpisode = Array.isArray(episodes) && currentIndex < episodes.length - 1;
  const epSeason = (ep, i) => ep.season_number || ep.season || 1;
  const seasonNumbers = [...new Set((episodes || []).map((e) => e.season_number || e.season || 1))].sort((a, b) => a - b);
  const currentSeason = episodes[currentIndex]?.season_number || episodes[currentIndex]?.season || 1;
  const activeSeason = selectedSeason != null ? selectedSeason : currentSeason;
  const nextEpData = hasNextEpisode ? episodes[currentIndex + 1] : null;

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setIsBuffering(true);

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

      hls.on(Hls.Events.MANIFEST_PARSED, () => { syncTracks(); setIsBuffering(false); });
      hls.on(Hls.Events.LEVEL_LOADED, syncTracks);
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => setCurrentAudioTrackId(data.id));
      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => setCurrentSubtitleId(data.id));

      return () => hls.destroy();
    } else {
      video.src = src;
      video.onloadedmetadata = () => setIsBuffering(false);
    }
  }, [src]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (v.paused) v.play().catch(() => {}); else v.pause();
    setIsPlaying(!v.paused);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

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

  const handleSubtitleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setExternalSubUrl(url);
      setCurrentSubtitleId(999);
      setShowSettings(null);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group overflow-hidden font-sans text-white select-none transition-all"
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
        onLoadedMetadata={() => setDuration(videoRef.current.duration)}
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
                    <img src={ep.cover_poster || ep.poster || '/api/placeholder/400/225'} className="w-full h-full object-cover" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
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
              <h3 className="text-sm font-semibold text-white">{{ subs: "Subtitles", audio: "Audio", quality: "Quality" }[showSettings] || showSettings}</h3>
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
                  <label className="flex items-center gap-2 mx-3 my-2 px-3 py-2 rounded-lg border border-dashed border-white/15 hover:border-blue-500/50 cursor-pointer text-white/70 hover:text-white transition-all">
                    <UploadCloud size={16}/><span className="text-xs font-medium">Upload subtitle (.vtt)</span>
                    <input type="file" accept=".vtt" className="hidden" onChange={handleSubtitleUpload} />
                  </label>
                </>
              )}
              {showSettings === 'quality' && (levels.length ? levels.map((l, i) => (
                <button key={i} onClick={() => { hlsRef.current.currentLevel = i; setShowSettings(null); }} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${currentLevel === i ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-sm font-medium">{l.height}p</span>{currentLevel === i && <Check size={16} className="text-blue-400"/>}
                </button>
              )) : <p className="px-4 py-3 text-sm text-white/40">Not available</p>)}
              {showSettings === 'audio' && (audioTracks.length ? audioTracks.map((t, i) => (
                <button key={i} onClick={() => { hlsRef.current.audioTrack = i; setShowSettings(null); }} className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${currentAudioTrackId === i ? 'text-blue-400 bg-blue-500/10' : 'text-white/85 hover:text-white hover:bg-white/5'}`}>
                  <span className="text-sm font-medium">{getLanguageName(t)}</span>{currentAudioTrackId === i && <Check size={16} className="text-blue-400"/>}
                </button>
              )) : <p className="px-4 py-3 text-sm text-white/40">Not available</p>)}
            </div>
          </div>
        </>
      )}

      {/* --- HUD: TOP --- */}
      <div className={`absolute top-0 inset-x-0 p-8 flex items-center justify-between bg-gradient-to-b from-black/95 via-black/20 to-transparent transition-all duration-500 z-50 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="flex items-center gap-5">
          <button onClick={onBackClick} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all active:scale-90"><ChevronLeft size={26} /></button>
          <div className="flex flex-col text-left min-w-0">
            {logoUrl
              ? <img src={logoUrl} alt={title} className="h-8 md:h-11 max-w-[220px] md:max-w-md object-contain drop-shadow-2xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              : <h1 className="text-lg md:text-2xl font-bold truncate max-w-xs md:max-w-xl drop-shadow-2xl">{title}</h1>}
          </div>
        </div>
      </div>

      {/* Center Play Indicator */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 z-30 ${!isPlaying && !isBuffering ? 'opacity-100 scale-100' : 'opacity-0 scale-125'}`}>
         <div className="p-8 rounded-full border border-white/10 bg-black/30 backdrop-blur-md shadow-2xl">
            {isPlaying ? <Pause size={40} fill="white" className="text-white" /> : <Play size={40} fill="white" className="text-white ml-1" />}
         </div>
      </div>

      {/* --- HUD: BOTTOM (CLEAN HUD) --- */}
      <div className={`absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent transition-all duration-500 z-50 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="relative group/progress mb-8">
            <div className="flex justify-between text-[11px] font-semibold mb-3 px-1 text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
            {/* THICK tactile progress bar */}
            <div className="relative h-2.5 w-full bg-white/10 rounded-full cursor-pointer group-hover/progress:h-3.5 transition-all shadow-inner" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
            }}>
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)]" style={{ width: `${(currentTime / duration) * 100}%` }} />
            </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <button onClick={() => videoRef.current.currentTime -= 10} className="hover:text-blue-500 transition-colors"><RotateCcw size={28}/></button>
            <button onClick={togglePlay} className="hover:scale-125 transition-transform active:scale-90 shadow-2xl">
              {isPlaying ? <Pause size={36} className="text-white" /> : <Play size={36} fill="white" className="text-white ml-1" />}
            </button>
            <button onClick={() => videoRef.current.currentTime += 10} className="hover:text-blue-500 transition-colors"><RotateCw size={28}/></button>

            {hasNextEpisode && (
                <button onClick={() => onEpisodeClick(nextEpData, currentIndex + 1)} className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-xl hover:bg-blue-600 transition-all text-white flex items-center gap-2 group shadow-xl">
                    <SkipForward size={20} fill="currentColor" />
                    <span className="hidden md:inline text-xs font-semibold">Next Episode</span>
                </button>
            )}
            
            <div className="relative flex items-center gap-4 group/volume" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                <button onClick={() => setIsMuted(!isMuted)} className="hover:text-blue-500 transition-colors">{isMuted ? <VolumeX size={28}/> : <Volume2 size={28}/>}</button>
                <div className={`flex items-center transition-all duration-300 overflow-hidden ${showVolumeSlider ? 'w-28 opacity-100 ml-2' : 'w-0 opacity-0'}`}>
                    <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1 bg-white/20 accent-blue-500 cursor-pointer" />
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            {episodes.length > 0 && (
                <button onClick={() => setShowSettings('episodes')} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-600 transition-all text-white flex items-center gap-3 shadow-lg group">
                    <ListVideo size={22} className="group-hover:scale-110 transition-transform" />
                    <span className="hidden md:inline text-xs font-semibold">Episodes</span>
                </button>
            )}
            <button onClick={() => setShowSettings('subs')} className={`p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all ${currentSubtitleId !== -1 ? 'text-blue-400' : 'text-white'}`}><Captions size={22} /></button>
            <button onClick={() => setShowSettings('audio')} className={`p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all ${showSettings === 'audio' ? 'text-blue-400' : 'text-white'}`}><Music size={22} /></button>
            <button onClick={() => setShowSettings('quality')} className={`p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all ${showSettings === 'quality' ? 'text-blue-400' : 'text-white'}`}><Layers size={22} /></button>
            <button onClick={handleFullscreen} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all text-white"><Maximize size={22} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;