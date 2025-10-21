// src/components/AdminLayout.jsx
import React, { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  Feather,
  ListChecks,
  Settings,
  MonitorPlay,
  Menu,
  X,
  UserCircle,
  LogOut, // Added for potential future use
} from "lucide-react"; // Using lucide-react for modern icons

// --- Sidebar Navigation Data ---
const ADMIN_LINKS = [
  {
    path: "/admin/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    path: "/admin/upload",
    icon: UploadCloud,
    label: "Movie Uploads",
  },
  {
    path: "/admin/upload-watch-html",
    icon: MonitorPlay,
    label: "Watch HTML (MV)",
  },
  {
    path: "/admin/blog-editor",
    icon: Feather,
    label: "Blog Editor",
  },
  {
    path: "/admin/stories",
    icon: ListChecks,
    label: "Stories/Tasks",
  },
  {
    path: "/admin/members",
    icon: Users,
    label: "Members",
  },
  {
    path: "/admin/settings",
    icon: Settings,
    label: "System Settings",
  },
];

const AdminLayout = ({ children }) => {
  const path = useLocation().pathname;
  const { userData } = useContext(AppContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile menu

  const isActive = (target) => path === target;

  const userInitial =
    userData?.name?.[0]?.toUpperCase() || userData?.email?.[0]?.toUpperCase() || "U";

  // Mock logout handler (replace with actual logic)
  const handleLogout = () => {
    // Implement actual logout logic here (e.g., supabase.auth.signOut())
    console.log("User logged out (Mock)");
  };

  return (
    <div className="min-h-screen h-full bg-gray-950 text-white flex">
      {/* --- Sidebar (Desktop & Mobile Overlay) --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transform 
                   ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                   md:translate-x-0 md:relative transition-transform duration-300 ease-in-out
                   w-64 bg-gray-900 p-6 border-r border-gray-800 flex flex-col`}
        onClick={() => setIsSidebarOpen(false)} // Close on item click
      >
        {/* Logo/Branding */}
        <div className="flex items-center gap-2 text-2xl font-extrabold text-white mb-8 border-b border-gray-800 pb-4">
          <UserCircle className="text-3xl text-red-500 w-8 h-8" />
          <span className="tracking-wider">ADMIN HUB</span>
          <button 
              className="md:hidden ml-auto text-gray-400 hover:text-white"
              onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}
          >
              <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <ul className="space-y-2 flex-grow">
          {ADMIN_LINKS.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
                  ${
                    isActive(link.path)
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "hover:bg-gray-800 text-gray-300 hover:text-white"
                  }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Footer/Logout Section */}
        <div className="mt-auto pt-6 border-t border-gray-800">
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800 text-red-400 hover:bg-gray-700 transition"
            >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
            </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header/Top Bar */}
        <header className="bg-gray-900 px-6 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 z-40 shadow-xl">
          <div className="flex items-center">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden mr-4 p-1 text-gray-300 hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-gray-200">
                {ADMIN_LINKS.find(link => link.path === path)?.label || "Admin Panel"}
            </h2>
          </div>

          {/* Profile Circle and Info */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
                <span className="text-sm font-semibold text-gray-200 block truncate max-w-[150px]">
                  {userData?.name || "Administrator"}
                </span>
                <span className="text-xs text-gray-500 block">
                  {userData?.email || "No Email"}
                </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-red-500 shadow-md">
              {userInitial}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 flex-grow">{children}</div>
      </main>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
          <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
              onClick={() => setIsSidebarOpen(false)}
          />
      )}
    </div>
  );
};

export default AdminLayout;