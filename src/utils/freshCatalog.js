import { backendUrl } from "./api";

/* The latest releases (backend /api/fresh, read hourly from 1TamilMV and
   HDHub4u and matched to TMDB), shaped as catalogue entries, so a language
   page carries what has just come out in that language and not only what we
   have uploaded. */
const LANG_CODE = { ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam", hi: "Hindi", en: "English",
  bn: "Bengali", mr: "Marathi", pa: "Punjabi", gu: "Gujarati" };
export const freshEntry = (f) => {
  const langs = (f.languages && f.languages.length) ? f.languages
    : (LANG_CODE[f.original_language] ? [LANG_CODE[f.original_language]] : []);
  const at = new Date(f.first_seen || 0);
  return {
    key: `fresh-${f.id}`,
    title: f.title, cleanTitle: f.title, displayTitle: f.title,
    watchSlug: f.slug, movieSlug: null, streamable: true, fresh: true,
    downloads: [], driveLinks: [], downloadable: false,
    poster: f.poster, cover: f.cover_poster || f.poster, titleLogo: f.title_logo || null,
    language: langs, categories: [], subCategory: f.print ? [f.print] : [],
    genres: f.genres || [], imdbRating: f.imdb_rating || null,
    contentType: f.content_type, description: f.description || "",
    createdAt: at, createdAtMs: at.getTime(),
    linkState: { movie: {
      tmdb_id: f.tmdb_id, imdb_id: f.imdb_id || null, title: f.title, slug: f.slug,
      poster: f.poster, cover_poster: f.cover_poster, description: f.description,
      year: f.year, imdb_rating: f.imdb_rating, content_type: f.content_type,
      genres: f.genres || [], title_logo: f.title_logo || null, episodes: [], cast: [], source: "tmdb",
    } },
  };
};

/** The latest releases as catalogue entries; [] if the backend does not answer. */
export async function loadFresh() {
  try {
    const d = await fetch(`${backendUrl}/api/fresh`).then((r) => r.json());
    return (d?.items || []).map(freshEntry);
  } catch { return []; }
}

/* Ours and the latest releases together, newest first. A release we have
   already uploaded keeps our entry (it has our links); its twin is dropped. */
const key = (t) => String(t || "").toLowerCase().split("(")[0].replace(/[^a-z0-9]+/g, " ").trim();
export function mergeFresh(ours, fresh) {
  const have = new Set(ours.map((e) => key(e.cleanTitle || e.title)));
  return [...ours, ...fresh.filter((f) => !have.has(key(f.title)))]
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}
