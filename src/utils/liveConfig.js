/* What the admin has put on air (/api/live-now), read once per visit.
 *
 *   events — lives added in Admin → Live now, each { id, title, link, poster, sport }
 *   shows  — the nightly shows' overrides: switched off, other times, another
 *            channel, or a new show — applied to LIVE_SHOWS in liveShow.js,
 *            so every card and button that asks "is this live" agrees.
 *
 * Anything listening with useLiveNow re-renders when it arrives; the shows'
 * clock (useLiveClock) is told too. */

import { useEffect, useState } from "react";
import { backendUrl } from "./api";
import { LIVE_SHOWS, BASE_LIVE_SHOWS } from "./liveShow";

const EVENT = "anchor-live-config";
let state = { events: [], shows: {}, loaded: false };
let pending = null;

const toMin = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + m; };
const toLabel = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const span = (x) => (x?.start && x?.end
  ? { startMin: toMin(x.start), endMin: toMin(x.end), startLabel: toLabel(x.start), endLabel: toLabel(x.end) }
  : null);

// The coded shows, with the admin's changes on top.
function applyShows(shows) {
  for (const k of Object.keys(LIVE_SHOWS)) delete LIVE_SHOWS[k];
  Object.assign(LIVE_SHOWS, JSON.parse(JSON.stringify(BASE_LIVE_SHOWS)));
  for (const [slug, o] of Object.entries(shows || {})) {
    const base = LIVE_SHOWS[slug];
    if (o.enabled === false) { delete LIVE_SHOWS[slug]; continue; }
    const weekday = span(o.weekday) || base?.weekday;
    if (!weekday || !(o.channelLink || base?.channelLink)) continue;   // a new show needs both
    LIVE_SHOWS[slug] = {
      ...(base || { slug, name: o.name || slug, language: "" }),
      ...(o.name ? { name: o.name } : {}),
      ...(o.channelLink ? { channelLink: o.channelLink } : {}),
      ...(o.channelName ? { channelName: o.channelName } : {}),
      weekday,
      weekend: span(o.weekend) || (span(o.weekday) ? weekday : base?.weekend) || weekday,
    };
  }
}

export function loadLiveNow(force = false) {
  if (pending && !force) return pending;
  pending = fetch(`${backendUrl}/api/live-now${force ? `?_=${Date.now()}` : ""}`)
    .then((r) => (r.ok ? r.json() : { events: [], shows: {} }))
    .catch(() => ({ events: [], shows: {} }))
    .then((d) => {
      state = { events: d.events || [], shows: d.shows || {}, loaded: true };
      applyShows(state.shows);
      window.dispatchEvent(new Event(EVENT));
      return state;
    });
  return pending;
}

export const liveNowState = () => state;
export const LIVE_CONFIG_EVENT = EVENT;

/** { events, shows, loaded } — loads on first use, refreshes on change. */
export function useLiveNow() {
  const [s, setS] = useState(state);
  useEffect(() => {
    const on = () => setS(state);
    window.addEventListener(EVENT, on);
    loadLiveNow();
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return s;
}
