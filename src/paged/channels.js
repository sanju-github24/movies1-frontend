// channels.js — single source of truth for all live stream channels
// Import from here in both LiveCricketTV.jsx and MatchCenter.jsx
//
// Each channel has a `group` field. LiveChannelSwitcher renders one collapsible
// dropdown per group (Star Sports, Willow, FanCode, Sony, …).

export const CRICKET_CHANNELS = [
  {
    id: "star-english", name: "Star Sports-1", sub: "English HD",
    group: "Star Sports",
    color: "#00a8e1", glow: "rgba(0,168,225,0.3)", border: "rgba(0,168,225,0.25)",
    bg: "rgba(0,168,225,0.06)", tag: "ENGLISH", useIcon: false,
    logo: "/star-sports-1.jpg",
    url: "https://m3u8-player-ashen.vercel.app/?sid=ae20ybhnk6u3&chid=AAsD&t=IAxTQhJmCAUbGwBYAxB6cQ",
    desc: "Star Sports 1 HD — Live cricket in English HD",
  },
  {
    id: "star-hindi", name: "Star Sports", sub: "Hindi HD",
    group: "Star Sports",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "HINDI", useIcon: false,
    logo: "/star-sports-1-hindi.jpg",
    url: "https://m3u8-player-ashen.vercel.app/?sid=m0oj508fj7ye&chid=AAsDWA&t=IAxTQhJmCAUbGwBYAxB6XBYOAE87PA",
    desc: "Star Sports Hindi HD — Live cricket in Hindi HD",
  },
  {
    id: "star-sports-1-kannada", name: "Star Sports", sub: "Kannada HD",
    group: "Star Sports",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "KANNADA", useIcon: false,
    logo: "/star-sports-1-kannada.jpg",
    url: "https://m3u8-player-ashen.vercel.app/?sid=iu279eb6l93w&chid=AAsDW1Nb&t=IAxTQhJmCAUbGwBYAxB5VBYECAsS",
    desc: "Star Sports Kannada HD — Live cricket in Kannada HD",
  },
  {
    id: "star-sports-1-tamil", name: "Star Sports", sub: "Tamil HD",
    group: "Star Sports",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "TAMIL", useIcon: false,
    logo: "/star-sports-1-tamil.jpg",
    url: "https://m3u8-player-ashen.vercel.app/?sid=kk0euzqekk4j&chid=AAsDRFNY&t=IAxTQhJmCAUbGwBYAxBmVBUDBU87PA",
    desc: "Star Sports Tamil HD — Live cricket in Tamil HD",
  },
  {
    id: "star-sports-1-telugu", name: "Star Sports", sub: "Telugu HD",
    group: "Star Sports",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "TELUGU", useIcon: false,
    logo: "/star-sports-1-telugu.jpg",
    url: "https://m3u8-player-ashen.vercel.app/?sid=nggrr3m0kwmt&chid=AAsDRFdZ&t=IAxTQhJmCAUbGwBYAxBmUBQfDhpTMHY",
    desc: "Star Sports Telugu HD — Live cricket in Telugu HD",
  },
  {
    id: "Willow-Sports", name: "Willow TV", sub: "English",
    group: "Willow",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "ENGLISH", useIcon: false,
    logo: "/willow.svg",
    url: "https://m3u8-player-ashen.vercel.app/?sid=mzo8bm6chvg8&src=https%3A%2F%2Famg01269-amg01269c1-sportstribal-emea-5204.playouts.now.amagi.tv%2Fts-eu-w1-n2%2Fplaylist%2Famg01269-willowtvfast-willowplus-sportstribalemea%2Fcb7f3e1a7b7b6f8a9ac33e6cd9f143a5d1073183573a80303aac5e9e7792155d80b9f7c9b84aeb4a19e24094385631004262d519ce647c968d23f6156b3f4f7f8ae1ec3f8cc50274e38b1f5549a3120e50fe6114d54a543b99c80a188938827c0738e11d210361daf35aab664abef86ef603359bf1843a6c6d2d0acc0602fcb02dfbbdbe0010c76da5b802488b2f5be7922198824df9d9cb5e9d449875f7068993a38dd1438486967eaf50e0304409737bc8cd7bcb9c04fb88cc393cc82170401f57e2a1a1d42453eed19c71829de291279a3ac08d2c801258d162b97cf4fb0ef6c873c3c05da9acc1bf08216be6ac5f10ba36f020769a6113c4ac6a10c4df534fb9bc785954c06c970924349bfcdf15be1274fca30e8aae601134c1de10d5cdf2cbc2b18e439231c5d4fcc37d6b4077010ec670a3992df41a9d40e89f431e0d187bfad315e596c95235554a84ab57c05c4eea8cc5d0894e73e1482f77c42c99570c67c9744b79e626f6d37c4f813405883072aa0c6cce12b2e862a5e7e8e4003aa7d78817ac38a1e65ca09968cd420f193ac1957d0f7a1d28efb91c4a5a1fe44aebd4c6e4056c21fce7c1fbba3e1b0f2b185f09cbafa75fa8cef86b7a32c4402d747b001df4528089beb6b4d99faf0b36e6b65dc6267bd08a8272ae04501d%2F66%2F1920x1080_5859480%2Findex.m3u8&title=Willow-cricket-live",
    desc: "Willow Sports — Live cricket in English",
  },
  {
    id: "fancode-live", name: "FanCode", sub: "Live",
    group: "FanCode",
    color: "#ec1c24", glow: "rgba(236,28,36,0.3)", border: "rgba(236,28,36,0.25)",
    bg: "rgba(236,28,36,0.06)", tag: "LIVE", useIcon: false,
    logo: "/fancode.svg",
    // Permanent FanCode Live channel — chid=fc_live always resolves to whatever
    // FanCode match is currently live (fresh signed token on every open).
    url: "https://m3u8-player-ashen.vercel.app/?sid=7cswis4w7cn1&chid=FRttXFtDHQ&t=g-emhBJmCgNJIxIWWVESYhcHDAFTLkEQYlQTAxobEhYSZ11YHQQ&lg=GwxGQEEPV0UeGARWVFFcVhcODEEQF18fQV4RBgUaA1VHQF5aGQ4aQBAVQR1fUBwDCEAgNB9GQRgoKyJBAxZV",
    desc: "FanCode — always plays the current live match",
  },
  {
    id: "sony-ten-1", name: "Sony Ten 1", sub: "English",
    group: "Sony",
    color: "#f97316", glow: "rgba(249,115,22,0.3)", border: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)", tag: "ENGLISH", useIcon: false,
    logo: "/sony-ten-1.png",
    url: "https://m3u8-player-ashen.vercel.app/?sid=ul1pulp4vklj&chid=ABdcSQM&t=IBdcSRJmCAUbGwBYAxB6cQ&lg=GwxGQEEPV0UDBhwMRFlfVB8PGkEQHFweWFwXRAoAHldWUUBQJwMEDhQdQR9BXRcdGkBBSAAGHwVMR1lXXEoEAAYFQFlaWEFIAgUcXwgNVhgaHEZYDwJIWg",
    desc: "Sony Ten 1 — Live cricket in English",
  },
];

export const FOOTBALL_CHANNELS = [
  {
    id: "sports18-english", name: "Sports18", sub: "English",
    group: "Sports18",
    color: "#1ed596", glow: "rgba(30,213,150,0.3)", border: "rgba(30,213,150,0.25)",
    bg: "rgba(30,213,150,0.06)", tag: "ENG", useIcon: true,
    logo: "",
    url: "https://m3u8-player-ashen.vercel.app/?sid=xxlnzgeutvc7&src=GwxGQEEPV0UFBgUdAgUcXhcPGQgXVlNAQhoUAx8KXEoGBQQET1lcQR5LRwg&t=Bx1BRA",
    desc: "Sports18 — FIFA World Cup 2026 in English",
  },
  {
    id: "sports18-2", name: "Sports18 2", sub: "English",
    group: "Sports18",
    color: "#1ed596", glow: "rgba(30,213,150,0.3)", border: "rgba(30,213,150,0.25)",
    bg: "rgba(30,213,150,0.06)", tag: "ENG", useIcon: true,
    logo: "",
    url: "https://m3u8-player-ashen.vercel.app/?sid=yvlqckxrby06&src=GwxGQEEPV0UaGxwKU1dXGx8FBggfHVNAW0ZWCQYCXBpeRVdfGRMaF1waQUBdRwwZRgIGAG1GW1EdBUYGHRxXSB8EVgdaGks&t=PxFEVRJzEQwI",
    desc: "FIFA World Cup 2026 in English",
  },
  {
    id: "koora-city", name: "Koora City", sub: "English",
    group: "Koora City",
    color: "#a78bfa", glow: "rgba(167,139,250,0.3)", border: "rgba(167,139,250,0.25)",
    bg: "rgba(167,139,250,0.06)", tag: "ENG", useIcon: true,
    logo: "",
    url: "https://m3u8-player-ashen.vercel.app/?sid=vztt78sub09z&src=GwxGQEEPV0UeCl0LX1FAWghEGhscClcfQUUXBRpeLE8AAB1cFg4MF10VAUUK&t=PxFEVRJzEQwI",
    desc: "Koora City — FIFA World Cup 2026",
  },
  {
    id: "sports18-usa", name: "Sports18", sub: "USA Feed",
    group: "Sports18",
    color: "#a78bfa", glow: "rgba(167,139,250,0.3)", border: "rgba(167,139,250,0.25)",
    bg: "rgba(167,139,250,0.06)", tag: "USA", useIcon: true,
    logo: "",
    url: "https://m3u8-player-ashen.vercel.app/?sid=tz3xam78ng4w&src=https%3A%2F%2Fnbculocallive.akamaized.net%2Fhls%2Flive%2F2037499%2Fpuertorico%2Fstream1%2Fmaster_1080.m3u8&title=fifa",
    desc: "Sports18 — FIFA World Cup 2026 USA broadcast",
  },
];
