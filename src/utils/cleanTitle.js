// Turn a raw release name into something a person would read and click.
//
//   "MUSAFIR CAFE (2026) S01 EP (01-08) TRUE WEB-DL - [1080P...] - ESUB"
//      cleanTitle   → "MUSAFIR CAFE"
//      displayTitle → "MUSAFIR CAFE Season 1 (2026)"
//
// One parser, in seo.js, is shared with the page metadata so a card and the
// <title> Google reads can never disagree. It cuts at the year — everything
// after it in a release name is technical — and keeps the name whole, so
// "Court - State vs A Nobody" survives rather than being truncated to "Court".
import { titleForSearch } from "./seo";

export const cleanTitle = (t = "") => (t ? titleForSearch(t).name : "");

/* The card version. A year and a season are worth keeping: they are how people
   tell one release from another, and "Bigg Boss Kannada Season 13" is a far
   better thing to click than "Bigg Boss Kannada". */
export const displayTitle = (t = "") => {
  if (!t) return "";
  const { name, year, season } = titleForSearch(t);
  return `${name}${season ? ` Season ${Number(season)}` : ""}${year ? ` (${year})` : ""}`;
};
