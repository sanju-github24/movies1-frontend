import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Globe, Loader2, RotateCcw, Save, Stethoscope, ExternalLink, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw, Zap, CalendarRange } from "lucide-react";
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

const PLACEHOLDER = { tamilmv: "www.1tamilmv.example", hdhub: "new9.hdhub4u.example", i4m: "go7.india4movies.example", movibox: "movibox.example" };

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
  /* Fetch: when the source is down, probe its known domains and switch to a
     working one — no need to hunt for the new domain by hand. */
  const fetchNow = async () => {
    setBusy("fetch"); setForceAsk("");
    try {
      const d = await call("POST", `/${row.site}/fetch`, {});
      onChanged(d.site);
      const hit = (d.tried || []).find((t) => t.base === d.found) || (d.tried || []).slice(-1)[0];
      if (hit) setCheck(hit);
      (d.success ? toast.success : toast.error)(d.message);
    } catch (e) { toast.error(e.message); }
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
        <button type="button" onClick={fetchNow} disabled={!!busy} title="Find a working domain automatically (use when the source is down)"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-sm font-semibold disabled:opacity-50">
          {busy === "fetch" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Fetch
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
  const [fetchingFresh, setFetchingFresh] = useState(false);
  const [lastFresh, setLastFresh] = useState(null);

  useEffect(() => {
    call("GET", "").then((d) => setSites(d.sites || [])).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  }, []);
  const changed = (row) => setSites((list) => list.map((x) => (x.site === row.site ? row : x)));

  const fetchFresh = async () => {
    setFetchingFresh(true);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${backendUrl}/api/fresh/refresh`, { method: "POST", headers, cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || `Failed (${r.status})`);
      setLastFresh(d);
      toast.success(d.message);
    } catch (e) {
      toast.error(e.message);
    }
    setFetchingFresh(false);
  };

  /* ── Date recovery ───────────────────────────────────────────────────── */
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const daysAgo  = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const [recoverFrom, setRecoverFrom] = useState(daysAgo(7));
  const [recoverTo,   setRecoverTo]   = useState(todayStr());
  const [recovering,  setRecovering]  = useState(false);
  const [recoverResult, setRecoverResult] = useState(null);

  const runRecover = async () => {
    if (!recoverFrom || !recoverTo) return toast.error("Pick both dates first");
    setRecovering(true); setRecoverResult(null);
    try {
      const headers = await authHeaders();
      const r = await fetch(`${backendUrl}/api/fresh/recover`, {
        method: "POST", headers, cache: "no-store",
        body: JSON.stringify({ from: recoverFrom, to: recoverTo }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || `Failed (${r.status})`);
      setRecoverResult(d);
      (d.added > 0 ? toast.success : toast.info)(d.message);
    } catch (e) {
      toast.error(e.message);
    }
    setRecovering(false);
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 text-white">
        {/* ── Header + Fetch Fresh ── */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black flex items-center gap-2"><Globe className="w-6 h-6 text-red-500" /> Source domains</h1>
            <p className="text-sm text-gray-400 mt-1">
              When a source moves to a new domain, hit <span className="text-blue-300 font-semibold">Fetch</span> to auto-find a working one,
              or type it in. Every backend picks it up within a minute — downloads, search and the fresh-releases list all switch over. Nothing needs redeploying.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchFresh}
            disabled={fetchingFresh}
            title="Re-scrape all sources right now and rebuild the fresh-releases list (normally runs every hour automatically)"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-900/40 disabled:opacity-50 shrink-0 transition-all"
          >
            {fetchingFresh ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Fetch Fresh
          </button>
        </div>
        {lastFresh && (
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-violet-500/10 text-violet-300 border border-violet-500/20">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              <span className="font-semibold">{lastFresh.count} titles</span> matched ·
              last refreshed at {new Date(lastFresh.updatedAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* ── Recover missed releases ── */}
        <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">Recover missed releases</p>
              <p className="text-xs text-gray-400">If the server was down for a period, scrape that date window and merge any missed titles into the list.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs text-gray-400 font-medium">From</label>
              <input
                type="date"
                value={recoverFrom}
                max={recoverTo || todayStr()}
                onChange={(e) => setRecoverFrom(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm focus:outline-none focus:border-amber-500 [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs text-gray-400 font-medium">To</label>
              <input
                type="date"
                value={recoverTo}
                min={recoverFrom}
                max={todayStr()}
                onChange={(e) => setRecoverTo(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm focus:outline-none focus:border-amber-500 [color-scheme:dark]"
              />
            </div>
            <button
              type="button"
              onClick={runRecover}
              disabled={recovering || !recoverFrom || !recoverTo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm disabled:opacity-50 transition-colors shrink-0"
            >
              {recovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
              {recovering ? "Recovering…" : "Recover"}
            </button>
          </div>
          {recovering && (
            <p className="text-xs text-amber-300/70 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Scraping sources and matching to TMDB — this may take 1–2 minutes…
            </p>
          )}
          {recoverResult && (
            <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
              recoverResult.added > 0
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">{recoverResult.message}</p>
                <p className="text-gray-400">
                  {recoverResult.added > 0 && <span>{recoverResult.added} new · </span>}
                  {recoverResult.merged > 0 && <span>{recoverResult.merged} updated · </span>}
                  {recoverResult.total} total in list
                </p>
              </div>
            </div>
          )}
        </div>

        {!loaded && <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        {sites.map((row) => <SiteCard key={row.site} row={row} onChanged={changed} />)}
      </div>
    </AdminLayout>
  );
}
