/* ===================================================================
   Nightly live telecasts.

   A handful of our titles aren't a library item at all — they're a live
   feed that only exists inside a fixed window every evening. Bigg Boss
   Kannada 13 is the first: it goes out 9:30 PM – 10:30 PM IST, every day.

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

export const LIVE_SHOWS = {
  "bigg-boss-kannada-13": {
    slug: "bigg-boss-kannada-13",
    name: "Bigg Boss Kannada 13",
    language: "Kannada",
    /* The player page we embed. It carries its own signed source/token
       params, so it goes into the overlay as an iframe rather than through
       hls.js — nothing here should try to rewrite or proxy it. */
    streamUrl:
      "https://m3u8-player-ashen.vercel.app/?sid=lvovfjjeoqz4&src=GwxGQEEPV0UNDktOXwFBRAgHWgBDVlFcXUAcDBsAHQwcXldBV1hRX0RKAgIBGgsHAANJG11cXUcLAQgBHRlWUVpRSUQaAhoUHUBeVAEGABwHVl8DRw0&t=MBdeX0BGWCEIAR0ZVlESfTxKQV5DQAJZGw&lg=GwxGQEEPV0URHAcKV1FfVghHCBwAHUZDH1gLGkccBwpXUV9HHQsNFl0RXB9TRgsPHRxcNHtmd2EuRSUmJT1xeHN7Ni8lQD8xZHVmYycmIDk2LGRzenQ2JCwjLDt9fH1nKzUiLj02c3RzajAuRgYeGVVVQRo0JS4gLDB2H1tYGQ0MQQMWVQ",
    startMin: 21 * 60 + 30,          // 9:30 PM IST
    endMin:   22 * 60 + 30,          // 10:30 PM IST
    startLabel: "9:30 PM",
    endLabel:   "10:30 PM",
    /* One episode a night, so the number is derived from the date rather than
       stored: EP02 airs on the night of 2026-09-07 IST, EP03 the next night,
       and so on. Re-anchor these two if the show ever skips a day. */
    season: 13,
    epochDate: "2026-09-07",
    epochEpisode: 2,
  },
};

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

/* Which night's episode is the one in play. Before 10:30 PM that's tonight's —
   whether it has started yet or not — and once tonight's has ended, attention
   moves to tomorrow's. */
const airDayIndex = (show, now) =>
  istDayIndex(now) + (istMinutes(now) >= show.endMin ? 1 : 0);

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
  const live = mins >= show.startMin && mins < show.endMin;
  const minutesUntilStart = live
    ? 0
    : (show.startMin - mins + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const minutesLeft = live ? show.endMin - mins : 0;
  const episode = episodeNumber(show, now);
  const epLabel = episodeLabel(show, now);
  return {
    isLiveShow: true,
    live,
    minutesUntilStart,
    minutesLeft,
    episode,
    episodeLabel: epLabel,
    badge: live ? "LIVE NOW" : `LIVE AT ${show.startLabel}`,
    // The episode rides on the button in both states, so it's clear which
    // night's show is about to start — or is already running.
    cta: live ? `WATCH LIVE · ${epLabel}` : `${epLabel} AT ${show.startLabel}`,
    // e.g. "Live daily 9:30 PM – 10:30 PM IST"
    window: `Live daily ${show.startLabel} – ${show.endLabel} IST`,
    countdown: formatCountdown(minutesUntilStart),
  };
};

export const liveStatusFor = (movieOrSlug, now = new Date()) =>
  liveStatus(getLiveShow(movieOrSlug), now);

/* A shared clock for anything that has to flip itself at 9:30 and again at
   10:30 without the viewer reloading. 20s is fine — the badge only needs to
   be right to within a card's worth of attention. */
export const useLiveClock = (intervalMs = 20000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
