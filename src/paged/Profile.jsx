import React, { useContext, useState, useEffect, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import {
  User, Mail, LogOut, Loader2, ShieldCheck, ShieldAlert,
  Save, Check, Clock3, Bookmark, Download, ChevronRight,
} from "lucide-react";

const LANGUAGES = ["Hindi", "English", "Kannada", "Tamil", "Telugu", "Malayalam"];

/* Where the viewer goes from here. The page used to offer only "back" and a
   logo, both of which the rail already does better. */
const SHORTCUTS = [
  { to: "/watch",          label: "My watchlist",  hint: "Everything you saved",     Icon: Bookmark },
  { to: "/latest",         label: "Latest uploads", hint: "Newest first",            Icon: Clock3 },
  { to: "/search-torrent", label: "Downloads",     hint: "Find links by name",       Icon: Download },
];

const Card = ({ children, className = "" }) => (
  <section className={`bg-white/[0.03] ring-1 ring-white/[0.06] rounded-2xl ${className}`}>
    {children}
  </section>
);

const Label = ({ children }) => (
  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">
    {children}
  </span>
);

const Profile = () => {
  const { setUserData, setIsLoggedIn } = useContext(AppContext);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [langs, setLangs] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // What was on the account when the page loaded, so Save can tell whether
  // anything actually changed rather than always looking available.
  const [initial, setInitial] = useState({ name: "", langs: [] });

  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      if (s?.user) {
        const meta = s.user.user_metadata || {};
        const n = meta.full_name || s.user.email.split("@")[0];
        const l = Array.isArray(meta.languages) ? meta.languages : [];
        setName(n); setLangs(l); setInitial({ name: n, langs: l });
      }
      setReady(true);
    })();
  }, []);

  const dirty = useMemo(() => {
    if (name.trim() !== initial.name) return true;
    if (langs.length !== initial.langs.length) return true;
    return langs.some((l) => !initial.langs.includes(l));
  }, [name, langs, initial]);

  const toggleLanguage = (lang) =>
    setLangs((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));

  const saveProfile = async () => {
    if (!name.trim()) return toast.error("Name cannot be empty");
    setSaving(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: name.trim(), languages: langs },
      });
      if (error) throw error;
      toast.success("Profile updated");
      setSession((prev) => ({ ...prev, user: data.user }));
      setInitial({ name: name.trim(), langs });
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      setIsLoggedIn(false);
      setUserData(null);
      toast.success("Signed out");
      /* /auth, not /login1 — that route does not exist, so signing out used to
         land on a blank page. */
      navigate("/auth");
    } catch {
      toast.error("Sign out failed");
    }
  };

  if (!ready) return (
    <div className="min-h-dvh bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-9 h-9 animate-spin text-blue-500" aria-hidden="true" />
    </div>
  );

  if (!session) return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center justify-center gap-5 px-6 text-center">
      <User className="w-10 h-10 text-gray-700" aria-hidden="true" />
      <p className="text-gray-300 font-black uppercase tracking-widest text-xs">You are not signed in</p>
      <Link to="/auth" className="bg-white text-black px-7 py-3 rounded-xl font-black text-sm hover:bg-gray-200 transition-colors">
        Sign in
      </Link>
    </div>
  );

  const user = session.user;
  const verified = !!user.email_confirmed_at;
  const initialLetter = (name || user.email)[0].toUpperCase();
  const since = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-dvh bg-gray-950 text-white px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12">
      <div className="w-full max-w-[1100px] mx-auto">

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tighter italic mb-6 sm:mb-8">
          My space
        </h1>

        {/* Identity beside preferences on a wide screen, stacked on a phone.
            The old page was a single 550px card centred in the window, which
            left most of a desktop empty and made a short form scroll. */}
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] items-start">

          {/* ── Who you are ── */}
          <Card className="p-6 flex flex-col items-center text-center">
            <span className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 p-[2px]">
              <span className="w-full h-full rounded-full bg-gray-950 flex items-center justify-center text-3xl font-black">
                {initialLetter}
              </span>
            </span>

            <h2 className="mt-4 text-lg font-black tracking-tight break-words w-full">{name || "Explorer"}</h2>

            {/* Reads the account, rather than claiming "Verified Account" for
                everyone the way the old badge did. */}
            {verified ? (
              <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Email verified
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" /> Email not verified
              </span>
            )}

            <p className="mt-4 text-xs text-gray-400 break-all">{user.email}</p>
            {since && <p className="mt-1 text-[11px] text-gray-600">Member since {since}</p>}

            <button onClick={handleLogout}
              className="mt-6 w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest
                         bg-white/[0.04] text-red-400 ring-1 ring-red-500/20
                         hover:bg-red-500 hover:text-white hover:ring-red-500 transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <span className="inline-flex items-center gap-2"><LogOut className="w-4 h-4" aria-hidden="true" /> Sign out</span>
            </button>
          </Card>

          {/* ── What you can change ── */}
          <div className="space-y-5">
            <Card className="p-6 space-y-6">
              <div>
                <Label>Display name</Label>
                <div className="flex items-center gap-3 bg-black/40 ring-1 ring-white/[0.06] rounded-xl px-4 py-3
                                focus-within:ring-blue-500 transition-shadow">
                  <User className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name" aria-label="Display name"
                    className="bg-transparent outline-none text-sm font-bold w-full placeholder:text-gray-600" />
                </div>
              </div>

              <div>
                <Label>Preferred languages</Label>
                <p className="text-[11px] text-gray-500 -mt-1 mb-3">
                  Used to pick the audio track when a title has several.
                </p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const on = langs.includes(lang);
                    return (
                      <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                        aria-pressed={on}
                        className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest
                                    border transition-colors duration-200 inline-flex items-center gap-1.5
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                          on ? "bg-white text-black border-white"
                             : "bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/[0.1] hover:text-white"
                        }`}>
                        {on && <Check className="w-3 h-3" aria-hidden="true" />}
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <div className="flex items-center gap-3 bg-black/20 ring-1 ring-white/[0.04] rounded-xl px-4 py-3">
                  <Mail className="w-4 h-4 text-gray-600 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-gray-400 truncate">{user.email}</span>
                  <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-gray-600 shrink-0">
                    Locked
                  </span>
                </div>
              </div>

              {/* Save is only offered when there is something to save. */}
              <button onClick={saveProfile} disabled={saving || !dirty}
                className="w-full py-3.5 rounded-xl font-black text-sm inline-flex items-center justify-center gap-2
                           bg-white text-black hover:bg-gray-200 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Saving…</>
                  : <><Save className="w-4 h-4" aria-hidden="true" /> {dirty ? "Save changes" : "Saved"}</>}
              </button>
            </Card>

            <Card className="p-2">
              <ul>
                {SHORTCUTS.map((item) => {
                  // Bound as a local, not destructured in the parameter list:
                  // lint exempts capitalised *variables* only, and nothing here
                  // counts a JSX tag as a use.
                  const Icon = item.Icon;
                  const { to, label, hint } = item;
                  return (
                  <li key={to}>
                    <Link to={to}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/[0.05] transition-colors
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                      <Icon className="w-5 h-5 text-gray-400 shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{label}</span>
                        <span className="block text-[11px] text-gray-500">{hint}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-600 ml-auto shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
