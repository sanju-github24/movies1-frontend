/* Our own visitor tracking — what Admin → Analytics reads (backend
   routes/analyticsRoutes.js).

   A visitor id (vid) stays in the browser, so a returning visitor is known; a
   visit id (sid) is per tab, and a new one starts after 30 minutes away. Each
   page sends a view (its path and title), then a heartbeat every 30 s while
   the tab is visible — that is what "online now" counts — and a leave when it
   closes. The heartbeat carries how long the page was actually in view.
   Admin pages are not counted. Nothing here may ever break the site, so every
   step swallows its errors. */
import { liveBackend } from "./api";
import { supabase } from "./supabaseClient";

const VID_KEY = "anc_vid";
const SID_KEY = "anc_sid";
const LAST_KEY = "anc_last";
const ADMIN_KEY = "anc_admin";
const ADMIN_EMAILS = ["sanjusanjay0444@gmail.com"];
const IDLE_MS = 30 * 60e3;
const PING_MS = 30e3;

const rid = () => (crypto?.randomUUID ? crypto.randomUUID().replace(/-/g, "") : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`);
const store = (s) => { try { return s(); } catch { return null; } };

let vid = "", newVisitor = false, sid = "", email = "";
/* The admin is never counted: not as online, not in any number. A browser
   that has opened an admin page is marked for good (markAdmin), and a
   signed-in admin email is caught too — even browsing the site logged out
   of the admin pages. */
let isAdmin = store(() => localStorage.getItem(ADMIN_KEY) === "1") || false;
let visibleSince = 0, banked = 0, started = false, lastPath = "";

function ids() {
  vid = store(() => localStorage.getItem(VID_KEY)) || "";
  if (!vid) { vid = rid(); newVisitor = true; store(() => localStorage.setItem(VID_KEY, vid)); }
  const last = Number(store(() => sessionStorage.getItem(LAST_KEY))) || 0;
  sid = store(() => sessionStorage.getItem(SID_KEY)) || "";
  if (!sid || Date.now() - last > IDLE_MS) { sid = rid(); store(() => sessionStorage.setItem(SID_KEY, sid)); }
}
const touch = () => store(() => sessionStorage.setItem(LAST_KEY, String(Date.now())));

/* Seconds the page has been in view since the last report. */
function takeActive() {
  const now = Date.now();
  let ms = banked;
  if (visibleSince) { ms += now - visibleSince; visibleSince = document.visibilityState === "visible" ? now : 0; }
  banked = 0;
  return Math.round(ms / 1000);
}

function send(body, beacon = false) {
  if (isAdmin && body.t !== "forget") return;
  const base = liveBackend();
  if (!base) return;
  const url = `${base}/api/analytics/collect`;
  const data = JSON.stringify({ ...body, sid, vid });
  try {
    if (beacon && navigator.sendBeacon && navigator.sendBeacon(url, new Blob([data], { type: "text/plain" }))) return;
    fetch(url, { method: "POST", body: data, headers: { "Content-Type": "text/plain" }, keepalive: true, credentials: "omit" }).catch(() => {});
  } catch { /* offline, blocked — not our problem */ }
}

const current = () => ({ path: `${location.pathname}${location.search}`.slice(0, 300), title: document.title || "" });
const counted = (path) => !/^\/admin(\/|$)/.test(path);

function utm() {
  const q = new URLSearchParams(location.search);
  const u = { source: q.get("utm_source") || "", medium: q.get("utm_medium") || "", campaign: q.get("utm_campaign") || "" };
  return u.source || u.medium || u.campaign ? u : undefined;
}

function start() {
  if (started) return;
  started = true;
  ids();
  visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
  supabase?.auth?.getSession?.().then(({ data }) => {
    email = data?.session?.user?.email || "";
    if (ADMIN_EMAILS.includes(email.toLowerCase())) markAdmin();
  }).catch(() => {});

  setInterval(() => {
    if (document.visibilityState !== "visible" || !counted(location.pathname)) return;
    touch();
    send({ t: "ping", d: takeActive(), ...current() });
  }, PING_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // Back after a long time away is a new visit, counted from this page.
      const last = Number(store(() => sessionStorage.getItem(LAST_KEY))) || 0;
      if (Date.now() - last > IDLE_MS) { ids(); lastPath = ""; trackPage(); }
      visibleSince = Date.now();
      touch();
    } else if (visibleSince) {
      banked += Date.now() - visibleSince;
      visibleSince = 0;
    }
  });
  addEventListener("pagehide", () => {
    flushWatch(true);
    if (counted(location.pathname)) send({ t: "leave", d: takeActive() }, true);
  });
}

/** This browser is the admin's: stop counting it, and have the backend forget
    every visit it already sent. */
export function markAdmin() {
  try {
    store(() => localStorage.setItem(ADMIN_KEY, "1"));
    if (isAdmin && store(() => localStorage.getItem(ADMIN_KEY + "_forgot")) === "1") return;
    isAdmin = true;
    if (pending) { clearTimeout(pending.timer); pending = null; }
    if (!vid) ids();
    send({ t: "forget" });
    store(() => localStorage.setItem(ADMIN_KEY + "_forgot", "1"));
  } catch { /* never break the page */ }
}

/** Call on every route change. The title is read a moment later, once the page has set it. */
let pending = null;   // a view waiting for its title: { path, payload, timer }
function flush(title) {
  if (!pending) return;
  clearTimeout(pending.timer);
  send({ ...pending.payload, path: pending.path, title });
  pending = null;
}
export function trackPage() {
  try {
    start();
    const path = `${location.pathname}${location.search}`.slice(0, 300);
    if (!counted(location.pathname) || path === lastPath) return;
    // Left before its title came: still a view, sent now, title unknown.
    flush("");
    const first = !lastPath;
    lastPath = path;
    touch();
    const payload = {
      t: "view", d: takeActive(), nv: newVisitor,
      ref: first ? document.referrer : "",
      sw: screen?.width, sh: screen?.height,
      lang: navigator.language || "",
      utm: first ? utm() : undefined,
      u: email || undefined,
    };
    newVisitor = false;
    pending = { path, payload, timer: setTimeout(() => flush(document.title || ""), 1200) };
  } catch { /* never break the page */ }
}

/* ── Watch time in AnchorHD ──────────────────────────────────────────────
   The player reports its position several times a second (the same calls
   that keep Continue Watching). Only small forward steps count as watching:
   paused, nothing arrives; a seek is one big jump and is skipped. The seconds
   go out every 30 s, when the title or episode changes, and when the page
   closes. meta = { slug, title, type, season, episode, epTitle, tmdbId, poster, source }. */
const WATCH_EVERY_MS = 30e3;
let watch = null;   // { key, meta, sec, pos, dur, lastT, lastSent }

export function flushWatch(beacon = false) {
  try {
    if (!watch || watch.sec < 1) return;
    send({ t: "watch", ...watch.meta, sec: Math.round(watch.sec), pos: Math.round(watch.pos), dur: Math.round(watch.dur || 0), u: email || undefined }, beacon);
    watch.sec = 0;
    watch.lastSent = Date.now();
  } catch { /* never break playback */ }
}

export function watchTick(meta, time, duration) {
  try {
    if (isAdmin || !meta?.slug || !(time >= 0)) return;
    start();
    const key = `${meta.slug}|${meta.season || ""}|${meta.episode || ""}`;
    if (!watch || watch.key !== key) {
      flushWatch();
      watch = { key, meta, sec: 0, pos: time, dur: duration || 0, lastT: time, lastSent: Date.now() };
      return;
    }
    const step = time - watch.lastT;
    watch.lastT = time;
    if (step > 0 && step <= 3) watch.sec += step;
    watch.pos = time;
    if (duration > 0) watch.dur = duration;
    watch.meta = meta;
    if (Date.now() - watch.lastSent >= WATCH_EVERY_MS) flushWatch();
  } catch { /* never break playback */ }
}
