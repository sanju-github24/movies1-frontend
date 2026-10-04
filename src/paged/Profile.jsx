import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Loader2, Settings, Pencil, Plus, Check, Play, X, ChevronRight, User } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { Avatar } from "../utils/avatars";
import { readProfiles, saveProfiles, newProfileId, MAX_PROFILES } from "../utils/profiles";
import { readContinueList, removeProgress, progressPercent, timeLeft } from "../utils/continueWatching";
import ProfileEditor from "../components/ProfileEditor";

/* The viewer's own page: who is watching, and what they were in the middle
   of. Account details, languages and help live one level in, under Help &
   Settings, the way the streaming apps keep them. */

const GREETINGS = [
  "Lights off, sound up — it's showtime.",
  "Popcorn's ready. So is your next binge.",
  "One more episode never hurt anyone.",
  "Your couch called. It misses you.",
  "Plot twists ahead. Buckle up.",
  "Snacks? Check. Blanket? Check. Press play.",
  "Tonight's forecast: 100% chance of movies.",
];

/* A night sky for the top of the page: a few hundred stars of three sizes,
   drawn as tiled radial gradients so it costs no images and no script. */
const STARS = [
  "radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,.55), transparent 60%)",
  "radial-gradient(1px 1px at 140px 80px, rgba(255,255,255,.4), transparent 60%)",
  "radial-gradient(1.5px 1.5px at 90px 160px, rgba(255,255,255,.5), transparent 60%)",
  "radial-gradient(1px 1px at 210px 40px, rgba(255,255,255,.35), transparent 60%)",
  "radial-gradient(1px 1px at 260px 190px, rgba(255,255,255,.45), transparent 60%)",
  "radial-gradient(2px 2px at 170px 120px, rgba(255,255,255,.3), transparent 60%)",
  "radial-gradient(1px 1px at 60px 220px, rgba(255,255,255,.4), transparent 60%)",
].join(",");

const minutes = (s) => `${Math.max(1, Math.round(s / 60))}m left`;

function ContinueCard({ r, editing, onRemove }) {
  const art = r.backdrop || r.poster;
  const tv = r.content_type === "tv" && r.season && r.episode;
  const pct = progressPercent(r);
  const body = (
    <>
      <span className="relative block aspect-video rounded-lg overflow-hidden bg-white/[0.05] ring-1 ring-white/[0.06] group-hover:ring-white/25 transition">
        {art ? <img src={art} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
             : <span className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">{r.title}</span>}
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {!editing && <Play className="absolute left-3 bottom-3 w-5 h-5 fill-white text-white drop-shadow" aria-hidden="true" />}
        <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
          <span className="block h-full bg-blue-500" style={{ width: `${pct}%` }} />
        </span>
        {editing && (
          <button type="button" onClick={(e) => { e.preventDefault(); onRemove(r); }} aria-label={`Remove ${r.title}`}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition">
            <X className="w-4 h-4" />
          </button>
        )}
      </span>
      <span className="block mt-2.5 text-[15px] font-semibold text-white truncate">{tv ? `S${r.season} E${r.episode}` : r.title}</span>
      <span className="block text-[13px] text-gray-400 truncate">
        {tv ? <>{r.title}<span className="mx-1.5" />{minutes(timeLeft(r))}</> : minutes(timeLeft(r))}
      </span>
    </>
  );
  return editing ? (
    <div className="group block w-[260px] sm:w-[330px] shrink-0">{body}</div>
  ) : (
    <Link to={`/watch/${r.slug}`} state={{ movie: { ...r, source: r.source || "tmdb" }, resume: r }}
      className="group block w-[260px] sm:w-[330px] shrink-0 focus:outline-none">{body}</Link>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [active, setActive] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editor, setEditor] = useState(null);         // { profile } or { profile: null } for new
  const [saving, setSaving] = useState(false);
  const [continueList, setContinueList] = useState(() => readContinueList());
  const [cwEdit, setCwEdit] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      setUser(u);
      if (u) {
        const { list, active: a } = readProfiles(u);
        setProfiles(list); setActive(a);
      }
      setReady(true);
    })();
  }, []);

  const greeting = useMemo(() => GREETINGS[new Date().getDate() % GREETINGS.length], []);
  const current = profiles.find((p) => p.id === active) || profiles[0];

  const persist = useCallback(async (list, a) => {
    setSaving(true);
    try {
      const u = await saveProfiles(list, a);
      setUser(u); setProfiles(list); setActive(a);
      return true;
    } catch (e) {
      toast.error(e.message || "Could not save profiles");
      return false;
    } finally { setSaving(false); }
  }, []);

  const pick = (p) => {
    if (editMode) { setEditor({ profile: p }); return; }
    if (p.id !== active) persist(profiles, p.id).then((ok) => ok && toast.success(`Watching as ${p.name}`, { autoClose: 1500 }));
  };

  const saveEditor = async (p) => {
    const exists = profiles.some((x) => x.id === p.id);
    const list = exists ? profiles.map((x) => (x.id === p.id ? p : x)) : [...profiles, { ...p, id: newProfileId() }];
    const a = exists ? active : list[list.length - 1].id;
    if (await persist(list, a)) { setEditor(null); setEditMode(false); }
  };
  const deleteProfile = async (p) => {
    if (profiles.length <= 1) { toast.info("You need at least one profile"); return; }
    if (!window.confirm(`Delete the profile “${p.name}”?`)) return;
    const list = profiles.filter((x) => x.id !== p.id);
    if (await persist(list, p.id === active ? list[0].id : active)) setEditor(null);
  };
  const removeContinue = (r) => { removeProgress(r.slug); setContinueList(readContinueList()); };

  if (!ready) return (
    <div className="min-h-dvh bg-black flex items-center justify-center">
      <Loader2 className="w-9 h-9 animate-spin text-blue-500" aria-hidden="true" />
    </div>
  );
  if (!user) return (
    <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center gap-5 px-6 text-center">
      <User className="w-10 h-10 text-gray-700" aria-hidden="true" />
      <p className="text-gray-300 font-semibold">You are not signed in</p>
      <Link to="/auth" className="bg-white text-black px-7 py-3 rounded-lg font-bold text-sm hover:bg-gray-200">Sign in</Link>
    </div>
  );

  return (
    <div className="min-h-dvh bg-black text-white">
      {/* ── The night sky ── */}
      <div className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0"
          style={{ backgroundImage: `${STARS}, linear-gradient(180deg, #141420 0%, #0a0a10 55%, #000 100%)`, backgroundSize: "280px 260px, 280px 260px, 280px 260px, 280px 260px, 280px 260px, 280px 260px, 280px 260px, 100% 100%",
                   WebkitMaskImage: "linear-gradient(180deg, #000 60%, transparent)", maskImage: "linear-gradient(180deg, #000 60%, transparent)" }} />
        <div className="relative max-w-[1600px] mx-auto px-5 sm:px-10 lg:px-16 pt-10 sm:pt-16 pb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="min-w-0">
            <Link to="/profile/settings" className="group inline-flex items-center gap-2 text-xl sm:text-[28px] font-bold tracking-tight text-white hover:text-white/90">
              {greeting}
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white/60 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
            <p className="mt-2 text-sm sm:text-base text-gray-400 break-all">{user.email}</p>
          </div>
          <Link to="/profile/settings"
            className="self-start inline-flex items-center gap-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] px-5 py-3 text-sm sm:text-base font-semibold transition">
            <Settings className="w-5 h-5" aria-hidden="true" /> Help &amp; Settings
          </Link>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-5 sm:px-10 lg:px-16 pb-24">
        {/* ── Profiles ── */}
        <section className="mt-8 sm:mt-12">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-[34px] font-bold tracking-tight">Profiles</h1>
            <button type="button" onClick={() => setEditMode((v) => !v)} aria-pressed={editMode}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm sm:text-base font-semibold border transition
                ${editMode ? "bg-white text-black border-white" : "bg-white/[0.06] border-white/[0.06] hover:bg-white/[0.12]"}`}>
              {editMode ? <><Check className="w-4 h-4" /> Done</> : <><Pencil className="w-4 h-4" /> Edit</>}
            </button>
          </div>
          <div className="flex gap-6 sm:gap-10 overflow-x-auto no-scrollbar pb-2">
            {profiles.map((p) => {
              const on = p.id === active;
              return (
                <button key={p.id} type="button" onClick={() => pick(p)} disabled={saving}
                  className="group shrink-0 flex flex-col items-center gap-3 focus:outline-none" aria-label={editMode ? `Edit ${p.name}` : `Watch as ${p.name}`}>
                  <span className={`relative block rounded-full transition ${on ? "ring-[3px] ring-white" : "ring-0 group-hover:ring-2 group-hover:ring-white/40"} group-focus-visible:ring-4 group-focus-visible:ring-blue-400`}>
                    <Avatar id={p.avatar} size={undefined} className="w-24 h-24 sm:w-[150px] sm:h-[150px]" />
                    {editMode ? (
                      <span className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center"><Pencil className="w-7 h-7" /></span>
                    ) : on && (
                      <span className="absolute right-0 bottom-1 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gray-100 text-black flex items-center justify-center ring-4 ring-black">
                        <Check className="w-5 h-5" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className={`text-sm sm:text-lg font-semibold ${on ? "text-white" : "text-gray-400"}`}>{p.name}</span>
                </button>
              );
            })}
            {profiles.length < MAX_PROFILES && (
              <button type="button" onClick={() => setEditor({ profile: null })}
                className="group shrink-0 flex flex-col items-center gap-3 focus:outline-none">
                <span className="w-24 h-24 sm:w-[150px] sm:h-[150px] rounded-full border-2 border-dashed border-white/20 group-hover:border-white/50 flex items-center justify-center transition">
                  <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-white/70" />
                </span>
                <span className="text-sm sm:text-lg font-semibold text-gray-400">Add</span>
              </button>
            )}
          </div>
        </section>

        {/* ── Continue watching ── */}
        {continueList.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <div className="flex items-center gap-4 mb-5">
              <h2 className="text-lg sm:text-[26px] font-semibold tracking-tight">Continue Watching for {current?.name}</h2>
              <button type="button" onClick={() => setCwEdit((v) => !v)} aria-pressed={cwEdit} aria-label="Edit continue watching"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition ${cwEdit ? "bg-white text-black" : "bg-white/[0.06] hover:bg-white/[0.12] text-gray-300"}`}>
                {cwEdit ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
              {continueList.map((r) => <ContinueCard key={r.slug} r={r} editing={cwEdit} onRemove={removeContinue} />)}
            </div>
          </section>
        )}
      </div>

      {editor && (
        <ProfileEditor profile={editor.profile} saving={saving}
          onSave={saveEditor} onCancel={() => setEditor(null)}
          onDelete={profiles.length > 1 ? deleteProfile : undefined} />
      )}
    </div>
  );
}
