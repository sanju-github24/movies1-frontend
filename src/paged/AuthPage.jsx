import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle,
  CheckCircle2, KeyRound, ChevronRight, ShieldCheck,
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";

/* Sign in, sign up, and getting back in.

   Supabase does the work. A new account confirms its email with the code
   the confirmation mail carries (its link still works too), and a forgotten
   password is reset with the code the recovery mail carries: the code and a
   new password, and you are signed in — no link to follow out of the site.
   Both codes can be sent again, a minute apart.

   The mails show a code only when their templates include {{ .Token }}
   (Supabase → Authentication → Email Templates). */

const RESEND_WAIT = 60;

const Field = ({ icon: Icon, right, ...props }) => (
  <div className="relative">
    {React.createElement(Icon, { className: "absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500 pointer-events-none", "aria-hidden": true })}
    <input
      {...props}
      className="w-full bg-white/[0.06] border border-white/10 rounded-xl py-3.5 pl-11 pr-11 text-[15px] text-white
                 placeholder:text-gray-500 outline-none focus:border-white/40 focus:bg-white/[0.08] transition"
    />
    {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
  </div>
);

const strength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;   // 0–4
};

export default function AuthPage() {
  const navigate = useNavigate();
  // login | signup | verify (new account's code) | forgot | reset (code + new password)
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", code: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [wait, setWait] = useState(0);          // seconds until a code can be sent again
  const codeRef = useRef(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  useEffect(() => { if (mode === "verify" || mode === "reset") setTimeout(() => codeRef.current?.focus(), 80); }, [mode]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: k === "code" ? e.target.value.replace(/\D/g, "").slice(0, 8) : e.target.value })); if (msg.text) setMsg({ type: "", text: "" }); };
  const go = (m) => { setMode(m); setMsg({ type: "", text: "" }); setForm((f) => ({ ...f, password: "", confirm: "", code: "" })); };
  const fail = (e) => setMsg({ type: "error", text: e?.message || String(e) });

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
            await sendSignupCode().catch(() => {});
            go("verify");
            setMsg({ type: "info", text: `Your email isn't verified yet — we've sent a code to ${email}.` });
            return;
          }
          throw new Error(/invalid login/i.test(error.message) ? "Wrong email or password." : error.message);
        }
        navigate("/");
      } else if (mode === "signup") {
        if (form.password.length < 6) throw new Error("Use at least 6 characters for your password.");
        if (form.password !== form.confirm) throw new Error("The passwords don't match.");
        const { data, error } = await supabase.auth.signUp({
          email, password: form.password,
          options: { data: { full_name: form.name.trim() }, emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (data.session) { navigate("/"); return; }    // projects without email confirmation
        setWait(RESEND_WAIT);
        go("verify");
        setMsg({ type: "info", text: `We've sent a code to ${email}.` });
      } else if (mode === "verify") {
        const { error } = await supabase.auth.verifyOtp({ email, token: form.code, type: "signup" });
        if (error) throw new Error(/expired|invalid/i.test(error.message) ? "That code is wrong or has expired — send a new one." : error.message);
        navigate("/");
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
        navigate("/");
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
    login: ["Welcome back", "Sign in to your watchlist, playlists and profiles."],
    signup: ["Create your account", "Save what you watch and listen to, on every device."],
    verify: ["Check your email", "Enter the code we sent to verify your account."],
    forgot: ["Forgot your password?", "Enter your email and we'll send you a code."],
    reset: ["Set a new password", "Enter the code from your email and choose a new password."],
  };
  const [title, sub] = titles[mode];
  const pw = strength(form.password);
  const eye = (
    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
      className="p-1.5 text-gray-500 hover:text-white">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
  );
  const codeStep = mode === "verify" || mode === "reset";

  return (
    <div className="min-h-dvh bg-black text-white relative flex items-center justify-center px-4 py-10 overflow-hidden">
      <Helmet><title>{title} | AnchorMovies</title></Helmet>
      <div className="absolute inset-0 bg-cover bg-center scale-105 opacity-40"
        style={{ backgroundImage: "url('/the_netflix_login_background__canada__2024___by_logofeveryt_dh0w8qv-pre.jpg')" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[420px]">
        <Link to="/" className="flex justify-center mb-8"><img src="/logo_39.png" alt="AnchorMovies" className="h-10" /></Link>

        <div className="rounded-2xl bg-[#0d0d12]/90 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl p-6 sm:p-8">
          {/* Sign in / Create account */}
          {(mode === "login" || mode === "signup") && (
            <div className="grid grid-cols-2 gap-1 p-1 mb-7 rounded-xl bg-white/[0.06]">
              {[["login", "Sign in"], ["signup", "Create account"]].map(([m, label]) => (
                <button key={m} type="button" onClick={() => go(m)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition ${mode === m ? "bg-white text-black shadow" : "text-gray-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {!(mode === "login" || mode === "signup") && (
            <button type="button" onClick={() => go("login")}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"><ArrowLeft size={16} /> Back to sign in</button>
          )}

          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-gray-400">{sub}</p>

          {msg.text && (
            <div role="status" className={`mt-5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm ${
              msg.type === "error" ? "bg-red-500/10 text-red-200 ring-1 ring-red-500/30" : "bg-sky-500/10 text-sky-100 ring-1 ring-sky-500/30"}`}>
              {msg.type === "error" ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field icon={User} type="text" placeholder="Your name" autoComplete="name" required value={form.name} onChange={set("name")} />
            )}

            {(mode === "login" || mode === "signup" || mode === "forgot") && (
              <Field icon={Mail} type="email" placeholder="Email address" autoComplete="email" required value={form.email} onChange={set("email")} />
            )}

            {codeStep && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Code sent to <span className="text-gray-300">{form.email}</span></p>
                <input ref={codeRef} value={form.code} onChange={set("code")} required
                  inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-label="Code from your email"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl py-4 text-center text-2xl font-bold tracking-[0.5em] text-white
                             placeholder:text-gray-600 outline-none focus:border-white/40" />
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={resend} disabled={wait > 0 || busy}
                    className="text-sm font-medium text-sky-400 hover:text-sky-300 disabled:text-gray-500">
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
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={() => go("forgot")} className="text-sm text-gray-400 hover:text-white">Forgot password?</button>
                  </div>
                )}
                {(mode === "signup" || mode === "reset") && form.password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={`h-1 rounded-full ${i < pw ? (pw <= 1 ? "bg-red-400" : pw === 2 ? "bg-amber-400" : "bg-emerald-400") : "bg-white/10"}`} />
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-500 w-12 text-right">{["Weak", "Weak", "Okay", "Good", "Strong"][pw]}</span>
                  </div>
                )}
              </div>
            )}

            {(mode === "signup" || mode === "reset") && (
              <Field icon={Lock} type={show ? "text" : "password"} required placeholder="Confirm password"
                autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
            )}

            <button type="submit" disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-black py-3.5 text-[15px] font-semibold
                         hover:bg-gray-200 active:scale-[0.99] transition disabled:opacity-60">
              {busy ? <Loader2 size={18} className="animate-spin" /> : mode === "forgot" ? <KeyRound size={18} /> : null}
              {{ login: "Sign in", signup: "Create account", verify: "Verify email", forgot: "Send code", reset: "Reset password" }[mode]}
            </button>
          </form>

          {mode === "login" && (
            <p className="mt-6 text-center text-sm text-gray-400">
              New here? <button type="button" onClick={() => go("signup")} className="font-semibold text-white hover:underline">Create an account</button>
            </p>
          )}
          {mode === "signup" && (
            <p className="mt-6 text-center text-sm text-gray-400">
              Have an account? <button type="button" onClick={() => go("login")} className="font-semibold text-white hover:underline">Sign in</button>
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button type="button" onClick={() => navigate("/")}
            className="group inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
            Continue without signing in <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="inline-flex items-center gap-1.5 text-[11px] text-gray-600"><ShieldCheck size={13} /> Secured with encrypted sign-in</p>
        </div>
      </div>
    </div>
  );
}
