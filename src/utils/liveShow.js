/* ===================================================================
   Nightly live telecasts.

   A handful of our titles aren't a library item at all — they're a live
   feed that only exists inside a fixed window every evening. Bigg Boss
   Kannada 13 is the first: it goes out 9:30 PM – 10:40 PM IST on weekdays,
   and from 9:00 PM on Saturdays and Sundays.

   Two rules follow from that, and both live here so the watch page, the
   hero and the trending rows all agree:

     1. It plays on AnchorHD and nothing else. There is no TMDB embed of a
        live Kannada feed, so offering the third-party servers would just
        hand the viewer a list of dead ends.
     2. It is only reachable during the window. Outside it there is nothing
        on the wire, so the cards show the next start time instead of
        opening a player that would sit there black.

   The window is expressed in IST because the telecast is — not in the
   viewer's local zone. IST is a fixed +5:30 with no DST, so the offset is
   arithmetic rather than an Intl round-trip.
=================================================================== */
import { useEffect, useState } from "react";

const IST_OFFSET_MIN = 330;          // Asia/Kolkata, no DST — safe as a constant
const MINUTES_PER_DAY = 1440;
const MS_PER_DAY = 86400000;

/* The shows as coded. LIVE_SHOWS is these with the admin's changes on top
   (utils/liveConfig: switched off, other times, another channel, a new
   show), and is what everything reads. */
export const BASE_LIVE_SHOWS = {
  "bigg-boss-kannada-13": {
    slug: "bigg-boss-kannada-13",
    name: "Bigg Boss Kannada 13",
    language: "Kannada",
    /* What plays while it is on air: the channel it goes out on, from our
       own Live TV list (JioTV's Colors Kannada HD, id 757), in AnchorHD's
       player — the same one the Live TV page opens. Written as the link the
       live pages pass, ?tab=&id=; LiveViewer resolves it at play time, so
       the channel's token is always fresh. */
    channelLink: "https://m3u8-player-orcin.vercel.app/?tab=live&id=757",
    channelName: "Colors Kannada HD",
    /* When it is on, in IST minutes after midnight: later on weekdays,
       earlier at the weekend. */
    weekday: { startMin: 21 * 60 + 30, endMin: 22 * 60 + 40, startLabel: "9:30 PM", endLabel: "10:40 PM" },
    weekend: { startMin: 21 * 60,      endMin: 22 * 60 + 40, startLabel: "9:00 PM", endLabel: "10:40 PM" },
    /* One episode a night, so the number is derived from the date rather than
       stored: EP02 airs on the night of 2026-09-07 IST, EP03 the next night,
       and so on. Re-anchor these two if the show ever skips a day. */
    season: 13,
    epochDate: "2026-09-07",
    epochEpisode: 2,
  },
};
export const LIVE_SHOWS = JSON.parse(JSON.stringify(BASE_LIVE_SHOWS));

/* Accepts a slug or any movie-ish object, so callers don't have to unwrap. */
export const getLiveShow = (movieOrSlug) => {
  const slug = typeof movieOrSlug === "string"
    ? movieOrSlug
    : (movieOrSlug?.slug || movieOrSlug?.id || "");
  return LIVE_SHOWS[slug] || null;
};

export const isLiveShow = (movieOrSlug) => !!getLiveShow(movieOrSlug);

const istMinutes = (now) =>
  (now.getUTCHours() * 60 + now.getUTCMinutes() + IST_OFFSET_MIN) % MINUTES_PER_DAY;

/* Whole days since the Unix epoch, counted in IST — the frame the telecast
   lives in. Comparing two of these gives a calendar-day difference that no
   month or year boundary can trip up. */
const istDayIndex = (now) => Math.floor((now.getTime() + IST_OFFSET_MIN * 60000) / MS_PER_DAY);
const dayIndexOfDate = (isoDate) => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / MS_PER_DAY);

/* The window for a given IST day (days since the epoch): Saturday and Sunday
   have their own. 1970-01-01 was a Thursday, so day 0 is weekday 4. */
const isWeekend = (dayIdx) => { const wd = (dayIdx + 4) % 7; return wd === 0 || wd === 6; };
export const windowFor = (show, dayIdx) => (isWeekend(dayIdx) ? show.weekend : show.weekday) || show.weekday;

/* Which night's episode is the one in play. Before tonight's end that's
   tonight's — whether it has started yet or not — and once tonight's has
   ended, attention moves to tomorrow's. */
const airDayIndex = (show, now) =>
  istDayIndex(now) + (istMinutes(now) >= windowFor(show, istDayIndex(now)).endMin ? 1 : 0);

export const episodeNumber = (show, now = new Date()) => {
  if (!show?.epochDate) return null;
  const n = show.epochEpisode + (airDayIndex(show, now) - dayIndexOfDate(show.epochDate));
  return Math.max(1, n);
};

export const episodeLabel = (show, now = new Date()) => {
  const ep = episodeNumber(show, now);
  return ep == null ? "" : `S${show.season} EP${String(ep).padStart(2, "0")}`;
};

const formatCountdown = (mins) => {
  if (mins <= 0) return "now";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

/* The single source of truth for "can this be watched right now". */
export const liveStatus = (show, now = new Date()) => {
  if (!show) return { isLiveShow: false, live: false };
  const mins = istMinutes(now);
  const day = istDayIndex(now);
  const today = windowFor(show, day);
  const live = mins >= today.startMin && mins < today.endMin;
  // The next start: tonight's if it is still ahead, else tomorrow's — which
  // may be at another time (Friday night → Saturday's 9:00 PM).
  const next = live || mins < today.startMin ? today : windowFor(show, day + 1);
  const minutesUntilStart = live ? 0
    : mins < today.startMin ? today.startMin - mins
    : MINUTES_PER_DAY - mins + next.startMin;
  const minutesLeft = live ? today.endMin - mins : 0;
  const episode = episodeNumber(show, now);
  const epLabel = episodeLabel(show, now);
  return {
    isLiveShow: true,
    live,
    minutesUntilStart,
    minutesLeft,
    episode,
    episodeLabel: epLabel,
    nextStartLabel: next.startLabel,     // tonight's, or tomorrow's once tonight's is over
    badge: live ? "LIVE NOW" : `LIVE AT ${next.startLabel}`,
    // The episode rides on the button in both states, so it's clear which
    // night's show is about to start — or is already running.
    cta: live ? `WATCH LIVE · ${epLabel}` : `${epLabel} AT ${next.startLabel}`,
    // e.g. "Live 9:30 PM – 10:40 PM IST · Sat–Sun from 9:00 PM"
    window: show.weekend && show.weekend.startLabel !== show.weekday.startLabel
      ? `Live ${show.weekday.startLabel} – ${show.weekday.endLabel} IST · Sat–Sun from ${show.weekend.startLabel}`
      : `Live daily ${show.weekday.startLabel} – ${show.weekday.endLabel} IST`,
    countdown: formatCountdown(minutesUntilStart),
  };
};

export const liveStatusFor = (movieOrSlug, now = new Date()) =>
  liveStatus(getLiveShow(movieOrSlug), now);

/* "Is this on the wire RIGHT NOW", as against isLiveShow's "does this title ever
   go out live". The distinction matters on the watch page: outside the window
   the title is an ordinary one with episodes and downloads, and treating it as
   live all day long hid those behind a player with nothing to play. */
export const isLiveNow = (movieOrSlug, now = new Date()) =>
  liveStatusFor(movieOrSlug, now).live === true;

/* A shared clock for anything that has to flip itself on and off air
   without the viewer reloading. 20s is fine — the badge only needs to
   be right to within a card's worth of attention. */
export const useLiveClock = (intervalMs = 20000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    // The admin's schedule arriving changes what is live, as the clock does.
    const onConfig = () => setNow(new Date());
    window.addEventListener("anchor-live-config", onConfig);
    return () => { clearInterval(id); window.removeEventListener("anchor-live-config", onConfig); };
  }, [intervalMs]);
  return now;
};
