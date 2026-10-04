import { supabase } from "./supabaseClient";

/* Viewer profiles, kept on the account (Supabase user metadata) so they
   follow the viewer to every device. An account that has never made one has
   a single profile named after it. The active profile is mirrored into
   localStorage so the rail can draw its avatar without asking the server. */

export const ACTIVE_KEY = "active_profile";
export const MAX_PROFILES = 5;

export function readProfiles(user) {
  const meta = user?.user_metadata || {};
  const fallbackName = meta.full_name || (user?.email || "You").split("@")[0];
  const list = Array.isArray(meta.profiles) && meta.profiles.length
    ? meta.profiles
    : [{ id: "p1", name: fallbackName, avatar: "smile-blue" }];
  const active = (list.find((p) => p.id === meta.active_profile) || list[0]).id;
  return { list, active };
}

function mirror(list, active) {
  try {
    const p = list.find((x) => x.id === active);
    if (p) localStorage.setItem(ACTIVE_KEY, JSON.stringify(p));
    window.dispatchEvent(new Event("profile-changed"));
  } catch { /* private mode: the rail falls back to its default */ }
}

export async function saveProfiles(list, active) {
  const { data, error } = await supabase.auth.updateUser({ data: { profiles: list, active_profile: active } });
  if (error) throw error;
  mirror(list, active);
  return data.user;
}

export function readActiveLocal() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null"); } catch { return null; }
}

export const newProfileId = () => `p${Date.now().toString(36)}`;
