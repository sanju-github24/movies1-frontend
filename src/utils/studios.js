/* Streaming "studios" for the home row and the /studio/:slug page. Each one maps
   to TMDB ids the backend's /api/tmdb-network uses: a network (TV shows) and a
   watch provider + region (movies). JioHotstar leads, region India; the rest
   default to the US catalogue, which is where TMDB's provider data is richest.
   `color` is the wordmark tint on the dark card (logos can be swapped in later). */
export const STUDIOS = [
  { slug: "jiohotstar",     name: "JioHotstar",  color: "#38bdf8", network: 8036, provider: 122, region: "IN" },
  { slug: "netflix",        name: "Netflix",     color: "#e50914", network: 213,  provider: 8,   region: "US" },
  { slug: "disney-plus",    name: "Disney+",     color: "#2ea0ff", network: 2739, provider: 337, region: "US" },
  { slug: "hbo-max",        name: "HBO Max",     color: "#a855f7", network: 3186, provider: 1899, region: "US" },
  { slug: "prime-video",    name: "Prime Video", color: "#00a8e1", network: 1024, provider: 9,   region: "US" },
  { slug: "apple-tv",       name: "Apple TV+",   color: "#f5f5f5", network: 2552, provider: 350, region: "US" },
  { slug: "hulu",           name: "Hulu",        color: "#1ce783", network: 453,  provider: 15,  region: "US" },
  { slug: "peacock",        name: "Peacock",     color: "#fafafa", network: 3353, provider: 387, region: "US" },
  { slug: "paramount-plus", name: "Paramount+",  color: "#5b9bff", network: 4330, provider: 531, region: "US" },
];

export const studioBySlug = (slug) => STUDIOS.find((s) => s.slug === slug) || null;
