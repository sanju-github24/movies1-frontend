/* Streaming "studios" for the home row and the /studio/:slug page. Each one maps
   to TMDB ids the backend's /api/tmdb-network uses: a network (TV shows) and a
   watch provider + region (movies). JioHotstar leads, region India; the rest
   default to the US catalogue, which is where TMDB's provider data is richest.
   `logo` is the network's own logo on TMDB; `color` tints its card. */
const LOGO = (p) => `https://image.tmdb.org/t/p/w500${p}`;

export const STUDIOS = [
  { slug: "jiohotstar",     name: "JioHotstar",  color: "#38bdf8", network: 8036, provider: 2336, region: "IN", logo: LOGO("/f4UwAB8E6DEQfFhyKEH4NEvwYRt.png") },
  { slug: "netflix",        name: "Netflix",     color: "#e50914", network: 213,  provider: 8,   region: "US", logo: LOGO("/wwemzKWzjKYJFfCeiB57q3r4Bcm.png") },
  { slug: "disney-plus",    name: "Disney+",     color: "#2ea0ff", network: 2739, provider: 337, region: "US", logo: LOGO("/1edZOYAfoyZyZ3rklNSiUpXX30Q.png") },
  { slug: "hbo-max",        name: "HBO Max",     color: "#a855f7", network: 3186, provider: 1899, region: "US", logo: LOGO("/xbYyhmzn6oq3RoV6MT03ZUMMo7L.png") },
  { slug: "prime-video",    name: "Prime Video", color: "#00a8e1", network: 1024, provider: 9,   region: "US", logo: LOGO("/w7HfLNm9CWwRmAMU58udl2L7We7.png") },
  { slug: "apple-tv",       name: "Apple TV+",   color: "#f5f5f5", network: 2552, provider: 350, region: "US", logo: LOGO("/bngHRFi794mnMq34gfVcm9nDxN1.png"), invert: true },
  { slug: "hulu",           name: "Hulu",        color: "#1ce783", network: 453,  provider: 15,  region: "US", logo: LOGO("/pqUTCleNUiTLAVlelGxUgWn1ELh.png") },
  { slug: "peacock",        name: "Peacock",     color: "#fafafa", network: 3353, provider: 387, region: "US", logo: LOGO("/7Y2AtOyMUWCIopISOWv1XwTCJmw.png") },
  { slug: "paramount-plus", name: "Paramount+",  color: "#5b9bff", network: 4330, provider: "2303|2616", region: "US", logo: LOGO("/fi83B1oztoS47xxcemFdPMhIzK.png") },
];

export const studioBySlug = (slug) => STUDIOS.find((s) => s.slug === slug) || null;
