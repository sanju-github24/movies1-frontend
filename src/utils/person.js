/* Where a cast member's face links to. The TMDB person id when the cast list
   carries one; otherwise the name, which /api/tmdb-person looks up — cast
   lists saved before ids were kept still link somewhere sensible. */
export const personLink = (actor) =>
  actor?.id ? `/person/${actor.id}` : actor?.name ? `/person/${encodeURIComponent(actor.name)}` : null;
