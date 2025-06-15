import React from 'react';
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

import { useContext } from 'react';
import { AppContext } from './context/AppContext';
import AdminUpload from './context/AdminUpload'; // Assuming AdminUpload is a component for admin uploads
import ProtectedAdminRoute from './components/ProtectedAdminRoute';



// Assuming getUserData is a function to fetch user data


const App = () => {
  const { isLoggedIn, isAdmin } = useContext(AppContext); // ✅ Centralized login state
  const [searchTerm, setSearchTerm] = React.useState('');
  const location = useLocation();
  const navigate = useNavigate();


  const hideCategoryBar = ['/login', '/email-verify', '/reset-password'].includes(location.pathname);

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

<Navbar
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
/>

{!hideCategoryBar && (
  <CategoryBar
    onCategoryClick={handleCategoryClick}
    onLanguageClick={handleLanguageClick}
  />
)}

<Routes>
  {/* Public Routes */}
  <Route path="/" element={<Home searchTerm={searchTerm} />} />
  <Route path="/movie/:code" element={<MovieDetail />} />
  <Route path="/search" element={<SearchResults />} />
  <Route path="/category/:name" element={<CategoryPage />} />
  <Route path="/latest" element={<LatestUploads />} />

  {/* Auth Pages */}
  {!isLoggedIn && (
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/email-verify" element={<EmailVerify />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </>
  )}

  {/* ✅ Always include Admin Route */}
  <Route path="/admin" element={<ProtectedAdminRoute />} />

  {/* Fallback */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>

    </div>
  );
};

export default App;
