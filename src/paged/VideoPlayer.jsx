import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js"; 
import { Play, Pause, Volume2, VolumeX, Minimize, Maximize, Loader2, ChevronLeft, FastForward, Rewind, Check, Settings, Equal, Music } from "lucide-react";

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
    // Subtitles are not fully implemented here but typically share the audio panel

    // --- Player Actions ---
    const togglePlayPause = () => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (isPlaying) {
            videoEl.pause();
        } else {
            videoEl.play().catch(e => console.error("Play failed:", e));
        }
        // Central Overlay Logic
        setShowOverlay(true);
        setTimeout(() => setShowOverlay(false), 500); 
    };

    const toggleMute = (e) => {
        e.stopPropagation(); 
        const videoEl = videoRef.current;
        if (!videoEl) return;
        
        // If the slider is hidden, toggle mute and show the slider momentarily
        if (!showVolumeSlider) {
             // If currently muted, unmute (but don't open the slider)
            if (isMuted) {
                videoEl.muted = false;
                setIsMuted(false);
                setVolume(volume || 1); 
            } else {
                // If not muted, open the slider (which is the default action for the volume button in this design)
                setShowVolumeSlider(true);
            }
        } else {
             // If the slider is open, toggle mute
             videoEl.muted = !isMuted;
             setIsMuted(!isMuted);
             // Ensure the slider value reflects the muted state immediately
             setVolume(isMuted ? (videoEl.volume || 1) : 0);
             setShowVolumeSlider(false); // Close the slider after clicking the icon
        }
        
    };
    
    // Handler to toggle Mute when clicking the area of the slider, but not the range input
    const handleVolumeSliderClick = (e) => {
        e.stopPropagation();
        // If the click is on the range input itself, do nothing, allowing range input to work
        if (e.target.type !== 'range') {
             // If clicking the div area, we can choose to close the slider or toggle mute
             // Let's make it close the slider on click outside the input
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
        }
    }, [currentAudioTrackId]); 

    const handleQualityChange = useCallback((newLevel) => {
        const hls = hlsInstanceRef.current;
        
        if (hls && newLevel !== currentQualityLevel) {
            hls.currentLevel = newLevel; 
            setCurrentQualityLevel(newLevel);
            setShowQualityPanel(false); 
        }
    }, [currentQualityLevel]); 

    // --- Controls visibility logic ---
    const showControlsTemporarily = useCallback(() => {
        // Always show controls immediately
        setShowControls(true);

        // Clear any existing timeout
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        
        // Set new timeout to hide controls
        controlsTimeoutRef.current = setTimeout(() => {
            // Only hide controls if playing AND no panels/sliders are open
            if (isPlaying && !showQualityPanel && !showAudioPanel && !showVolumeSlider) {
                setShowControls(false);
            }
        }, 3000); 
    }, [isPlaying, showQualityPanel, showAudioPanel, showVolumeSlider]);

    useEffect(() => {
        // Initial call to show controls briefly
        showControlsTemporarily();

        const handleClickOutside = (event) => {
            // Check if the click is outside the player container
            if (playerContainerRef.current && !playerContainerRef.current.contains(event.target)) {
                setShowQualityPanel(false);
                setShowAudioPanel(false);
                // setShowVolumeSlider(false); // Let volume slider handle its own close on icon click
            }
        };
        
        // --- Fullscreen change listener for controls logic ---
        const handleFullscreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
            // When exiting fullscreen, ensure controls are visible
            if (!document.fullscreenElement) {
                setShowControls(true);
            }
        };

        const playerContainer = playerContainerRef.current;
        if (playerContainer) {
            // Add mouse move listener
            playerContainer.addEventListener('mousemove', showControlsTemporarily);
            
            // Hide controls on mouse leave unless a panel/slider is open
            const handleMouseLeave = () => {
                 if (isPlaying && !showQualityPanel && !showAudioPanel && !showVolumeSlider) {
                     setShowControls(false);
                 }
            };
            playerContainer.addEventListener('mouseleave', handleMouseLeave);
            
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('fullscreenchange', handleFullscreenChange);

        }

        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            if (playerContainer) {
                playerContainer.removeEventListener('mousemove', showControlsTemporarily);
                // Need to remove the named function reference
                const handleMouseLeave = () => {
                    if (isPlaying && !showQualityPanel && !showAudioPanel && !showVolumeSlider) {
                        setShowControls(false);
                    }
                };
                playerContainer.removeEventListener('mouseleave', handleMouseLeave);
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
        let savedTime = getLastPlaybackTime(src); // Always returns 0

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

        videoEl.addEventListener('timeupdate', handleTimeUpdate);
        videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoEl.addEventListener('play', handlePlay);
        videoEl.addEventListener('pause', handlePause);
        videoEl.addEventListener('waiting', handleWaiting);
        videoEl.addEventListener('playing', handlePlaying);
        videoEl.addEventListener('volumechange', handleVolumeChangeUpdate);


        return () => {
            // 6. 💾 PERSISTENCE: FINAL SAVE ON UNMOUNT/RELOAD - DISABLED
            // if (videoRef.current) {
            //     setLastPlaybackTime(src, videoRef.current.currentTime);
            // }

            if (hlsInstanceRef.current) hlsInstanceRef.current.destroy();
            videoEl.removeEventListener('timeupdate', handleTimeUpdate);
            videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoEl.removeEventListener('play', handlePlay);
            videoEl.removeEventListener('pause', handlePause);
            videoEl.removeEventListener('waiting', handleWaiting);
            videoEl.removeEventListener('playing', handlePlaying);
            videoEl.removeEventListener('volumechange', handleVolumeChangeUpdate);
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
    // 1. Updated Play/Pause Icon for mobile responsiveness
    const PlayPauseIcon = isPlaying ? (
        <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
    ) : (
        <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
    );

    // 2. Updated Mute/Volume Icon for mobile responsiveness
    const MuteVolumeIcon = isMuted || volume === 0 ? (
        <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    ) : (
        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    );

    // 3. Updated Fullscreen Icon for mobile responsiveness
    const FullscreenIcon = isFullScreen ? (
        <Minimize className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    ) : (
        <Maximize className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    );


    return (
        <div 
            ref={playerContainerRef} 
            // 🔑 IMPORTANT: Use 'h-full' and 'w-full' for the container in fullscreen, but maintain aspect ratio otherwise
            className="w-full max-w-full mx-auto rounded-xl overflow-hidden shadow-2xl bg-black relative border-4 border-gray-800 group transition-all duration-300" 
            style={{ aspectRatio: isFullScreen ? 'unset' : "16/9", height: isFullScreen ? '100vh' : 'auto' }}
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

            {/* Central Play/Pause Overlay - FIX: Added missing closing parenthesis */}
            {showOverlay && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    <div className="text-white p-4 rounded-full bg-black/50 transition-opacity duration-100 ease-in-out">
                        {isPlaying ? (
                            // 4. Central Overlay Icon Size: w-12 h-12 (mobile) -> sm:w-16 sm:h-16 (desktop)
                            <Pause className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                        ) : (
                            <Play className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
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
                    className="h-6 sm:h-8 w-auto opacity-75" // Logo size updated
                />
            </div>


            {/* TOP CONTROL BAR (mimicking Hotstar) */}
            <div 
                className={`absolute top-0 inset-x-0 p-4 pt-6 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-40 transition-opacity duration-300 ${showControls || showQualityPanel || showAudioPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Left: Back Button & Title */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <button 
                        onClick={onBackClick} 
                        className="text-white p-1 sm:p-2 rounded-full hover:bg-white/20 transition"
                        title="Back"
                    >
                        {/* 5. Back Button Icon Size: w-5 h-5 (mobile) -> sm:w-6 sm:h-6 (desktop) */}
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    {/* 6. Title Text Size: text-base (mobile) -> sm:text-lg (desktop) */}
                    <span className="text-white text-base sm:text-lg font-semibold truncate max-w-[150px] sm:max-w-[200px]">{title}</span>
                </div>

                {/* Right: Quality & Audio/Subtitle Buttons */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                    {qualityLevels.length > 1 && (
                        <button 
                            onClick={() => { setShowQualityPanel(p => !p); setShowAudioPanel(false); showControlsTemporarily(); }} 
                            className="text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/50 bg-white/10 hover:bg-white/30 transition"
                        >
                            Quality {getCurrentQualityLabel()}
                        </button>
                    )}
                    {/* Check if audioTracks exist (length > 0) */}
                    {audioTracks.length > 0 && (
                        <button 
                            onClick={() => { setShowAudioPanel(p => !p); setShowQualityPanel(false); showControlsTemporarily(); }} 
                            className="text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/50 bg-white/10 hover:bg-white/30 transition"
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
                    <div className="flex items-center space-x-3 sm:space-x-6">
                        
                        {/* Rewind 10s Button with "10" */}
                        <button onClick={() => seekRelative(-10)} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition flex items-center relative" title="Rewind 10s">
                            <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">10</span>
                            {/* 7. Rewind Icon Size: w-6 h-6 (mobile) -> sm:w-7 sm:h-7 (desktop) */}
                            <Rewind className="w-6 h-6 sm:w-7 sm:h-7 opacity-70" />
                        </button>

                        <button onClick={togglePlayPause} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition" title={isPlaying ? "Pause" : "Play"}>
                            {/* 8. Play/Pause Icon is defined above with responsive classes */}
                            {PlayPauseIcon}
                        </button>
                        
                        {/* Forward 10s Button with "10" */}
                        <button onClick={() => seekRelative(10)} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition flex items-center relative" title="Forward 10s">
                             <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">10</span>
                            {/* 9. FastForward Icon Size: w-6 h-6 (mobile) -> sm:w-7 sm:h-7 (desktop) */}
                            <FastForward className="w-6 h-6 sm:w-7 sm:h-7 opacity-70" />
                        </button>

                        {/* 10. Time Text Size: text-sm (mobile) -> sm:text-base (desktop) */}
                        <span className="text-white text-sm sm:text-base ml-2">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Center: "More Like This" (placeholder) */}
                    <div className="hidden sm:block"> 
                        {/* Keeping this div structure */}
                    </div> 

                    {/* Right Controls: Volume, Fullscreen */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {/* Volume button and slider (ENHANCED) */}


                        <div className="relative flex items-center">
                            <button 
                                onClick={toggleMute} // Button toggles Mute or opens the slider
                                className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition"
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {/* 11. Volume Icon is defined above with responsive classes */}
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
                        
                        <button onClick={toggleFullScreen} className="text-white p-1 sm:p-2 hover:bg-white/20 rounded-full transition" title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
                            {/* 12. Fullscreen Icon is defined above with responsive classes */}
                            {FullscreenIcon}
                        </button>
                    </div>
                </div>
            </div>


            {/* QUALITY SELECTION PANEL (Slides from right) */}
            <div 
                // 🔑 Mobile Fit Improvement: w-full h-full on mobile, fixed width on sm+
                className={`absolute top-0 right-0 w-full h-full sm:w-80 bg-black/90 backdrop-blur-md transition-transform duration-300 ease-in-out z-50 p-4 flex flex-col ${showQualityPanel ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-gray-700 mb-4">
                    {/* Back button in panel: w-5 h-5 (mobile) -> sm:w-6 sm:h-6 (desktop) */}
                    <button onClick={() => setShowQualityPanel(false)} className="text-white p-2 rounded-full hover:bg-white/20 transition">
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
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
                    {/* Render specific quality levels */}
                    {qualityLevels.map(level => (
                         <li 
                            key={level.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${currentQualityLevel === level.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                            onClick={() => handleQualityChange(level.id)}
                        >
                            {level.resolution.split('x')[1]}p 
                            <span className="text-xs text-gray-400 ml-2">({level.bitrate} kbps)</span>
                            {currentQualityLevel === level.id && <Check className="w-5 h-5 ml-auto" />}
                        </li>
                    ))}
                </ul>
            </div>

             {/* AUDIO SELECTION PANEL (Slides from right) */}
            <div 
                // 🔑 Mobile Fit Improvement: w-full h-full on mobile, fixed width on sm+
                className={`absolute top-0 right-0 w-full h-full sm:w-80 bg-black/90 backdrop-blur-md transition-transform duration-300 ease-in-out z-50 p-4 flex flex-col ${showAudioPanel ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-gray-700 mb-4">
                    {/* Back button in panel: w-5 h-5 (mobile) -> sm:w-6 sm:h-6 (desktop) */}
                    <button onClick={() => setShowAudioPanel(false)} className="text-white p-2 rounded-full hover:bg-white/20 transition">
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <span className="text-white text-lg font-bold">Audio Track</span>
                    <div className="w-8"></div> {/* Placeholder for alignment */}
                </div>
                <ul className="flex-grow overflow-y-auto space-y-1 text-white">
                    {/* Auto Option (Default) */}
                    <li 
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${currentAudioTrackId === -1 ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                        onClick={() => handleAudioTrackChange(-1)}
                    >
                        Default ({getCurrentAudioLabel()})
                        {currentAudioTrackId === -1 && <Check className="w-5 h-5 ml-auto" />}
                    </li>
                    {/* Render specific audio tracks */}
                    {audioTracks.map(track => (
                         <li 
                            key={track.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${currentAudioTrackId === track.id ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                            onClick={() => handleAudioTrackChange(track.id)}
                        >
                            <div className="flex items-center">
                                <Music className="w-4 h-4 mr-2" />
                                <span>{track.name || `Track ${track.id}`}</span>
                                {track.lang && <span className="text-xs text-gray-400 ml-2">({track.lang})</span>}
                            </div>
                            {currentAudioTrackId === track.id && <Check className="w-5 h-5 ml-auto" />}
                        </li>
                    ))}
                    {/* Placeholder for Subtitles/CC options */}
                    <div className="pt-4 border-t border-gray-700 mt-4">
                         <h3 className="text-white font-semibold mb-2">Subtitles / CC (Not Implemented)</h3>
                         <p className="text-gray-400 text-sm">Off</p>
                    </div>
                </ul>
            </div>


        </div>
    );
};

export default VideoPlayer;