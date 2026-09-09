/* Is this India's senior men's team playing?
 *
 * There used to be no need to ask: BCCI's old feed only ever returned India
 * fixtures, so a filter that stripped women's and A-team matches was enough.
 * Its replacement (stats.bcci.tv/match/live_scores/) returns every live match
 * in the world, so "not women's" now lets through Duleep Trophy zonal games and
 * Australia v Bangladesh — which is why the home page strip filled up with
 * matches nobody came here for.
 *
 * So the test is positive now: India has to actually be one of the two teams.
 */

/* Competitions we never want, by BCCI competition id. Carried over from the
   sports page, which is where this filter used to live. */
export const BCCI_EXCLUDE_COMP_IDS = new Set([238, 357, 358, 389, 390, 393]);

/* Women's, Under-19 and A-team sides carry it in the team name — "India Women",
 * "India A", "India U19" — so the same check covers both teams and the title. */
const NOT_SENIOR_MEN = /\b(women|wom\b|\bw\d{2}\b|u-?19|under[- ]?19|emerging|legends)\b/i;
const A_TEAM = /\bindia\s+a\b/i;

const isIndiaSide = (name = "", code = "") => {
  const n = String(name).trim();
  if (!n && !code) return false;
  if (NOT_SENIOR_MEN.test(n) || A_TEAM.test(n)) return false;
  // "India" exactly — not "India Women", not "West Indies", which contains it.
  return /^india$/i.test(n) || String(code).trim().toUpperCase() === "IND";
};

export function isIndiaMensMatch(m) {
  if (!m) return false;
  if (BCCI_EXCLUDE_COMP_IDS.has(Number(m.CompetitionID))) return false;

  // A title naming a women's or age-group event disqualifies it outright.
  const title = `${m.MatchName || ""} ${m.CompetitionName || ""}`;
  if (NOT_SENIOR_MEN.test(title) || A_TEAM.test(title)) return false;

  return isIndiaSide(m.HomeTeamName, m.FirstBattingTeamCode)
      || isIndiaSide(m.AwayTeamName, m.SecondBattingTeamCode);
}
