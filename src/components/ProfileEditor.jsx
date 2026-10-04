import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { AVATARS, Avatar } from "../utils/avatars";

/* Create or edit a profile: a row of avatars with the chosen one large and
   ticked in the middle, and a name. Full screen, like the apps people know
   this from. */
export default function ProfileEditor({ profile, onSave, onCancel, onDelete, saving }) {
  const editing = !!profile;
  const [avatar, setAvatar] = useState(profile?.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)].id);
  const [name, setName] = useState(profile?.name || "");
  const row = useRef(null);
  const input = useRef(null);

  // Keep the chosen avatar centred in the row.
  useEffect(() => {
    const el = row.current?.querySelector(`[data-id="${avatar}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [avatar]);
  useEffect(() => { if (!editing) input.current?.focus(); }, [editing]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const at = AVATARS.findIndex((a) => a.id === avatar);
  const step = (d) => setAvatar(AVATARS[(at + d + AVATARS.length) % AVATARS.length].id);
  const submit = (e) => { e.preventDefault(); if (name.trim()) onSave({ ...(profile || {}), name: name.trim().slice(0, 24), avatar }); };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#0b0c12] text-white flex flex-col" role="dialog" aria-modal="true"
      aria-label={editing ? "Edit profile" : "Create profile"}>
      <div className="flex items-center justify-between px-5 sm:px-12 pt-6 sm:pt-10">
        <span className="w-16" />
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">{editing ? "Edit Profile" : "Create Profile"}</h2>
        <button type="button" onClick={onCancel} className="w-16 text-right text-base sm:text-lg font-semibold text-blue-400 hover:text-blue-300">Cancel</button>
      </div>

      <form onSubmit={submit} className="flex-1 flex flex-col items-center justify-center gap-10 sm:gap-14 pb-10">
        <div className="relative w-full">
          <button type="button" onClick={() => step(-1)} aria-label="Previous avatar"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full text-white/80 hover:bg-white/10"><ChevronLeft className="w-6 h-6" /></button>
          <div ref={row} className="flex items-center gap-5 sm:gap-8 overflow-x-auto no-scrollbar px-[40vw] py-6 snap-x snap-mandatory">
            {AVATARS.map((a) => {
              const on = a.id === avatar;
              return (
                <button key={a.id} data-id={a.id} type="button" onClick={() => setAvatar(a.id)} aria-pressed={on}
                  aria-label={`${a.label} avatar`}
                  className={`relative shrink-0 snap-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400
                    ${on ? "w-36 h-36 sm:w-48 sm:h-48 ring-4 ring-white" : "w-20 h-20 sm:w-28 sm:h-28 opacity-80 hover:opacity-100"}`}>
                  <Avatar id={a.id} size="100%" />
                  {on && (
                    <span className="absolute -right-1 bottom-1 sm:bottom-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 text-black flex items-center justify-center ring-4 ring-[#0b0c12]">
                      <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => step(1)} aria-label="Next avatar"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full text-white/80 hover:bg-white/10"><ChevronRight className="w-6 h-6" /></button>
        </div>

        <label className="w-full max-w-md px-5">
          <span className="sr-only">Profile name</span>
          <input ref={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Your Name"
            className="w-full rounded-lg bg-transparent border border-white/25 focus:border-white/70 px-5 py-4 text-lg sm:text-xl outline-none placeholder:text-white/35" />
        </label>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button type="submit" disabled={!name.trim() || saving}
            className="min-w-[200px] rounded-lg bg-white text-black px-8 py-3 font-bold disabled:opacity-40 hover:bg-gray-200 transition">
            {saving ? "Saving…" : editing ? "Save" : "Create Profile"}
          </button>
          {editing && onDelete && (
            <button type="button" onClick={() => onDelete(profile)}
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-red-400 hover:bg-red-500/10 transition">
              <Trash2 className="w-4 h-4" /> Delete profile
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
