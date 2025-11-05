import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js"; 
import { Play, Pause, Volume2, VolumeX, Minimize, Maximize, Loader2, ChevronLeft, FastForward, Rewind, Check, Settings, Equal } from "lucide-react";

// Utility function to format seconds into HH:MM:SS
const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity || seconds < 0) return '0:00';
    const date = new Date(0);
    date.setSeconds(seconds);
    const timeString = date.toISOString().substr(11, 8);
    // Remove leading '00:' if it's less than an hour
    return timeString.startsWith('00:') ? timeString.substring(3) : timeString;
};

// --- PERSISTENCE UTILITY FUNCTIONS REMOVED/DISABLED ---
// Function to generate a unique localStorage key for the quality setting
// const getQualityStorageKey = (src) => `hls-quality-${btoa(src).substring(0, 32)}`;
// Function to generate a unique localStorage key for the audio track setting
// const getAudioTrackStorageKey = (src) => `hls-audio-track-${btoa(src).substring(0, 32)}`;
// Function to generate a unique localStorage key for playback time
// const getTimeStorageKey = (src) => `hls-playback-time-${btoa(src).substring(0, 32)}`;

// Get last stored playback time for a given video source (returns 0 if not found)
const getLastPlaybackTime = (src) => {
    // Persistence disabled, always return 0
    return 0; 
};

// Set the current playback time for a given video source
const setLastPlaybackTime = (src, time) => {
    // Persistence disabled, no-op
    return;
};


const VideoPlayer = ({ src, title = "Video Title", onBackClick }) => { 
    const videoRef = useRef(null);
    const hlsInstanceRef = useRef(null);
    const playerContainerRef = useRef(null);
    const controlsTimeoutRef = useRef(null); 

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

    // --- HLS Track State ---
    const [audioTracks, setAudioTracks] = useState([]);
    const [currentAudioTrackId, setCurrentAudioTrackId] = useState(-1); // -1 is typically 'Auto' or default
    const [qualityLevels, setQualityLevels] = useState([]);
    const [currentQualityLevel, setCurrentQualityLevel] = useState(-1); // -1 is 'Auto'

    // 🔑 STATES for right-side panels
    const [showQualityPanel, setShowQualityPanel] = useState(false);
    const [showAudioPanel, setShowAudioPanel] = useState(false);

    // --- Player Actions ---
    const togglePlayPause = () => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (isPlaying) {
            videoEl.pause();
        } else {
            videoEl.play().catch(e => console.error("Play failed:", e));
        }
        setShowOverlay(true);
        setTimeout(() => setShowOverlay(false), 500); 
    };

    const toggleMute = (e) => {
        e.stopPropagation(); 
        const videoEl = videoRef.current;
        if (!videoEl) return;
        
        if (showVolumeSlider) {
             setShowVolumeSlider(false); 
             if (!isMuted) {
                 videoEl.muted = true;
                 setIsMuted(true);
                 setVolume(0); 
             } else {
                 const targetVolume = volume === 0 ? 1 : volume;
                 videoEl.volume = targetVolume;
                 videoEl.muted = false;
                 setIsMuted(false);
                 setVolume(targetVolume);
             }

        } else {
            setShowVolumeSlider(true);
        }
    };
    
    // Handler to toggle Mute when clicking the area of the slider, but not the range input
    const handleVolumeSliderClick = (e) => {
        e.stopPropagation();
        if (e.target.type !== 'range') {
             const videoEl = videoRef.current;
             if (!videoEl) return;
             videoEl.muted = !isMuted;
             setIsMuted(!isMuted);
             setShowVolumeSlider(false); 
        }
    }

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
        // Persistence disabled
        // setLastPlaybackTime(src, seekTime); 
    };

    const seekRelative = (seconds) => {
        const videoEl = videoRef.current;
        if (videoEl) {
            videoEl.currentTime = Math.max(0, Math.min(duration, videoEl.currentTime + seconds));
            setCurrentTime(videoEl.currentTime);
            // Persistence disabled
            // setLastPlaybackTime(src, videoEl.currentTime); 
        }
    };

    const toggleFullScreen = useCallback(() => {
        const container = playerContainerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    const handleAudioTrackChange = useCallback((newTrackId) => {
        const hls = hlsInstanceRef.current;
        if (hls && newTrackId !== currentAudioTrackId) {
            hls.audioTrack = newTrackId; 
            setCurrentAudioTrackId(newTrackId);
            setShowAudioPanel(false); 
            // 💾 PERSISTENCE: Disabled
            /*
            try {
                localStorage.setItem(getAudioTrackStorageKey(src), newTrackId.toString());
            } catch (error) {
                console.warn("Could not save audio track preference to localStorage:", error);
            }
            */
        }
    }, [currentAudioTrackId]); // Removed src dependency since persistence is disabled

    const handleQualityChange = useCallback((newLevel) => {
        const hls = hlsInstanceRef.current;
        
        if (hls && newLevel !== currentQualityLevel) {
            hls.currentLevel = newLevel; 
            setCurrentQualityLevel(newLevel);
            
            // 💾 PERSISTENCE: Disabled
            /*
            try {
                localStorage.setItem(getQualityStorageKey(src), newLevel.toString());
            } catch (error) {
                console.warn("Could not save quality preference to localStorage:", error);
            }
            */
            setShowQualityPanel(false); 
        }
    }, [currentQualityLevel]); // Removed src dependency since persistence is disabled

    // --- Controls visibility logic ---
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying && !showQualityPanel && !showAudioPanel && !showVolumeSlider) {
                 setShowControls(false);
            }
        }, 3000); 
    }, [isPlaying, showQualityPanel, showAudioPanel, showVolumeSlider]);

    useEffect(() => {
        showControlsTemporarily();

        const handleClickOutside = (event) => {
            // Check if the click is outside the player container
            if (playerContainerRef.current && !playerContainerRef.current.contains(event.target)) {
                setShowQualityPanel(false);
                setShowAudioPanel(false);
                setShowVolumeSlider(false);
            }
        };

        const playerContainer = playerContainerRef.current;
        if (playerContainer) {
            playerContainer.addEventListener('mousemove', showControlsTemporarily);
            // Hide controls on mouse leave unless a panel/slider is open
            playerContainer.addEventListener('mouseleave', () => {
                if (isPlaying && !showQualityPanel && !showAudioPanel && !showVolumeSlider) {
                    setShowControls(false);
                }
            });
            
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            if (playerContainer) {
                playerContainer.removeEventListener('mousemove', showControlsTemporarily);
                playerContainer.removeEventListener('mouseleave', () => { /* no-op */ });
                document.removeEventListener('mousedown', handleClickOutside);
            }
        };
    }, [isPlaying, showControlsTemporarily, showQualityPanel, showAudioPanel, showVolumeSlider]);


    // --- 🎹 KEYBOARD SHORTCUTS EFFECT ---
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            if (event.code === 'Space') {
                event.preventDefault(); 
            }

            switch (event.key) {
                case ' ': 
                    togglePlayPause();
                    break;
                case 'ArrowRight': 
                    seekRelative(10);
                    showControlsTemporarily();
                    break;
                case 'ArrowLeft': 
                    seekRelative(-10);
                    showControlsTemporarily();
                    break;
                default:
                    return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [togglePlayPause, seekRelative, showControlsTemporarily]); 


    // --- 📹 Core HLS and Video Setup (Persistence Disabled) ---
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (hlsInstanceRef.current) {
            hlsInstanceRef.current.destroy();
        }
        
        setIsLoading(true);

        // 1. 🔍 RETRIEVE PERSISTENCE DATA - DISABLED
        let savedQualityLevel = -1;
        let savedAudioTrackId = -1;
        let savedTime = getLastPlaybackTime(src); // Always returns 0

        /*
        try {
            const savedLevel = localStorage.getItem(getQualityStorageKey(src));
            if (savedLevel !== null) {
                savedQualityLevel = parseInt(savedLevel, 10);
                setCurrentQualityLevel(savedQualityLevel);
            }
            const savedTrack = localStorage.getItem(getAudioTrackStorageKey(src));
            if (savedTrack !== null) {
                 savedAudioTrackId = parseInt(savedTrack, 10);
                 setCurrentAudioTrackId(savedTrackId);
            }
        } catch (error) {
            console.warn("Could not read preferences from localStorage:", error);
        }
        */


        if (Hls.isSupported()) {
            const hls = new Hls();
            hlsInstanceRef.current = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                setIsLive(data.live); 
                const levels = data.levels.map((level, index) => ({
                    id: index,
                    bitrate: Math.round(level.bitrate / 1000),
                    resolution: `${level.width}x${level.height}`
                }));
                setQualityLevels(levels);
                setAudioTracks(hls.audioTracks || []);
                
                // 2. ⚙️ APPLY SAVED QUALITY LEVEL (Default to Auto)
                setCurrentQualityLevel(-1); 
                hls.currentLevel = -1; 
                
                // 3. 🗣️ APPLY SAVED AUDIO TRACK (Default to HLS selection)
                setCurrentAudioTrackId(hls.audioTrack); 
                
                setIsLoading(false);
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => setCurrentQualityLevel(data.level));
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => setAudioTracks(data.audioTracks));
            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => setCurrentAudioTrackId(data.id));

            hls.attachMedia(videoEl);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(src);
                
                // 4. ⏯️ APPLY SAVED PLAYBACK TIME (Will only be 0)
                videoEl.addEventListener('loadeddata', () => {
                    if (savedTime > 0 && savedTime < videoEl.duration - 5) { // savedTime is 0 here
                        videoEl.currentTime = savedTime;
                        setCurrentTime(savedTime);
                        console.log(`Resuming playback at: ${formatTime(savedTime)}`);
                    }
                    // Attempt to play after setting time
                    videoEl.play().catch(() => console.log("Autoplay failed."));
                }, { once: true }); 

            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error("HLS.js Fatal Error:", data);
                    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
                    else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.loadSource(src);
                }
            });

        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS Fallback for Safari/iOS
            videoEl.src = src;
            videoEl.addEventListener('loadedmetadata', () => setDuration(videoEl.duration));
             // 5. ⏯️ APPLY SAVED PLAYBACK TIME (Native Fallback - Will only be 0)
             videoEl.addEventListener('loadeddata', () => {
                 if (savedTime > 0 && savedTime < videoEl.duration - 5) { // savedTime is 0 here
                     videoEl.currentTime = savedTime;
                     setCurrentTime(savedTime);
                     console.log(`Resuming playback at: ${formatTime(savedTime)} (Native)`);
                 }
                 videoEl.play();
             }, { once: true });
        } else {
            console.error("HLS playback is not supported on this browser.");
        }
        
        // --- HTML Video Element Event Handlers ---
        const handleTimeUpdate = () => {
            const time = videoEl.currentTime;
            setCurrentTime(time);
        };
        const handleLoadedMetadata = () => setDuration(videoEl.duration);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleWaiting = () => setIsLoading(true);
        const handlePlaying = () => setIsLoading(false);
        const handleVolumeChangeUpdate = () => {
            setVolume(videoEl.volume);
            setIsMuted(videoEl.muted);
        };
        const handleFullscreenChange = () => setIsFullScreen(!!document.fullscreenElement);

        videoEl.addEventListener('timeupdate', handleTimeUpdate);
        videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoEl.addEventListener('play', handlePlay);
        videoEl.addEventListener('pause', handlePause);
        videoEl.addEventListener('waiting', handleWaiting);
        videoEl.addEventListener('playing', handlePlaying);
        videoEl.addEventListener('volumechange', handleVolumeChangeUpdate);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            // 6. 💾 PERSISTENCE: FINAL SAVE ON UNMOUNT/RELOAD - DISABLED
            // if (videoRef.current) {
            //     setLastPlaybackTime(src, videoRef.current.currentTime);
            // }

            if (hlsInstanceRef.current) hlsInstanceRef.current.destroy();
            videoEl.removeEventListener('timeupdate', handleTimeUpdate);
            videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoEl.removeEventListener('play', handlePlay);
            videoEl.removeEventListener('pause', handlePause);
            videoEl.removeEventListener('waiting', handleWaiting);
            videoEl.removeEventListener('playing', handlePlaying);
            videoEl.removeEventListener('volumechange', handleVolumeChangeUpdate);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };

    }, [src]); // Re-run effect when 'src' changes (server switches)

    // --- Helper Functions to get current text labels for UI ---
    const getCurrentQualityLabel = () => {
        if (currentQualityLevel === -1) return "Auto";
        const level = qualityLevels.find(l => l.id === currentQualityLevel);
        // Find resolution height
        return level ? `${level.resolution.split('x')[1]}p` : "Custom";
    };

    const getCurrentAudioLabel = () => {
        if (currentAudioTrackId === -1) return "Default"; // Assuming default for -1 or if not found
        const track = audioTracks.find(t => t.id === currentAudioTrackId);
        // Use name, then lang, then fallback
        return track ? (track.name || track.lang || `Track ${track.id}`) : "Unknown";
    };

    // --- Main Render ---
    const PlayPauseIcon = isPlaying ? (
        <Pause className="w-7 h-7 text-white" />
    ) : (
        <Play className="w-7 h-7 text-white" />
    );

    const MuteVolumeIcon = isMuted || volume === 0 ? (
        <VolumeX className="w-6 h-6 text-white" />
    ) : (
        <Volume2 className="w-6 h-6 text-white" />
    );

    const FullscreenIcon = isFullScreen ? (
        <Minimize className="w-6 h-6 text-white" />
    ) : (
        <Maximize className="w-6 h-6 text-white" />
    );


    return (
        <div 
            ref={playerContainerRef} 
            className="w-full max-w-full mx-auto rounded-xl overflow-hidden shadow-2xl bg-black relative border-4 border-gray-800 group transition-all duration-300" 
            style={{ aspectRatio: "16/9", height: isFullScreen ? '100vh' : 'auto' }}
            // Reset controls visibility when panels are open
            onMouseMove={showQualityPanel || showAudioPanel || showVolumeSlider ? undefined : showControlsTemporarily}
            onMouseLeave={showQualityPanel || showAudioPanel || showVolumeSlider ? undefined : () => {
                if (isPlaying) setShowControls(false);
            }}
        >
            
            {/* Video Element */}
            <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                playsInline
                onClick={togglePlayPause} // Toggle play/pause on video click
            />

            {/* Loading Indicator */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
                    <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
                    <span className="ml-4 text-white text-lg">Loading Stream...</span>
                </div>
            )}

            {/* Central Play/Pause Overlay */}
            {showOverlay && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    <div className="text-white p-4 rounded-full bg-black/50 transition-opacity duration-100 ease-in-out">
                         {isPlaying ? (
                            <Pause className="w-16 h-16 text-white" />
                        ) : (
                            <Play className="w-16 h-16 text-white" />
                        )}
                    </div>
                </div>
            )}
            
            {/* 🖼️ LOGO IN TOP RIGHT CORNER (Always Visible) */}
            <div 
                className={`absolute top-0 right-0 p-4 pt-6 z-40 transition-opacity duration-300`}
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Use the public path for the image */}
                <img 
                    src="/logo_39.png" 
                    alt="Brand Logo" 
                    className="h-8 w-auto opacity-75" // Adjust height and opacity as needed
                />
            </div>


            {/* TOP CONTROL BAR (mimicking Hotstar) */}
            <div 
                className={`absolute top-0 inset-x-0 p-4 pt-6 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-40 transition-opacity duration-300 ${showControls || showQualityPanel || showAudioPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Left: Back Button & Title */}
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={onBackClick} 
                        className="text-white p-2 rounded-full hover:bg-white/20 transition"
                        title="Back"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-white text-lg font-semibold truncate max-w-[200px]">{title}</span>
                </div>

                {/* Right: Quality & Audio/Subtitle Buttons */}
                <div className="flex items-center space-x-4">
                    {qualityLevels.length > 1 && (
                        <button 
                            onClick={() => { setShowQualityPanel(p => !p); setShowAudioPanel(false); showControlsTemporarily(); }} 
                            className="text-white text-sm px-3 py-1.5 rounded-full border border-white/50 bg-white/10 hover:bg-white/30 transition"
                        >
                            Quality {getCurrentQualityLabel()}
                        </button>
                    )}
                    {/* Check if audioTracks exist (length > 0) */}
                    {audioTracks.length > 0 && (
                        <button 
                            onClick={() => { setShowAudioPanel(p => !p); setShowQualityPanel(false); showControlsTemporarily(); }} 
                            className="text-white text-sm px-3 py-1.5 rounded-full border border-white/50 bg-white/10 hover:bg-white/30 transition"
                        >
                            Audio & Subtitles
                        </button>
                    )}
                </div>
            </div>
            
            {/* BOTTOM CONTROL BAR WRAPPER */}
<div 
    className={`absolute inset-x-0 bottom-0 z-40 transition-opacity duration-300 ${showControls || showVolumeSlider ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    onClick={(e) => e.stopPropagation()} 
>
    {/* PROGRESS BAR (RUNNER TIME LINE) */}
    <div className="w-full h-2 flex items-center px-4 pb-2">
         <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            // Light Blue (cyan-400 equivalent) for filled progress
            className="w-full bg-blue-600 appearance-none cursor-pointer range-with-custom-thumb" 
            style={{
                background: `linear-gradient(to right, #22D3EE 0%, #22D3EE ${(currentTime / duration) * 100}%, #ffffff40 ${(currentTime / duration) * 100}%, #ffffff40 100%)`
            }}
         />
    </div>

                {/* Main Control Row */}
                <div className="p-4 pt-0 pb-6 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent">
                    {/* Left Controls: Rewind, Play/Pause, Fast Forward, Time */}
                    <div className="flex items-center space-x-6">
                        
                        {/* Rewind 10s Button with "10" */}
                        <button onClick={() => seekRelative(-10)} className="text-white p-2 hover:bg-white/20 rounded-full transition flex items-center relative" title="Rewind 10s">
                            <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">10</span>
                            <Rewind className="w-7 h-7 opacity-70" />
                        </button>

                        <button onClick={togglePlayPause} className="text-white p-2 hover:bg-white/20 rounded-full transition" title={isPlaying ? "Pause" : "Play"}>
                            {PlayPauseIcon}
                        </button>
                        
                        {/* Forward 10s Button with "10" */}
                        <button onClick={() => seekRelative(10)} className="text-white p-2 hover:bg-white/20 rounded-full transition flex items-center relative" title="Forward 10s">
                             <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">10</span>
                            <FastForward className="w-7 h-7 opacity-70" />
                        </button>

                        <span className="text-white text-base ml-2">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Center: "More Like This" (placeholder) */}
                    <div className="hidden sm:block"> 
                        {/* Keeping this div structure */}
                    </div> 

                    {/* Right Controls: Volume, Fullscreen */}
                    <div className="flex items-center space-x-4">
                        {/* Volume button and slider (ENHANCED) */}


<div className="relative flex items-center">
    <button 
        onClick={toggleMute} // Button toggles Mute or opens the slider
        className="text-white p-2 hover:bg-white/20 rounded-full transition"
        title={isMuted ? "Unmute" : "Mute"}
    >
        {MuteVolumeIcon}
    </button>
    
    {/* Vertical Volume Slider (Now controlled by showVolumeSlider) */}
    {showVolumeSlider && (
        <div 
            className="absolute bottom-full mb-5 left-1/2 transform -translate-x-1/2 bg-gray-800 p-3 rounded-lg shadow-xl"
            onClick={handleVolumeSliderClick} // Click outside the range input closes it/mutes
            // Adjust z-index to ensure it sits on top of controls bar
            style={{ zIndex: 50, position: 'absolute' }} 
        >
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 appearance-none cursor-pointer rounded-full"
                // Tailwind utility classes for the range track and thumb might be needed globally 
                // or via specific utility files if this custom style is insufficient.
                style={{
                    transform: 'rotate(-90deg) translateX(-50%)', 
                    transformOrigin: 'bottom',
                    width: '80px', 
                    height: '8px', 
                    // Light Blue (cyan-400 equivalent) for volume level
                    background: `linear-gradient(to right, #22D3EE 0%, #22D3EE ${volume * 100}%, #0891B2 ${volume * 100}%, #0891B2 100%)`
                }}
            />
        </div>
    )}
</div>
                        
                        <button onClick={toggleFullScreen} className="text-white p-2 hover:bg-white/20 rounded-full transition" title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
                            {FullscreenIcon}
                        </button>
                    </div>
                </div>
            </div>


            {/* QUALITY SELECTION PANEL (Slides from right) */}
            <div 
                className={`absolute top-0 right-0 h-full w-full sm:w-80 bg-black/90 backdrop-blur-md transition-transform duration-300 ease-in-out z-50 p-4 flex flex-col ${showQualityPanel ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-gray-700 mb-4">
                    <button onClick={() => setShowQualityPanel(false)} className="text-white p-2 rounded-full hover:bg-white/20 transition">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-white text-lg font-bold">Quality</span>
                    <div className="w-8"></div> {/* Placeholder for alignment */}
                </div>
                <ul className="flex-grow overflow-y-auto space-y-1 text-white">
                    {/* Auto Option - Updated selection color to cyan-600 */}
                    <li 
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${currentQualityLevel === -1 ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                        onClick={() => handleQualityChange(-1)}
                    >
                        Auto
                        {currentQualityLevel === -1 && <Check className="w-5 h-5 ml-auto" />}
                    </li>
                    {/* Quality Options - Updated selection color to cyan-600 */}
                    {qualityLevels.map((level) => (
                        <li
                            key={level.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${currentQualityLevel === level.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                            onClick={() => handleQualityChange(level.id)}
                        >
                            {level.resolution.split('x')[1]}p ({Math.round(level.bitrate / 1000)} kbps)
                            {currentQualityLevel === level.id && <Check className="w-5 h-5 ml-auto" />}
                        </li>
                    ))}
                     {qualityLevels.length === 0 && (
                        <p className="text-gray-400 p-3">No separate quality levels detected.</p>
                    )}
                </ul>
            </div>
            
            {/* AUDIO TRACK SELECTION PANEL (Slides from right) */}
            <div 
                className={`absolute top-0 right-0 h-full w-full sm:w-80 bg-black/90 backdrop-blur-md transition-transform duration-300 ease-in-out z-50 p-4 flex flex-col ${showAudioPanel ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-gray-700 mb-4">
                    <button onClick={() => setShowAudioPanel(false)} className="text-white p-2 rounded-full hover:bg-white/20 transition">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-white text-lg font-bold">Audio & Subtitles</span>
                    <div className="w-8"></div> {/* Placeholder for alignment */}
                </div>
                
                <h3 className="text-white text-md font-semibold mb-2">Audio Tracks</h3>
                <ul className="overflow-y-auto space-y-1 text-white mb-6 border-b border-gray-700 pb-4">
                    {/* Auto/Default Option */}
                    <li 
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${currentAudioTrackId === -1 ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                        onClick={() => handleAudioTrackChange(-1)}
                    >
                        Default (Auto)
                        {currentAudioTrackId === -1 && <Check className="w-5 h-5 ml-auto" />}
                    </li>
                    {/* Audio Track Options */}
                    {audioTracks.map((track) => (
                        <li
                            key={track.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${currentAudioTrackId === track.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                            onClick={() => handleAudioTrackChange(track.id)}
                        >
                            {track.name || track.lang || `Track ${track.id}`}
                            {currentAudioTrackId === track.id && <Check className="w-5 h-5 ml-auto" />}
                        </li>
                    ))}
                    {audioTracks.length === 0 && (
                        <p className="text-gray-400 p-3">No separate audio tracks detected.</p>
                    )}
                </ul>

                {/* Subtitle Placeholder (Placeholder for future implementation) */}
                <h3 className="text-white text-md font-semibold mb-2">Subtitles</h3>
                <ul className="space-y-1 text-white">
                    <li className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 cursor-not-allowed">
                        <span className="text-gray-400">Off (Subtitles not yet implemented)</span>
                    </li>
                </ul>

            </div>

        </div>
    );
};

export default VideoPlayer;