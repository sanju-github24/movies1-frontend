import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Users, Eye, Clock, LogOut, UserPlus, Globe2, MapPin, Smartphone, Monitor, Tablet, Tv,
  Chrome, Link2, Megaphone, FileText, DoorOpen, Languages, Maximize, RefreshCw, Search, ChevronDown,
  ExternalLink, Loader2, Radio, PlayCircle, Film,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { supabase } from "../utils/supabaseClient";
import { backendUrl } from "../utils/api";

/* Admin → Analytics.
 *
 * Our own tracking (utils/analytics.js → backend routes/analyticsRoutes.js):
 * who is on the site right now and on which page, visitors per day, and
 * where they come from — country, city, device, browser, the link that
 * brought them — with every visit's trail of pages. "Online" refreshes every
 * 10 s, the rest every minute. Days are IST. */

const SITE = "https://www.1anchormovies.buzz";

async function authHeaders() {
  const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
  const token = data?.session?.access_token || (() => { try { return localStorage.getItem("token") || ""; } catch { return ""; } })();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function api(path) {
  const r = await fetch(`${backendUrl}/api/analytics${path}`, { headers: await authHeaders() });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `Failed (${r.status})`);
  return d;
}

// ---------- formatting ----------
const n = (x) => Number(x || 0).toLocaleString("en-IN");
const flag = (cc) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐");
const dur = (s) => {
  s = Math.max(0, Math.round(s || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const ago = (t) => {
  const s = Math.round((Date.now() - new Date(t).getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const istTime = (t) => new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const istClock = (t) => new Date(t).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", second: "2-digit" });
const change = (a, b) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);
const place = (v) => [v.city, v.region && v.region !== v.city ? v.region : "", v.country].filter(Boolean).join(", ") || "Unknown";
const DeviceIcon = ({ type, size = 15, className = "" }) => {
  const I = type === "Mobile" ? Smartphone : type === "Tablet" ? Tablet : type === "TV" ? Tv : Monitor;
  return <I size={size} className={className} />;
};
const deviceText = (v) => [v.vendor && v.model ? `${v.vendor} ${v.model}` : v.model || v.deviceType, `${v.browser}${v.browserVer ? ` ${v.browserVer}` : ""}`, `${v.os}${v.osVer ? ` ${v.osVer}` : ""}`].filter(Boolean).join(" · ");
const source = (v) => v.utmSource ? `${v.utmSource}${v.utmMedium ? ` / ${v.utmMedium}` : ""}` : v.refDomain || "Direct";

const epLabel = (w) => (w?.season && w?.episode ? `S${w.season} E${w.episode}` : "");
const hours = (s) => {
  s = Math.round(s || 0);
  if (s < 3600) return dur(s);
  const h = s / 3600;
  return `${h >= 100 ? Math.round(h).toLocaleString("en-IN") : h.toFixed(1)} h`;
};
const pct = (w) => (w?.duration > 0 ? Math.min(100, Math.round((w.maxPos / w.duration) * 100)) : null);

/* How far into a title someone got: a bar and the percent. */
const Progress = ({ w }) => {
  const p = pct(w);
  if (p == null) return <span className="text-xs text-gray-500">—</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-800"><span className={`block h-full ${p >= 90 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${p}%` }} /></span>
      <span className="w-9 text-right tabular-nums text-xs text-gray-400">{p}%</span>
    </span>
  );
};

// ---------- pieces ----------
const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-800 bg-gray-900/70 ${className}`}>{children}</div>
);
const Title = ({ icon, children, right }) => { const Icon = icon; return (
  <div className="flex items-center gap-2 px-5 pt-4 pb-3">
    {Icon && <Icon size={16} className="text-red-400" />}
    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">{children}</h3>
    <div className="ml-auto">{right}</div>
  </div>
); };

function Kpi({ icon, label, value, sub, delta, accent = "text-white", live }) {
  const Icon = icon;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {live ? <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" /></span> : <Icon size={14} />}
        {label}
      </div>
      <div className={`mt-2 text-3xl font-black tabular-nums ${accent}`}>{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
        {delta != null && <span className={delta >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%</span>}
        <span>{sub}</span>
      </div>
    </Card>
  );
}

/* Visitors and page views per day — an area and a line, with the day under the pointer. */
function DailyChart({ daily }) {
  const [hover, setHover] = useState(null);
  const W = 1000, H = 240, P = 28;
  const max = Math.max(1, ...daily.map((d) => Math.max(d.visitors, d.views)));
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, daily.length - 1);
  const y = (v) => H - P - (v / max) * (H - 2 * P);
  const line = (k) => daily.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[k])}`).join(" ");
  const area = `${line("visitors")} L${x(daily.length - 1)},${H - P} L${x(0)},${H - P} Z`;
  const h = hover != null ? daily[hover] : null;
  return (
    <div className="relative px-3 pb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56" preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round((((e.clientX - r.left) / r.width) * W - P) / ((W - 2 * P) / Math.max(1, daily.length - 1)));
          setHover(Math.max(0, Math.min(daily.length - 1, i)));
        }}>
        <defs><linearGradient id="va" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ef4444" stopOpacity=".45" /><stop offset="1" stopColor="#ef4444" stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={P} x2={W - P} y1={y(max * f)} y2={y(max * f)} stroke="#1f2937" strokeDasharray="4 6" />)}
        <path d={area} fill="url(#va)" />
        <path d={line("visitors")} fill="none" stroke="#ef4444" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <path d={line("views")} fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P} y2={H - P} stroke="#6b7280" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="flex justify-between px-4 text-[10px] text-gray-500">
        {daily.filter((_, i) => i % Math.ceil(daily.length / 8) === 0 || i === daily.length - 1).map((d) => <span key={d.day}>{d.day.slice(5)}</span>)}
      </div>
      {h && (
        <div className="pointer-events-none absolute top-2 right-5 rounded-xl border border-gray-700 bg-gray-950/95 px-3 py-2 text-xs shadow-xl">
          <div className="font-bold text-gray-200">{new Date(`${h.day}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</div>
          <div className="text-red-400">{n(h.visitors)} visitors · {n(h.newVisitors)} new</div>
          <div className="text-blue-400">{n(h.views)} page views · {n(h.sessions)} visits</div>
        </div>
      )}
    </div>
  );
}

const Bars = ({ values, labels, color = "bg-red-500", height = "h-28", title }) => {
  const max = Math.max(1, ...values);
  return (
    <div className="px-5 pb-4">
      <div className={`flex items-end gap-[3px] ${height}`}>
        {values.map((v, i) => (
          <div key={i} className="group relative flex-1 h-full flex items-end">
            <div className={`w-full rounded-t ${color} opacity-80 group-hover:opacity-100 transition`} style={{ height: `${Math.max(v ? 4 : 1, (v / max) * 100)}%` }} />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-950 px-1.5 py-0.5 text-[10px] text-gray-200 opacity-0 group-hover:opacity-100">{title ? title(i, v) : v}</span>
          </div>
        ))}
      </div>
      {labels && <div className="mt-1 flex justify-between text-[10px] text-gray-500">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>}
    </div>
  );
};

/* A ranked list with a share bar behind each row. */
function Ranked({ rows, label, value = (r) => r.visitors, render, empty = "No data yet", link }) {
  const total = rows.reduce((a, r) => a + value(r), 0) || 1;
  if (!rows.length) return <p className="px-5 pb-5 text-sm text-gray-500">{empty}</p>;
  return (
    <ul className="px-3 pb-3 space-y-1">
      {rows.map((r, i) => {
        const v = value(r);
        const href = link?.(r);
        const inner = (
          <>
            <span className="absolute inset-y-0 left-0 rounded-lg bg-red-500/10" style={{ width: `${(v / total) * 100}%` }} />
            <span className="relative min-w-0 flex-1 truncate">{render ? render(r) : label(r)}</span>
            <span className="relative tabular-nums font-bold text-gray-200">{n(v)}</span>
            <span className="relative w-11 text-right tabular-nums text-xs text-gray-500">{Math.round((v / total) * 100)}%</span>
          </>
        );
        return (
          <li key={i}>
            {href
              ? <a href={href} target="_blank" rel="noreferrer" className="relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-gray-300 hover:bg-gray-800/70">{inner}</a>
              : <div className="relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-gray-300">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/* Every page of one visit, in order, with when it was opened. */
function Trail({ pages = [] }) {
  if (!pages.length) return <p className="text-xs text-gray-500">No pages recorded.</p>;
  return (
    <ol className="relative ml-2 border-l border-gray-700 space-y-2">
      {pages.map((p, i) => (
        <li key={i} className="ml-4">
          <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${i === pages.length - 1 ? "bg-red-500" : "bg-gray-600"}`} />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <a href={`${SITE}${p.p}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-300 hover:underline break-all">{p.p}</a>
            <span className="text-xs text-gray-400 truncate max-w-[22rem]">{p.t}</span>
            <span className="text-[10px] text-gray-500 ml-auto">{istClock(p.at)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function VisitDetails({ v }) {
  const facts = [
    ["Location", `${flag(v.countryCode)} ${place(v)}`],
    ["Time zone", v.tz || "—"],
    ["IP address", v.ip || "—"],
    ["Device", v.vendor || v.model ? `${v.vendor} ${v.model}`.trim() : v.deviceType],
    ["Browser", `${v.browser} ${v.browserVer || ""}`],
    ["OS", `${v.os} ${v.osVer || ""}`],
    ["Screen", v.screen || "—"],
    ["Language", v.lang || "—"],
    ["Came from", v.ref ? v.ref : "Direct / none"],
    ["Campaign", v.utmSource ? [v.utmSource, v.utmMedium, v.utmCampaign].filter(Boolean).join(" / ") : "—"],
    ["Signed in as", v.user || "Guest"],
    ["Visitor", v.newVisitor ? "New" : "Returning"],
    ["Started", istTime(v.startedAt)],
    ["Last seen", `${istClock(v.lastSeen)} (${ago(v.lastSeen)})`],
    ["Time on site", `${dur((new Date(v.lastSeen) - new Date(v.startedAt)) / 1000)} · ${dur(v.activeSec)} in view`],
    ["Pages", n(v.pageCount)],
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] bg-gray-950/60 px-5 py-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        {facts.map(([k, val]) => (
          <React.Fragment key={k}>
            <dt className="text-gray-500">{k}</dt>
            <dd className="text-gray-200 break-all">{val}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div className="space-y-4">
        {!!v.watched?.length && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Watched in AnchorHD</p>
            <ul className="space-y-1.5">
              {v.watched.map((w, i) => (
                <li key={i} className="flex items-center gap-3 text-xs">
                  <PlayCircle size={14} className="shrink-0 text-green-400" />
                  <a href={`${SITE}/watch/${w.slug}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-gray-200 hover:underline">
                    {w.title}{epLabel(w) ? <span className="text-gray-500"> · {epLabel(w)}</span> : null}
                  </a>
                  <span className="tabular-nums text-gray-300">{dur(w.seconds)}</span>
                  <Progress w={w} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Pages visited</p>
          <Trail pages={v.pages} />
        </div>
      </div>
    </div>
  );
}

/* A visit as a row: where, on what, from where, which page, how long; opens to every detail. */
function VisitRow({ v, live }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr onClick={() => setOpen((o) => !o)} className="cursor-pointer border-t border-gray-800 hover:bg-gray-800/40">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{flag(v.countryCode)}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-200">{v.city || v.country || "Unknown"}</div>
              <div className="truncate text-[11px] text-gray-500">{[v.region, v.country].filter(Boolean).join(", ")}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <DeviceIcon type={v.deviceType} className="text-gray-400 shrink-0" />
            <span className="truncate max-w-[16rem]">{deviceText(v)}</span>
          </div>
        </td>
        <td className="px-4 py-3 max-w-[18rem]">
          {v.playing ? (
            <>
              <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-green-400"><PlayCircle size={14} className="shrink-0" /> <span className="truncate">{v.playing.title}{epLabel(v.playing) ? ` · ${epLabel(v.playing)}` : ""}</span></div>
              <div className="truncate text-[11px] text-gray-500">watching · {dur(v.playing.seconds)} so far{pct(v.playing) != null ? ` · at ${pct(v.playing)}%` : ""}</div>
            </>
          ) : (
            <>
              <div className="truncate font-mono text-xs text-blue-300">{v.currentPath}</div>
              <div className="truncate text-[11px] text-gray-500">{v.currentTitle}</div>
            </>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{source(v)}</td>
        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap tabular-nums">
          {dur((new Date(v.lastSeen) - new Date(v.startedAt)) / 1000)}
          <div className="text-[11px] text-gray-500">{n(v.pageCount)} page{v.pageCount === 1 ? "" : "s"}</div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
          {live ? <span className="text-green-400">● {ago(v.lastSeen)}</span> : istTime(v.startedAt)}
          <ChevronDown size={14} className={`ml-2 inline transition-transform ${open ? "rotate-180" : ""}`} />
        </td>
      </tr>
      {open && <tr><td colSpan={6} className="p-0"><VisitDetails v={v} /></td></tr>}
    </>
  );
}

const VisitTable = ({ visits, live, empty }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[900px] text-left">
      <thead>
        <tr className="text-[11px] uppercase tracking-wider text-gray-500">
          <th className="px-4 py-2 font-semibold">Location</th>
          <th className="px-4 py-2 font-semibold">Device</th>
          <th className="px-4 py-2 font-semibold">{live ? "Viewing now" : "Last page"}</th>
          <th className="px-4 py-2 font-semibold">Source</th>
          <th className="px-4 py-2 font-semibold">Time on site</th>
          <th className="px-4 py-2 font-semibold">{live ? "Active" : "Started (IST)"}</th>
        </tr>
      </thead>
      <tbody>
        {visits.map((v) => <VisitRow key={v.sid} v={v} live={live} />)}
        {!visits.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">{empty}</td></tr>}
      </tbody>
    </table>
  </div>
);

const RANGES = [[1, "Today"], [7, "7 days"], [30, "30 days"], [90, "90 days"]];

/* One title opened: each episode (a series), and who watched it, where, on what. */
function TitleDetail({ slug, days }) {
  const [d, setD] = useState(null);
  useEffect(() => { api(`/watch/title?${new URLSearchParams({ slug, days: String(days) })}`).then(setD).catch(() => setD({ episodes: [], recent: [] })); }, [slug, days]);
  if (!d) return <div className="flex items-center gap-2 px-5 py-4 text-sm text-gray-400"><Loader2 size={15} className="animate-spin" /> Loading…</div>;
  const eps = d.episodes.filter((e) => e.season && e.episode);
  return (
    <div className="grid gap-5 bg-gray-950/60 px-5 py-4 lg:grid-cols-2">
      {eps.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">By episode</p>
          <table className="w-full text-left text-xs">
            <thead><tr className="text-gray-500"><th className="py-1 font-semibold">Episode</th><th className="py-1 font-semibold text-right">Viewers</th><th className="py-1 font-semibold text-right">Watch time</th><th className="py-1 font-semibold text-right">Finished</th></tr></thead>
            <tbody>
              {eps.map((e) => (
                <tr key={`${e.season}-${e.episode}`} className="border-t border-gray-800">
                  <td className="py-1.5 pr-2 text-gray-200"><b>{epLabel(e)}</b> <span className="text-gray-500">{e.epTitle}</span></td>
                  <td className="py-1.5 text-right tabular-nums text-gray-200">{n(e.viewers)}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-300">{hours(e.seconds)}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-400">{e.completion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={eps.length ? "" : "lg:col-span-2"}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Who watched (latest {d.recent.length})</p>
        <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {d.recent.map((w, i) => (
            <li key={i} className="flex items-center gap-3 text-xs">
              <span className="text-base leading-none">{flag(w.visit?.countryCode)}</span>
              <span className="w-32 truncate text-gray-200">{w.visit?.city || w.visit?.country || "Unknown"}</span>
              <DeviceIcon type={w.visit?.deviceType} size={13} className="shrink-0 text-gray-500" />
              <span className="min-w-0 flex-1 truncate text-gray-400">{w.visit ? deviceText(w.visit) : ""}{w.visit?.user ? ` · ${w.visit.user}` : ""}</span>
              {epLabel(w) && <span className="text-gray-500">{epLabel(w)}</span>}
              <span className="w-16 text-right tabular-nums text-gray-200">{dur(w.seconds)}</span>
              <Progress w={w} />
              <span className="w-16 text-right text-gray-500">{ago(w.lastAt)}</span>
            </li>
          ))}
          {!d.recent.length && <li className="text-xs text-gray-500">Nobody yet.</li>}
        </ul>
      </div>
    </div>
  );
}

/* Watch time in AnchorHD: how long titles actually played, and which titles. */
function WatchSection({ days, watchingNow }) {
  const [w, setW] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => api(`/watch?days=${days}`).then(setW).catch(() => {}), [days]);
  useEffect(() => { load(); const t = setInterval(load, 60e3); return () => clearInterval(t); }, [load]);
  const t = w?.totals;
  return (
    <Card>
      <Title icon={Film} right={<span className="text-xs text-gray-500">seconds actually played · pauses &amp; skips not counted</span>}>Watch time in AnchorHD</Title>
      <div className="grid grid-cols-2 gap-3 px-5 pb-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Watching now", n(watchingNow ?? w?.watchingNow), "text-green-400"],
          ["Watched today", hours(w?.today?.seconds)],
          [`Watch time · ${days === 1 ? "today" : `${days}d`}`, hours(t?.seconds)],
          ["Viewers", n(t?.viewers)],
          ["Plays", n(t?.plays)],
          ["Avg per viewer", dur(t?.viewers ? t.seconds / t.viewers : 0)],
        ].map(([k, v, c]) => (
          <div key={k}><div className="text-[11px] uppercase tracking-wider text-gray-500">{k}</div><div className={`text-xl font-black tabular-nums ${c || ""}`}>{v}</div></div>
        ))}
      </div>
      {days > 1 && w && (
        <Bars values={w.daily.map((d) => Math.round(d.seconds / 60))} color="bg-blue-500" height="h-20"
          labels={[w.daily[0]?.day.slice(5), w.daily[w.daily.length - 1]?.day.slice(5)]}
          title={(i, v) => `${w.daily[i].day.slice(5)} · ${hours(v * 60)} · ${n(w.daily[i].viewers)} viewers`} />
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2 font-semibold">#</th>
              <th className="px-4 py-2 font-semibold">Title</th>
              <th className="px-4 py-2 font-semibold text-right">Viewers</th>
              <th className="px-4 py-2 font-semibold text-right">Plays</th>
              <th className="px-4 py-2 font-semibold text-right">Watch time</th>
              <th className="px-4 py-2 font-semibold text-right">Avg / viewer</th>
              <th className="px-4 py-2 font-semibold text-right">Finished</th>
              <th className="px-4 py-2 font-semibold">Last watched</th>
            </tr>
          </thead>
          <tbody>
            {(w?.titles || []).map((x, i) => (
              <React.Fragment key={x.slug}>
                <tr onClick={() => setOpen(open === x.slug ? null : x.slug)} className="cursor-pointer border-t border-gray-800 hover:bg-gray-800/40">
                  <td className="px-4 py-2.5 text-sm tabular-nums text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {x.poster ? <img src={x.poster} alt="" loading="lazy" className="h-12 w-8 shrink-0 rounded object-cover" /> : <span className="h-12 w-8 shrink-0 rounded bg-gray-800" />}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-100">{x.title || x.slug}</div>
                        <div className="truncate text-[11px] text-gray-500">{x.contentType === "tv" ? `Series · ${n(x.episodes)} episode${x.episodes === 1 ? "" : "s"} watched` : "Movie"} · /watch/{x.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-gray-100">{n(x.viewers)}</td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-gray-300">{n(x.plays)}</td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-gray-300">{hours(x.seconds)}</td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-gray-300">{dur(x.avgPerViewer)}</td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-gray-400">{x.completion}%</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{ago(x.lastAt)} <ChevronDown size={14} className={`ml-1 inline transition-transform ${open === x.slug ? "rotate-180" : ""}`} /></td>
                </tr>
                {open === x.slug && <tr><td colSpan={8} className="p-0"><TitleDetail slug={x.slug} days={days} /></td></tr>}
              </React.Fragment>
            ))}
            {w && !w.titles.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">Nothing watched in AnchorHD yet in this range.</td></tr>}
            {!w && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500"><Loader2 className="inline animate-spin" /></td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(7);
  const [sum, setSum] = useState(null);
  const [live, setLive] = useState(null);
  const [error, setError] = useState("");
  const [visits, setVisits] = useState([]);
  const [next, setNext] = useState(null);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [device, setDevice] = useState("");
  const [tab, setTab] = useState("pages");

  const loadSummary = useCallback(() => api(`/summary?days=${days}`).then((d) => { setSum(d); setError(""); }).catch((e) => setError(e.message)), [days]);
  const loadLive = useCallback(() => api("/live").then(setLive).catch(() => {}), []);
  const loadVisits = useCallback((more = false) => {
    setLoadingVisits(true);
    const qs = new URLSearchParams({ limit: "40", ...(q ? { q } : {}), ...(country ? { country } : {}), ...(device ? { device } : {}), ...(more && next ? { before: next } : {}) });
    return api(`/sessions?${qs}`)
      .then((d) => { setVisits((v) => (more ? [...v, ...d.visits] : d.visits)); setNext(d.next); })
      .catch(() => {})
      .finally(() => setLoadingVisits(false));
  }, [q, country, device, next]);

  useEffect(() => { loadSummary(); const t = setInterval(loadSummary, 60e3); return () => clearInterval(t); }, [loadSummary]);
  useEffect(() => { loadLive(); const t = setInterval(loadLive, 10e3); return () => clearInterval(t); }, [loadLive]);
  useEffect(() => { const t = setTimeout(() => loadVisits(false), 300); return () => clearTimeout(t); }, [q, country, device]);   // eslint-disable-line react-hooks/exhaustive-deps

  // What everyone online is looking at right now, most-watched first.
  const nowViewing = useMemo(() => {
    const m = new Map();
    for (const v of live?.visits || []) {
      const k = v.currentPath || "/";
      m.set(k, { key: k, title: v.currentTitle, visitors: (m.get(k)?.visitors || 0) + 1 });
    }
    return [...m.values()].sort((a, b) => b.visitors - a.visitors).slice(0, 10);
  }, [live]);

  const t = sum?.today, y = sum?.yesterday, r = sum?.range;
  const rangeLabel = RANGES.find(([d]) => d === days)?.[1];
  const hourLabels = ["12a", "", "", "3a", "", "", "6a", "", "", "9a", "", "", "12p", "", "", "3p", "", "", "6p", "", "", "9p", "", ""];

  const breakdowns = {
    pages: { icon: FileText, title: "Top pages", rows: sum?.pages || [], value: (x) => x.views, link: (x) => `${SITE}${x.key}`,
      render: (x) => <span className="flex flex-col"><span className="truncate font-mono text-xs text-blue-300">{x.key}</span><span className="truncate text-[11px] text-gray-500">{x.title}</span></span> },
    entries: { icon: DoorOpen, title: "Landing pages", rows: sum?.entries || [], link: (x) => `${SITE}${x.key}`, render: (x) => <span className="font-mono text-xs text-blue-300">{x.key}</span> },
    referrers: { icon: Link2, title: "Where they came from", rows: sum?.referrers || [], label: (x) => x.key },
    campaigns: { icon: Megaphone, title: "Campaigns (UTM)", rows: sum?.campaigns || [], label: (x) => [x.key.source, x.key.medium, x.key.campaign].filter(Boolean).join(" / "), empty: "No links with utm_source yet — add ?utm_source=reddit to links you share." },
  };
  const bd = breakdowns[tab];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
        {/* header */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black"><Activity className="text-red-500" /> Analytics</h1>
            <p className="text-xs text-gray-500">Our own tracking · IST · {sum ? `updated ${istClock(sum.generatedAt)}` : "loading…"}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-xl border border-gray-800 bg-gray-900 p-1">
              {RANGES.map(([d, l]) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${days === d ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}>{l}</button>
              ))}
            </div>
            <button onClick={() => { loadSummary(); loadLive(); loadVisits(false); }} title="Refresh"
              className="rounded-xl border border-gray-800 bg-gray-900 p-2.5 text-gray-400 hover:text-white"><RefreshCw size={16} /></button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi live label="Online now" value={n(live?.online ?? sum?.online)} sub="on the site right now" accent="text-green-400" />
          <Kpi icon={Users} label="Visitors today" value={n(t?.visitors)} delta={t && change(t.visitors, y?.visitors)} sub="vs yesterday" />
          <Kpi icon={Eye} label="Page views today" value={n(t?.views)} delta={t && change(t.views, y?.views)} sub="vs yesterday" />
          <Kpi icon={Clock} label="Avg time on site" value={dur(t?.avgDuration)} sub="today" />
          <Kpi icon={LogOut} label="Bounce rate" value={`${t?.bounceRate ?? 0}%`} sub="left after one page" />
          <Kpi icon={UserPlus} label="New visitors" value={n(t?.newVisitors)} sub={`of ${n(t?.sessions)} visits today`} />
        </div>

        {/* live */}
        <Card>
          <Title icon={Radio} right={<span className="text-xs text-gray-500">refreshes every 10 s</span>}>Live — last 30 minutes</Title>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div>
              <Bars values={live?.perMinute || Array(30).fill(0)} color="bg-green-500" height="h-24" labels={["30m ago", "20m", "10m", "now"]}
                title={(i, v) => `${v} views · ${29 - i}m ago`} />
            </div>
            <div className="pb-2">
              <p className="px-5 text-xs font-bold uppercase tracking-wider text-gray-400">Watching now</p>
              <Ranked rows={nowViewing} link={(x) => `${SITE}${x.key}`} empty="Nobody online right now"
                render={(x) => <span className="flex flex-col"><span className="truncate font-mono text-xs text-blue-300">{x.key}</span><span className="truncate text-[11px] text-gray-500">{x.title}</span></span>} />
            </div>
          </div>
          <VisitTable visits={live?.visits || []} live empty="Nobody online right now." />
        </Card>

        {/* daily chart */}
        <Card>
          <Title icon={Users} right={
            <span className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-red-500" /> Visitors</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-blue-400" /> Page views</span>
            </span>}>
            {days === 1 ? "Today" : `Daily visitors — ${rangeLabel}`}
          </Title>
          <div className="grid grid-cols-2 gap-3 px-5 pb-2 sm:grid-cols-5">
            {[["Visitors", r?.visitors], ["Visits", r?.sessions], ["Page views", r?.views], ["Avg time", dur(r?.avgDuration)], ["Bounce", `${r?.bounceRate ?? 0}%`]].map(([k, v]) => (
              <div key={k}><div className="text-[11px] uppercase tracking-wider text-gray-500">{k}</div><div className="text-lg font-black tabular-nums">{typeof v === "number" ? n(v) : v ?? "—"}</div></div>
            ))}
          </div>
          {sum ? (days === 1
            ? <Bars values={sum.hours} labels={hourLabels} height="h-48" title={(i, v) => `${v} visits · ${i}:00`} />
            : <DailyChart daily={sum.daily} />)
            : <div className="flex h-56 items-center justify-center text-gray-500"><Loader2 className="animate-spin" /></div>}
        </Card>

        {/* watch time */}
        <WatchSection days={days} watchingNow={live?.watching} />

        {/* where */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <Title icon={Globe2}>Countries</Title>
            <Ranked rows={sum?.countries || []} render={(x) => <span>{flag(x.key?.code)} {x.key?.name || "Unknown"}</span>} />
          </Card>
          <Card>
            <Title icon={MapPin}>Cities</Title>
            <Ranked rows={sum?.cities || []} render={(x) => <span>{flag(x.key?.code)} {x.key?.city}<span className="text-gray-500">{x.key?.region ? `, ${x.key.region}` : ""}</span></span>} />
          </Card>
        </div>

        {/* on what */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <Title icon={Smartphone}>Devices</Title>
            <Ranked rows={sum?.devices || []} render={(x) => <span className="flex items-center gap-2"><DeviceIcon type={x.key} className="text-gray-400" /> {x.key}</span>} />
          </Card>
          <Card><Title icon={Chrome}>Browsers</Title><Ranked rows={sum?.browsers || []} label={(x) => x.key} /></Card>
          <Card><Title icon={Monitor}>Operating systems</Title><Ranked rows={sum?.os || []} label={(x) => x.key} /></Card>
          <Card><Title icon={Smartphone}>Phone models</Title><Ranked rows={sum?.models || []} label={(x) => `${x.key?.vendor || ""} ${x.key?.model || ""}`.trim()} /></Card>
        </div>

        {/* pages & sources */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <Title icon={bd.icon} right={
              <div className="flex rounded-lg border border-gray-800 bg-gray-950 p-0.5">
                {Object.entries(breakdowns).map(([k, b]) => (
                  <button key={k} onClick={() => setTab(k)} className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${tab === k ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}>{b.title.split(" ")[0] === "Where" ? "Sources" : b.title.split(" (")[0].replace("Top ", "").replace(/^\w/, (c) => c.toUpperCase())}</button>
                ))}
              </div>}>{bd.title}</Title>
            <Ranked rows={bd.rows} label={bd.label} render={bd.render} value={bd.value} link={bd.link} empty={bd.empty} />
          </Card>
          <div className="space-y-5">
            <Card>
              <Title icon={Clock}>Busiest hours (IST)</Title>
              <Bars values={sum?.hours || Array(24).fill(0)} labels={["12a", "6a", "12p", "6p", "11p"]} title={(i, v) => `${v} visits · ${i}:00–${i + 1}:00`} />
            </Card>
            <div className="grid grid-cols-2 gap-5">
              <Card><Title icon={Languages}>Languages</Title><Ranked rows={(sum?.languages || []).filter((x) => x.key)} label={(x) => x.key} /></Card>
              <Card><Title icon={Maximize}>Screens</Title><Ranked rows={(sum?.screens || []).filter((x) => x.key)} label={(x) => x.key} /></Card>
            </div>
          </div>
        </div>

        {/* every visit */}
        <Card>
          <Title icon={Eye}>All visits</Title>
          <div className="flex flex-wrap gap-2 px-5 pb-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a URL (/watch/…), city, IP, referrer, email, phone model…"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
            </div>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
              <option value="">All countries</option>
              {(sum?.countries || []).filter((c) => c.key?.code).map((c) => <option key={c.key.code} value={c.key.code}>{flag(c.key.code)} {c.key.name}</option>)}
            </select>
            <select value={device} onChange={(e) => setDevice(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
              <option value="">All devices</option>
              {["Mobile", "Desktop", "Tablet", "TV"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <VisitTable visits={visits} empty={loadingVisits ? "Loading…" : "No visits match."} />
          {next && (
            <div className="flex justify-center p-4">
              <button onClick={() => loadVisits(true)} disabled={loadingVisits}
                className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50">
                {loadingVisits ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} className="rotate-90" />} Load older visits
              </button>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
