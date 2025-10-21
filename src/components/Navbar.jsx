
// src/components/Navbar.jsx
import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate, NavLink, useLocation } from "react-router-dom"; // Added useLocation
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../utils/api";
import { supabase } from "../utils/supabaseClient";
import CategoryBar from "./CategoryBar";

// ✅ CORRECTED: Removed Bars3Icon (Heroicons) and ensured all imports are from lucide-react
import {
  X, 
  Search,
  Home,
  Clock3,
  MonitorPlay,
  User,
  Globe,
  LogIn,
  Menu // ✅ Correct Lucide icon for the hamburger menu
} from "lucide-react"; 

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ Get current location for mobile bottom bar
  const { userData, setUserData, setIsLoggedIn, onNavigate, onClose } = useContext(AppContext);

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(userData?.name || "");
  const [showNotifications, setShowNotifications] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState(
    userData?.membershipStatus || "none"
  );
  const [notification, setNotification] = useState(null);

  const profileRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const membershipChannelRef = useRef(null); // prevent multiple subscriptions

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
        setEditingName(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout
  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      await axios.post(`${backendUrl}/api/auth/logout`);
      await supabase.auth.signOut();

      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userData");
      setIsLoggedIn(false);
      setUserData(null);

      navigate("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const userInitial =
    userData?.name?.[0]?.toUpperCase() ??
    userData?.email?.[0]?.toUpperCase() ??
    "U";

  const NotificationPopup = ({ notification, show, onClose }) => {
    if (!show || !notification) return null;
    return (
      <div className="absolute top-10 right-0 bg-white text-black rounded shadow-md z-50 w-64 p-2">
        <div className="flex justify-between items-center mb-2 border-b pb-1">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 font-bold"
          >
            <X className="w-4 h-4" /> 
          </button>
        </div>
        <p className="text-sm px-2 py-1">{notification}</p>
      </div>
    );
  };

  const handleNavigateCategory = (name) => {
    navigate(`/category/${encodeURIComponent(name)}`);
    setMobileOpen(false); // close mobile drawer
  };
  
  // ✅ ENHANCEMENT: Streamlined mobile search handler
  const handleMobileSearch = () => {
    setMobileOpen(true);
    // Focus logic will be handled automatically by the mobileSearchRef if needed, 
    // but the main goal here is to open the drawer where the search bar is located.
  };

  return (
    <nav className="w-full bg-blue-700 text-white sticky top-0 z-50 shadow">
      {/* Desktop Navbar (Minor changes for consistency) */}
      <div className="hidden sm:flex flex-col">
        <div className="flex items-center justify-between px-10 h-16">
          <Link to="/" className="shrink-0">
            <img src="/logo_3.png" alt="logo" className="w-28 md:w-32 object-contain" />
          </Link>

          <div className="flex items-center gap-6 flex-grow justify-center">
            <ul className="flex gap-6 text-sm font-medium">
              <li>
                <Link to="/latest" className="hover:text-blue-200 transition">
                  Latest Uploads
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:text-blue-200 transition">
                  Blogs
                </Link>
              </li>
              <li>
                <Link to="/watch" className="hover:text-blue-200 transition">
                  Watch
                </Link>
              </li>
            </ul>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
                setSearchTerm("");
              }}
              role="search"
              className="ml-6 relative bg-white text-black rounded-full px-4 py-1 w-64 flex items-center shadow-inner"
            >
              <input
                type="text"
                placeholder="Search movies…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent w-full text-sm focus:outline-none pr-6"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-700 transition">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4 relative" ref={profileRef}>
            {userData ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications((v) => !v)}
                    className="p-1 rounded-full hover:bg-white/10 transition"
                  >
                    <img src="/bell.png" alt="Notifications" className="w-6 h-6 filter invert" /> 
                    {notification && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-blue-700"></span>
                    )}
                  </button>
                  <NotificationPopup
                    notification={notification}
                    show={showNotifications}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>

                {/* Profile */}
                <div
                  onClick={() => setProfileOpen((v) => !v)}
                  className="w-9 h-9 rounded-full bg-black flex items-center justify-center font-bold cursor-pointer ring-2 ring-white hover:ring-blue-300 transition"
                >
                  {userInitial}
                </div>

                {profileOpen && (
                  <div className="absolute top-12 right-0 bg-white text-black rounded-lg shadow-2xl z-50 w-48 p-2 border border-gray-200">
                    {editingName ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="border p-1 rounded text-sm focus:border-blue-500 outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!newName.trim()) return toast.error("Name cannot be empty");
                              try {
                                const { data } = await axios.put(
                                  `${backendUrl}/api/user/update-name`,
                                  { newName: newName.trim() }
                                );
                                if (data.success) {
                                  toast.success("Name updated successfully!");
                                  setUserData((prev) => ({ ...prev, name: newName.trim() }));
                                  setEditingName(false);
                                }
                              } catch {
                                toast.error("Error updating name");
                              }
                            }}
                            className="flex-1 bg-blue-600 text-white text-sm px-2 py-1 rounded hover:bg-blue-700 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingName(false)}
                            className="flex-1 bg-gray-200 text-sm px-2 py-1 rounded hover:bg-gray-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ul className="text-sm py-1">
                        <li className="px-4 py-2 border-b text-gray-700 font-semibold truncate">{userData.name}</li>
                        <li>
                          <button
                            onClick={() => setEditingName(true)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span role="img" aria-label="edit">✏️</span> Edit Name
                          </button>
                        </li>
                        <li>
                          <Link
                            to="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-gray-500" /> View Profile
                          </Link>
                        </li>
                        <li>
                          <button
                            onClick={logout}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <LogIn className="w-4 h-4" /> Logout
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-4 py-1.5 rounded-full hover:bg-gray-100 transition shadow"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* Optional Category Bar */}
        <CategoryBar onNavigate={handleNavigateCategory} />
      </div>

{/* Mobile Navbar (Top) */}
<div className="sm:hidden flex items-center justify-between px-4 py-3 bg-blue-700 relative">
  <button onClick={() => setMobileOpen(true)} className="text-white p-2 rounded-lg hover:bg-blue-600 transition">
    <Menu className="w-6 h-6" /> {/* ✅ CORRECTED: Used Menu icon */}
  </button>

  <Link to="/" className="flex items-center justify-center">
    {/* Assuming logo_39.png is the anchor/main logo */}
    <img src="/logo_39.png" alt="Anchor" className="h-9 w-auto object-contain" />
  </Link>

  {/* Mobile Profile Icon */}
  {userData ? (
    <div className="relative" ref={profileRef}>
      <div
        onClick={() => setProfileOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-black flex items-center justify-center font-bold cursor-pointer ring-2 ring-white hover:ring-blue-300 transition"
      >
        {userInitial}
      </div>

      {/* Mobile Profile Dropdown (Kept logic similar to desktop for simplicity) */}
      {profileOpen && (
        <div className="absolute top-10 right-0 bg-white text-black rounded-lg shadow-2xl z-50 w-48 p-2 border border-gray-200">
          {editingName ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border p-1 rounded text-sm focus:border-blue-500 outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!newName.trim()) return toast.error("Name cannot be empty");
                    try {
                      const { data } = await axios.put(
                        `${backendUrl}/api/user/update-name`,
                        { newName: newName.trim() }
                      );
                      if (data.success) {
                        toast.success("Name updated successfully!");
                        setUserData((prev) => ({ ...prev, name: newName.trim() }));
                        setEditingName(false);
                      }
                    } catch {
                      toast.error("Error updating name");
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white text-sm px-2 py-1 rounded hover:bg-blue-700 transition"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="flex-1 bg-gray-200 text-sm px-2 py-1 rounded hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <ul className="text-sm py-1">
              <li className="px-4 py-2 border-b text-gray-700 font-semibold truncate">{userData.name}</li>
              <li>
                <button
                  onClick={() => setEditingName(true)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span role="img" aria-label="edit">✏️</span> Edit Name
                </button>
              </li>
              <li>
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="block px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-gray-500" /> View Profile
                </Link>
              </li>
              <li>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  ) : (
    <button onClick={() => navigate("/login")} className="text-white font-semibold px-2 py-1.5 rounded-full hover:bg-blue-600 transition">
      Login
    </button>
  )}
</div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-[100] transition-all duration-300"> {/* Increased Z-index */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          {/* Drawer Panel */}
          <div className="absolute top-0 right-0 w-72 h-full bg-white shadow-2xl p-4 flex flex-col overflow-y-auto rounded-l-xl transition-transform duration-300 transform translate-x-0">
            
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-blue-700">Anchor Movies</h3>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
                setSearchTerm("");
                setMobileOpen(false);
              }}
              role="search"
              className="relative bg-gray-100 text-black rounded-full px-4 py-2 w-full flex items-center mb-6 shadow-inner"
            >
              <input
                ref={mobileSearchRef} // Use the ref here
                type="text"
                placeholder="Search movies…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent w-full text-sm focus:outline-none pr-6"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                <Search className="w-4 h-4" />
              </button>
            </form>

            {!userData && (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="bg-blue-600 text-white text-center py-2.5 rounded-lg mb-6 font-semibold shadow hover:bg-blue-700 transition"
              >
                <LogIn className="w-5 h-5 inline mr-2"/> Login to Anchor
              </Link>
            )}

            {/* Main Nav Links */}
            <ul className="flex flex-col gap-2 mb-6">
                <Link to="/" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-gray-700 font-medium hover:bg-blue-50 rounded-lg transition flex items-center gap-3"><Home className="w-5 h-5 text-blue-600"/> Home</Link>
                <Link to="/latest" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-gray-700 font-medium hover:bg-blue-50 rounded-lg transition flex items-center gap-3"><Clock3 className="w-5 h-5 text-blue-600"/> Latest Uploads</Link>
                <Link to="/watch" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-gray-700 font-medium hover:bg-blue-50 rounded-lg transition flex items-center gap-3"><MonitorPlay className="w-5 h-5 text-blue-600"/> Watch</Link>
                <Link to="/blogs" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-gray-700 font-medium hover:bg-blue-50 rounded-lg transition flex items-center gap-3"><Globe className="w-5 h-5 text-blue-600"/> Blogs</Link>
            </ul>


            {/* Languages (Mobile) */}
            <details open className="w-full mt-4">
              <summary className="cursor-pointer font-bold text-blue-700 py-3 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center gap-3">
                <Globe className="w-5 h-5"/> Popular Languages
              </summary>
              <div className="mt-3 pl-2 flex flex-col gap-2">
                {["Tamil", "Telugu", "Kannada", "Hindi", "Malayalam", "English"].map(
                  (lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        // Use handleNavigateCategory which includes setMobileOpen(false)
                        handleNavigateCategory(lang); 
                      }}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-left text-sm hover:bg-blue-600 hover:text-white transition shadow-sm"
                    >
                      {lang}
                    </button>
                  )
                )}
              </div>
            </details>

          </div>
        </div>
      )}

{/* Mobile Bottom Navbar - ENHANCED */}
<div className="sm:hidden fixed bottom-0 left-0 right-0 bg-blue-900 border-t-2 border-blue-600 shadow-2xl flex justify-around py-2 z-50 text-xs">
  
  {/* Home */}
  <NavLink
    to="/"
    end
    className={({ isActive }) =>
      `flex flex-col items-center p-1 rounded-lg transition ${
        isActive ? "text-white font-bold bg-blue-700" : "text-gray-300 hover:text-white"
      }`
    }
  >
    <Home className="w-5 h-5" />
    <span className="mt-1">Home</span>
  </NavLink>

  {/* Latest */}
  <NavLink
    to="/latest"
    className={({ isActive }) =>
      `flex flex-col items-center p-1 rounded-lg transition ${
        isActive ? "text-white font-bold bg-blue-700" : "text-gray-300 hover:text-white"
      }`
    }
  >
    <Clock3 className="w-5 h-5" />
    <span className="mt-1">Latest</span>
  </NavLink>

  {/* Center Button - Search/Watch Toggle */}
  <button
    onClick={handleMobileSearch}
    className="flex flex-col items-center -mt-4 p-3 rounded-full bg-white text-blue-700 shadow-xl ring-4 ring-blue-500/50 hover:bg-gray-100 transition transform hover:scale-105"
  >
    <Search className="w-6 h-6" />
    <span className="text-xs mt-1 font-bold">Search</span>
  </button>

  {/* Watch */}
  <NavLink
    to="/watch"
    className={({ isActive }) =>
      `flex flex-col items-center p-1 rounded-lg transition ${
        isActive ? "text-white font-bold bg-blue-700" : "text-gray-300 hover:text-white"
      }`
    }
  >
    <MonitorPlay className="w-5 h-5" />
    <span className="mt-1">Watch</span>
  </NavLink>

  {/* Profile/Login */}
  {userData ? (
    <button
      onClick={() => {
        setProfileOpen((v) => !v);
        // Note: Profile dropdown shows relative to the top bar icon, which is fine
      }}
      className={`flex flex-col items-center p-1 rounded-lg transition ${
        profileOpen ? "text-white font-bold bg-blue-700" : "text-gray-300 hover:text-white"
      }`}
    >
      <User className="w-5 h-5" />
      <span className="mt-1">Profile</span>
    </button>
  ) : (
    <NavLink
      to="/login"
      className={({ isActive }) =>
        `flex flex-col items-center p-1 rounded-lg transition ${
          isActive ? "text-white font-bold bg-blue-700" : "text-gray-300 hover:text-white"
        }`
      }
    >
      <LogIn className="w-5 h-5" />
      <span className="mt-1">Login</span>
    </NavLink>
  )}
</div>
    </nav>
  );
};

export default Navbar;