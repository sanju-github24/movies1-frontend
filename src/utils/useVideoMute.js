import { useEffect } from "react";

/* Trailers autoplay, and autoplay is only ever allowed silent — so the element
   starts muted and the user's choice is applied to the live element afterwards,
   never through a remount or a reload. That's what makes the mute button pick
   the sound up where the trailer already is instead of starting it over. A
   trailer that mounts while the user has sound on waits for playback to
   actually begin before lifting the mute, or the browser blocks it outright. */
export function useVideoMute(ref, muted, src) {
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (muted) { v.muted = true; return; }
    if (!v.paused && v.readyState >= 2) { v.muted = false; return; }
    const onPlaying = () => { v.muted = false; };
    v.addEventListener("playing", onPlaying, { once: true });
    return () => v.removeEventListener("playing", onPlaying);
  }, [ref, muted, src]);
}
