/* The tiles of the /categories page, laid out like JioHotstar's own
   (hotstar.com/in/categories): studios, languages, genres. The artwork is
   JioHotstar's tile art, served from its image CDN; each tile links to our
   own page for it.

   Read from JioHotstar's categories page, 2026-10-25. Its genres that our
   catalogue has no titles under (Food, Mythology) are left out; `match` is
   what a genre is called in our catalogue's TMDB genres ("Talk" for a talk
   show, "Action & Adventure" for a series). */
export const hsImg = (src, w = 640) => `https://img10.hotstar.com/image/upload/f_auto,q_auto,w_${w}/${src}`;

export const CATEGORY_STUDIOS = [
  { slug: "jiohotstar",     name: "JioHotstar Specials", art: "sources/r1/cms/prod/5598/1739441155598-a" },
  { slug: "disney-plus",    name: "Disney+",             art: "sources/r1/cms/prod/3703/1747996723703-a" },
  { slug: "hbo-max",        name: "HBO Max",             art: "sources/r1/cms/prod/5531/1775539725531-a" },
  { slug: "peacock",        name: "Peacock",             art: "sources/r1/cms/prod/1888/1789126331888-a" },
  { slug: "paramount-plus", name: "Paramount+",          art: "sources/r1/cms/prod/583/1739358280583-a" },
  // Ours, not on JioHotstar's page: their logos, on the same dark tile.
  { slug: "netflix" }, { slug: "prime-video" }, { slug: "apple-tv" }, { slug: "hulu" },
];

export const CATEGORY_LANGUAGES = [
  { name: "Hindi",     native: "हिन्दी",   art: "sources/r1/cms/prod/6661/1526661-a-00b818b5bc0e" },
  { name: "English",   native: "English",  art: "sources/r1/cms/prod/6660/1526660-a-afdd1ecfd8ae" },
  { name: "Tamil",     native: "தமிழ்",    art: "sources/r1/cms/prod/6682/1526682-a-fd4e220ba563" },
  { name: "Telugu",    native: "తెలుగు",   art: "sources/r1/cms/prod/6685/1526685-a-5f5995a53f61" },
  { name: "Kannada",   native: "ಕನ್ನಡ",    art: "sources/r1/cms/prod/6059/1781241136059-a" },
  { name: "Malayalam", native: "മലയാളം",   art: "sources/r1/cms/prod/6672/1526672-a-eafe6913c6c8" },
  { name: "Marathi",   native: "मराठी",    art: "sources/r1/cms/prod/6674/1526674-a-fdd5233a7699" },
  { name: "Bengali",   native: "বাংলা",    art: "sources/r1/cms/prod/6659/1526659-a-7271cf19114e" },
  { name: "Gujarati",  native: "ગુજરાતી",  art: "sources/r1/cms/prod/9235/1777037879235-a" },
  { name: "Odia",      native: "ଓଡ଼ିଆ",     art: "sources/r1/cms/prod/8137/1498137-a-86c0b069edb0" },
];

export const CATEGORY_GENRES = [
  { name: "Action",    match: ["Action", "Action & Adventure"],  art: "sources/r1/cms/prod/5302/1535302-a-e90748391e0d" },
  { name: "Comedy",    match: ["Comedy"],                        art: "sources/r1/cms/prod/5292/1535292-a-5739f9c84b63" },
  { name: "Drama",     match: ["Drama"],                         art: "sources/r1/cms/prod/5285/1535285-a-88035ca1ae69" },
  { name: "Romance",   match: ["Romance"],                       art: "sources/r1/cms/prod/1112/1750239101112-a" },
  { name: "Crime",     match: ["Crime"],                         art: "sources/r1/cms/prod/5288/1535288-a-690bac400aa1" },
  { name: "Family",    match: ["Family", "Kids"],                art: "sources/r1/cms/prod/5284/1535284-a-656c6b45a905" },
  { name: "Reality",   match: ["Reality"],                       art: "sources/r1/cms/prod/5264/1535264-a-9e7871687c76" },
  { name: "Talk Show", match: ["Talk"],                          art: "sources/r1/cms/prod/5250/1535250-a-b320bf06458d" },
];

/* Genres JioHotstar's page has no tile for, offered as plain tiles after it. */
export const MORE_GENRES = [
  { name: "Thriller",  match: ["Thriller"] },
  { name: "Horror",    match: ["Horror"] },
  { name: "Mystery",   match: ["Mystery"] },
  { name: "Sci-Fi",    match: ["Science Fiction", "Sci-Fi & Fantasy"] },
  { name: "Fantasy",   match: ["Fantasy", "Sci-Fi & Fantasy"] },
  { name: "Animation", match: ["Animation"] },
  { name: "Adventure", match: ["Adventure", "Action & Adventure"] },
  { name: "History",   match: ["History", "War", "War & Politics"] },
  { name: "Documentary", match: ["Documentary"] },
];

export const genreByName = (name) => {
  const n = String(name || "").toLowerCase();
  return [...CATEGORY_GENRES, ...MORE_GENRES].find((g) => g.name.toLowerCase() === n) || null;
};
