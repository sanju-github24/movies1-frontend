import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  User, HelpCircle, ChevronRight, ArrowLeft, Laptop, Smartphone, Loader2, Check, ShieldCheck, ShieldAlert, Send, MessageSquarePlus,
} from "lucide-react";
import { FaTelegramPlane } from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import { AppContext } from "../context/AppContext";

/* Help & Settings: what the account is and how to reach us. A menu on the
   left and the chosen section on the right; on a phone the menu comes first
   and a section opens over it. */

const LANGUAGES = ["Hindi", "English", "Kannada", "Tamil", "Telugu", "Malayalam"];
const COMMUNITY = "https://t.me/AnchorMovies";
const REQUESTS = "https://t.me/anchormovies_bot";

const SECTIONS = [
  { id: "account", label: "Account & Devices", hint: "Manage Account & Devices", Icon: User },
  { id: "help", label: "Help & Support", hint: "Help Centre", Icon: HelpCircle },
];

// "Chrome on macOS" — enough to recognise the device, read off the browser.
function thisDevice() {
  const ua = navigator.userAgent || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "this device";
  return { label: `${browser} on ${os}`, mobile: /iPhone|iPad|iPod|Android/.test(ua) };
}

const Row = ({ children, className = "" }) => (
  <div className={`flex items-center justify-between gap-4 ${className}`}>{children}</div>
);
const Button = ({ children, className = "", ...rest }) => (
  <button type="button" {...rest}
    className={`rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.06] px-6 py-3 text-sm sm:text-base font-semibold transition disabled:opacity-40 ${className}`}>
    {children}
  </button>
);

function Account({ user, onLogout }) {
  const meta = user.user_metadata || {};
  const [name, setName] = useState(meta.full_name || user.email.split("@")[0]);
  const [langs, setLangs] = useState(Array.isArray(meta.languages) ? meta.languages : []);
  const [initial, setInitial] = useState({ name, langs });
  const [saving, setSaving] = useState(false);
  const device = useMemo(thisDevice, []);
  const dirty = name.trim() !== initial.name || langs.length !== initial.langs.length || langs.some((l) => !initial.langs.includes(l));
  const since = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "";

  const save = async () => {
    if (!name.trim()) return toast.error("Name cannot be empty");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim(), languages: langs } });
      if (error) throw error;
      // The player picks the audio track by this.
      if (langs[0]) try { localStorage.setItem("preferred_audio_lang", langs[0]); } catch { /* private mode */ }
      setInitial({ name: name.trim(), langs });
      toast.success("Saved");
    } catch (e) { toast.error(e.message || "Could not save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-gray-500">Registered Email</p>
        <p className="mt-1 text-lg sm:text-xl font-semibold break-all">{user.email}</p>
        <p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${user.email_confirmed_at ? "text-emerald-400" : "text-amber-400"}`}>
          {user.email_confirmed_at ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          {user.email_confirmed_at ? "Verified" : "Not verified"}{since && <span className="text-gray-500 font-normal"> · Member since {since}</span>}
        </p>
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-semibold mb-4">Your details</h3>
        <label className="block max-w-md">
          <span className="block text-sm text-gray-500 mb-2">Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            className="w-full rounded-lg bg-white/[0.04] border border-white/10 focus:border-white/40 px-4 py-3 outline-none" />
        </label>
        <p className="text-sm text-gray-500 mt-6 mb-2">Preferred audio languages <span className="text-gray-600">— the first one plays when a title has several</span></p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => {
            const on = langs.includes(l);
            return (
              <button key={l} type="button" aria-pressed={on}
                onClick={() => setLangs((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]))}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border transition
                  ${on ? "bg-white text-black border-white" : "bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/10"}`}>
                {on && <Check className="w-3.5 h-3.5" />}{l}
              </button>
            );
          })}
        </div>
        <Button onClick={save} disabled={!dirty || saving} className="mt-6 bg-white text-black hover:bg-gray-200 border-white">
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-semibold mb-5">This Device</h3>
        <Row>
          <span className="flex items-center gap-4 min-w-0">
            {device.mobile ? <Smartphone className="w-6 h-6 text-gray-300 shrink-0" /> : <Laptop className="w-6 h-6 text-gray-300 shrink-0" />}
            <span>
              <span className="block font-semibold">{device.label}</span>
              <span className="block text-sm text-gray-500">Last used : just now</span>
            </span>
          </span>
          <Button onClick={onLogout}>Log Out</Button>
        </Row>
      </div>
    </div>
  );
}

function Help() {
  return (
    <div className="space-y-6">
      <p className="text-sm font-bold tracking-[0.15em] text-gray-300">HELP &amp; SUPPORT</p>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold">Join the Community</h3>
          <p className="mt-2 text-gray-400 leading-relaxed max-w-xl">
            New uploads, live matches and announcements land on our Telegram first. Join to report a problem, ask for a title, or just hang out with other viewers.
          </p>
        </div>
        <a href={COMMUNITY} target="_blank" rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#229ED9] hover:bg-[#1c8cc2] px-6 py-3.5 font-semibold transition">
          <FaTelegramPlane className="w-5 h-5" /> Join Telegram
        </a>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <a href={REQUESTS} target="_blank" rel="noopener noreferrer"
          className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] p-5 flex items-center gap-4 transition">
          <MessageSquarePlus className="w-6 h-6 text-gray-300 shrink-0" />
          <span className="flex-1"><span className="block font-semibold">Request a title</span><span className="block text-sm text-gray-500">Ask our bot for a movie or show we don't have yet</span></span>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
        </a>
        <a href={COMMUNITY} target="_blank" rel="noopener noreferrer"
          className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] p-5 flex items-center gap-4 transition">
          <Send className="w-6 h-6 text-gray-300 shrink-0" />
          <span className="flex-1"><span className="block font-semibold">Report a problem</span><span className="block text-sm text-gray-500">A stream not playing, a wrong title, a broken link</span></span>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3 text-sm text-gray-400 leading-relaxed">
        <p className="font-semibold text-gray-200">Quick fixes</p>
        <p>• A stream won't start? Try another server from the list under the player — AnchorHD first.</p>
        <p>• Stuck on a black screen? Turn off the ad blocker for this site, or try Chrome.</p>
        <p>• Audio in the wrong language? Set your languages under Account &amp; Devices.</p>
      </div>
    </div>
  );
}

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { setUserData, setIsLoggedIn } = useContext(AppContext);
  const [params, setParams] = useSearchParams();
  const section = params.get("s");                 // null on a phone = the menu
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user || null); setReady(true); });
  }, []);

  const open = (id) => setParams({ s: id });
  const shown = section || "account";              // desktop always shows one

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      setIsLoggedIn(false); setUserData(null);
      toast.success("Signed out");
      navigate("/auth");
    } catch { toast.error("Sign out failed"); }
  };

  if (!ready) return <div className="min-h-dvh bg-black flex items-center justify-center"><Loader2 className="w-9 h-9 animate-spin text-blue-500" /></div>;
  if (!user) return (
    <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center gap-5">
      <p className="text-gray-300">You are not signed in</p>
      <Link to="/auth" className="bg-white text-black px-7 py-3 rounded-lg font-bold text-sm">Sign in</Link>
    </div>
  );

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-10 lg:px-16 py-8 sm:py-14 lg:grid lg:grid-cols-[minmax(300px,420px)_1fr] lg:gap-14">
        {/* Menu — always on a desktop; on a phone only until a section is open. */}
        <aside className={`${section ? "hidden lg:block" : "block"} lg:border-r lg:border-white/[0.06] lg:pr-14`}>
          <button type="button" onClick={() => navigate("/profile")} className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Profile
          </button>
          <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight mb-8">Help &amp; Settings</h1>
          <nav className="space-y-2">
            {SECTIONS.map((item) => {
              // A local, not a destructured parameter: lint only exempts capitalised variables.
              const Icon = item.Icon;
              const { id, label, hint } = item;
              const on = shown === id;
              return (
                <button key={id} type="button" onClick={() => open(id)} aria-current={on ? "page" : undefined}
                  className={`w-full flex items-center gap-4 rounded-2xl px-5 py-5 text-left transition border
                    ${on ? "lg:bg-white/[0.04] lg:border-white/[0.12] border-transparent" : "border-transparent hover:bg-white/[0.03]"}`}>
                  <Icon className="w-5 h-5 text-gray-300 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-base sm:text-lg font-semibold">{label}</span>
                    <span className="block text-sm text-gray-500">{hint}</span>
                  </span>
                  <ChevronRight className={`w-5 h-5 ${on ? "text-white" : "text-gray-600"}`} />
                </button>
              );
            })}
          </nav>
          <Button onClick={logout} className="mt-10">Log Out</Button>
        </aside>

        {/* Section */}
        <main className={`${section ? "block" : "hidden lg:block"} pt-2`}>
          <button type="button" onClick={() => setParams({})} className="lg:hidden mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Help &amp; Settings
          </button>
          {shown === "help" ? <Help /> : <Account user={user} onLogout={logout} />}
        </main>
      </div>
    </div>
  );
}
