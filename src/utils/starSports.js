/* Star Sports 1 and 2 as one channel each, with every commentary language a
 * switch inside it.
 *
 * Read from the live JioTV list the worker serves, so a language that drops
 * out of that list drops out here too, and one that is added appears without
 * anyone editing channels.js. JioTV rather than Hotstar because Jio's CDN
 * plays straight from the browser; Hotstar's has to go round through the
 * Mumbai proxy, which takes most of a minute to wake.
 */
import { langName, preferredLangs } from "./langs";

const WORKER = "https://jtv-proxy.sanjusanjay0444.workers.dev/";
const PLAYER = "https://m3u8-player-orcin.vercel.app/";

// "Star Sports 1", "Star Sports 1 Hindi HD", "Star Sports 2 Tamil" — and not
// Select, Khel or 3, which are other channels rather than other languages.
const NAME = /^star sports ([12])(?: (hindi|tamil|telugu|kannada|malayalam|marathi|bengali|bangla))?( hd)?$/i;
const ORDER = ["ENG", "HIN", "TAM", "TEL", "KAN", "MAL", "MAR", "BEN"];
const rank = (code) => { const i = ORDER.indexOf(code); return i === -1 ? ORDER.length : i; };

const TTL = 10 * 60_000;
let cache = null, cachedAt = 0;

/* [{ num: "1", languages: [{ code, label, id, url, logo }] }, { num: "2", … }]
   Only the channels the feed has; an empty array when it has neither. */
export async function fetchStarSportsGroups() {
  if (cache && Date.now() - cachedAt < TTL) return cache;
  const r = await fetch(`${WORKER}?_=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`Feed HTTP ${r.status}`);
  const rows = await r.json();

  const byNum = {};
  for (const ch of Array.isArray(rows) ? rows : []) {
    const m = NAME.exec(String(ch.channel_name || "").trim());
    if (!m || !ch.channel_id || ch.token_expired === true) continue;
    const code = m[2] ? (/^bangla$/i.test(m[2]) ? "BEN" : m[2].slice(0, 3).toUpperCase()) : "ENG";
    const hd = !!m[3];
    const langs = (byNum[m[1]] ||= {});
    // Each language is listed in SD and HD; the HD one is the one to play.
    if (langs[code] && (langs[code].hd || !hd)) continue;
    langs[code] = {
      code, label: langName(code), hd,
      id: String(ch.channel_id),
      logo: ch.channel_logo || "",
      url: `${PLAYER}?tab=live&id=${encodeURIComponent(ch.channel_id)}&solo=1`,
    };
  }

  cache = ["1", "2"].filter((n) => byNum[n]).map((num) => ({
    num,
    languages: Object.values(byNum[num]).sort((a, b) => rank(a.code) - rank(b.code)),
  }));
  cachedAt = Date.now();
  return cache;
}

// The viewer's own language if the channel carries it, then English, then Hindi.
export function preferredLanguage(languages) {
  for (const want of [...preferredLangs(), "ENG", "HIN"]) {
    const hit = languages.find((l) => l.code === want);
    if (hit) return hit;
  }
  return languages[0];
}
