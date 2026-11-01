import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Film, Loader2, Save, ArrowUp, ArrowDown, RotateCcw, Eye, EyeOff } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { supabase } from "../utils/supabaseClient";
import { backendUrl } from "../utils/api";

/* Admin → AnchorHD servers.
 *
 * The order (and which are on) that the main AnchorHD player tries its sources.
 * Saved to /api/anchor-servers; the player reads it within a minute. Castle is
 * first by default, then MoviBox. A disabled source is simply skipped. */

// Must match SERVER_DEFS in utils/anchorTmdb.js (kept here so the admin bundle
// doesn't pull the whole resolver).
const DEFS = [
  { key: "own", label: "AnchorHD · our CDN" },
  { key: "castle", label: "Castle · multi-language" },
  { key: "moviebox", label: "MoviBox · multi-language" },
  { key: "languages", label: "India4Movies / HDHub4u / 1TamilMV" },
  { key: "singularity", label: "Singularity" },
  { key: "bingr", label: "BingR servers" },
  { key: "filmu", label: "FilmU (Bastion · RiveStream · MeowTV · VidRock)" },
];
const DEFAULT_ORDER = DEFS.map((d) => d.key);
const LABEL = Object.fromEntries(DEFS.map((d) => [d.key, d.label]));

async function authHeaders() {
  const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
  const token = data?.session?.access_token || (() => { try { return localStorage.getItem("token") || ""; } catch { return ""; } })();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// Turn a saved order (enabled keys) into the full editable list: enabled first
// (in order), then every other known source as disabled.
function toItems(order) {
  const enabled = (order || []).filter((k) => LABEL[k]);
  const disabled = DEFS.map((d) => d.key).filter((k) => !enabled.includes(k));
  return [
    ...enabled.map((k) => ({ key: k, enabled: true })),
    ...disabled.map((k) => ({ key: k, enabled: false })),
  ];
}

export default function AdminAnchorServers() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      let order = DEFAULT_ORDER;
      try {
        const r = await fetch(`${backendUrl}/api/anchor-servers`);
        const d = await r.json();
        if (Array.isArray(d.order) && d.order.length) order = d.order;
      } catch { /* defaults */ }
      setItems(toItems(order));
      setLoaded(true);
    })();
  }, []);

  const move = (i, dir) => setItems((list) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });
  const toggle = (i) => setItems((list) => list.map((x, idx) => (idx === i ? { ...x, enabled: !x.enabled } : x)));

  const save = async () => {
    setBusy(true);
    try {
      const order = items.filter((x) => x.enabled).map((x) => x.key);
      if (!order.length) throw new Error("Keep at least one source on");
      const r = await fetch(`${backendUrl}/api/anchor-servers`, { method: "PUT", headers: await authHeaders(), body: JSON.stringify({ order }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || `Save failed (${r.status})`);
      toast.success("AnchorHD server order saved");
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  const reset = () => setItems(toItems(DEFAULT_ORDER));

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 text-white">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Film className="w-6 h-6 text-red-500" /> AnchorHD servers</h1>
          <p className="text-sm text-gray-400 mt-1">
            The order the main player tries its sources, top first. Drag with the arrows, hide one with the eye.
            The player picks it up within a minute — no redeploy.
          </p>
        </div>

        {!loaded && <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}

        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={it.key}
              className={`flex items-center gap-3 rounded-xl border p-3 ${it.enabled ? "border-gray-700 bg-gray-800/50" : "border-gray-800 bg-gray-900/40 opacity-60"}`}>
              <span className="w-6 text-center text-sm font-bold text-gray-500">{it.enabled ? i + 1 : "–"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{LABEL[it.key]}</p>
                <p className="text-xs text-gray-500">{it.key}</p>
              </div>
              <button type="button" onClick={() => toggle(i)} title={it.enabled ? "Disable" : "Enable"}
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
                {it.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-gray-700 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1 rounded hover:bg-gray-700 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={busy || !loaded}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 font-bold text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save order
          </button>
          <button type="button" onClick={reset} disabled={busy}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-700 text-sm disabled:opacity-50">
            <RotateCcw className="w-4 h-4" /> Default (Castle first)
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
