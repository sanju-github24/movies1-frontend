/* Which commentary a stream carries, and which one someone would want.
 *
 * The feeds publish each language of a match as a separate stream, and the
 * language is written in exactly one reliable place: the suffix on the id —
 * "1090541371_HIN", "4249129_PUN". The field that claims to say it,
 * audioLanguageName, reads ENG on all five variants of the same SonyLiv match,
 * and the [Hindi] in a title is stripped by the worker before it gets here.
 * So the suffix is the source of truth and nothing else is consulted.
 */

const NAMES = {
  ENG: "English", HIN: "Hindi", TAM: "Tamil", TEL: "Telugu", KAN: "Kannada",
  MAL: "Malayalam", BEN: "Bengali", MAR: "Marathi", PUN: "Punjabi",
  GUJ: "Gujarati", ODI: "Odia", BHO: "Bhojpuri", URD: "Urdu",
};

const SUFFIX = /_([A-Za-z]{3})$/;

export const langCode = (id) => {
  const m = SUFFIX.exec(String(id ?? ""));
  return m ? m[1].toUpperCase() : "";
};

// The match itself, with the language taken off.
export const baseId = (id) => String(id ?? "").replace(SUFFIX, "");

export const langName = (code) => NAMES[code] || code;

/* The languages someone chose on their profile, as codes. Stored there as
   full names — "Kannada" — whose first three letters happen to be the codes
   the feeds use. */
export function preferredLangs() {
  try {
    const l = JSON.parse(localStorage.getItem("profile_langs") || "[]");
    return Array.isArray(l) ? l.map((x) => String(x).slice(0, 3).toUpperCase()) : [];
  } catch { return []; }
}

/* Of several language variants, the one to start with: the viewer's own
   language if the match has it, then English, then Hindi, then whatever came
   first. Without this the listing opened whichever variant the feed happened
   to list first, which was English for everyone. */
export function pickPreferred(items, getId = (x) => x.id) {
  if (!items?.length) return null;
  for (const want of [...preferredLangs(), "ENG", "HIN"]) {
    const hit = items.find((i) => langCode(getId(i)) === want);
    if (hit) return hit;
  }
  return items[0];
}

/* Collapse a list of streams to one per match, keeping the preferred language
   and remembering how many there were. A match with no language suffix is its
   own group and passes through untouched. */
export function oneperMatch(items, getId = (x) => x.id) {
  const groups = new Map();
  items.forEach((it) => {
    const id = getId(it);
    const key = langCode(id) ? baseId(id) : `solo:${id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  });
  return [...groups.values()].map((g) => ({ ...pickPreferred(g, getId), langCount: g.length }));
}
