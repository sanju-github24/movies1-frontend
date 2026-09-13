/* Card sizing for the whole site.

   Every page that lists titles had invented its own column ladder — the home
   catalogue climbed to nine columns inside a 2400px shell while /latest and
   /category stopped at five inside max-w-7xl. On a phone they all happened to
   land in the same place, which is why mobile always looked right; on a wide
   desktop the same card was 150px on one page and 320px on another.

   auto-fill with a min track replaces the ladder outright: the browser fits as
   many columns as the width allows and shares the remainder out, so a card
   lands inside one deliberate size band at every width instead of jumping
   between breakpoints. Two phone columns stay fixed, because a fluid track on
   a 360px screen gives you one enormous card per row.

   Two grids, because this site has two card shapes and they do not want the
   same track. A 2:3 poster at 185px wide is 278px tall — a comfortable card.
   A 16:9 card at that width is 104px tall, which is a thumbnail. Sizing both
   from one number is what left /latest looking starved. */

/* 2:3 portrait posters — the home catalogue. */
export const POSTER_GRID =
  "grid gap-3 sm:gap-4 grid-cols-2 " +
  "sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] " +
  "xl:grid-cols-[repeat(auto-fill,minmax(185px,1fr))] " +
  "min-[1800px]:grid-cols-[repeat(auto-fill,minmax(205px,1fr))]";

/* 16:9 and 16:10 landscape cards — /latest, /category and both search pages.
   Wider tracks so the artwork keeps enough height to read as a still rather
   than as a strip, and the title below it has room for more than one word. */
export const LANDSCAPE_GRID =
  "grid gap-4 sm:gap-5 grid-cols-1 min-[420px]:grid-cols-2 " +
  "sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] " +
  "xl:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] " +
  "min-[1800px]:grid-cols-[repeat(auto-fill,minmax(330px,1fr))]";

/* The shell those cards sit in. max-w-7xl was boxing every listing page into
   1280px, so on a wide monitor the content sat in a narrow column with some
   700px of dead margin either side of it. Wide enough to use a large display,
   capped so a row on an ultrawide does not run past comfortable reading. */
export const POSTER_SHELL = "w-full max-w-[1800px] mx-auto";

/* A single column of rows rather than a grid of cards — the torrent results,
   where each row is a long release name with its buttons. It does not want the
   full 1800px: a row that wide leaves a filename stranded against a download
   button half a metre away. But max-w-4xl (896px) was breaking those names
   across three lines on a display with room to spare. This is the measure
   where a typical release name fits on one or two. */
export const LIST_SHELL = "w-full max-w-[1280px] mx-auto";
