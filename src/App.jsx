import React, { useContext, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

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
import AdSlot from './components/AdSlot';
import AdPopup from './components/AdPopup';


const App = () => {
  const { isLoggedIn } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const hideOnPaths = ['/login', '/email-verify', '/reset-password'];
const hideEverythingOnPaths = /^\/blogs\/[^/]+$/; // regex to match /blogs/:slug

const hideNavbarAndCategoryBar = hideEverythingOnPaths.test(location.pathname);
const hideOnlyCategoryBar = hideOnPaths.includes(location.pathname);


  const handleCategoryClick = (category) => {
    navigate(`/category/${encodeURIComponent(category)}`);
  };

  const handleLanguageClick = (language) => {
    navigate(`/search?query=${encodeURIComponent(language)}`);
  };

  return (
    <div className="bg-black min-h-screen text-white">
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
  <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
)}

{!hideNavbarAndCategoryBar && !hideOnlyCategoryBar && (
  <>
  <CategoryBar
    onCategoryClick={handleCategoryClick}
    onLanguageClick={handleLanguageClick}
  />
   <AdSlot />
   <AdPopup/>
  </>
)}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home searchTerm={searchTerm} />} />
        <Route path="/movie/:code" element={<MovieDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/category/:name" element={<CategoryPage />} />
        <Route path="/latest" element={<LatestUploads />} />
        <Route path="/blogs" element={<BlogList />} />
  <Route path="/blogs/:slug" element={<BlogViewer />} />

        <Route path="/admin" element={<ProtectedAdminRoute />}>
  <Route index element={<Navigate to="/admin/upload" />} />
  <Route path="upload" element={<AdminUpload />} />
  <Route path="blog-editor" element={<BlogEditor />} />
  <Route path="dashboard" element={<AdminDashboard />} />
  <Route path="/admin/stories" element={<AdminStories />} />

</Route>


        {/* Auth Pages */}
        {!isLoggedIn && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/email-verify" element={<EmailVerify />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </>
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
