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
  year = ""           // Prop passed from parent movieMeta
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

  // Normalization
  const currentIndex = Number(currentEpisodeIndex);
  const hasNextEpisode = Array.isArray(episodes) && currentIndex < episodes.length - 1;
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
        onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
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

      {/* --- REFINED DYNAMIC EPISODES OVERLAY (SMOOTH SCROLL) --- */}
      {showSettings === 'episodes' && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-[150] flex flex-col p-6 sm:p-12 animate-in fade-in duration-500" onClick={() => setShowSettings(null)}>
          <div className="max-w-6xl mx-auto w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-10 shrink-0">
              <div className="flex flex-col gap-1 text-left">
                 <h2 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter text-white">Episodes</h2>
                 <div className="flex items-center gap-3">
                    <span className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">Deployment Queue</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full"/>
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{episodes.length} SEGMENTS</span>
                 </div>
              </div>
              <button onClick={() => setShowSettings(null)} className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-red-600 transition-all shadow-xl"><CloseIcon size={28}/></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
              {episodes.map((ep, i) => (
                <button 
                  key={i} 
                  onClick={() => { onEpisodeClick(ep, i); setShowSettings(null); }}
                  className={`w-full group relative flex flex-col md:flex-row items-center gap-8 p-6 rounded-[2.5rem] transition-all border ${currentIndex === i ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_50px_rgba(37,99,235,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className="relative shrink-0 w-full md:w-72 aspect-video rounded-[1.5rem] overflow-hidden bg-gray-900 border border-white/10 shadow-2xl">
                    <img src={ep.cover_poster || ep.poster || '/api/placeholder/400/225'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60" alt=""/>
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={40} fill="white"/>
                    </div>
                    {currentIndex === i && (
                        <div className="absolute inset-0 bg-blue-600/40 flex flex-col items-center justify-center gap-2">
                             <Activity className="animate-pulse" size={32}/>
                             <span className="text-[10px] font-black uppercase tracking-widest">Active Link</span>
                        </div>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col items-start text-left gap-3 overflow-hidden">
                    <div className="flex items-center gap-4">
                        <span className="text-blue-500 text-xs font-black uppercase tracking-[0.2em]">S{ep.season_number || ep.season || 1} : E{ep.episodeNumberInSeason || ep.episode || (i+1)}</span>
                        <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold">
                            <Clock size={12}/> {ep.duration ? `${ep.duration}m` : 'Syncing'}
                        </div>
                    </div>
                    <h4 className="text-xl md:text-2xl font-black uppercase italic tracking-tight group-hover:text-blue-400 transition-colors line-clamp-1">{ep.title || `Segment ${i + 1}`}</h4>
                    <p className="text-gray-400 text-xs md:text-sm font-medium leading-relaxed line-clamp-2 max-w-2xl">
                        {ep.description || "Synchronizing narrative data. Ready for visual injection into the Quantum node."}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- STANDARD SETTINGS (INTACT) --- */}
      {showSettings && showSettings !== 'episodes' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowSettings(null)}>
          <div className="w-full max-w-sm bg-gray-950 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
              <h3 className="text-lg font-black uppercase tracking-widest text-blue-500">{showSettings}</h3>
              <button onClick={() => setShowSettings(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><CloseIcon size={20}/></button>
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {showSettings === 'subs' && (
                <>
                  <button onClick={() => changeSubtitles(-1)} className={`w-full flex items-center justify-between p-4 rounded-2xl ${currentSubtitleId === -1 ? 'bg-blue-600' : 'hover:bg-white/5'}`}>
                    <span className="font-black uppercase text-xs tracking-widest">Off</span>
                    {currentSubtitleId === -1 && <Check size={16}/>}
                  </button>
                  {subtitleTracks.map((t, i) => (
                    <button key={i} onClick={() => changeSubtitles(i)} className={`w-full flex items-center justify-between p-4 rounded-2xl ${currentSubtitleId === i ? 'bg-blue-600' : 'hover:bg-white/5'}`}>
                      <span className="font-black uppercase text-xs tracking-widest">{getLanguageName(t)}</span>
                      {currentSubtitleId === i && <Check size={16}/>}
                    </button>
                  ))}
                  <label className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/50 cursor-pointer mt-4 group transition-all">
                    <UploadCloud size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase text-[10px]">Import .VTT</span>
                    <input type="file" accept=".vtt" className="hidden" onChange={handleSubtitleUpload} />
                  </label>
                </>
              )}
              {showSettings === 'quality' && levels.map((l, i) => (
                <button key={i} onClick={() => { hlsRef.current.currentLevel = i; setShowSettings(null); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${currentLevel === i ? 'bg-blue-600' : 'hover:bg-white/5'}`}>
                  <span className="font-black uppercase text-xs tracking-widest">{l.height}p HD</span>
                  {currentLevel === i && <Check size={16}/>}
                </button>
              ))}
              {showSettings === 'audio' && audioTracks.map((t, i) => (
                <button key={i} onClick={() => { hlsRef.current.audioTrack = i; setShowSettings(null); }} className={`w-full flex items-center justify-between p-4 rounded-2xl ${currentAudioTrackId === i ? 'bg-blue-600' : 'hover:bg-white/5'}`}>
                  <span className="font-black uppercase text-xs tracking-widest">{getLanguageName(t)}</span>
                  {currentAudioTrackId === i && <Check size={16}/>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- HUD: TOP --- */}
      <div className={`absolute top-0 inset-x-0 p-8 flex items-center justify-between bg-gradient-to-b from-black/95 via-black/20 to-transparent transition-all duration-500 z-50 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="flex items-center gap-5">
          <button onClick={onBackClick} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-600 transition-all active:scale-90 shadow-2xl"><ChevronLeft size={28} /></button>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-1">Neural Core Node</span>
            <h1 className="text-xl md:text-3xl font-black uppercase italic truncate max-w-sm md:max-w-xl drop-shadow-2xl">{title}</h1>
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
            <div className="flex justify-end text-[11px] font-black mb-3 px-1 text-blue-400 uppercase tracking-widest">
                {/* RUNNING NUMBER HIDDEN FOR PREMIUM LOOK */}
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
                    <SkipForward size={22} fill="currentColor" />
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">Inject Next Segment</span>
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
                    <ListVideo size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">Deployment Queue</span>
                </button>
            )}
            <button onClick={() => setShowSettings('subs')} className={`p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all ${currentSubtitleId !== -1 ? 'text-blue-500' : 'text-gray-400'}`}><Captions size={24} /></button>
            <button onClick={() => setShowSettings('audio')} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-gray-400"><Music size={24} /></button>
            <button onClick={() => setShowSettings('quality')} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-gray-400"><Layers size={24} /></button>
            <button onClick={handleFullscreen} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-600 transition-all shadow-xl"><Maximize size={24} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;