import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../utils/api';
import { assets } from '../assets/assets';
import AdScriptLoader from "../components/AdScriptLoader"; // ✅ adjust path if needed


const Navbar = () => {
  const navigate = useNavigate();
  const { userData, setUserData, setIsLoggedIn } = useContext(AppContext);

  /* ────── state ────── */
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  /* ────── click‑away for profile drop‑down ────── */
  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /* ────── auth helpers (trimmed for brevity) ────── */
  const resendEmailVerification = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(`${backendUrl}/api/auth/resend-verification`, {
        email: userData?.email,
      });

      data.success
        ? toast.success('Verification email sent')
        : toast.error(data.message || 'Failed to send verification email');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(`${backendUrl}/api/auth/logout`);
      if (data.success) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');

        setIsLoggedIn(false);
        setUserData(null);
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  /* ────── search submit ────── */
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/search?query=${encodeURIComponent(q)}`);
      setSearchTerm('');
      setMobileOpen(false); // collapse menu on mobile
    }
  };

  const userInitial =
    userData?.user_metadata?.name?.[0]?.toUpperCase() ??
    userData?.email?.[0]?.toUpperCase() ??
    'U';

  /* ────── JSX ────── */
  return (
    <nav className="w-full bg-blue-700 text-white sticky top-0 z-50 shadow">
      {/* top bar */}
      <div className="flex items-center justify-between px-4 sm:px-10 h-16">

        {/* left: hamburger + logo */}
        <div className="flex items-center gap-4">
          {/* hamburger – mobile only */}
          <button
            className="sm:hidden p-2 focus:outline-none"
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {/* logo */}
          <Link to="/" className="shrink-0">
            <img src="/logo_3.png" alt="logo" className="w-24 sm:w-28 md:w-32 object-contain" />
          </Link>
        </div>

        {/* center: nav links + desktop search */}
        <div className="hidden sm:flex items-center gap-6 flex-grow justify-center">
          <ul className="flex gap-6 text-sm font-medium">
            <li><Link to="/latest" className="hover:underline">Latest Uploads</Link> </li>
            <li><Link to="/blogs" className="hover:underline">Blogs</Link></li>
            
          </ul>
          <AdScriptLoader/>
          

          {/* desktop search – unchanged pill style */}
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="ml-6 relative bg-white text-black rounded-full px-4 py-1 w-64 flex items-center"
          >
            <input
              type="text"
              placeholder="Search movies…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent w-full text-sm focus:outline-none pr-6"
              
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
           
              <img src="https://cdn-icons-png.flaticon.com/512/3917/3917132.png"
                   alt="search" className="w-4 h-4 opacity-80" />
            </button>
            
          </form>
          <AdScriptLoader/>
        </div>
        

        {/* right: user avatar or login */}
        <div className="ml-auto relative" ref={profileRef}>
          {userData ? (
            <>
              <div
                onClick={() => setProfileOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-black flex items-center justify-center font-bold cursor-pointer"
              >
               
                {userInitial}
              </div>
              {profileOpen && (
                <div className="absolute top-11 right-0 bg-white text-black rounded shadow-md z-50 w-40">
                 <ul className="text-sm py-1">
  {!userData?.email_confirmed_at && (
    <li
      onClick={() => {
        setProfileOpen(false);
        resendEmailVerification();
      }}
      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
    >
      Verify Email
    </li>
  )}
  <li
    onClick={() => {
      setProfileOpen(false);
      logout();
    }}
    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
  >
    Logout
  </li>
</ul>

                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:flex items-center gap-2 bg-white text-blue-700 font-semibold px-4 py-1.5 rounded-full hover:bg-gray-100 transition"
            >
              Login
              <img src={assets.arrow_icon} alt="arrow" className="w-4" />
            </button>
          )}
        </div>
      </div>

      {/* mobile slide‑down menu */}
      {mobileOpen && (
  <div className="sm:hidden bg-white border-t border-gray-200 px-4 pb-4 space-y-4 text-black shadow-md">
    {/* Home link */}
    <Link to="/" onClick={() => setMobileOpen(false)} className="block py-2 hover:underline">
      Home
    </Link>

    {/* Mobile search – gray input + blue button */}
    <form onSubmit={handleSearchSubmit} className="flex rounded overflow-hidden">
      <input
        type="text"
        placeholder="Search movies…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-grow p-2 bg-gray-100 placeholder-gray-500 focus:outline-none"
      />
      <button type="submit" className="bg-blue-600 text-white px-4">
        🔍
      </button>
    </form>


          <Link to="/latest" onClick={() => setMobileOpen(false)} className="block py-2 hover:underline">
            Latest Uploads
          
          </Link>
          <Link to="/blogs"  onClick={() => setMobileOpen(false)} className="block py-2 hover:underline">
            Blogs
            
          </Link>

          {!userData && (
            <button
              onClick={() => { setMobileOpen(false); navigate('/login'); }}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
            >
              Login
              
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
