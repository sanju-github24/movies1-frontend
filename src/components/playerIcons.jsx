import React from "react";

/* The video player's control icons, drawn in the style of JioHotstar's
   player: a solid, softly rounded play triangle and pause bars; circular
   skip arrows with "10" inside; thin, round-capped outlines for volume,
   fullscreen, next episode and back. Our own drawings — not JioHotstar's
   files. Each takes the props the player already passes to Lucide's icons
   (size, className, fill, strokeWidth), so they drop in by name. */
const Svg = ({ size, className, children, strokeWidth = 1.8, style, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size ?? 24} height={size ?? 24}
    fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style} aria-hidden="true" focusable="false" {...rest}>
    {children}
  </svg>
);
// The player passes fill="white" to its play icon; these solid shapes fill with
// the text colour regardless, so the prop is swallowed here.
const solid = ({ fill, ...p }) => p;   // eslint-disable-line no-unused-vars

export const Play = (p) => (
  <Svg {...solid(p)} strokeWidth={0}>
    <path fill="currentColor" d="M7.5 4.9c0-1.15 1.25-1.86 2.24-1.27l10.1 6.1c.95.58.95 1.96 0 2.54l-10.1 6.1c-.99.6-2.24-.12-2.24-1.27V4.9z" />
  </Svg>
);

export const Pause = (p) => (
  <Svg {...solid(p)} strokeWidth={0}>
    <rect x="6" y="4" width="4" height="16" rx="1.6" fill="currentColor" />
    <rect x="14" y="4" width="4" height="16" rx="1.6" fill="currentColor" />
  </Svg>
);

/* Skip back / forward 10 s: an open circle with an arrowhead, "10" inside. */
const Ten = () => (
  <text x="12" y="15.6" textAnchor="middle" fontSize="7.4" fontWeight="700" fill="currentColor" stroke="none"
    fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">10</text>
);
export const RotateCcw = (p) => (
  <Svg {...solid(p)}>
    <path d="M4.6 9.3A8 8 0 1 1 4 12.9" />
    <path d="M4.2 4.8v4.7h4.7" />
    <Ten />
  </Svg>
);
export const RotateCw = (p) => (
  <Svg {...solid(p)}>
    <path d="M19.4 9.3A8 8 0 1 0 20 12.9" />
    <path d="M19.8 4.8v4.7h-4.7" />
    <Ten />
  </Svg>
);

export const Volume2 = (p) => (
  <Svg {...solid(p)}>
    <path d="M4 9.5h3l4.4-3.7c.55-.46 1.4-.07 1.4.65v11.1c0 .72-.85 1.11-1.4.65L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
    <path d="M18.6 6.4a7.5 7.5 0 0 1 0 11.2" />
  </Svg>
);
export const VolumeX = (p) => (
  <Svg {...solid(p)}>
    <path d="M4 9.5h3l4.4-3.7c.55-.46 1.4-.07 1.4.65v11.1c0 .72-.85 1.11-1.4.65L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" />
    <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
  </Svg>
);

export const Maximize = (p) => (
  <Svg {...solid(p)}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </Svg>
);
export const Minimize = (p) => (
  <Svg {...solid(p)}>
    <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />
  </Svg>
);

/* Next episode: a play triangle with a bar after it. */
export const SkipForward = (p) => (
  <Svg {...solid(p)}>
    <path d="M5 6.2c0-.8.88-1.28 1.55-.84l8.3 5.8c.57.4.57 1.24 0 1.64l-8.3 5.8C5.88 19.08 5 18.6 5 17.8V6.2z" fill="currentColor" strokeWidth="1.2" />
    <path d="M19 5.5v13" strokeWidth="2.2" />
  </Svg>
);

export const ChevronLeft = (p) => (
  <Svg {...solid(p)} strokeWidth={2}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

/* Double chevrons, for the «10 and 10» skip buttons on the control bar. */
export const ChevronsLeft = (p) => (
  <Svg {...solid(p)} strokeWidth={2}>
    <path d="M12 6l-6 6 6 6M19 6l-6 6 6 6" />
  </Svg>
);
export const ChevronsRight = (p) => (
  <Svg {...solid(p)} strokeWidth={2}>
    <path d="M5 6l6 6-6 6M12 6l6 6-6 6" />
  </Svg>
);
