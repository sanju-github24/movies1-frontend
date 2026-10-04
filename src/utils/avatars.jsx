import React from "react";

/* Profile pictures, drawn here — no artwork borrowed from anyone else.
   Each is a gradient disc with a face on it: expressions for the people
   and a handful of animals. Scale-free SVG, so they are sharp at 32px in the
   rail and at 170px on the profile page. */

const FACES = {
  smile: (
    <>
      <circle cx="38" cy="44" r="4.5" fill="#fff" /><circle cx="62" cy="44" r="4.5" fill="#fff" />
      <path d="M36 62 Q50 70 66 58" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  grin: (
    <>
      <circle cx="38" cy="42" r="4.5" fill="#fff" /><circle cx="62" cy="42" r="4.5" fill="#fff" />
      <path d="M33 56 Q50 76 67 56 Z" fill="#fff" />
    </>
  ),
  wink: (
    <>
      <path d="M32 44 Q38 39 44 44" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <circle cx="62" cy="44" r="4.5" fill="#fff" />
      <path d="M38 62 Q52 70 64 60" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  cool: (
    <>
      <rect x="27" y="37" width="20" height="12" rx="5" fill="#111" /><rect x="53" y="37" width="20" height="12" rx="5" fill="#111" />
      <rect x="45" y="40" width="10" height="3" fill="#111" />
      <path d="M40 63 Q52 68 62 61" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  love: (
    <>
      <path d="M33 40 a5 5 0 0 1 9 0 a5 5 0 0 1 9 0 q0 6 -9 12 q-9 -6 -9 -12z" transform="translate(-6 -2)" fill="#fff" />
      <path d="M57 40 a5 5 0 0 1 9 0 a5 5 0 0 1 9 0 q0 6 -9 12 q-9 -6 -9 -12z" transform="translate(-4 -2)" fill="#fff" />
      <path d="M36 61 Q50 72 64 61" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  sleepy: (
    <>
      <path d="M31 45 Q38 49 45 45" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M55 45 Q62 49 69 45" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="63" r="5" fill="#fff" />
      <text x="68" y="30" fontSize="13" fontWeight="900" fill="#fff" opacity="0.85">z</text>
    </>
  ),
  wow: (
    <>
      <circle cx="38" cy="43" r="6" fill="#fff" /><circle cx="62" cy="43" r="6" fill="#fff" />
      <circle cx="38" cy="43" r="2.5" fill="#111" /><circle cx="62" cy="43" r="2.5" fill="#111" />
      <ellipse cx="50" cy="64" rx="6" ry="8" fill="#fff" />
    </>
  ),
  star: (
    <>
      <path d="M38 36 l2.6 5.4 6 .8 -4.4 4.1 1 5.9 -5.2-2.8 -5.2 2.8 1-5.9 -4.4-4.1 6-.8z" fill="#fff" />
      <path d="M62 36 l2.6 5.4 6 .8 -4.4 4.1 1 5.9 -5.2-2.8 -5.2 2.8 1-5.9 -4.4-4.1 6-.8z" fill="#fff" />
      <path d="M36 61 Q50 73 64 61" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  calm: (
    <>
      <path d="M32 44 Q38 40 44 44" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M56 44 Q62 40 68 44" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M40 61 Q50 66 60 61" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  ),
  laugh: (
    <>
      <path d="M31 42 l7 4 -7 4" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M69 42 l-7 4 7 4" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 57 Q50 80 66 57 Z" fill="#fff" />
    </>
  ),
  // Animals
  panda: (
    <>
      <circle cx="26" cy="24" r="11" fill="#111" /><circle cx="74" cy="24" r="11" fill="#111" />
      <circle cx="50" cy="54" r="30" fill="#fafafa" />
      <ellipse cx="38" cy="50" rx="8" ry="10" fill="#111" transform="rotate(-20 38 50)" />
      <ellipse cx="62" cy="50" rx="8" ry="10" fill="#111" transform="rotate(20 62 50)" />
      <circle cx="39" cy="50" r="3" fill="#fff" /><circle cx="61" cy="50" r="3" fill="#fff" />
      <ellipse cx="50" cy="63" rx="5" ry="3.5" fill="#111" />
    </>
  ),
  cat: (
    <>
      <path d="M22 40 L28 14 L44 30 Z" fill="#fff" opacity="0.92" /><path d="M78 40 L72 14 L56 30 Z" fill="#fff" opacity="0.92" />
      <circle cx="50" cy="54" r="28" fill="#fff" opacity="0.92" />
      <ellipse cx="40" cy="50" rx="4" ry="6" fill="#1f2937" /><ellipse cx="60" cy="50" rx="4" ry="6" fill="#1f2937" />
      <path d="M46 60 L54 60 L50 65 Z" fill="#f472b6" />
      <path d="M50 65 Q46 70 42 68 M50 65 Q54 70 58 68" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  fox: (
    <>
      <path d="M20 22 L42 36 L28 54 Z" fill="#fff" opacity="0.95" /><path d="M80 22 L58 36 L72 54 Z" fill="#fff" opacity="0.95" />
      <path d="M22 40 Q50 30 78 40 Q70 74 50 82 Q30 74 22 40 Z" fill="#fff" opacity="0.95" />
      <circle cx="40" cy="50" r="4" fill="#1f2937" /><circle cx="60" cy="50" r="4" fill="#1f2937" />
      <circle cx="50" cy="70" r="4.5" fill="#1f2937" />
    </>
  ),
  bear: (
    <>
      <circle cx="28" cy="28" r="10" fill="#fff" opacity="0.9" /><circle cx="72" cy="28" r="10" fill="#fff" opacity="0.9" />
      <circle cx="50" cy="54" r="29" fill="#fff" opacity="0.9" />
      <circle cx="40" cy="48" r="4" fill="#1f2937" /><circle cx="60" cy="48" r="4" fill="#1f2937" />
      <ellipse cx="50" cy="63" rx="11" ry="8" fill="#e5e7eb" />
      <ellipse cx="50" cy="60" rx="4.5" ry="3" fill="#1f2937" />
    </>
  ),
  penguin: (
    <>
      <ellipse cx="50" cy="56" rx="30" ry="32" fill="#111827" />
      <ellipse cx="50" cy="62" rx="20" ry="22" fill="#fff" />
      <circle cx="42" cy="46" r="4" fill="#fff" /><circle cx="58" cy="46" r="4" fill="#fff" />
      <circle cx="42" cy="46" r="2" fill="#111" /><circle cx="58" cy="46" r="2" fill="#111" />
      <path d="M44 54 L56 54 L50 61 Z" fill="#f59e0b" />
    </>
  ),
  owl: (
    <>
      <path d="M24 30 L34 38 M76 30 L66 38" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="38" cy="48" r="12" fill="#fff" /><circle cx="62" cy="48" r="12" fill="#fff" />
      <circle cx="38" cy="48" r="5" fill="#1f2937" /><circle cx="62" cy="48" r="5" fill="#1f2937" />
      <path d="M45 60 L55 60 L50 70 Z" fill="#f59e0b" />
    </>
  ),
};

export const AVATARS = [
  { id: "smile-blue",   face: "smile",   from: "#2563eb", to: "#7c3aed", label: "Smile" },
  { id: "grin-sun",     face: "grin",    from: "#f59e0b", to: "#ef4444", label: "Grin" },
  { id: "panda",        face: "panda",   from: "#9ca3af", to: "#374151", label: "Panda" },
  { id: "cool-teal",    face: "cool",    from: "#06b6d4", to: "#0e7490", label: "Cool" },
  { id: "love-pink",    face: "love",    from: "#ec4899", to: "#be123c", label: "Love" },
  { id: "fox",          face: "fox",     from: "#fb923c", to: "#c2410c", label: "Fox" },
  { id: "wink-lime",    face: "wink",    from: "#84cc16", to: "#15803d", label: "Wink" },
  { id: "cat",          face: "cat",     from: "#a78bfa", to: "#6d28d9", label: "Cat" },
  { id: "star-gold",    face: "star",    from: "#facc15", to: "#ea580c", label: "Star" },
  { id: "penguin",      face: "penguin", from: "#38bdf8", to: "#1d4ed8", label: "Penguin" },
  { id: "sleepy-night", face: "sleepy",  from: "#6366f1", to: "#1e1b4b", label: "Sleepy" },
  { id: "bear",         face: "bear",    from: "#b45309", to: "#78350f", label: "Bear" },
  { id: "wow-mint",     face: "wow",     from: "#34d399", to: "#047857", label: "Wow" },
  { id: "owl",          face: "owl",     from: "#64748b", to: "#1e293b", label: "Owl" },
  { id: "laugh-coral",  face: "laugh",   from: "#fb7185", to: "#e11d48", label: "Laugh" },
  { id: "calm-violet",  face: "calm",    from: "#c084fc", to: "#7e22ce", label: "Calm" },
];

export const avatarById = (id) => AVATARS.find((a) => a.id === id) || AVATARS[0];

export function Avatar({ id, size = 48, className = "", title }) {
  const a = avatarById(id);
  const gid = `av-${a.id}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`rounded-full ${className}`}
      role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a.from} /><stop offset="1" stopColor={a.to} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${gid})`} />
      <circle cx="30" cy="22" r="26" fill="#fff" opacity="0.08" />
      {FACES[a.face]}
    </svg>
  );
}
