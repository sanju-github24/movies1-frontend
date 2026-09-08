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
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import NotifyButton from "./NotifyButton";

const API = import.meta.env.VITE_BACKEND_URL || "https://movies1-backend.onrender.com";

/* The channel invitation, on every page.
   A channel nobody can find announces to nobody — and a visitor who joins is
   worth far more than one who reads a page and leaves, because they see every
   upload from then on without having to find us again. The link comes from the
   server so it always matches the channel actually configured, and nothing is
   rendered at all when there is no channel to join. */
const TelegramLink = () => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/telegram/channel`)
      .then((r) => r.json())
      .then((d) => { if (alive && d?.enabled && d.url) setUrl(d.url); })
      .catch(() => { /* no channel, no invitation */ });
    return () => { alive = false; };
  }, []);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase
                 tracking-widest bg-sky-600 hover:bg-sky-500 border border-sky-500 text-white transition"
    >
      <Send size={14} /> Join our Telegram
    </a>
  );
};

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
        <p className="mb-4">Movies and web series in Tamil, Telugu, Kannada, Hindi, Malayalam and
           English — streaming in HD with download links.</p>
        {/* The two channels that do not depend on anyone's ranking algorithm. */}
        <div className="flex flex-wrap gap-2">
          <NotifyButton />
          <TelegramLink />
        </div>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
