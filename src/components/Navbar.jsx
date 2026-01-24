// src/components/Navbar.jsx
import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate, NavLink, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { supabase } from "../utils/supabaseClient";
import { 
  X, Search, Home, Clock3, MonitorPlay, 
  Tv, User, Globe, Menu, ChevronRight, ChevronDown, ArrowLeft, LogOut, Settings
} from "lucide-react";

// --- Sub-Component: Floating Watch Menu ---
const WatchOptionsPopup = ({ onClose, onNavigate }) => (
  <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-56 bg-white text-black rounded-2xl shadow-2xl p-2 z-[110] border border-gray-100 animate-slide-up-fade">
    <div className="flex justify-between items-center px-3 py-2 border-b border-gray-50 mb-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Streaming Options</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X className="w-4 h-4" />
        </button>
    </div>
    <ul className="space-y-1">
      <li>
        <button
          onClick={() => { onNavigate("/watch"); onClose(); }}
          className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl flex items-center gap-3 text-gray-800 transition"
        >
          <Tv className="w-5 h-5 text-blue-500" /> 
          <span className="text-sm font-bold">Movies & Shows</span>
        </button>
      </li>
      <li>
        <button
          onClick={() => { onNavigate("/live-cricket"); onClose(); }}
          className="w-full text-left px-4 py-3 hover:bg-red-50 rounded-xl flex items-center gap-3 text-red-600 transition"
        >
          <div className="relative">
            <MonitorPlay className="w-5 h-5 text-red-500" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
          </div>
          <span className="text-sm font-black">Live Cricket</span>
        </button>
      </li>
    </ul>
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white"></div>
  </div>
);

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsLoggedIn, setUserData } = useContext(AppContext);

  const [session, setSession] = useState(null); // Supabase Session State
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [showWatchOptions, setShowWatchOptions] = useState(false);

  const profileRef = useRef(null);
  const langRef = useRef(null);
  const watchButtonRef = useRef(null);
  const mobileInputRef = useRef(null);

  const languages = ["Tamil", "Telugu", "Kannada", "Hindi", "Malayalam", "English"];

  // 🔐 SUPABASE AUTH SYNC
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (watchButtonRef.current && !watchButtonRef.current.contains(e.target)) setShowWatchOptions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) mobileInputRef.current.focus();
  }, [mobileSearchOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setIsLoggedIn(false);
    setUserData(null);
    setProfileOpen(false);
    navigate("/login1");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
      setMobileSearchOpen(false);
      setSearchTerm("");
    }
  };

  const handleNavigateCategory = (name) => {
    navigate(`/category/${encodeURIComponent(name)}`);
    setMobileOpen(false);
    setLangOpen(false);
  };

  // Helper to get letter for icon
  const getInitial = () => {
    if (!session?.user) return "";
    const name = session.user.user_metadata?.full_name;
    return (name ? name[0] : session.user.email[0]).toUpperCase();
  };

  return (
    <nav className="w-full bg-blue-700 text-white sticky top-0 z-50 shadow-lg font-sans">
      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-between px-10 h-16 max-w-7xl mx-auto">
        <Link to="/" className="shrink-0">
          <img src="/logo_3.png" alt="logo" className="h-35 object-contain" />
        </Link>

        <div className="flex items-center gap-8">
          <ul className="flex items-center gap-6 text-sm font-bold uppercase tracking-tight">
            <li><Link to="/latest" className="hover:text-blue-200 transition">Latest</Link></li>
            
            <li className="relative" ref={langRef}>
              <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1 hover:text-blue-200 transition">
                Languages <ChevronDown size={14} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute top-full mt-2 left-0 w-48 bg-white text-black rounded-xl shadow-2xl py-2 z-50 border border-gray-100 animate-slide-up-fade">
                  {languages.map(lang => (
                    <button key={lang} onClick={() => handleNavigateCategory(lang)} className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-700 transition font-bold text-xs">
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </li>

            <li className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <Link to="/live-cricket" className="text-red-300 hover:text-white transition">Live Cricket</Link>
            </li>
            <li><Link to="/blogs" className="hover:text-blue-200 transition">Blogs</Link></li>
            <li><Link to="/watch" className="hover:text-blue-200 transition">Watch</Link></li>
          </ul>

          <form onSubmit={handleSearchSubmit} className="relative bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full px-4 py-1.5 w-64 flex items-center group focus-within:bg-white focus-within:text-black transition-all">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent w-full text-sm outline-none placeholder:text-white/50 group-focus-within:placeholder:text-gray-400"
            />
            <Search className="w-4 h-4 opacity-50 group-focus-within:opacity-100" />
          </form>
        </div>

        {/* PROFILE SECTION DESKTOP */}
        <div className="relative" ref={profileRef}>
          {session ? (
            <>
              <button onClick={() => setProfileOpen(!profileOpen)} className="w-10 h-10 rounded-full bg-black border-2 border-white flex items-center justify-center font-black shadow-lg hover:scale-105 transition-all">
                {getInitial()}
              </button>
              {profileOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-white text-black rounded-2xl shadow-2xl py-3 z-[60] border border-gray-100 animate-slide-up-fade">
                  <div className="px-5 py-3 border-b border-gray-50 mb-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Logged in as</p>
                    <p className="font-bold text-sm truncate">{session.user.user_metadata?.full_name || session.user.email}</p>
                  </div>
                  <button onClick={() => {navigate("/profile"); setProfileOpen(false);}} className="w-full text-left px-5 py-3 hover:bg-blue-50 flex items-center gap-3 transition font-bold text-sm">
                    <Settings size={18} className="text-gray-400" /> Profile Settings
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-5 py-3 hover:bg-red-50 text-red-600 flex items-center gap-3 transition font-bold text-sm">
                    <LogOut size={18} /> Logout Session
                  </button>
                </div>
              )}
            </>
          ) : (
            <button onClick={() => navigate("/auth")} className="bg-white text-blue-700 font-bold px-6 py-2 rounded-full hover:bg-blue-50 transition shadow-md">Login</button>
          )}
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="sm:hidden flex items-center justify-between px-4 h-14 border-b border-white/10">
        <button onClick={() => setMobileOpen(true)} className="p-2"><Menu /></button>
        <Link to="/"><img src="/logo_39.png" alt="logo" className="h-8" /></Link>
        <button onClick={() => setMobileSearchOpen(true)} className="p-2"><Search /></button>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[120] sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 left-0 w-80 h-full bg-white text-black p-6 animate-slide-right shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-xl text-blue-700 italic tracking-tighter">AnchorMovies</h3>
              <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X /></button>
            </div>
            
            <ul className="space-y-2 font-bold text-gray-700 mb-8">
              <li><Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition"><Home size={20} className="text-blue-600"/> Home</Link></li>
              <li><Link to="/latest" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition"><Clock3 size={20} className="text-blue-600"/> Latest Uploads</Link></li>
              <li><Link to="/watch" onClick={() => setMobileOpen(false)} className="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition"><Tv size={20} className="text-blue-600"/> Watch Movies</Link></li>
              <li>
                <Link to="/live-cricket" onClick={() => setMobileOpen(false)} className="flex items-center justify-between p-3 bg-red-50 text-red-600 rounded-xl transition">
                  <div className="flex items-center gap-4"><MonitorPlay size={20}/> Live Cricket</div>
                  <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                </Link>
              </li>
            </ul>

            <div className="mt-auto pt-6 border-t border-gray-100">
              {!session ? (
                <button onClick={() => {navigate("/auth"); setMobileOpen(false);}} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl">Login to Anchor</button>
              ) : (
                <div className="flex items-center gap-4 p-2">
                    <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-black text-xl">{getInitial()}</div>
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

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-blue-800 border-t border-white/10 flex justify-around items-center h-16 pb-1 z-[100] shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        <NavLink to="/" end className={({isActive}) => `flex flex-col items-center gap-1 transition ${isActive ? 'text-white' : 'text-white/50'}`}>
          <Home size={22} /> <span className="text-[10px] font-bold">Home</span>
        </NavLink>
        <NavLink to="/latest" className={({isActive}) => `flex flex-col items-center gap-1 transition ${isActive ? 'text-white' : 'text-white/50'}`}>
          <Clock3 size={22} /> <span className="text-[10px] font-bold">Latest</span>
        </NavLink>
        <div className="relative -mt-8 flex items-center justify-center">
          <button onClick={() => setMobileSearchOpen(true)} className="w-14 h-14 bg-white text-blue-700 rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-800 active:scale-90 transition">
            <Search size={24} />
          </button>
        </div>
        <div className="relative" ref={watchButtonRef}>
          <button onClick={() => setShowWatchOptions(!showWatchOptions)} className={`flex flex-col items-center gap-1 transition ${showWatchOptions || location.pathname.includes('watch') ? 'text-white' : 'text-white/50'}`}>
            <Tv size={22} /> <span className="text-[10px] font-bold">Watch</span>
          </button>
          {showWatchOptions && <WatchOptionsPopup onClose={() => setShowWatchOptions(false)} onNavigate={(path) => { navigate(path); setShowWatchOptions(false); }} />}
        </div>
        <button onClick={() => { session ? navigate("/profile") : navigate("/login1"); }} className={`flex flex-col items-center gap-1 transition ${location.pathname === '/profile' ? 'text-white' : 'text-white/50'}`}>
          <User size={22} /> <span className="text-[10px] font-bold">Account</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;