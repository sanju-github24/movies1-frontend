import { X as CloseIcon, Type, RotateCcw } from "lucide-react";

/* How AnchorHD's subtitles look — size, colour, edge, weight, the plate
 * behind them, how high they sit and how early or late they come — chosen
 * in a window over the player, with a preview, and kept for next time.
 *
 * The player turns the choice into a ::cue rule (subtitleCss) and moves the
 * cues for height and timing; this file is the window and the defaults. */

export const SUB_DEFAULTS = { size: 100, color: "#ffffff", edge: "shadow", bold: false, bg: 60, line: 86, delay: 0 };
const KEY = "anchorhd:sub-style";

export function loadSubStyle() {
  try { return { ...SUB_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...SUB_DEFAULTS }; }
}
export function saveSubStyle(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

const COLOURS = ["#ffffff", "#d4d4d8", "#facc15", "#67e8f9", "#86efac", "#f9a8b4"];

const EDGES = {
  none: "none",
  shadow: "0 2px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)",
  outline: "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 3px #000",
};

// The look as CSS declarations — for the ::cue rule and the preview alike.
export function cueDecl(s, base = 1.05) {
  return {
    color: s.color,
    background: `rgba(0,0,0,${(s.bg / 100).toFixed(2)})`,
    fontWeight: s.bold ? 700 : 500,
    textShadow: EDGES[s.edge] || "none",
    fontSize: `${(base * s.size / 100).toFixed(3)}rem`,
  };
}

// A ::cue rule for the player's video, at each of the sizes index.css uses.
export function subtitleCss(selector, s) {
  const rule = (base) => {
    const d = cueDecl(s, base);
    return `${selector}::cue{color:${d.color};background:${d.background};font-weight:${d.fontWeight};text-shadow:${d.textShadow};font-size:${d.fontSize};}`;
  };
  return `${rule(1.05)}@media (min-width:768px){${rule(1.35)}}@media (min-width:1280px){${rule(1.6)}}`;
}

function Row({ label, children }) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-white/85">{label}</p>
      {children}
    </div>
  );
}

function Slider({ value, min, max, step = 1, onChange, suffix, icon }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-white cursor-pointer" />
      <span className="w-16 text-right text-sm font-medium text-white/85 tabular-nums">{suffix(value)}</span>
    </div>
  );
}

function Segments({ value, options, onChange }) {
  return (
    <div className="flex p-1 rounded-xl bg-white/[0.06] border border-white/10">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${value === v ? "bg-white text-black" : "text-white/75 hover:text-white"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SubtitleStyle({ value, onChange, onClose, preview }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const d = cueDecl(value, 1.05);

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[720px] max-h-[88%] flex flex-col rounded-2xl bg-[#16181f]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-7 pt-5 pb-3">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Subtitles</h3>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onChange({ ...SUB_DEFAULTS })} aria-label="Reset to default"
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10"><RotateCcw size={17} /></button>
            <button type="button" onClick={onClose} aria-label="Close"
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10"><CloseIcon size={20} /></button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 sm:px-7 pb-6 space-y-6">
          {/* Preview: the title's own picture, with a line set as chosen. */}
          <div className="relative aspect-[16/5] rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-700 to-slate-900">
            {preview && <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />}
            <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: `${Math.min(value.line, 92) - 6}%` }}>
              <span className="px-2 py-0.5 rounded leading-snug text-center" style={{ ...d, fontSize: `${(1.05 * value.size) / 100}rem` }}>
                This is how subtitles look
              </span>
            </div>
          </div>

          <Row label="Text size">
            <Slider value={value.size} min={60} max={200} step={5} onChange={(v) => set({ size: v })} suffix={(v) => `${v}%`}
              icon={<Type size={18} className="text-white/60 shrink-0" />} />
          </Row>

          <Row label="Colour">
            <div className="flex flex-wrap gap-3">
              {COLOURS.map((c) => (
                <button key={c} type="button" onClick={() => set({ color: c })} aria-label={`Colour ${c}`}
                  className={`w-9 h-9 rounded-full transition-transform hover:scale-110 ${value.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#16181f]" : ""}`}
                  style={{ background: c }} />
              ))}
            </div>
          </Row>

          <Row label="Text edge">
            <Segments value={value.edge} onChange={(v) => set({ edge: v })}
              options={[["none", "None"], ["shadow", "Shadow"], ["outline", "Outline"]]} />
          </Row>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/85">Bold text</p>
            <button type="button" role="switch" aria-checked={value.bold} onClick={() => set({ bold: !value.bold })}
              className={`relative w-12 h-7 rounded-full transition-colors ${value.bold ? "bg-white" : "bg-white/20"}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full transition-all ${value.bold ? "left-6 bg-black" : "left-1 bg-white"}`} />
            </button>
          </div>

          <Row label="Background">
            <Slider value={value.bg} min={0} max={100} step={5} onChange={(v) => set({ bg: v })} suffix={(v) => (v ? `${v}%` : "None")} />
          </Row>

          <Row label="Position">
            <Slider value={value.line} min={60} max={94} onChange={(v) => set({ line: v })}
              suffix={(v) => (v >= 90 ? "Bottom" : v <= 68 ? "Higher" : `${v}%`)} />
          </Row>

          <Row label="Sync">
            <Slider value={value.delay} min={-10} max={10} step={0.25} onChange={(v) => set({ delay: v })}
              suffix={(v) => (v === 0 ? "In sync" : `${v > 0 ? "+" : ""}${v}s`)} />
            <p className="text-xs text-white/40">Subtitles too early? Move right to show them later. Too late? Move left.</p>
          </Row>
        </div>
      </div>
    </div>
  );
}
