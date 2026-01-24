import React, { useContext, useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from "./utils/supabaseClient";

// --- Components & Pages Imports ---
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
import BlogList from './components/BlogList';
import BlogViewer from './components/BlogViewer';
import AdminDashboard from './paged/AdminDashboard';
import AdminStories from "./paged/AdminStories";
import AdScriptLoader from './components/AdScriptLoader';
import AdPopup from './components/AdPopup';
import PopAdsScript from './components/PopAdsScript';
import Profile from "./paged/Profile";
import UploadWatchHtml from './paged/UploadWatchHtml';
import WatchPage from './paged/WatchPage';
import AdminMembers from "./paged/AdminMembers";
import WatchListPage from "./paged/WatchListPage";
import AdminUp4streamFiles from './components/AdminUp4streamFiles';
import VideoPlayerPage from './paged/VideoPlayerPage';
import LiveCricket from './paged/LiveCricket';
import AdminLiveMatchUpload from './paged/AdminLiveMatchUpload';
import LiveStreamPlayer from './paged/LiveStreamPlayer';
import SeriesView from './paged/SeriesView';
import AuthPage from './paged/AuthPage';
import UpdatePassword from './paged/UpdatePassword';

// 🛡️ Lockout Component (Standard users see this if they tried to hack /admin)
const LockoutOverlay = () => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const expiry = localStorage.getItem('admin_lockout');
      if (expiry) {
        const remaining = Math.floor((parseInt(expiry) - Date.now()) / 1000);
        if (remaining <= 0) {
          localStorage.removeItem('admin_lockout');
          window.location.reload();
        } else {
          setTimeLeft(remaining);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft || timeLeft <= 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-center p-6">
      <div className="bg-red-900/20 border border-red-500 p-10 rounded-3xl max-w-md">
        <h1 className="text-4xl font-black text-red-500 mb-4 uppercase italic">Access Denied</h1>
        <p className="text-gray-300 mb-6 font-bold uppercase tracking-widest text-xs">
          Suspicious activity detected. You are blocked from this site for 10 minutes.
        </p>
        <div className="text-6xl font-mono font-black text-white">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};

// 🛡️ Standard Protected Route
const ProtectedRoute = ({ children, session, initialized }) => {
  if (!initialized) return null; 
  return session ? children : <Navigate to="/auth" />;
};

// 👑 Strict Admin Protected Route
const ProtectedAdminRoute = ({ children, session, initialized }) => {
  const adminEmail = "sanjusanjay0444@gmail.com";
  if (!initialized) return null;

  const isAuthorized = session?.user?.email?.toLowerCase() === adminEmail.toLowerCase();

  if (!isAuthorized) {
    const lockoutTime = Date.now() + 10 * 60 * 1000;
    localStorage.setItem('admin_lockout', lockoutTime.toString());
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContent = () => {
  const { isLoggedIn } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // --- 🛡️ ANTI-INSPECT LOGIC ---
  useEffect(() => {
    const adminEmail = "sanjusanjay0444@gmail.com";
    
    const handleContextMenu = (e) => {
      if (session?.user?.email?.toLowerCase() !== adminEmail) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e) => {
      if (session?.user?.email?.toLowerCase() === adminEmail) return;

      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || 
        (e.ctrlKey && e.keyCode === 85)
      ) {
        e.preventDefault();
        // Force exit/redirect if they try to inspect
        window.location.href = "https://www.google.com"; 
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hidePaths = ["/login", "/auth", "/verify-account", "/reset-password", "/blogs", "/update-password"];
  const isBlogViewerPath = /^\/blogs\/[^/]+$/.test(location.pathname);
  const isWatchPath = /^\/watch(\/[^/]+)?$/.test(location.pathname);
  const isPlayerPath = /^\/player(\/.*)?$/.test(location.pathname); 
  const isAdminPath = location.pathname.startsWith("/admin");
  const isLiveStreamPlayerPath = /^\/live-cricket\/player\/[^/]+$/.test(location.pathname); 
  const isLiveCricketPath = location.pathname === "/live-cricket"; 

  const hideNavbarAndCategoryBar =
    hidePaths.includes(location.pathname) || 
    isBlogViewerPath || isWatchPath || isPlayerPath || isAdminPath || isLiveCricketPath || isLiveStreamPlayerPath;

  const handleNavigate = (name) => {
    navigate(`/category/${encodeURIComponent(name)}`);
    setMobileOpen(false);
  };

  return (
    <div className="bg-black min-h-screen text-white relative overflow-x-hidden">
      <LockoutOverlay />
      <ToastContainer position="top-center" autoClose={3000} theme="dark" />

      {!hideNavbarAndCategoryBar && (
        <>
          <div className="hidden sm:block">
            <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} onNavigate={handleNavigate} />
          </div>
          <div className="sm:hidden">
            <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} isMobile={true} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onNavigate={handleNavigate} />
            {mobileOpen && (
              <div className="fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
                <div className="absolute top-0 right-0 w-72 h-full bg-white shadow-xl p-4 flex flex-col overflow-y-auto rounded-l-xl text-black">
                  <CategoryBar isMobile={true} onNavigate={handleNavigate} onClose={() => setMobileOpen(false)} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Routes>
        <Route path="/" element={<Home searchTerm={searchTerm} />} />
        <Route path="/movie/:code" element={<MovieDetail />} />
        <Route path="/search" element={<SearchResults searchTerm={searchTerm} />} />
        <Route path="/category/:name" element={<CategoryPage />} />
        <Route path="/latest" element={<LatestUploads />} />
        <Route path="/blogs" element={<BlogList />} />
        <Route path="/blogs/:slug" element={<BlogViewer />} />
        <Route path="/auth" element={session ? <Navigate to="/watch" /> : <AuthPage />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        {/* 🎬 PUBLIC WATCH ROUTES (Login no longer forced) */}
<Route path="/watch" element={<WatchListPage />} />

<Route 
  path="/watch/:slug/*" 
  element={<WatchPage />} 
/>

<Route 
  path="/player/:slug?" 
  element={<VideoPlayerPage />} 
/>
        <Route path="/live-cricket/player/:slug" element={<LiveStreamPlayer />} />
        <Route path="/live-cricket" element={<LiveCricket />} /> 
        <Route path="/series/:seriesSlug" element={<SeriesView />} />
        <Route path="/profile" element={<ProtectedRoute session={session} initialized={initialized}><Profile /></ProtectedRoute>} />
        <Route path="/verify-account" element={<EmailVerify />} />

        {!isLoggedIn && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </>
        )}

        <Route 
            path="/admin/*" 
            element={
              <ProtectedAdminRoute session={session} initialized={initialized}>
                <Routes>
                  <Route index element={<Navigate to="upload" replace />} />
                  <Route path="upload" element={<AdminUpload />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="blog-editor" element={<BlogEditor />} />
                  <Route path="stories" element={<AdminStories />} />
                  <Route path="upload-watch-html" element={<UploadWatchHtml />} />
                  <Route path="live-upload" element={<AdminLiveMatchUpload />} />
                  <Route path="members" element={<AdminMembers />} />
                  <Route path="up4stream" element={<AdminUp4streamFiles />} />
                </Routes>
              </ProtectedAdminRoute>
            } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!(isPlayerPath || isLiveCricketPath || isLiveStreamPlayerPath) && (
        <>
          <AdScriptLoader />
          <PopAdsScript />
          <AdPopup />
        </>
      )}
    </div>
  );
};

const App = () => (
    <AppContent />
);

export default App;