// src/components/Navbar.jsx
import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate, NavLink, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { MobileBackButton } from "./BackBar";
import { supabase } from "../utils/supabaseClient";
import { useMusicPlayer } from "../context/MusicPlayerContext";
import { X, ChevronDown, LogOut, Settings } from "lucide-react";
import { Avatar } from "../utils/avatars";
import { readProfiles } from "../utils/profiles";
/* The rail runs on Material icons rather than Lucide, because it needs a
   matched outline/filled pair for every destination and Lucide ships stroke
   outlines only. Filling a stroke icon does not work — a filled magnifier or
   globe collapses into a solid blob — so the active state had nowhere to go
   except the translucent pill this replaces. Lucide stays for the mobile
   chrome, which is unchanged. */
import {
  MdHome, MdOutlineHome,
  MdWatchLater, MdOutlineWatchLater,
  MdMovie, MdOutlineMovie,
  MdSportsCricket, MdOutlineSportsCricket,
  MdLiveTv, MdOutlineLiveTv,
  MdMusicNote, MdOutlineMusicNote,
  MdPublic, MdOutlinePublic,
  MdLanguage, MdOutlineLanguage,
  MdPerson, MdOutlinePerson,
  MdSearch, MdMenu,
} from "react-icons/md";

/* ── Desktop rail ──────────────────────────────────────────────────────────
   The rail's destinations, in one place, because each one is three pieces of
   markup that only differ by icon and label. Each carries both weights of its
   icon: the outline for every other page, the solid one for the page you are
   actually on.

   No per-item colour any more. The rail is monochrome, so "white" reads as
   "you are here"; a green music note and a red sports icon were each shouting
   the same thing as the active state and drowning it out. */
const RAIL_LINKS = [
  { to: "/",            label: "Home",        Icon: MdOutlineHome,          IconOn: MdHome, end: true },
  { action: "search",   label: "Search",      Icon: MdSearch,               IconOn: MdSearch },
  { to: "/latest",      label: "Latest",      Icon: MdOutlineWatchLater,    IconOn: MdWatchLater },
  { to: "/watch",       label: "Movies",      Icon: MdOutlineMovie,         IconOn: MdMovie },
  { to: "/sports",      label: "Live Sports", Icon: MdOutlineSportsCricket, IconOn: MdSportsCricket },
  { to: "/live-stream", label: "Live TV",     Icon: MdOutlineLiveTv,        IconOn: MdLiveTv },
  { to: "/music",       label: "Music",       Icon: MdOutlineMusicNote,     IconOn: MdMusicNote },
  { to: "/blogs",       label: "Blogs",       Icon: MdOutlinePublic,        IconOn: MdPublic },
];

/* A rail row is a fixed 72px of icon gutter with the label hanging off its
   right edge, so nothing moves horizontally as the rail widens — only the
   label's opacity changes. Sized to 44px so it is a real pointer target. */
const railItem = (isActive) =>
  `w-full h-11 flex items-center rounded-lg pl-[25px] pr-2 transition-colors duration-200
   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
   ${isActive ? "text-white" : "text-gray-300 hover:text-white"}`;

const railLabel = (open) =>
  `ml-5 text-xl font-medium whitespace-nowrap transition-[opacity,transform] duration-200 ease-out
   ${open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"}`;

/* Labels arrive one after another, just behind the widening edge of the rail,
   instead of the whole column appearing at once the moment the pointer lands.

   The stagger is only on the way in. Closing runs with no delay at all: a
   menu that takes its time going away feels broken, and the pointer has
   usually already moved on to whatever it was reaching for. */
const labelDelay = (open, i) => ({ transitionDelay: open ? `${50 + i * 22}ms` : "0ms" });


const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsLoggedIn, setUserData } = useContext(AppContext);

  const [session, setSession] = useState(null);
  /* The profile watching now, for its avatar at the foot of the rail. Read off
     the account, and again whenever the profile page switches or edits one. */
  const [activeProfile, setActiveProfile] = useState(null);
  useEffect(() => {
    const read = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s?.user) { setActiveProfile(null); return; }
      const { list, active } = readProfiles(s.user);
      setActiveProfile(list.find((p) => p.id === active) || null);
    };
    read();
    window.addEventListener("profile-changed", read);
    return () => window.removeEventListener("profile-changed", read);
  }, [session]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);   // desktop: rail is hovered

  const profileRef = useRef(null);
  const langRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const languages = ["Tamil", "Telugu", "Kannada", "Hindi", "Malayalam", "English"];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      setTimeout(() => mobileSearchRef.current.focus(), 100);
    }
  }, [mobileSearchOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
    setRailOpen(false);
    setLangOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const player = useMusicPlayer();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setIsLoggedIn(false);
    setUserData(null);
    setProfileOpen(false);
    navigate("/auth");
  };

  /* Search is a page, not a panel over this one: its own address, Back to
     leave it, results as you type. The music section keeps its own search. */
  const openSearch = () => {
    navigate(location.pathname.startsWith("/music") ? "/music/search" : "/search");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Only the music section searches songs. Everywhere else (home included)
      // searches movies — a song playing in the mini-player must not hijack it.
      const isMusicMode = location.pathname.startsWith("/music");
      if (isMusicMode) {
        navigate(`/music/search?find=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
      }
      setMobileSearchOpen(false);
      setSearchTerm("");
    }
  };

  const getInitial = () => {
    if (!session?.user) return "";
    const name = session.user.user_metadata?.full_name;
    return (name ? name[0] : session.user.email[0]).toUpperCase();
  };

  /* The phone's tab bar gets out of the way of what is being read: it slides
     off as the page scrolls down and comes back the moment it scrolls up, or
     near the top and the bottom of the page. */
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY, ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const nearEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
        if (y < 80 || nearEnd) setNavHidden(false);
        else if (y > last + 8) setNavHidden(true);
        else if (y < last - 8) setNavHidden(false);
        last = y; ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // A new page starts with the bar showing.
  useEffect(() => { setNavHidden(false); }, [location.pathname]);

  return (
    <nav className="text-white font-sans">

      {/* ── Desktop Left Rail ──
          A row of text links across the top was costing the catalogue a band of
          vertical space on every page and still only fit seven destinations. The
          rail keeps to a 72px gutter, so the artwork starts at the top of the
          window, and it has room to grow: hovering it slides the labels out over
          a dimmed page, which is the pattern the big streaming apps settled on
          because it reads as an overlay rather than as a layout shift. */}
      <div className="hidden sm:block" onMouseLeave={() => { setRailOpen(false); setLangOpen(false); }}>
        {/* The wash that puts the page behind the open rail. Click-through is
            deliberate: it is scenery, and closing is a matter of moving away. */}
        {/* Not a flat wash. A single opacity across the whole window mutes the
            artwork everywhere and reads as a grey film laid over the page; the
            reference runs a gradient instead — near-black under the menu,
            falling away to almost nothing by the right edge, so the labels get
            the contrast they need and the hero is still playing behind them.

            Written as an inline gradient rather than Tailwind stops: five
            colour stops is past the point where the arbitrary-value syntax
            stays readable. */}
        <div className={`fixed inset-0 z-[118] pointer-events-none
                         transition-opacity duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]
                         ${railOpen ? "opacity-100" : "opacity-0"}`}
          style={{
            background:
              "linear-gradient(to right," +
              "rgba(0,0,0,0.97) 0%," +
              "rgba(0,0,0,0.93) 18%," +
              "rgba(0,0,0,0.70) 38%," +
              "rgba(0,0,0,0.38) 62%," +
              "rgba(0,0,0,0.18) 100%)",
          }}
          aria-hidden="true" />

        <div
          onMouseEnter={() => setRailOpen(true)}
          /* Transparent at rest. A permanent dark panel down the left edge cut
             the page in two and fought the hero for the same strip of screen —
             the artwork stops dead against a slab of chrome. Collapsed, the
             rail is nothing but its icons over whatever the page is showing;
             it only paints a ground once it opens and actually needs one to
             carry the labels. The icons keep a drop shadow so they survive
             over a bright poster with no panel under them. */
          className={`fixed left-0 top-0 bottom-0 z-[120] flex flex-col
                      overflow-y-auto overflow-x-hidden scrollbar-hide
                      bg-transparent rail-float
                      transition-[width] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]
                      ${railOpen ? "w-72" : "w-[72px]"}`}
        >
          {/* The same mark the browser tab shows, and it does not react to the
              rail opening. The crossfade to a wordmark that used to live here
              meant the one fixed point in the rail moved every time the pointer
              crossed it. Pinned to the icon gutter so it holds its place while
              the labels come out beside it. */}
          <Link to="/" className="shrink-0 relative h-16 mt-5 mb-10 block" aria-label="AnchorMovies home">
            <img src="/favicon-cleaned-256x256.png" alt="AnchorMovies"
              className="absolute left-[18px] top-1/2 -translate-y-1/2 w-9 h-9 object-contain" />
          </Link>

          <ul className="flex flex-col gap-2 px-2">
            {RAIL_LINKS.map((link, i) => {
              const { to, label, end, action } = link;

              // The one row that opens a panel instead of going somewhere.
              if (action === "search") {
                const SearchIcon = link.Icon;
                return (
                  <li key="search">
                    <button type="button" onClick={openSearch} className={railItem(location.pathname === "/search")}>
                      <SearchIcon size={26} className="shrink-0" />
                      <span className={railLabel(railOpen)} style={labelDelay(railOpen, i)}>{label}</span>
                    </button>
                  </li>
                );
              }

              return (
              <li key={to}>
                {/* Children as a render prop, not just the className: the row
                    has to swap the icon's weight on the active route, and that
                    is the only way isActive reaches inside the link. */}
                <NavLink to={to} end={end} className={({ isActive }) => railItem(isActive)}>
                  {({ isActive }) => {
                    // Capitalised local, so lint counts the JSX tag as a use.
                    const RailIcon = isActive ? link.IconOn : link.Icon;
                    return (
                      <>
                        <RailIcon size={26} className="shrink-0" />
                        <span className={railLabel(railOpen)} style={labelDelay(railOpen, i)}>{label}</span>
                      </>
                    );
                  }}
                </NavLink>
              </li>
              );
            })}

            {/* Languages. Collapsed it is a plain link to the rail's own row;
                open, it unfolds in place rather than flying out as a popover,
                which would hang off a 72px rail with nothing to anchor it. */}
            <li ref={langRef}>
              <button type="button"
                onClick={() => { setRailOpen(true); setLangOpen(o => !o); }}
                aria-expanded={langOpen}
                className={railItem(location.pathname.startsWith("/category"))}>
                {location.pathname.startsWith("/category")
                  ? <MdLanguage size={26} className="shrink-0" />
                  : <MdOutlineLanguage size={26} className="shrink-0" />}
                <span className={railLabel(railOpen)} style={labelDelay(railOpen, RAIL_LINKS.length)}>Languages</span>
                <ChevronDown size={14}
                  className={`ml-auto shrink-0 transition-all duration-200
                              ${railOpen ? "opacity-60" : "opacity-0"} ${langOpen ? "rotate-180" : ""}`} />
              </button>
              {railOpen && langOpen && (
                <ul className="pl-[38px] py-1 space-y-0.5">
                  {/* Links, not buttons: an onClick-navigate renders no href,
                      so a crawler could not follow this menu and the language
                      collections had nothing pointing at them. It also restores
                      middle-click and open-in-new-tab. */}
                  {languages.map(lang => (
                    <li key={lang}>
                      <Link to={`/category/${encodeURIComponent(lang)}`}
                        onClick={() => setLangOpen(false)}
                        className="block py-2 text-base font-normal text-gray-400 hover:text-white whitespace-nowrap transition-colors">
                        {lang}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>

          {/* My Space, at the foot of the rail. */}
          <div className="mt-auto px-2 pb-4 pt-4" ref={profileRef}>
            {session ? (
              <>
                <button type="button" onClick={() => { setRailOpen(true); setProfileOpen(o => !o); }}
                  className={railItem(location.pathname === "/profile")}>
                  {activeProfile ? (
                    <Avatar id={activeProfile.avatar} size={30} className="shrink-0" title={activeProfile.name} />
                  ) : (
                    <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                      {getInitial()}
                    </span>
                  )}
                  <span className={railLabel(railOpen)} style={labelDelay(railOpen, RAIL_LINKS.length + 1)}>My Space</span>
                </button>
                {railOpen && profileOpen && (
                  <div className="mt-1 pl-[38px] space-y-0.5">
                    <p className="text-xs font-bold text-gray-500 truncate py-1">
                      {activeProfile?.name || session.user.user_metadata?.full_name || session.user.email}
                    </p>
                    <button onClick={() => { navigate("/profile"); setProfileOpen(false); }}
                      className="flex items-center gap-2 py-2 text-base font-normal text-gray-400 hover:text-white transition-colors whitespace-nowrap">
                      <Settings size={14} /> Profile settings
                    </button>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 py-2 text-base font-normal text-red-400 hover:text-red-300 transition-colors whitespace-nowrap">
                      <LogOut size={14} /> Log out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button type="button" onClick={() => navigate("/auth")} className={railItem(false)}>
                {location.pathname === "/profile"
                  ? <MdPerson size={26} className="shrink-0" />
                  : <MdOutlinePerson size={26} className="shrink-0" />}
                <span className={railLabel(railOpen)} style={labelDelay(railOpen, RAIL_LINKS.length + 1)}>Log in</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile top ──
          No coloured bar: the back button where there is somewhere to go
          back to, the mark, and the full menu. It scrolls away with the page;
          the tab bar at the foot carries the navigation. */}
      <div className="sm:hidden relative z-50 flex items-center justify-between px-3 h-14">
        <div className="flex items-center gap-1">
          <MobileBackButton />
          <Link to="/" aria-label="Home" className="p-1.5">
            <img src="/favicon-cleaned-256x256.png" alt="AnchorMovies" className="h-8 w-8 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          </Link>
        </div>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:bg-white/10 transition">
          <MdMenu size={24} />
        </button>
      </div>

      {/* ── Mobile Search Overlay ── */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-950/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-blue-500">Discovery Engine</h3>
              <button onClick={() => setMobileSearchOpen(false)} className="p-2 bg-white/5 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={location.pathname.startsWith("/music") || !!(player?.currentTrack) ? "Search songs, albums, artists..." : "Search movies, series, TMDB IDs..."}
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 px-6 text-xl outline-none focus:border-blue-500 transition-all text-white font-bold"
              />
              <button type="submit" aria-label="Search" className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 p-3 rounded-xl shadow-lg">
                <MdSearch size={22} />
              </button>
            </form>
            <div className="mt-10">
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] mb-4 text-center">Global Discovery active</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Sidebar ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[120] sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 left-0 w-80 h-full bg-white text-black p-6 animate-in slide-in-from-left duration-300 shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xl text-blue-700 italic tracking-tighter">AnchorMovies</h3>
              <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X />
              </button>
            </div>

            <ul className="space-y-2 font-bold text-gray-700 mb-8">
              <li>
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition">
                  <MdOutlineHome size={22} className="text-blue-600" /> Home
                </Link>
              </li>
              <li>
                <Link to="/latest" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition">
                  <MdOutlineWatchLater size={22} className="text-blue-600" /> Latest Uploads
                </Link>
              </li>
              <li>
                <Link to="/watch" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition">
                  <MdOutlineMovie size={22} className="text-blue-600" /> Watch Movies
                </Link>
              </li>
              <li>
                <Link to="/live-stream" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-purple-50 rounded-xl transition">
                  <MdOutlineLiveTv size={22} className="text-purple-600" /> Live TV
                </Link>
              </li>
              <li>
                <Link to="/music" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-green-50 rounded-xl transition">
                  <MdOutlineMusicNote size={22} className="text-green-600" /> Music
                </Link>
              </li>
              <li>
                <button
                  onClick={() => { navigate("/sports"); setMobileOpen(false); }}
                  className="w-full flex items-center justify-between p-3 bg-red-50 text-red-600 rounded-xl transition"
                >
                  <div className="flex items-center gap-4">
                    <MdOutlineSportsCricket size={22} />
                    <span>Live Sports</span>
                  </div>
                </button>
              </li>
              <li>
                <Link to="/blogs" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition">
                  <MdOutlinePublic size={22} className="text-blue-600" /> Blogs
                </Link>
              </li>
            </ul>

            <div className="mt-auto pt-6 border-t border-gray-100">
              {!session ? (
                <button
                  onClick={() => { navigate("/auth"); setMobileOpen(false); }}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl"
                >
                  Login to Anchor
                </button>
              ) : (
                <div className="flex items-center gap-4 p-2">
                  <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-black text-xl">
                    {getInitial()}
                  </div>
                  <div>
                    <p className="font-black text-sm">{session.user.user_metadata?.full_name || "Explorer"}</p>
                    <button onClick={handleLogout} className="text-xs font-bold text-red-500 uppercase tracking-widest">Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile tab bar ──
          A floating glass pill of round buttons, clear of the screen's edges
          and the home indicator. The page you are on is the white one. */}
      <div
        className={`sm:hidden fixed inset-x-0 z-[100] flex justify-center px-3 pointer-events-none
                    transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${navHidden ? "translate-y-[calc(100%+24px)]" : "translate-y-0"}`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <nav aria-label="Main"
          className="pointer-events-auto w-full max-w-md flex items-center justify-between gap-1 rounded-[26px]
                     bg-[#111116]/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.55)] px-2.5 py-2.5">
          {[
            { to: "/", end: true, label: "Home", Icon: MdOutlineHome, IconOn: MdHome },
            { action: "search", label: "Search", Icon: MdSearch, IconOn: MdSearch },
            { to: "/watch", label: "Movies", Icon: MdOutlineMovie, IconOn: MdMovie },
            { to: "/sports", label: "Live Sports", Icon: MdOutlineSportsCricket, IconOn: MdSportsCricket },
            { to: "/live-stream", label: "Live TV", Icon: MdOutlineLiveTv, IconOn: MdLiveTv },
            { to: "/music", label: "Music", Icon: MdOutlineMusicNote, IconOn: MdMusicNote },
          ].map((item) => {
            const Icon = item.Icon;
            const IconOn = item.IconOn;
            const pill = (on) => `w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-90
                                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                                  ${on ? "bg-white text-black" : "bg-white/[0.07] text-white/85 hover:bg-white/[0.14]"}`;
            if (item.action === "search") {
              return (
                <button key="search" type="button" onClick={openSearch} aria-label="Search" className={pill(location.pathname === "/search" || location.pathname === "/music/search")}>
                  <Icon size={23} />
                </button>
              );
            }
            return (
              <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} className={({ isActive }) => pill(isActive)}>
                {({ isActive }) => (isActive ? <IconOn size={23} /> : <Icon size={23} />)}
              </NavLink>
            );
          })}
          <button type="button" onClick={() => { session ? navigate("/profile") : navigate("/auth"); }}
            aria-label={session ? "Profile" : "Log in"}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition active:scale-90
                        ${location.pathname.startsWith("/profile") ? "ring-2 ring-white" : ""}
                        ${session && activeProfile ? "" : "bg-white/[0.07] text-white/85"}`}>
            {session && activeProfile
              ? <Avatar id={activeProfile.avatar} size={40} />
              : <MdOutlinePerson size={23} />}
          </button>
        </nav>
      </div>
    </nav>
  );
};

export default Navbar;
