import React, { useContext, useState, useEffect, useRef } from 'react';
import { assets } from '../assets/assets';
import { useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { backendUrl } from '../utils/api';
import axios from 'axios';

const Navbar = () => {
  const navigate = useNavigate();
  const { userData, setUserData, setIsLoggedIn } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef(null);
  const hoverTimeout = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = (menu) => {
    clearTimeout(hoverTimeout.current);
    setOpenDropdown(menu);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setOpenDropdown(null), 150);
  };

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (query) {
      navigate(`/search?query=${encodeURIComponent(query)}`);
      setSearchTerm('');
    }
  };

  const isVerified = !!userData?.email_confirmed_at;
  const userInitial =
    userData?.user_metadata?.name?.[0]?.toUpperCase() ||
    userData?.email?.[0]?.toUpperCase() ||
    'U';

  const dropdownStyle = 'absolute bg-white text-black rounded mt-2 min-w-[160px] shadow-md z-50';

  return (
    <nav className="w-full bg-blue-700 text-white flex items-center justify-between px-4 sm:px-10 h-16 sticky top-0 z-50">
      {/* Logo */}
      <Link to="/" className="flex items-center">
        <img src="/logo_3.png" alt="Logo" className="w-24 sm:w-28 md:w-32 h-auto object-contain" />
      </Link>

      {/* Navigation Links */}
      <div className="hidden sm:flex items-center gap-6 flex-grow justify-center relative">
        <ul className="flex gap-6 text-sm font-medium">
          {[
            {
              title: 'Browse',
              items: [
                <Link to="/latest" className="block w-full h-full">Latest Uploads</Link>,
                'Trending',
                'Genres',
              ],
            },
            {
              title: 'Movies',
              items: ['Tamil', 'Telugu', 'Malayalam'],
            },
            {
              title: 'Members Lounge',
              items: ['Forum', 'Support'],
            },
            {
              title: 'Languages',
              items: ['Hindi', 'English', 'Kannada'],
            },
          ].map((menu) => (
            <li
              key={menu.title}
              className="relative cursor-pointer"
              onMouseEnter={() => handleMouseEnter(menu.title)}
              onMouseLeave={handleMouseLeave}
            >
              {menu.title} ▾
              {openDropdown === menu.title && (
                <ul className={dropdownStyle}>
                  {menu.items.map((item, i) => (
                    <li key={i} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                      {typeof item === 'string' ? item : item}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
           {/* New Blog Link */}
  <li className="cursor-pointer hover:underline">
    <Link to="/blogs">Blogs</Link>
  </li>
        </ul>

        {/* Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="ml-6 relative bg-white text-black rounded-full px-4 py-1 w-64 flex items-center"
          role="search"
        >
          <input
            type="text"
            placeholder="Search movies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent w-full text-sm focus:outline-none pr-6"
            aria-label="Search movies"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3917/3917132.png"
              alt="Search"
              className="w-4 h-4 opacity-80"
            />
          </button>
        </form>
      </div>

      {/* User Login/Profile */}
      <div className="flex items-center gap-4">
        {userData ? (
          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-bold cursor-pointer"
            >
              {userInitial}
            </div>

            {profileDropdownOpen && (
              <div className="absolute top-11 right-0 bg-white text-black rounded shadow-md z-50 w-40">
                <ul className="text-sm">
                  {!isVerified && (
                    <li
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        resendEmailVerification();
                      }}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      Verify Email
                    </li>
                  )}
                  <li
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    Logout
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-4 py-1.5 rounded-full hover:bg-gray-100 transition"
          >
            Login
            <img src={assets.arrow_icon} alt="arrow" className="w-4" />
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
