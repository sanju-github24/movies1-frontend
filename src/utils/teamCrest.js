/* One place the site gets a picture for a cricket team.

   Two heroes now need this — the sports hero, and the movies home hero once it
   started carrying live matches — and they must not disagree about what India
   looks like. */

/* Crests we host ourselves, by team code.

   The boards' own feeds are not dependable: BCCI sends a logo URL for some
   fixtures and nothing for others, and where it is missing the badge used to
   fall all the way back to a 🏏 emoji — the same picture for both sides of the
   match. A crest we ship is always there and always the right team.

   Add a file to /public/teams and a line here to cover another side. */
export const TEAM_CRESTS = {
  IND: "/teams/ind.webp",
  AFG: "/teams/afg.webp",
};

/* Country flags, for teams we have no crest for. Better than a generic glyph:
   it is at least about this fixture, and there is one for every country. */
const FLAG_ISO = {
  IND: "in", AUS: "au", PAK: "pk", NZ: "nz", SA: "za", RSA: "za", SL: "lk",
  BAN: "bd", AFG: "af", IRE: "ie", ZIM: "zw", ENG: "gb-eng", SCO: "gb-sct",
  NED: "nl", NEP: "np", OMA: "om", UAE: "ae", USA: "us", CAN: "ca", NAM: "na",
  WI: "jm", HK: "hk", PNG: "pg", BER: "bm", KEN: "ke",
};

export const flagImg = (code) => {
  const iso = FLAG_ISO[String(code || "").toUpperCase()];
  return iso ? `https://flagcdn.com/w640/${iso}.png` : null;
};

/* Our crest first, then whatever the feed sent, then the country flag. */
export function teamCrest(code, feedLogo) {
  const key = String(code || "").toUpperCase();
  return TEAM_CRESTS[key] || feedLogo || flagImg(key) || null;
}
