import React from "react";
import { useVideoMute } from "../utils/useVideoMute";

/* Shared player for the chrome-free MP4 trailers (the IMDb asset, or Netflix's
   where IMDb has none). A bare <video> with no controls, so nothing of a player
   is ever on screen: no icons, no branding, no end screen. Our own mute button
   is the only thing that touches it. This is what the hero and both detail
   overlays play whenever a trailer resolves; TMDB's YouTube embed is only the
   fallback for the titles neither source has. */

export default function Mp4Trailer({ src, muted, loop = false, onEnd, className = "w-full h-full object-cover" }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    v.muted = true;                       // a new trailer always starts silent
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }, [src]);

  useVideoMute(ref, muted, src);

  return (
    <video ref={ref} src={src} autoPlay muted loop={loop} playsInline preload="auto"
      disablePictureInPicture controlsList="nodownload noplaybackrate"
      onEnded={onEnd} className={`${className} pointer-events-none`} />
  );
}
