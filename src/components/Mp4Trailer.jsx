import React from "react";
import { useVideoMute } from "../utils/useVideoMute";

/* Shared player for the chrome-free MP4 trailers (the IMDb asset, or Netflix's
   where IMDb has none). A bare <video> with no controls, so nothing of a player
   is ever on screen: no icons, no branding, no end screen. Our own mute button
   is the only thing that touches it. This is what the hero and both detail
   overlays play whenever a trailer resolves; TMDB's YouTube embed is only the
   fallback for the titles neither source has. */

export default function Mp4Trailer({ src, muted, loop = false, onEnd, onStart, className = "w-full h-full object-cover" }) {
  const ref = React.useRef(null);
  /* Stays invisible until it is genuinely playing. Some devices refuse to
     autoplay at all — iOS in Low Power Mode is the common one — and a video
     element that can't start doesn't sit there quietly: Safari draws its own
     play button over it. Hidden until it plays, that never shows, and callers
     keep the artwork up instead (onStart tells them when to drop it). */
  const [live, setLive] = React.useState(false);
  const onStartRef = React.useRef(onStart);
  onStartRef.current = onStart;

  React.useEffect(() => { setLive(false); }, [src]);

  React.useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    v.muted = true;                       // a new trailer always starts silent
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, [src]);

  /* Keep it playing. A trailer is a progressive MP4 off IMDb's CDN, so on a
     phone it can run the buffer dry and sit there paused; browsers also pause
     the element when the tab goes to the background, when the device wakes from
     sleep, and (on iOS) whenever Low Power Mode kicks in. None of those are the
     user asking it to stop — there IS no pause control — so we start it again.

     Only real pauses are acted on: a finished trailer stays finished, a hidden
     tab is left alone until it comes back, and a buffer stall needs nothing
     because the element never actually leaves the playing state. If the browser refuses
     because sound is on, we drop back to muted rather than sit frozen, and the
     retry count stops a refusal from turning into a pause/play loop. */
  React.useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    let tries = 0;

    const resume = () => {
      if (!v.paused || !v.isConnected || v.ended || document.hidden || tries > 20) return;
      tries += 1;
      const p = v.play();
      if (p && p.catch) p.catch(() => {
        if (!v.muted) { v.muted = true; v.play().catch(() => {}); }
      });
    };
    const onVisible = () => { if (!document.hidden) { tries = 0; resume(); } };
    // Playing cleanly again means the next stall gets a fresh set of retries.
    const onPlaying = () => {
      tries = 0;
      setLive(true);
      if (onStartRef.current) onStartRef.current();
    };

    v.addEventListener("pause", resume);
    v.addEventListener("playing", onPlaying);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      v.removeEventListener("pause", resume);
      v.removeEventListener("playing", onPlaying);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [src]);

  useVideoMute(ref, muted, src);

  return (
    <video ref={ref} src={src} autoPlay muted loop={loop} playsInline preload="auto"
      disablePictureInPicture controlsList="nodownload noplaybackrate"
      onEnded={onEnd}
      className={`${className} pointer-events-none transition-opacity duration-700 ${live ? "opacity-100" : "opacity-0"}`} />
  );
}
