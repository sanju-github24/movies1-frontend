// src/components/AdminLayout.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BsGrid1X2Fill,
  BsFillArchiveFill,
  BsPeopleFill,
  BsListCheck,
  BsFillGearFill,
  BsCameraVideoFill
} from "react-icons/bs";

import { FaUserShield } from "react-icons/fa";

const AdminLayout = ({ children }) => {
  const path = useLocation().pathname;
  const isActive = (target) => path === target;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 p-6 border-r border-gray-800 hidden md:block">
        <div className="sidebar-title mb-6">
          <div className="flex items-center gap-2 text-2xl font-bold mb-6 text-white">
            <FaUserShield className="text-3xl text-blue-400" />
            <span>ADMIN</span>
          </div>
        </div>

        <ul className="space-y-3">
          <li>
            <Link
              to="/admin/dashboard"
              className={`flex items-center gap-2 px-3 py-2 rounded ${
                isActive("/admin/dashboard")
                  ? "bg-white text-black font-bold"
                  : "hover:bg-gray-800"
              }`}
            >
              <BsGrid1X2Fill className="text-lg" /> Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/admin/upload"
              className={`flex items-center gap-2 px-3 py-2 rounded ${
                isActive("/admin/upload")
                  ? "bg-white text-black font-bold"
                  : "hover:bg-gray-800"
              }`}
            >
              <BsFillArchiveFill className="text-lg" /> Uploads
            </Link>
          </li>

          {/* NEW: MV Upload */}
          <li>
            <Link
              to="/admin/upload-watch-html"
              className={`flex items-center gap-2 px-3 py-2 rounded ${
                isActive("/admin/mv-upload")
                  ? "bg-white text-black font-bold"
                  : "hover:bg-gray-800"
              }`}
            >
              <BsCameraVideoFill className="text-lg" /> MV Upload
            </Link>
          </li>

          <li>
            <Link
              to="/admin/blog-editor"
              className={`flex items-center gap-2 px-3 py-2 rounded ${
                isActive("/admin/blog-editor")
                  ? "bg-white text-black font-bold"
                  : "hover:bg-gray-800"
              }`}
            >
              <BsPeopleFill className="text-lg" /> Blog
            </Link>
          </li>

          <li>
            <Link
              to="/admin/stories"
              className={`flex items-center gap-2 px-3 py-2 rounded ${
                isActive("/admin/stories")
                  ? "bg-white text-black font-bold"
                  : "hover:bg-gray-800"
              }`}
            >
              <BsListCheck className="text-lg" /> Stories
            </Link>
          </li>

          <li>
            <Link
              to="/admin/settings"
              className={`flex items-center gap-2 px-3 py-2 rounded ${
                isActive("/admin/settings")
                  ? "bg-white text-black font-bold"
                  : "hover:bg-gray-800"
              }`}
            >
              <BsFillGearFill className="text-lg" /> Settings
            </Link>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        <header className="bg-gray-900 px-6 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 z-50">
          <h2 className="text-xl font-semibold">Admin Panel</h2>
          <span className="text-sm text-gray-400">Logged in</span>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
