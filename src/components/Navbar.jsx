// src/components/Navbar.jsx
import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../utils/api";
import { assets } from "../assets/assets";
import { supabase } from "../utils/supabaseClient";
import CategoryBar from "./CategoryBar";

import {
  Bars3Icon,
} from "@heroicons/react/24/outline";

const Navbar = () => {
  const navigate = useNavigate();
  const { userData, setUserData, setIsLoggedIn } = useContext(AppContext);

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

  // Real-time membership status
  

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
            &times;
          </button>
        </div>
        <p className="text-sm px-2 py-1">{notification}</p>
      </div>
    );
  };

  const handleNavigateCategory = (name) => {
    navigate(`/categories?name=${encodeURIComponent(name)}`);
    setMobileOpen(false);
  };

  const handleMobileSearchClick = () => {
    setMobileOpen(true);
    setTimeout(() => {
      mobileSearchRef.current?.focus();
    }, 100);
  };

  return (
    <nav className="w-full bg-blue-700 text-white sticky top-0 z-50 shadow">
      {/* Desktop Navbar */}
      <div className="hidden sm:flex flex-col">
        <div className="flex items-center justify-between px-10 h-16">
          <Link to="/" className="shrink-0">
            <img src="/logo_3.png" alt="logo" className="w-28 md:w-32 object-contain" />
          </Link>

          <div className="flex items-center gap-6 flex-grow justify-center">
            <ul className="flex gap-6 text-sm font-medium">
              <li>
                <Link to="/latest" className="hover:underline">
                  Latest Uploads
                </Link>
              </li>
              <li>
                <Link to="/blogs" className="hover:underline">
                  Blogs
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
                <img
                  src="https://cdn-icons-png.flaticon.com/512/3917/3917132.png"
                  alt="search"
                  className="w-4 h-4 opacity-80"
                />
              </button>
            </form>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4 relative" ref={profileRef}>
            {userData ? (
              <>
                <div className="relative">
                  <button onClick={() => setShowNotifications((v) => !v)}>
                    <img src="/bell.png" alt="Notifications" className="w-6 h-6" />
                    {notification && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </button>
                  <NotificationPopup
                    notification={notification}
                    show={showNotifications}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>

                <div
                  onClick={() => setProfileOpen((v) => !v)}
                  className="w-9 h-9 rounded-full bg-black flex items-center justify-center font-bold cursor-pointer"
                >
                  {userInitial}
                </div>

                {profileOpen && (
                  <div className="absolute top-12 right-0 bg-white text-black rounded shadow-md z-50 w-48 p-2">
                    {editingName ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="border p-1 rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!newName.trim())
                                return toast.error("Name cannot be empty");
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
                            className="flex-1 bg-blue-600 text-white text-sm px-2 py-1 rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingName(false)}
                            className="flex-1 bg-gray-200 text-sm px-2 py-1 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ul className="text-sm py-1">
                        <li className="px-4 py-2 border-b text-gray-700">{userData.name}</li>
                        <li>
                          <button
                            onClick={() => setEditingName(true)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          >
                            ✏️ Edit Name
                          </button>
                        </li>
                        <li>
                          <Link
                            to="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 hover:bg-gray-100"
                          >
                            👤 View Profile
                          </Link>
                        </li>
                        <li>
                          <button
                            onClick={logout}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          >
                            🚪 Logout
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
                className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-4 py-1.5 rounded-full hover:bg-gray-100 transition"
              >
                Login
                <img src={assets.arrow_icon} alt="arrow" className="w-4" />
              </button>
            )}
          </div>
        </div>

        <CategoryBar onNavigate={handleNavigateCategory} />
      </div>

      {/* Mobile Navbar */}
      <div className="sm:hidden flex items-center justify-between px-4 py-3">
        <button onClick={() => setMobileOpen(true)} className="text-white">
          <Bars3Icon className="w-6 h-6" />
        </button>

        <Link to="/" className="flex items-center justify-center">
          <img src="/logo_39.png" alt="Anchor" className="h-9 w-auto object-contain" />
        </Link>

        <div className="w-6" />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          ></div>

          <div className="absolute top-0 right-0 w-72 h-full bg-white shadow-xl p-4 flex flex-col overflow-y-auto rounded-l-xl">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Menu</h3>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl"
              >
                &times;
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
              className="relative bg-gray-100 text-black rounded-full px-4 py-1 w-full flex items-center mb-4"
            >
              <input
                type="text"
                placeholder="Search movies…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={mobileSearchRef}
                className="bg-transparent w-full text-sm focus:outline-none pr-6"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/3917/3917132.png"
                  alt="search"
                  className="w-4 h-4 opacity-80"
                />
              </button>
            </form>

            {!userData && (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="bg-blue-600 text-white text-center py-2 rounded-md mb-4 font-medium"
              >
                Login
              </Link>
            )}

            {/* Categories */}
            <details className="mb-3">
              <summary className="cursor-pointer font-medium text-gray-800 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200">
                🎬 Categories
              </summary>
              <div className="mt-2 pl-4 flex flex-col gap-2">
                {[
                  "Tamil Language",
                  "Telugu Language",
                  "Kannada Language",
                  "Malayalam Language",
                  "Hindi Language",
                  "Hollywood Movies",
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleNavigateCategory(cat)}
                    className="text-left text-gray-700 hover:text-blue-600 transition"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </details>

            {/* Languages */}
            <details>
              <summary className="cursor-pointer font-medium text-gray-800 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200">
                🌐 Languages
              </summary>
              <div className="mt-2 pl-4 flex flex-col gap-2">
                {["Tamil", "Telugu", "Kannada", "Hindi", "Malayalam", "English"].map(
                  (lang) => (
                    <button
                      key={lang}
                      onClick={() => handleNavigateCategory(lang)}
                      className="text-left text-gray-700 hover:text-blue-600 transition"
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

      {/* Mobile Bottom Navbar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-blue-600 border-t shadow-md flex justify-around py-2 z-50 text-sm">
        <Link to="/" className="flex flex-col items-center text-white">
          <img src="/home.png" alt="Home" className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </Link>

        <Link to="/latest" className="flex flex-col items-center text-white">
          <img src="/routine.png" alt="Latest" className="w-5 h-5" />
          <span className="text-xs">Latest</span>
        </Link>

        <button
          onClick={handleMobileSearchClick}
          className="flex flex-col items-center text-white"
        >
          <img src="/search.png" alt="Search" className="w-5 h-5" />
          <span className="text-xs">Search</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
