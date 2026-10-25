import React from "react";
import {
  House, Search, Clock3, Popcorn, Volleyball, TvMinimal, Music2, Newspaper,
  LayoutDashboard, CircleUserRound,
} from "lucide-react";

/* The navbar's icons, drawn the way JioHotstar's rail draws its own: thin
   outlined glyphs (house, search, popcorn for movies, a TV, a grid for
   categories) at rest, and the same glyph in a heavier stroke when its page
   is open. Open-source Lucide icons in that style — not JioHotstar's files.
   Each pair is { Icon, IconOn }, and both take the react-icons props the
   navbar already passes (size, className). */
const pair = (L) => ({
  Icon: (p) => <L strokeWidth={1.5} {...p} />,
  IconOn: (p) => <L strokeWidth={2.4} {...p} />,
});

export const NAV_ICONS = {
  home: pair(House),
  search: pair(Search),
  latest: pair(Clock3),
  movies: pair(Popcorn),
  sports: pair(Volleyball),
  tv: pair(TvMinimal),
  music: pair(Music2),
  blogs: pair(Newspaper),
  categories: pair(LayoutDashboard),
  profile: pair(CircleUserRound),
};
