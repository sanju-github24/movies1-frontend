// src/components/Navbar.jsx
import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../utils/api";
import { assets } from "../assets/assets";
import { supabase } from "../utils/supabaseClient";

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
  const [membershipStatus, setMembershipStatus] = useState(userData?.membershipStatus || "none");
  const [notification, setNotification] = useState(null);
  const profileRef = useRef(null);

  // Close dropdown on outside click
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

  // Real-time membership status subscription
  useEffect(() => {
    if (!userData?.email) return;

    const channel = supabase
      .channel("membership-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "membership_applications",
          filter: `email=eq.${userData.email}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus !== membershipStatus) {
            setMembershipStatus(newStatus);
            setUserData((prev) => ({ ...prev, membershipStatus: newStatus }));

            // Set notification text
            if (newStatus === "approved") setNotification("✅ Your membership request has been approved!");
            else if (newStatus === "rejected") setNotification("❌ Your membership request was rejected.");
            else if (newStatus === "pending") setNotification("⏳ Your membership request is pending review.");
            else setNotification(null);
          }
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [userData?.email, membershipStatus, setUserData]);

  const logout = async () => {
    try {
      // ✅ Clear backend session (cookie)
      axios.defaults.withCredentials = true;
      await axios.post(`${backendUrl}/api/auth/logout`);
  
      // ✅ Clear Supabase session
      await supabase.auth.signOut();
  
      // ✅ Clear local state & storage
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userData");
      setIsLoggedIn(false);
      setUserData(null);
      setIsAdmin(false); // reset admin flag
  
      // ✅ Navigate to login page
      navigate("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(error.response?.data?.message || error.message);
    }
  };
  

  const userInitial = userData?.name?.[0]?.toUpperCase() ?? userData?.email?.[0]?.toUpperCase() ?? "U";

  // Notification component inside Navbar
  const NotificationPopup = ({ notification, show, onClose }) => {
    if (!show || !notification) return null;

    return (
      <div className="absolute top-10 right-0 bg-white text-black rounded shadow-md z-50 w-64 p-2">
        <div className="flex justify-between items-center mb-2 border-b pb-1">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold">&times;</button>
        </div>
        <p className="text-sm px-2 py-1">{notification}</p>
      </div>
    );
  };

  return (
    <nav className="w-full bg-blue-700 text-white sticky top-0 z-50 shadow">
      <div className="flex items-center justify-between px-4 sm:px-10 h-16">
        {/* Hamburger + Logo */}
        <div className="flex items-center gap-2 mr-1">
          <button className="sm:hidden p-2 focus:outline-none" onClick={() => setMobileOpen((p) => !p)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <Link to="/" className="shrink-0 mr-2">
            <img src="/logo_3.png" alt="logo" className="w-27 sm:w-28 md:w-32 object-contain" />
          </Link>
        </div>

        {/* Desktop links + search */}
        <div className="hidden sm:flex items-center gap-6 flex-grow justify-center">
          <ul className="flex gap-6 text-sm font-medium">
            <li><Link to="/latest" className="hover:underline">Latest Uploads</Link></li>
            <li><Link to="/blogs" className="hover:underline">Blogs</Link></li>
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); navigate(`/search?query=${encodeURIComponent(searchTerm)}`); setSearchTerm(""); setMobileOpen(false); }} role="search" className="ml-6 relative bg-white text-black rounded-full px-4 py-1 w-64 flex items-center">
            <input type="text" placeholder="Search movies…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent w-full text-sm focus:outline-none pr-6" />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
              <img src="https://cdn-icons-png.flaticon.com/512/3917/3917132.png" alt="search" className="w-4 h-4 opacity-80" />
            </button>
          </form>
        </div>

        {/* Right: Notification + Avatar */}
        <div className="ml-auto flex items-center gap-4" ref={profileRef}>
          {userData ? (
            <>
              {/* Notification */}
              <div className="relative">
                <button onClick={() => setShowNotifications((v) => !v)} className="relative">
                  <img src="/bell.png" alt="Notifications" className="w-6 h-6" />
                  {notification && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
                <NotificationPopup notification={notification} show={showNotifications} onClose={() => setShowNotifications(false)} />
              </div>

              {/* User avatar */}
              <div onClick={() => setProfileOpen((v) => !v)} className="w-9 h-9 rounded-full bg-black flex items-center justify-center font-bold cursor-pointer">
                {userInitial}
              </div>

              {/* Profile dropdown */}
              {profileOpen && (
                <div className="absolute top-12 right-0 bg-white text-black rounded shadow-md z-50 w-48 p-2">
                  {editingName ? (
                    <div className="flex flex-col gap-2">
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="border p-1 rounded text-sm" />
                      <div className="flex gap-2">
                        <button onClick={async () => { if (!newName.trim()) return toast.error("Name cannot be empty"); const { data } = await axios.put(`${backendUrl}/api/user/update-name`, { newName: newName.trim() }); if (data.success) { toast.success("Name updated successfully!"); setUserData(prev => ({ ...prev, name: newName.trim() })); setEditingName(false); } }} className="flex-1 bg-blue-600 text-white text-sm px-2 py-1 rounded hover:bg-blue-700">Save</button>
                        <button onClick={() => setEditingName(false)} className="flex-1 bg-gray-200 text-sm px-2 py-1 rounded hover:bg-gray-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <ul className="text-sm py-1">
                      <li className="px-4 py-2 border-b text-gray-700">{userData.name}</li>
                      <li><Link to="/profile" onClick={() => setProfileOpen(false)} className="block px-4 py-2 hover:bg-gray-100">👤 View Profile</Link></li>
                      <li><button onClick={logout} className="w-full text-left px-4 py-2 hover:bg-gray-100">🚪 Logout</button></li>
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
            <button onClick={() => navigate("/login")} className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-4 py-1.5 rounded-full hover:bg-gray-100 transition">
              Login
              <img src={assets.arrow_icon} alt="arrow" className="w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200 px-4 pb-4 space-y-4 text-black shadow-md">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block py-2 hover:underline">Home</Link>
          <form onSubmit={(e) => { e.preventDefault(); navigate(`/search?query=${encodeURIComponent(searchTerm)}`); setSearchTerm(""); setMobileOpen(false); }} className="flex rounded overflow-hidden">
            <input type="text" placeholder="Search movies…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow p-2 bg-gray-100 placeholder-gray-500 focus:outline-none" />
            <button type="submit" className="bg-blue-600 text-white px-4">🔍</button>
          </form>
          <Link to="/latest" onClick={() => setMobileOpen(false)} className="block py-2 hover:underline">Latest Uploads</Link>
          <Link to="/blogs" onClick={() => setMobileOpen(false)} className="block py-2 hover:underline">Blogs</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
