import React, { useContext, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import CategoryBar from './components/CategoryBar';
import Home from './paged/Home';
import Login from './paged/Login';
import EmailVerify from './paged/EmailVerify';
import ResetPassword from './paged/ResetPassword';
import MovieDetail from './paged/MovieDetail';
import SearchResults from './paged/SearchResults';
import CategoryPage from './components/CategoryPage';
import LatestUploads from './components/LatestUploads';

import { AppContext } from './context/AppContext';
import AdminUpload from './context/AdminUpload';
import BlogEditor from './components/BlogEditor';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import BlogList from './components/BlogList';
import BlogViewer from './components/BlogViewer';
import AdminDashboard from './paged/AdminDashboard';
import AdminStories from "./paged/AdminStories";
import AdScriptLoader from './components/AdScriptLoader';
import AdPopup from './components/AdPopup';          // ✅ Optional
import PopAdsScript from './components/PopAdsScript'; // ✅ Optional
import Profile from "./paged/Profile"; // Adjust path if needed
import UploadWatchHtml from './paged/UploadWatchHtml';
import WatchPage from './paged/WatchPage';
import AdminMembers from "./paged/AdminMembers"; // adjust path if needed
import WatchListPage from "./paged/WatchListPage";
import AdminUp4streamFiles from './components/AdminUp4streamFiles';



const App = () => {
  const { isLoggedIn } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Hide navbar & category bar on specific paths
  const hidePaths = ["/login", "/verify-account", "/reset-password"];
  const isBlogViewerPath = /^\/blogs\/[^/]+$/.test(location.pathname);
  const isWatchPath = /^\/watch(\/[^/]+)?$/.test(location.pathname);
  const isAdminPath = location.pathname.startsWith("/admin");

  const hideNavbarAndCategoryBar =
    hidePaths.includes(location.pathname) || isBlogViewerPath || isWatchPath || isAdminPath;

  // Unified handler for language navigation
  const handleNavigate = (name) => {
    navigate(`/category/${encodeURIComponent(name)}`);
    setMobileOpen(false);
  };

  return (
    <div className="bg-black min-h-screen text-white relative overflow-x-hidden">
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {!hideNavbarAndCategoryBar && (
        <>
          {/* Desktop Navbar */}
          <div className="hidden sm:block">
            <Navbar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Mobile Navbar */}
          <div className="sm:hidden">
            <Navbar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isMobile={true}
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
              onNavigate={handleNavigate}
            />

            {mobileOpen && (
              <div className="fixed inset-0 z-50">
                <div
                  className="absolute inset-0 bg-black/60"
                  onClick={() => setMobileOpen(false)}
                />
                <div className="absolute top-0 right-0 w-72 h-full bg-white shadow-xl p-4 flex flex-col overflow-y-auto rounded-l-xl">
                  <CategoryBar
                    isMobile={true}
                    onNavigate={handleNavigate}
                    onClose={() => setMobileOpen(false)}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Routes */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home searchTerm={searchTerm} />} />
        <Route path="/movie/:code" element={<MovieDetail />} />
        <Route path="/search" element={<SearchResults searchTerm={searchTerm} />} />
        <Route path="/category/:name" element={<CategoryPage />} />
        <Route path="/latest" element={<LatestUploads />} />
        <Route path="/watch" element={<WatchListPage />} />
        <Route path="/blogs" element={<BlogList />} />
        <Route path="/blogs/:slug" element={<BlogViewer />} />
        <Route path="/watch/:slug/*" element={<WatchPage />} />

        {/* Profile */}
        <Route path="/profile" element={<Profile />} />

        {/* Email Verification */}
        <Route path="/verify-account" element={<EmailVerify />} />

        {/* Auth Pages */}
        {!isLoggedIn && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </>
        )}

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedAdminRoute />}>
          <Route index element={<Navigate to="/admin/upload" />} />
          <Route path="upload" element={<AdminUpload />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="blog-editor" element={<BlogEditor />} />
          <Route path="stories" element={<AdminStories />} />
          <Route path="upload-watch-html" element={<UploadWatchHtml />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="up4stream" element={<AdminUp4streamFiles />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Ads */}
      <AdScriptLoader />
      <PopAdsScript />
      <AdPopup />
    </div>
  );
};

export default App;