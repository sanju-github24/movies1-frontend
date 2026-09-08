/* The site's crawlable index.
 *
 * The language collections were reachable only through the navbar dropdown,
 * which renders nothing until it is opened — so there were zero links to them
 * in the HTML, and a crawler had no path from the home page into the
 * catalogue. A footer is the ordinary answer: it is on every page, it is real
 * markup, and it is useful to a person looking for "the Kannada ones" too.
 *
 * Nothing here is hidden or stuffed — these are six pages that exist, named
 * for what they contain.
 */
import React from "react";
import { Link } from "react-router-dom";

const LANGUAGES = ["Tamil", "Telugu", "Kannada", "Hindi", "Malayalam", "English"];

const SiteFooter = () => (
  <footer className="w-full border-t border-white/10 bg-gray-950 text-gray-400 mt-16">
    <div className="max-w-7xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-3">
      <div>
        <h2 className="text-white font-black text-xs uppercase tracking-widest mb-3">
          Browse by language
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {LANGUAGES.map((lang) => (
            <li key={lang}>
              <Link
                to={`/category/${encodeURIComponent(lang)}`}
                className="hover:text-blue-400 transition"
              >
                {lang} Movies
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-white font-black text-xs uppercase tracking-widest mb-3">Explore</h2>
        <ul className="space-y-2 text-sm">
          <li><Link to="/latest" className="hover:text-blue-400 transition">Latest uploads</Link></li>
          <li><Link to="/watch" className="hover:text-blue-400 transition">Watch online</Link></li>
          <li><Link to="/sports" className="hover:text-blue-400 transition">Live sports</Link></li>
          <li><Link to="/blogs" className="hover:text-blue-400 transition">Blog</Link></li>
        </ul>
      </div>

      <div className="text-xs leading-relaxed">
        <p className="text-white font-black uppercase tracking-widest mb-3">AnchorMovies</p>
        <p>Movies and web series in Tamil, Telugu, Kannada, Hindi, Malayalam and English —
           streaming in HD with download links.</p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
