import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Mail, Lock, User, Eye, EyeOff, Loader2, ChevronLeft, AlertCircle,
  CheckCircle2, KeyRound, HelpCircle, X,
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { backendUrl } from "../utils/api";
import PosterWall from "../components/PosterWall";
import QrCode from "../components/QrCode";

/* Sign in, sign up, and getting back in.

   Desktop: the form on the left (with a "scan to sign in" QR beside it when
   there is room), a wall of our latest posters on the right. Phones: the
   same wall, dimmed, behind the form.

   Supabase does the work. A new account confirms its email with the code the
   confirmation mail carries (its link still works too), and a forgotten
   password is reset with the code the recovery mail carries: the code and a
   new password, and you are signed in — no link to follow out of the site.
   Both codes can be sent again, a minute apart.

   Scan to sign in: this page asks the backend for a short-lived code (routes/
   qrLoginRoutes.js) and shows it as a QR. A phone that is already signed in
   opens it, taps Approve (paged/QrApprove.jsx), and this page trades the
   one-time token it is then handed for a session of its own.

   The mails show a code only when their templates include {{ .Token }}
   (Supabase → Authentication → Email Templates). */

const RESEND_WAIT = 60;
const BRAND = "AnchorMovies";

/* Only a path on this site may follow a sign-in ("/qr-approve?c=…"), never another address. */
const safeNext = (n) => (typeof n === "string" && /^\/(?!\/)/.test(n) ? n : "/");

function useMedia(query) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

/* The QR code: asks for a code, renews it as it runs out, and asks every two
   seconds whether the phone has said yes. */
function useQrLogin(enabled, onApproved) {
  const [qr, setQr] = useState(null);          // { id, secret, url, expiresAt, total }
  const [left, setLeft] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const approved = useRef(onApproved);
  approved.current = onApproved;
  const making = useRef(false);

  const make = useCallback(async () => {
    if (making.current) return;
    making.current = true;
    try {
      const r = await fetch(`${backendUrl}/api/qr-login/create`, { method: "POST" });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setQr({ id: d.id, secret: d.secret, url: `${window.location.origin}/qr-approve?c=${d.id}`, expiresAt: Date.now() + d.expiresIn * 1000, total: d.expiresIn });
      setUnavailable(false);
    } catch { setQr(null); setUnavailable(true); }   // no backend support: the page leaves the QR out
    finally { making.current = false; }
  }, []);

  useEffect(() => { if (enabled) make(); else setQr(null); }, [enabled, make]);

  useEffect(() => {
    if (!enabled || !qr) return undefined;
    const tick = () => {
      const s = Math.max(0, Math.ceil((qr.expiresAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) make();
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [enabled, qr, make]);

  useEffect(() => {
    if (!enabled || !qr) return undefined;
    let stop = false;
    const poll = async () => {
      if (stop || document.hidden) return;
      try {
        const r = await fetch(`${backendUrl}/api/qr-login/${qr.id}/poll`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: qr.secret }),
        });
        const d = await r.json();
        if (stop) return;
        if (d.status === "approved") { stop = true; approved.current(d.token_hash); }
        else if (d.status === "expired") make();
      } catch { /* try again in two seconds */ }
    };
    const t = setInterval(poll, 2000);
    return () => { stop = true; clearInterval(t); };
  }, [enabled, qr, make]);

  return { qr, left, unavailable };
}

const Field = ({ icon: Icon, right, ...props }) => (
  <div className="relative">
    {React.createElement(Icon, { className: "absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] sm:w-5 sm:h-5 text-white/40 pointer-events-none", "aria-hidden": true })}
    <input
      {...props}
      className="w-full h-[52px] sm:h-[60px] bg-[#0b0b0b] border border-white/10 rounded-2xl pl-11 sm:pl-[52px] pr-12 text-[15px] sm:text-base text-white
                 placeholder:text-white/35 outline-none focus:border-white/40 focus:bg-[#111] transition"
    />
    {right && <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">{right}</div>}
  </div>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
  </svg>
);

const strength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;   // 0–4
};

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  // login | signup | verify (new account's code) | forgot | reset (code + new password)
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", code: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [social, setSocial] = useState("");        // "google" | "github" while one is opening
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [wait, setWait] = useState(0);          // seconds until a code can be sent again
  const [help, setHelp] = useState(false);
  const [qrDone, setQrDone] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  useEffect(() => { if (mode === "verify" || mode === "reset") setTimeout(() => codeRef.current?.focus(), 80); }, [mode]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: k === "code" ? e.target.value.replace(/\D/g, "").slice(0, 8) : e.target.value })); if (msg.text) setMsg({ type: "", text: "" }); };
  const go = (m) => { setMode(m); setMsg({ type: "", text: "" }); setHelp(false); setForm((f) => ({ ...f, password: "", confirm: "", code: "" })); };
  const fail = (e) => setMsg({ type: "error", text: e?.message || String(e) });

  /* ── Scan to sign in (wide screens only: a phone cannot scan itself) ── */
  const wide = useMedia("(min-width: 1400px)");
  const finishQr = useCallback(async (tokenHash) => {
    setQrDone(true);
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    if (error) { setQrDone(false); setMsg({ type: "error", text: "The phone approved, but this browser could not finish signing in. Try again." }); return; }
    navigate(next);
  }, [navigate, next]);
  const { qr, left, unavailable } = useQrLogin(mode === "login" && wide, finishQr);
  const showQr = mode === "login" && wide && !unavailable;

  const sendSignupCode = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email: form.email.trim() });
    if (error) throw error;
    setWait(RESEND_WAIT);
  };
  const sendResetCode = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,   // the mail's link still works
    });
    if (error) throw error;
    setWait(RESEND_WAIT);
  };

  const oauth = async (provider) => {
    if (social || busy) return;
    setSocial(provider); setMsg({ type: "", text: "" });
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}${next}` } });
    if (error) {
      const name = provider === "google" ? "Google" : "GitHub";
      setMsg({ type: "error", text: /not enabled|unsupported/i.test(error.message) ? `${name} sign-in isn't switched on yet.` : error.message });
      setSocial("");
    }   // on success the browser is already on its way to the provider
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg({ type: "", text: "" });
    const email = form.email.trim();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
        if (error) {
          // Signed up but never confirmed: send a code and take them to it.
          if (/not confirmed/i.test(error.message)) {
            await sendSignupCode().catch(() => { });
            go("verify");
            setMsg({ type: "info", text: `Your email isn't verified yet — we've sent a code to ${email}.` });
            return;
          }
          throw new Error(/invalid login/i.test(error.message) ? "Wrong email or password." : error.message);
        }
        navigate(next);
      } else if (mode === "signup") {
        if (form.password.length < 6) throw new Error("Use at least 6 characters for your password.");
        if (form.password !== form.confirm) throw new Error("The passwords don't match.");
        const { data, error } = await supabase.auth.signUp({
          email, password: form.password,
          options: { data: { full_name: form.name.trim() }, emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (data.session) { navigate(next); return; }    // projects without email confirmation
        setWait(RESEND_WAIT);
        go("verify");
        setMsg({ type: "info", text: `We've sent a code to ${email}.` });
      } else if (mode === "verify") {
        const { error } = await supabase.auth.verifyOtp({ email, token: form.code, type: "signup" });
        if (error) throw new Error(/expired|invalid/i.test(error.message) ? "That code is wrong or has expired — send a new one." : error.message);
        navigate(next);
      } else if (mode === "forgot") {
        await sendResetCode();
        go("reset");
        setMsg({ type: "info", text: `We've sent a code to ${email}.` });
      } else if (mode === "reset") {
        if (form.password.length < 6) throw new Error("Use at least 6 characters for your new password.");
        if (form.password !== form.confirm) throw new Error("The passwords don't match.");
        const { error } = await supabase.auth.verifyOtp({ email, token: form.code, type: "recovery" });
        if (error) throw new Error(/expired|invalid/i.test(error.message) ? "That code is wrong or has expired — send a new one." : error.message);
        const { error: upd } = await supabase.auth.updateUser({ password: form.password });
        if (upd) throw upd;
        navigate(next);
      }
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    if (wait > 0 || busy) return;
    setBusy(true); setMsg({ type: "", text: "" });
    try {
      if (mode === "verify") await sendSignupCode(); else await sendResetCode();
      setMsg({ type: "info", text: `A new code is on its way to ${form.email.trim()}.` });
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  };

  const titles = {
    login: [`Welcome back to ${BRAND}`, showQr ? "Scan QR code or use email to log in" : "Sign in to your watchlist, playlists and profiles."],
    signup: ["Create your account", "Save what you watch and listen to, on every device."],
    verify: ["Check your email", "Enter the code we sent to verify your account."],
    forgot: ["Forgot your password?", "Enter your email and we'll send you a code."],
    reset: ["Set a new password", "Enter the code from your email and choose a new password."],
  };
  const [title, sub] = titles[mode];
  const pw = strength(form.password);
  const codeStep = mode === "verify" || mode === "reset";
  const ready = {
    login: form.email.trim() && form.password,
    signup: form.name.trim() && form.email.trim() && form.password && form.confirm,
    verify: form.code.length >= 6,
    forgot: form.email.trim(),
    reset: form.code.length >= 6 && form.password && form.confirm,
  }[mode];
  const eye = (
    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
      className="p-1.5 text-white/40 hover:text-white">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
  );
  const back = () => {
    if (mode !== "login") { go("login"); return; }
    if (window.history.length > 1) navigate(-1); else navigate("/");
  };

  return (
    <div className="relative min-h-dvh bg-black text-white overflow-x-hidden">
      <Helmet><title>{title} | {BRAND}</title></Helmet>

      {/* The poster wall: the right-hand side on desktop, a dimmed backdrop on phones and tablets. */}
      <PosterWall className="fixed inset-y-0 right-0 w-full lg:w-[46%]" />
      <div className="fixed inset-0 bg-black/80 lg:hidden" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 w-[46%] hidden lg:block bg-gradient-to-r from-black via-black/55 to-black/35 pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-y-0 right-0 w-[46%] hidden lg:block bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 min-h-dvh flex flex-col lg:w-[54%]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="px-3 sm:px-8 pt-3 sm:pt-8 flex items-center gap-2">
          <button type="button" onClick={back} aria-label="Back"
            className="w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"><ChevronLeft size={26} /></button>
          <Link to="/" className="lg:hidden mx-auto -translate-x-5"><img src="/logo_39.png" alt={BRAND} className="h-8" /></Link>
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-10">
          <div className="text-center">
            <h1 className="text-[26px] sm:text-4xl lg:text-[40px] font-bold tracking-tight">{title}</h1>
            <p className="mt-2 sm:mt-3 text-sm sm:text-lg text-white/50">{sub}</p>
          </div>

          <div className={`mt-7 sm:mt-12 w-full flex justify-center ${showQr ? "max-w-[960px]" : "max-w-[480px]"}`}>
            {/* Scan to sign in */}
            {showQr && (
              <>
                <section className="w-[300px] shrink-0 flex flex-col items-center pt-2" aria-label="Scan to sign in">
                  <div className="relative w-[240px] h-[240px] rounded-[28px] bg-white p-4 shadow-[0_0_80px_rgba(255,255,255,0.06)]">
                    {qr ? <QrCode value={qr.url} logo="/favicon-circle-blackbg.png" className="w-full h-full" />
                      : <div className="w-full h-full rounded-xl bg-black/10 animate-pulse" />}
                    {qrDone && (
                      <div className="absolute inset-0 rounded-[28px] bg-black/85 flex flex-col items-center justify-center gap-3 text-center px-4">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm font-semibold">Approved — signing you in…</span>
                      </div>
                    )}
                  </div>
                  <h2 className="mt-7 text-lg font-semibold">Scan to sign in</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/50 text-center max-w-[250px]">
                    Open your phone’s camera and approve on a device that’s signed in to {BRAND}.
                  </p>
                  {qr && (
                    <div className="mt-5 w-[220px] text-center">
                      <p className="text-sm text-white/55 tabular-nums">Expires in {clock(left)}</p>
                      <div className="mt-2 h-[3px] rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-white/70 transition-[width] duration-500 ease-linear" style={{ width: `${Math.min(100, (left / qr.total) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </section>
                <div className="relative mx-10 w-px self-stretch bg-white/10" aria-hidden="true">
                  <span className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 bg-black py-3 text-xs font-semibold tracking-[0.25em] text-white/45">OR</span>
                </div>
              </>
            )}

            {/* The form — on phones and tablets it sits on a frosted card over the wall. */}
            <div className="w-full max-w-[480px] min-w-0 rounded-3xl bg-black/55 backdrop-blur-xl ring-1 ring-white/10 p-5 sm:p-8 lg:bg-transparent lg:backdrop-blur-none lg:ring-0 lg:p-0 lg:rounded-none">
              {msg.text && (
                <div role="status" className={`mb-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm ${msg.type === "error" ? "bg-red-500/10 text-red-200 ring-1 ring-red-500/30" : "bg-sky-500/10 text-sky-100 ring-1 ring-sky-500/30"}`}>
                  {msg.type === "error" ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
                  <span>{msg.text}</span>
                </div>
              )}

              <form onSubmit={submit} className="space-y-3 sm:space-y-4">
                {mode === "signup" && (
                  <Field icon={User} type="text" placeholder="Your name" autoComplete="name" required value={form.name} onChange={set("name")} />
                )}

                {(mode === "login" || mode === "signup" || mode === "forgot") && (
                  <Field icon={Mail} type="email" placeholder="you@example.com" autoComplete="email" required value={form.email} onChange={set("email")} />
                )}

                {codeStep && (
                  <div>
                    <p className="text-xs text-white/45 mb-2">Code sent to <span className="text-white/80">{form.email}</span></p>
                    <input ref={codeRef} value={form.code} onChange={set("code")} required
                      inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-label="Code from your email"
                      className="w-full bg-[#0b0b0b] border border-white/10 rounded-2xl py-4 text-center text-2xl font-bold tracking-[0.5em] text-white
                                 placeholder:text-white/25 outline-none focus:border-white/40" />
                    <div className="mt-2 flex justify-end">
                      <button type="button" onClick={resend} disabled={wait > 0 || busy}
                        className="text-sm font-medium text-sky-400 hover:text-sky-300 disabled:text-white/30">
                        {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                      </button>
                    </div>
                  </div>
                )}

                {(mode === "login" || mode === "signup" || mode === "reset") && (
                  <div>
                    <Field icon={Lock} type={show ? "text" : "password"} required
                      placeholder={mode === "reset" ? "New password" : "Password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={form.password} onChange={set("password")} right={eye} />
                    {mode === "login" && (
                      <div className="mt-3 flex justify-end">
                        <button type="button" onClick={() => go("forgot")} className="text-sm sm:text-[15px] font-medium text-white/60 hover:text-white">Forgot password?</button>
                      </div>
                    )}
                    {(mode === "signup" || mode === "reset") && form.password && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-4 gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className={`h-1 rounded-full ${i < pw ? (pw <= 1 ? "bg-red-400" : pw === 2 ? "bg-amber-400" : "bg-emerald-400") : "bg-white/10"}`} />
                          ))}
                        </div>
                        <span className="text-[11px] text-white/40 w-12 text-right">{["Weak", "Weak", "Okay", "Good", "Strong"][pw]}</span>
                      </div>
                    )}
                  </div>
                )}

                {(mode === "signup" || mode === "reset") && (
                  <Field icon={Lock} type={show ? "text" : "password"} required placeholder="Confirm password"
                    autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
                )}

                <button type="submit" disabled={busy || !ready}
                  className={`w-full h-[52px] sm:h-[60px] flex items-center justify-center gap-2 rounded-2xl text-base sm:text-lg font-semibold transition active:scale-[0.99]
                    ${ready ? "bg-white text-black hover:bg-gray-200" : "bg-white/15 text-white/60 cursor-not-allowed"} disabled:opacity-90`}>
                  {busy ? <Loader2 size={20} className="animate-spin" /> : mode === "forgot" ? <KeyRound size={18} /> : null}
                  {{ login: "Sign in", signup: "Create account", verify: "Verify email", forgot: "Send code", reset: "Reset password" }[mode]}
                </button>
              </form>

              {(mode === "login" || mode === "signup") && (
                <>
                  <div className="mt-6 sm:mt-8 flex items-center gap-4" aria-hidden="true">
                    <span className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] sm:text-xs font-semibold tracking-[0.22em] text-white/40">OR CONTINUE WITH</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <div className="mt-5 sm:mt-6 space-y-3">
                    {[["google", "Continue with Google", <GoogleIcon key="g" />], ["github", "Continue with GitHub", <GitHubIcon key="h" />]].map(([p, label, icon]) => (
                      <button key={p} type="button" onClick={() => oauth(p)} disabled={!!social || busy}
                        className="w-full h-[52px] sm:h-[60px] flex items-center justify-center gap-3 rounded-2xl border border-white/12 bg-transparent hover:bg-white/[0.06] text-[15px] sm:text-lg font-medium transition disabled:opacity-60">
                        {social === p ? <Loader2 size={20} className="animate-spin" /> : icon}{label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {mode === "login" && (
                <p className="mt-6 sm:mt-8 text-center text-sm sm:text-lg text-white/50">
                  New to {BRAND}? <button type="button" onClick={() => go("signup")} className="font-semibold text-white hover:underline">Create an account</button>
                </p>
              )}
              {mode === "signup" && (
                <p className="mt-6 sm:mt-8 text-center text-sm sm:text-lg text-white/50">
                  Already have an account? <button type="button" onClick={() => go("login")} className="font-semibold text-white hover:underline">Sign in</button>
                </p>
              )}
              {!(mode === "login" || mode === "signup") && (
                <p className="mt-6 text-center text-sm text-white/50">
                  <button type="button" onClick={() => go("login")} className="font-semibold text-white hover:underline">Back to sign in</button>
                </p>
              )}
            </div>
          </div>
        </main>

        <footer className="relative border-t border-white/10 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 text-xs sm:text-sm text-white/40"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <p>By continuing you agree to our <Link to="/terms" className="underline hover:text-white/70">Terms</Link>, <Link to="/privacy" className="underline hover:text-white/70">Privacy</Link> and <Link to="/dmca" className="underline hover:text-white/70">DMCA</Link>.</p>
          <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help}
            className="shrink-0 inline-flex items-center gap-2 text-sm sm:text-base font-medium text-white/60 hover:text-white">
            <HelpCircle size={18} /> Get Help
          </button>

          {help && (
            <div className="absolute right-3 sm:right-8 bottom-full mb-3 w-[min(92vw,360px)] rounded-2xl bg-[#111] ring-1 ring-white/15 shadow-2xl p-5 text-left text-white/70 text-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-white font-semibold">Having trouble?</h3>
                <button type="button" onClick={() => setHelp(false)} aria-label="Close" className="text-white/50 hover:text-white"><X size={16} /></button>
              </div>
              <ul className="mt-3 space-y-2.5 leading-relaxed">
                <li><button type="button" onClick={() => go("forgot")} className="font-semibold text-white hover:underline">Forgot your password?</button> We’ll email you a code.</li>
                <li>Never got the verification code? Try signing in — we’ll send a new one.</li>
                <li>Can’t scan the QR? Use your email, or Google or GitHub.</li>
                <li>QR sign-in needs a phone that’s already signed in to {BRAND}.</li>
              </ul>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}