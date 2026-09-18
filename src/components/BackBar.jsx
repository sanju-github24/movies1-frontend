import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

/* One way back, the same on every page.
 *
 * A page opened from a shared link or a search result has nothing behind it
 * in this site's history, and a plain history-back from there leaves the site
 * altogether. So back goes to the previous page when there is one, and
 * otherwise to where this page lives — a blog post to the blog, a song to
 * Music, a match to Sports — never out of AnchorMovies. */

const PARENTS = [
  [/^\/blogs\/.+/, "/blogs"],
  [/^\/music\/.+/, "/music"],
  [/^\/(tournament|match|match-center)\/.+/, "/sports"],
  [/^\/live-cricket\/.+/, "/live-cricket"],
  [/^\/watch\/search/, "/watch"],
];

export const parentOf = (path) => {
  const hit = PARENTS.find(([re]) => re.test(path));
  return hit ? hit[1] : "/";
};

/* Where this page is, in words, for the bar beside the button. */
const NAMES = [
  [/^\/movie\//, "Movie"],
  [/^\/search-torrent/, "Downloads"],
  [/^\/search/, "Search"],
  [/^\/category\/([^/]+)/, (m) => `${decodeURIComponent(m[1])} Movies`],
  [/^\/latest/, "Latest uploads"],
  [/^\/blogs\/.+/, "Blog"],
  [/^\/blogs/, "Blogs"],
  [/^\/news/, "News"],
  [/^\/watch\/search/, "Search"],
  [/^\/watch$/, "Watch"],
  [/^\/sports/, "Live Sports"],
  [/^\/tournament\//, "Tournament"],
  [/^\/(match|match-center)\//, "Match Centre"],
  [/^\/live-cricket/, "Live Cricket"],
  [/^\/live-stream/, "Live TV"],
  [/^\/music\/search/, "Music search"],
  [/^\/music\/track/, "Song"],
  [/^\/music/, "Music"],
  [/^\/profile/, "Profile"],
];

const nameOf = (path) => {
  for (const [re, name] of NAMES) {
    const m = path.match(re);
    if (m) return typeof name === "function" ? name(m) : name;
  }
  return "";
};

export function useGoBack() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return () => {
    // The router numbers its own history entries; 0 is where the visit began.
    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate(parentOf(pathname), { replace: true });
  };
}

/* Pages that draw a back control of their own in the same place. A second one
   right above it would be two buttons that do the same thing. */
const OWN_BACK = [/^\/live-stream/, /^\/music\/search/, /^\/music\/track\//, /^\/news/];

/* Phones: sits in the blue top bar, beside the menu. */
export function MobileBackButton() {
  const { pathname } = useLocation();
  const goBack = useGoBack();
  if (pathname === "/") return null;
  return (
    <button type="button" onClick={goBack} aria-label="Go back"
      className="p-2 -ml-1 rounded-full active:bg-white/15">
      <ArrowLeft size={24} aria-hidden="true" />
    </button>
  );
}

/* Desktop: a slim bar across the top of the page, clear of the rail. It
   scrolls away with the page rather than sticking — pages keep sticky headers
   of their own at the top, and the rail beside it always has Home. */
export default function BackBar() {
  const { pathname } = useLocation();
  const goBack = useGoBack();
  if (pathname === "/" || OWN_BACK.some((re) => re.test(pathname))) return null;
  const name = nameOf(pathname);

  return (
    <div className="hidden sm:flex items-center gap-3 px-6 lg:px-8 h-12 border-b border-white/5 bg-black relative z-[60]">
      <button type="button" onClick={goBack}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5
                   text-xs font-bold text-gray-200 hover:bg-white/15 hover:text-white transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
      </button>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0 text-xs text-gray-500">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-white transition-colors">
          <Home className="w-3.5 h-3.5" aria-hidden="true" /> Home
        </Link>
        {name && (
          <>
            <span aria-hidden="true">/</span>
            <span className="truncate font-semibold text-gray-300" aria-current="page">{name}</span>
          </>
        )}
      </nav>
    </div>
  );
}
