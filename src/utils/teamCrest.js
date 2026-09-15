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

/* A team code from a team's name.
 *
 * The fixture feeds name their sides and nothing else — "Australia vs
 * Zimbabwe", never AUS and ZIM — so every flag lookup on this site, keyed by
 * code, had nothing to look up and fell back to an empty circle with the name
 * faded inside it.
 *
 * Only national sides are here. A club has no flag to show, and returning
 * nothing for one is the right answer rather than a near miss. */
const TEAM_CODES = {
  india: "IND", australia: "AUS", pakistan: "PAK", "new zealand": "NZ",
  "south africa": "SA", "sri lanka": "SL", bangladesh: "BAN",
  afghanistan: "AFG", ireland: "IRE", zimbabwe: "ZIM", england: "ENG",
  scotland: "SCO", netherlands: "NED", holland: "NED", nepal: "NEP",
  oman: "OMA", uae: "UAE", "united arab emirates": "UAE", usa: "USA",
  "united states": "USA", canada: "CAN", namibia: "NAM", "west indies": "WI",
  "hong kong": "HK", "papua new guinea": "PNG", bermuda: "BER", kenya: "KEN",
};

export function codeForTeam(name) {
  let n = String(name || "").toLowerCase().trim();
  if (!n) return "";

  /* "India Women", "Australia W", "India A" — the same country, and the same
     flag. Stripped so a women's or second-string fixture is not left blank. */
  n = n
    .replace(/\b(women'?s?|men'?s?)\b/g, " ")
    .replace(/\s+(w|a|u19|u-19|xi)$/i, " ")
    .replace(/\s+/g, " ")
    .trim();

  return TEAM_CODES[n] || "";
}
