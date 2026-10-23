import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Radio, Trash2, Plus, Loader2, Tv } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { supabase } from "../utils/supabaseClient";
import { backendUrl } from "../utils/api";
import { loadLiveNow, useLiveNow } from "../utils/liveConfig";
import { BASE_LIVE_SHOWS } from "../utils/liveShow";

/* Admin → Live now.
 *
 * The lives running on the site: each one added here shows on the home and
 * Live pages as LIVE and plays in AnchorHD until it is deleted. And the
 * nightly shows (Bigg Boss Kannada): switched on or off, their times and
 * channel. Saved to /api/live-now; the site reads it on every visit. */

const Input = "w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500";
const Label = "block text-xs font-semibold text-gray-400 mb-1";

async function authHeaders() {
  const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
  const token = data?.session?.access_token || (() => { try { return localStorage.getItem("token") || ""; } catch { return ""; } })();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function call(method, path, body) {
  const r = await fetch(`${backendUrl}/api/live-now${path}`, { method, headers: await authHeaders(), body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `Failed (${r.status})`);
  return d;
}

const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function ShowCard({ slug, base, override }) {
  const pick = (k, sub) => override?.[k]?.[sub] || (base?.[k] ? fromMin(base[k][sub === "start" ? "startMin" : "endMin"]) : "");
  const [f, setF] = useState(() => ({
    enabled: override?.enabled !== false,
    channelName: override?.channelName || base?.channelName || "",
    channelLink: override?.channelLink || base?.channelLink || "",
    wdStart: pick("weekday", "start"), wdEnd: pick("weekday", "end"),
    weStart: pick("weekend", "start"), weEnd: pick("weekend", "end"),
  }));
  const [saving, setSaving] = useState(false);
  const save = async (patch = {}) => {
    const next = { ...f, ...patch };
    setF(next); setSaving(true);
    try {
      await call("PUT", `/shows/${slug}`, {
        enabled: next.enabled, channelName: next.channelName, channelLink: next.channelLink,
        weekday: { start: next.wdStart, end: next.wdEnd }, weekend: { start: next.weStart, end: next.weEnd },
      });
      await loadLiveNow(true);
      toast.success(patch.enabled === false ? "Taken off live" : patch.enabled === true ? "Back on live" : "Saved");
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Tv className="w-5 h-5 text-red-400" />
        <div className="min-w-0">
          <p className="font-bold text-white">{base?.name || slug}</p>
          <p className="text-xs text-gray-400">{f.enabled ? "On live at its times" : "Off — not shown as live"}</p>
        </div>
        <button type="button" role="switch" aria-checked={f.enabled} disabled={saving} onClick={() => save({ enabled: !f.enabled })}
          className={`ml-auto relative w-12 h-7 rounded-full transition-colors ${f.enabled ? "bg-red-600" : "bg-gray-600"}`}>
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${f.enabled ? "left-6" : "left-1"}`} />
        </button>
      </div>
      {f.enabled && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className={Label}>Mon–Fri start (IST)</label><input type="time" value={f.wdStart} onChange={set("wdStart")} className={Input} /></div>
            <div><label className={Label}>Mon–Fri end</label><input type="time" value={f.wdEnd} onChange={set("wdEnd")} className={Input} /></div>
            <div><label className={Label}>Sat–Sun start</label><input type="time" value={f.weStart} onChange={set("weStart")} className={Input} /></div>
            <div><label className={Label}>Sat–Sun end</label><input type="time" value={f.weEnd} onChange={set("weEnd")} className={Input} /></div>
          </div>
          <div className="grid sm:grid-cols-[1fr_2fr] gap-3">
            <div><label className={Label}>Channel name</label><input value={f.channelName} onChange={set("channelName")} className={Input} /></div>
            <div><label className={Label}>Channel link</label><input value={f.channelLink} onChange={set("channelLink")} className={Input} placeholder="https://…/?tab=live&id=757" /></div>
          </div>
          <button type="button" onClick={() => save()} disabled={saving}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50">
            {saving ? "Saving…" : "Save times"}
          </button>
        </>
      )}
    </div>
  );
}

export default function AdminLiveNow() {
  const { events, shows, loaded } = useLiveNow();
  const [form, setForm] = useState({ title: "", link: "", poster: "", sport: "" });
  const [busy, setBusy] = useState("");
  useEffect(() => { loadLiveNow(true); }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy("add");
    try {
      await call("POST", "/events", form);
      setForm({ title: "", link: "", poster: "", sport: "" });
      await loadLiveNow(true);
      toast.success("Live added — it is on the site now");
    } catch (err) { toast.error(err.message); }
    setBusy("");
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this live? It comes off the site at once.")) return;
    setBusy(id);
    try { await call("DELETE", `/events/${id}`); await loadLiveNow(true); toast.success("Deleted"); } catch (err) { toast.error(err.message); }
    setBusy("");
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8 text-white">
        <h1 className="text-2xl font-black flex items-center gap-2"><Radio className="w-6 h-6 text-red-500" /> Live now</h1>

        {/* Running */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Running ({events.length})</h2>
          {!loaded && <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}
          {loaded && events.length === 0 && <p className="text-sm text-gray-400">Nothing added is live right now.</p>}
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/40 p-3">
              <div className="w-24 aspect-video rounded-md overflow-hidden bg-gray-700 shrink-0">
                {ev.poster && <img src={ev.poster} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold truncate">
                  <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black">LIVE</span>{ev.title}
                </p>
                <p className="text-xs text-gray-400 truncate">{ev.sport ? `${ev.sport} · ` : ""}{ev.link}</p>
              </div>
              <button onClick={() => remove(ev.id)} disabled={busy === ev.id} aria-label="Delete live"
                className="p-2.5 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50">
                {busy === ev.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
            </div>
          ))}
        </section>

        {/* Add */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Add a live</h2>
          <form onSubmit={add} className="rounded-xl border border-gray-700 bg-gray-800/40 p-4 grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className={Label}>Title *</label><input required value={form.title} onChange={set("title")} className={Input} placeholder="India vs England, Men's Group A" /></div>
            <div className="sm:col-span-2"><label className={Label}>Stream link * (a .m3u8 / .mpd, or a live page link with ?tab=…&id=…)</label><input required value={form.link} onChange={set("link")} className={Input} placeholder="https://…" /></div>
            <div><label className={Label}>Poster (https image)</label><input value={form.poster} onChange={set("poster")} className={Input} /></div>
            <div><label className={Label}>Sport</label><input value={form.sport} onChange={set("sport")} className={Input} placeholder="Kabaddi" /></div>
            <button type="submit" disabled={busy === "add"}
              className="sm:col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 font-bold disabled:opacity-50">
              {busy === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add live
            </button>
          </form>
        </section>

        {/* Nightly shows */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Nightly shows</h2>
          {loaded && Object.keys({ ...BASE_LIVE_SHOWS, ...shows }).map((slug) => (
            <ShowCard key={slug} slug={slug} base={BASE_LIVE_SHOWS[slug]} override={shows[slug]} />
          ))}
        </section>
      </div>
    </AdminLayout>
  );
}
