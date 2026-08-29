/* Read a release filename into the facts a downloader actually chooses by:
   quality, source, codec, how many languages (and which), audio, subtitles,
   size. Everything comes from the name — nothing is fetched — so it works for
   our own uploads and for any link whose filename follows the usual convention:

     "Newton's 3rd Law (2026) - TRUE WEB-DL - 1080p - AVC -
      Tam Tel Hin Mal Kan - DD5.1 - 640Kbps AAC - 8GB - ESub.mkv"
*/

// Short codes and full words → a display language name. Order-independent.
const LANG = {
  tam: "Tamil", tamil: "Tamil",
  tel: "Telugu", telugu: "Telugu",
  hin: "Hindi", hindi: "Hindi",
  mal: "Malayalam", malayalam: "Malayalam",
  kan: "Kannada", kannada: "Kannada",
  eng: "English", english: "English",
  ben: "Bengali", bengali: "Bengali",
  mar: "Marathi", marathi: "Marathi",
  pun: "Punjabi", punjabi: "Punjabi", pan: "Punjabi",
  guj: "Gujarati", gujarati: "Gujarati",
  ori: "Odia", odia: "Odia",
  urd: "Urdu", urdu: "Urdu",
  bho: "Bhojpuri",
};

const QUALITY = /\b(2160p|1440p|1080p|720p|480p|360p|4k)\b/i;
const SOURCE  = /\b(WEB[\s-]?DL|WEB[\s-]?RIP|HDRip|BluRay|BDRip|BRRip|HDTC|PreDVD|DVDRip|HDCAM|CAMRip|HDTV|HQ\s*HDRip)\b/i;
const CODEC   = /\b(x265|x264|HEVC|AVC|H\.?264|H\.?265|10bit)\b/i;
const AUDIO   = /\b(DD\s*5\.1|DDP\s*5\.1|DTS(?:[\s-]?HD)?|TrueHD|Atmos|AAC|AC3|MP3|EAC3|640Kbps)\b/i;
const SIZE    = /\b(\d+(?:\.\d+)?\s?(?:GB|MB))\b/i;

const pretty = (s = "") =>
  s.replace(/\s+/g, " ").replace(/web\s*-?\s*dl/i, "WEB-DL").replace(/web\s*-?\s*rip/i, "WEBRip")
   .replace(/blu\s*-?\s*ray/i, "BluRay").trim();

/** Languages found in the name, de-duped and in the order they appear. */
export function languagesOf(name = "") {
  const found = [];
  const seen = new Set();
  // word-by-word so "Tam Tel Hin" and "Tamil+Telugu" both work
  for (const tok of String(name).toLowerCase().split(/[^a-z]+/)) {
    const lang = LANG[tok];
    if (lang && !seen.has(lang)) { seen.add(lang); found.push(lang); }
  }
  // "Multi Audio" / "Dual Audio" with no explicit list → note it, count unknown
  if (!found.length && /\b(multi|dual)[\s._-]*audio\b/i.test(name)) return { list: [], label: /dual/i.test(name) ? "Dual Audio" : "Multi Audio" };
  return { list: found, label: null };
}

/** { quality, source, codec, languages:{list,label}, audio, subs, size } */
export function parseFileMeta(name = "") {
  const langs = languagesOf(name);
  return {
    quality: ((QUALITY.exec(name) || [])[1] || "").replace(/4k/i, "4K").replace(/P$/, "p") || null,
    source:  pretty((SOURCE.exec(name) || [])[1] || "") || null,
    codec:   (CODEC.exec(name) || [])[1]?.toUpperCase().replace("H264", "H.264").replace("H265", "H.265") || null,
    audio:   (AUDIO.exec(name) || [])[1]?.toUpperCase().replace(/\s+/g, "") || null,
    languages: langs,
    subs:    /\bE?SUBs?\b/i.test(name) || /\bsub(title)?s?\b/i.test(name),
    size:    (SIZE.exec(name) || [])[1]?.toUpperCase().replace(/\s+/g, "") || null,
  };
}

/** The filename a download entry points at — from its path, url, or label. */
export function fileNameOf(link = {}, block = {}) {
  const fromPath = link.path && decodeURIComponent(link.path.split("/").pop() || "");
  if (fromPath) return fromPath;
  try {
    if (link.url) {
      const p = new URL(link.url).pathname;
      const last = decodeURIComponent(p.split("/").pop() || "");
      if (/\.\w{2,4}$/.test(last)) return last;
    }
  } catch { /* not a URL */ }
  return block.name || link.label || "";
}
