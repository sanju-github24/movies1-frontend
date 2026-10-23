import { useState } from "react";
import { Radio, Play } from "lucide-react";
import LiveViewer from "./LiveViewer";
import { useLiveNow } from "../utils/liveConfig";

/* The lives the admin has on air (Admin → Live now), as a row of cards that
 * play in AnchorHD. Nothing at all when none is running. */
export default function LiveNowRow({ className = "" }) {
  const { events } = useLiveNow();
  const [open, setOpen] = useState(null);
  if (!events.length) return null;

  return (
    <section className={className} aria-label="Live now">
      <h2 className="flex items-center gap-2 px-4 sm:px-8 lg:px-12 mb-3 text-lg sm:text-xl font-black text-white">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
        </span>
        Live now
      </h2>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-8 lg:px-12 pb-2 scrollbar-hide">
        {events.map((ev) => (
          <button key={ev.id} type="button" onClick={() => setOpen(ev)}
            className="group relative shrink-0 w-64 sm:w-80 aspect-video rounded-xl overflow-hidden bg-gray-800 text-left ring-1 ring-white/10 hover:ring-white/30 transition">
            {ev.poster
              ? <img src={ev.poster} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              : <div className="absolute inset-0 bg-gradient-to-br from-red-900/60 to-gray-900" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
              <Radio className="w-3 h-3" /> Live
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black"><Play className="w-5 h-5 ml-0.5" fill="currentColor" /></span>
            </span>
            <div className="absolute bottom-0 inset-x-0 p-3">
              {ev.sport && <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">{ev.sport}</p>}
              <p className="text-sm sm:text-base font-bold text-white line-clamp-2">{ev.title}</p>
            </div>
          </button>
        ))}
      </div>
      <LiveViewer open={!!open} title={open?.title || ""} src={open?.link || ""} poster={open?.poster} onClose={() => setOpen(null)} />
    </section>
  );
}
