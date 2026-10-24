import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Globe, Loader2, RotateCcw, Save, Stethoscope, ExternalLink, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { supabase } from "../utils/supabaseClient";
import { backendUrl } from "../utils/api";

/* Admin → Source domains.
 *
 * 1TamilMV, HDHub4u and India4Movies move to a new domain whenever the old
 * one is blocked. Type the new one here and every copy of the backend uses it
 * within a minute — no redeploy. A domain is checked before it is saved: one
 * that does not answer, or answers as some other site, needs "Save anyway". */

const Input = "w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500";

async function authHeaders() {
  const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
  const token = data?.session?.access_token || (() => { try { return localStorage.getItem("token") || ""; } catch { return ""; } })();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function call(method, path, body) {
  const r = await fetch(`${backendUrl}/api/site-domains${path}`, { method, headers: await authHeaders(), body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.message || `Failed (${r.status})`); e.data = d; throw e; }
  return d;
}

const PLACEHOLDER = { tamilmv: "www.1tamilmv.example", hdhub: "new9.hdhub4u.example", i4m: "go7.india4movies.example" };

function CheckLine({ check, onUse }) {
  if (!check) return null;
  const good = check.ok && check.looksRight;
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs rounded-lg px-3 py-2 ${good ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
      {good ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span>
        {check.base}{" "}
        {check.ok
          ? (check.looksRight ? `is up (${check.status}, ${check.ms} ms)` : `answered ${check.status}, but does not look like the site`)
          : (check.status ? `answered ${check.status}` : (check.error || "did not answer"))}
      </span>
      {check.redirectedTo && (
        <button type="button" onClick={() => onUse(check.redirectedTo)} className="inline-flex items-center gap-1 underline font-semibold">
          forwards to {check.redirectedTo} <ArrowRight className="w-3 h-3" /> use that
        </button>
      )}
    </div>
  );
}

function SiteCard({ row, onChanged }) {
  const [value, setValue] = useState("");
  const [check, setCheck] = useState(null);
  const [forceAsk, setForceAsk] = useState("");
  const [busy, setBusy] = useState("");

  const test = async (base) => {
    setBusy("test"); setForceAsk("");
    try { setCheck(await call("POST", `/${row.site}/test`, base ? { base } : {})); }
    catch (e) { toast.error(e.message); }
    setBusy("");
  };
  const save = async (force = false, base = value) => {
    if (!base.trim()) return toast.error("Type the new domain first");
    setBusy("save");
    try {
      const d = await call("PUT", `/${row.site}`, { base, force });
      setCheck({ base: d.site.current, ...d.check }); setValue(""); setForceAsk("");
      toast.success(`${row.name} now uses ${d.site.current}`);
      onChanged(d.site);
    } catch (e) {
      if (e.data?.needsForce) { setCheck({ base: e.data.base, ...e.data.check }); setForceAsk(e.message); }
      else toast.error(e.message);
    }
    setBusy("");
  };
  const reset = async () => {
    setBusy("reset");
    try { const d = await call("DELETE", `/${row.site}`); toast.success(`${row.name} is back on ${d.site.current}`); onChanged(d.site); setCheck(null); }
    catch (e) { toast.error(e.message); }
    setBusy("");
  };

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Globe className="w-5 h-5 text-red-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">{row.name}</p>
          <a href={row.current} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-300 hover:text-white inline-flex items-center gap-1 break-all">
            {row.current} <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
          <p className="text-xs text-gray-500 mt-0.5">
            {row.override
              ? `Set by ${row.override.updatedBy || "admin"} · ${new Date(row.override.updatedAt).toLocaleString()}`
              : row.site === "hdhub" && row.current !== row.default ? "Found automatically (domain of the day)" : "Default"}
          </p>
        </div>
        <button type="button" onClick={() => test()} disabled={!!busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold disabled:opacity-50">
          {busy === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />} Check
        </button>
        {row.override && (
          <button type="button" onClick={reset} disabled={!!busy} title={`Back to ${row.default}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 text-sm disabled:opacity-50">
            {busy === "reset" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Reset
          </button>
        )}
      </div>

      <CheckLine check={check} onUse={(b) => { setValue(b); save(false, b); }} />

      <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="flex flex-col sm:flex-row gap-2">
        <input value={value} onChange={(e) => { setValue(e.target.value); setForceAsk(""); }}
          placeholder={`New domain, e.g. ${PLACEHOLDER[row.site] || "example.com"}`} className={Input} spellCheck={false} autoCapitalize="off" />
        <button type="submit" disabled={!!busy}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 font-bold text-sm disabled:opacity-50 shrink-0">
          {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Check &amp; save
        </button>
      </form>

      {forceAsk && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <span className="flex-1 min-w-0">{forceAsk}. Save it anyway?</span>
          <button type="button" onClick={() => save(true)} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs">
            Save anyway
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminSourceDomains() {
  const [sites, setSites] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    call("GET", "").then((d) => setSites(d.sites || [])).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  }, []);
  const changed = (row) => setSites((list) => list.map((x) => (x.site === row.site ? row : x)));

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 text-white">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Globe className="w-6 h-6 text-red-500" /> Source domains</h1>
          <p className="text-sm text-gray-400 mt-1">
            When 1TamilMV, HDHub4u or India4Movies moves to a new domain, enter it here. Every backend picks it up within a minute —
            downloads, search and the fresh-releases list all switch over. Nothing needs redeploying.
          </p>
        </div>
        {!loaded && <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        {sites.map((row) => <SiteCard key={row.site} row={row} onChanged={changed} />)}
      </div>
    </AdminLayout>
  );
}
