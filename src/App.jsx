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



const App = () => {
  const { isLoggedIn } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Hide Navbar & CategoryBar on these paths
  const hidePaths = ['/login', '/verify-account', '/reset-password'];
  const isBlogViewerPath = /^\/blogs\/[^/]+$/.test(location.pathname);
  const isAdminPath = location.pathname.startsWith('/admin'); // ✅ Hide in Admin too

  const hideNavbarAndCategoryBar =
    hidePaths.includes(location.pathname) || isBlogViewerPath || isAdminPath;

  const handleCategoryClick = (category) => {
    navigate(`/category/${encodeURIComponent(category)}`);
  };

  const handleLanguageClick = (language) => {
    navigate(`/search?query=${encodeURIComponent(language)}`);
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

      {/* Global Ad Scripts */}
      <AdScriptLoader />

      {/* Navbar + Category Bar */}
      {!hideNavbarAndCategoryBar && (
        <>
          <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <CategoryBar
            onCategoryClick={handleCategoryClick}
            onLanguageClick={handleLanguageClick}
          />
        </>
      )}

      {/* Routes */}
      <Routes>
        {/* ✅ Public Routes */}
        <Route path="/" element={<Home searchTerm={searchTerm} />} />
        <Route path="/movie/:code" element={<MovieDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/category/:name" element={<CategoryPage />} />
        <Route path="/latest" element={<LatestUploads />} />
        <Route path="/blogs" element={<BlogList />} />
        <Route path="/blogs/:slug" element={<BlogViewer />} />
        <Route path="/watch/:slug" element={<WatchPage />} />

        {/* ✅ Profile */}
        <Route path="/profile" element={<Profile />} />

        {/* ✅ Email Verify */}
        <Route path="/verify-account" element={<EmailVerify />} />

        {/* ✅ Auth Pages (if not logged in) */}
        {!isLoggedIn && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </>
        )}

        {/* ✅ Admin Routes */}
        <Route path="/admin" element={<ProtectedAdminRoute />}>
  <Route index element={<Navigate to="/admin/upload" />} />
  <Route path="upload" element={<AdminUpload />} />
  <Route path="dashboard" element={<AdminDashboard />} />
  <Route path="blog-editor" element={<BlogEditor />} />
  <Route path="stories" element={<AdminStories />} />
  <Route path="upload-watch-html" element={<UploadWatchHtml />} />
  <Route path="members" element={<AdminMembers />} />
</Route>


        {/* ✅ Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
