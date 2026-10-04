import React from "react";
import { ListPlus } from "lucide-react";
import { toast } from "react-toastify";
import { useMusicPlayer } from "../context/MusicPlayerContext";

/* "Play next": queues a song to play straight after the one playing, without
   interrupting it. Sits on any song row or card; the click stays its own, so
   the row behind it does not also open or play.

   compact — icon only (cards and rows); otherwise icon and label. */
export default function PlayNextButton({ track, compact = true, className = "", style }) {
  const { playNext, currentTrack } = useMusicPlayer();
  if (!track?.id) return null;

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    playNext(track);
    toast.success(currentTrack ? `“${track.title}” plays next` : `Playing “${track.title}”`,
      { autoClose: 1800, hideProgressBar: true });
  };

  return (
    <button type="button" onClick={onClick} title="Play next" aria-label={`Play ${track.title} next`}
      className={className ||
        `inline-flex items-center justify-center gap-1.5 rounded-full text-white/85 hover:text-white
         bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors focus:outline-none
         focus-visible:ring-2 focus-visible:ring-white ${compact ? "w-8 h-8" : "px-3 py-1.5 text-xs font-semibold"}`}
      style={style}>
      <ListPlus className="w-4 h-4" aria-hidden="true" />
      {!compact && "Play next"}
    </button>
  );
}
