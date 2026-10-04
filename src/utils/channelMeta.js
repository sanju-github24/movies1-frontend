/**
 * What a live channel is, worked out from what it is called.
 *
 * Hotstar's feed groups its channels; JioTV's 1,100-odd come with an empty
 * group on every one. So the Live TV page reads category and language off the
 * name — "Aaj Tak" is Hindi news, "Colors Kannada" Kannada entertainment, "Sun
 * TV" Tamil — with the feed's own group trusted whenever it has one.
 */

export const CATEGORIES = ["Sports", "News", "Entertainment", "Movies", "Kids", "Music", "Devotional", "Knowledge"];

// Order matters: the first rule that matches wins.
const CATEGORY_RULES = [
  ["Sports", /sport|\bten ?\d|sony six|eurosport|cricket|\bwwe\b|football|golf|racing|khel|\bipl\b|olympic/i],
  ["Kids", /\bkids?\b|cartoon|pogo|\bnick|disney|sonic|hungama|chutti|kushi|kochu ?tv|\bbaby|cbeebies|toon|junior|\bjr\b|chintu|gubbare/i],
  ["News", /news|india tv|ibc ?24|north east live|\bdy ?365|aaj ?tak|ndtv|\babp\b|cnbc|business|\bet now|times now|republic|\btv ?9|india today|wion|samachar|vaarta|varta|khabar|lok ?sabha|sansad|dd india|mirror now|thanthi|puthiya|\bntv\b|\babn\b|sakshi|\bv6\b|10 ?tv|hmtv|\bcvr\b|\bt news|tv ?5|kalinga|\botv\b|odisha tv|bloomberg|\bcnn|\bbbc world|al ?jazeera|france ?24|\bdw\b|euronews|sky news|nhk|bharat ?24|news ?nation|good news today|janam|reporter|media ?one|jaihind|mathrubhumi|manorama news|asianet news|suvarna news|public tv|polimer news|lokshahi|saam|zee 24|\b24 ?ghanta|kolkata tv/i],
  ["Devotional", /aastha|sanskar|bhakti|\bgod\b|sadhna|devotional|shubh|satsang|darshan|ishwar|peace of mind|vedic|katha|gurbani|simran|\bom\b|dharm|jinvani|paras|arihant|krishna|krsna|tirumala|svbc|shraddha|angel tv|shalom|madha|\bqtv\b|ekam|prarthana|sai\b|vedanta|ramayan|mahadev/i],
  ["Music", /music|\bmtv|9xm|9x\b|9x jalwa|zing|sangeet|mastiii|isaiaruvi|musix|\bvh1|channel v|\bhits\b|dhamaal|jalwa|b4u music|e ?24|tunes?\b|gaana|bajao/i],
  ["Movies", /movie|cinema|cine|\bpix\b|\bmax\b|\bgold\b|flix|\bhbo|action|bollywood|filmy|\bfilm|talkies|picture|thirai|cinemalu|chitramandir|manoranjan|anmol cinema|wah\b|b4u kadak|romedy|\bmn\+/i],
  ["Knowledge", /vidya|prabha|discovery|nat ?geo|national geographic|history|animal planet|\btlc\b|travel|food|living|fox life|\bepic\b|bbc earth|knowledge|science|kisan|gyan|\bedu|swayam|good times|zest|safari|vande gujarat|docu/i],
];

const LANGUAGE_RULES = [
  ["Kannada", /kannada|udaya|suvarna|colors super|chintu|namma|kasturi|power tv|\bb ?tv\b|dighvijay|raj kannada|sri sankara|tv9 kannada|news ?first/i],
  ["Tamil", /tamil|sun tv|\bktv\b|vijay|polimer|thanthi|puthiya|kalaignar|\bjaya|raj tv|chutti|adithya|isaiaruvi|sirippoli|murasu|vasanth|mega tv|news ?7 tamil|captain|sathiyam|makkal|peppers|vendhar|thirai|sun music|sun news|zee tamil/i],
  ["Telugu", /telugu|kushi tv|gemini|\bmaa\b|star maa|\betv\b|\bntv\b|sakshi|\babn\b|tv ?5|\bv6\b|10 ?tv|hmtv|\bt news|\bcvr\b|cinemalu|mahaa|svbc|zee telugu|tv9 telugu|bhakti tv/i],
  ["Malayalam", /malayalam|kaumudy|asianet|mazhavil|surya|flowers|manorama|mathrubhumi|kairali|amrita|jaihind|kochu|24 news|reporter|media ?one|janam|kappa|safari|shalom|goodness|zee keralam/i],
  ["Bengali", /bangla|bengali|jalsha|kolkata|aakash|ruposhi|abp ananda|24 ?ghanta|calcutta|sun bangla|enterr10 bangla/i],
  ["Marathi", /marathi|zee talkies|jhakaas|saam|lokshahi|abp majha|zee yuva|fakt|pravah|maiboli|tv9 marathi|zee 24 taas/i],
  ["Gujarati", /gujarati|gujrati|sandesh|gstv|\bvtv\b|abp asmita|zee 24 kalak|vande gujarat/i],
  ["Punjabi", /punjabi|\bptc|chardikla|pitaara|zee punjab|babe ?ji|gurbani|simran/i],
  ["Odia", /odia|oriya|sarthak|tarang|\botv\b|kalinga|alankar|prarthana|nandighosha|odisha/i],
  ["English", /english|nickelodeon|travelxp|ndtv 24x7|times now|wion|\bcnn|\bbbc|\bhbo|star movies|movies now|romedy|\bmn\+|zee cafe|comedy central|colors infinity|\baxn|sony pix|cnbc tv18|\bet now|india today|republic tv|mirror now|discovery|nat ?geo|animal planet|history|\btlc\b|al ?jazeera|france ?24|\bdw\b|euronews|nhk|bloomberg|sky news|\bvh1|mtv beats|cartoon network|pogo|\bnick\b|cbeebies|\bdd india|good times|zest|fox|\bepic\b/i],
  ["Hindi", /hindi|bhojpuri|\bindia\b|news ?18 (mp|up|rajasthan|bihar|haryana)|\bset\b|anmol|awaaz|bajar|sudarshan|sadhna|ibc ?24|zee up|dd (madhya|rajasthan|bihar|uttar)|raj pariwar|news ?24|news ?x\b|vip news|jalwa|aaj ?tak|zee news|abp news|news18 india|india tv|ndtv india|republic bharat|dd national|star plus|\bsony|colors|zee tv|&tv|and tv|\bsab\b|zee anmol|star bharat|dangal|bindass|zee cinema|star gold|\bb4u|zee bollywood|9xm|zing|aastha|sanskar|tv9 bharatvarsh|good news today|news nation|zee hindustan|bharat ?24|dd news|lok ?sabha|sansad|hungama|sonic|disney|zee action|manoranjan|enterr10|shemaroo|ishara|nazara|aaj|bharat/i],
];

const pick = (rules, text) => (rules.find(([, re]) => re.test(text)) || [])[0] || "";

const GROUP_ALIASES = { documentary: "Knowledge", infotainment: "Knowledge", lifestyle: "Knowledge", religious: "Devotional", spiritual: "Devotional", business: "News", music: "Music", movies: "Movies", kids: "Kids", news: "News", sports: "Sports", entertainment: "Entertainment" };

export function categoryOf(name, group = "") {
  const g = GROUP_ALIASES[String(group || "").toLowerCase().trim()];
  if (g) return g;
  return pick(CATEGORY_RULES, String(name || "")) || "Entertainment";
}

// A name that says its language ("Discovery Kids Hindi") is taken at its word first.
const SAID = /\b(kannada|tamil|telugu|malayalam|bengali|bangla|marathi|gujarati|punjabi|odia|oriya|english|hindi)\b/i;
const SAID_AS = { bangla: "Bengali", oriya: "Odia" };

export function languageOf(name) {
  const n = String(name || "");
  const said = (n.match(SAID) || [])[1];
  if (said) { const w = said.toLowerCase(); return SAID_AS[w] || w[0].toUpperCase() + w.slice(1); }
  return pick(LANGUAGE_RULES, n) || "";
}

/* A Hotstar name like "Bigboss 24/7 live-KANNADA" reads better as "Bigg Boss
   24/7 · Kannada"; everything else keeps its name. */
export function displayName(name) {
  const s = String(name || "").trim();
  const bb = s.match(/^bigg?\s*boss\s*24\/7\s*live\s*-\s*(\w+)/i);
  if (bb) return `Bigg Boss 24/7 ${bb[1][0].toUpperCase()}${bb[1].slice(1).toLowerCase()}`;
  return s;
}

export const isHD = (name) => /\bHD\b/.test(String(name || ""));
