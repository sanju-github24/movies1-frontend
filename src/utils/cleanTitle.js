// Turn a raw release name into a clean display title, e.g.
// "MUSAFIR CAFE (2026) S01 EP (01-08) TRUE WEB-DL - [1080P...] - ESUB" → "Musafir Cafe".
export const cleanTitle = (t = "") => {
  if (!t) return "";
  let s = t.split(/\s*[([]?\s*(?:19|20)\d{2}/)[0];
  s = s.split(/\s+(?:S\d{1,2}|Season|EP\d|Complete|WEB[\s-]?DL|HDRip|BluRay|1080p|720p|480p|2160p)/i)[0];
  s = s.replace(/[\s\-_.|]+$/g, "").trim();
  return s || t;
};
