/* The two buttons a nightly live show needs, shared by the mobile sheet and the
 * desktop overlay so the pair cannot drift apart.
 *
 * Renders nothing for an ordinary title — this is only for shows listed in
 * LIVE_SHOWS (today, Bigg Boss Kannada 13).
 *
 * Why two buttons rather than one that changes meaning: between 9:30 and 10:30
 * a viewer may want either tonight's broadcast or last night's episode, and a
 * single button can only offer one of them. Outside the window the live button
 * still shows, carrying the countdown, because "when is it on" is the question
 * people open the page to answer.
 */
import React from "react";
import { Radio, Play } from "lucide-react";
import { getLiveShow, liveStatus, useLiveClock } from "../utils/liveShow";
import { epNo, seasonNo, airDate, newestEpisode } from "../utils/titleEpisodes";

export default function LiveShowActions({ movie, episodes = [], onWatchLive, onWatchEpisode }) {
  const clock = useLiveClock();
  const show = getLiveShow(movie);
  if (!show) return null;

  const st = liveStatus(show, clock);
  const latest = newestEpisode(episodes);
  const latestDate = latest ? airDate(latest.air_date || latest.airDate) : "";

  /* Tonight's episode airs today, so the date on the live button is simply
     today in IST — the show's own numbering already tells us which episode. */
  const tonight = new Date().toLocaleDateString("en-GB", {
    weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Kolkata",
  });

  return (
    <div className="w-full flex flex-col gap-2.5">
      <button
        onClick={onWatchLive}
        className={`w-full py-3.5 px-4 rounded-lg font-bold text-base flex items-center justify-between gap-3
          active:scale-[0.98] transition-all shadow-lg ${
            st.live
              ? "bg-red-600 text-white"
              : "bg-white/10 text-white border border-white/15"
          }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Radio className={`w-5 h-5 shrink-0 ${st.live ? "animate-pulse" : ""}`} />
          <span className="truncate">{st.live ? "Watch Live" : `Live at ${show.startLabel}`}</span>
        </span>
        <span className="text-[11px] font-semibold opacity-80 text-right shrink-0 leading-tight">
          {show.name}
          <br />
          {st.episodeLabel} · {st.live ? tonight : `in ${st.countdown}`}
        </span>
      </button>

      {latest && (
        <button
          onClick={() => onWatchEpisode?.(latest)}
          className="w-full py-3.5 px-4 rounded-lg font-bold text-base flex items-center justify-between gap-3
                     bg-gray-100 text-black active:scale-[0.98] transition-all shadow-lg"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Play className="w-5 h-5 fill-current shrink-0" />
            <span className="truncate">Watch Latest Episode</span>
          </span>
          <span className="text-[11px] font-semibold text-gray-600 text-right shrink-0 leading-tight">
            S{seasonNo(latest)} EP{String(epNo(latest)).padStart(2, "0")}
            {latestDate && <><br />{latestDate}</>}
          </span>
        </button>
      )}
    </div>
  );
}
