import React, { useContext, useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from "./utils/supabaseClient";

// --- Components & Pages Imports ---
import Navbar from './components/Navbar';
import CategoryBar from './components/CategoryBar';
import SiteFooter from './components/SiteFooter';
import Home from './paged/Home';
import Login from './paged/Login';
import EmailVerify from './paged/EmailVerify';
import ResetPassword from './paged/ResetPassword';
const MovieDetail = lazy(() => import('./paged/MovieDetail'));
const SearchResults = lazy(() => import('./paged/SearchResults'));
const SearchPage = lazy(() => import('./paged/SearchPage'));
import CategoryPage from './components/CategoryPage';
import LatestUploads from './components/LatestUploads';
import { AppContext } from './context/AppContext';
const AdminUpload = lazy(() => import('./context/AdminUpload'));
const BlogEditor = lazy(() => import('./components/BlogEditor'));
const BlogList = lazy(() => import('./components/BlogList'));
const BlogViewer = lazy(() => import('./components/BlogViewer'));
const AdminDashboard = lazy(() => import('./paged/AdminDashboard'));
const AdminStories = lazy(() => import('./paged/AdminStories'));
import AdScriptLoader from './components/AdScriptLoader';
import AdPopup from './components/AdPopup';
import PopAdsScript from './components/PopAdsScript';
import MbidadmBanner from './components/MbidadmBanner';
const Profile = lazy(() => import('./paged/Profile'));
const UploadWatchHtml = lazy(() => import('./paged/UploadWatchHtml'));
const WatchPage = lazy(() => import('./paged/WatchPage'));
const AdminMembers = lazy(() => import('./paged/AdminMembers'));
const WatchListPage = lazy(() => import('./paged/WatchListPage'));
const MXWatch = lazy(() => import('./paged/MXWatch'));
const HlsWatch = lazy(() => import('./paged/HlsWatch'));
const AdminUp4streamFiles = lazy(() => import('./components/AdminUp4streamFiles'));
const VideoPlayerPage = lazy(() => import('./paged/VideoPlayerPage'));
const LiveCricket = lazy(() => import('./paged/LiveCricket'));
const AdminLiveMatchUpload = lazy(() => import('./paged/AdminLiveMatchUpload'));
const LiveStreamPlayer = lazy(() => import('./paged/LiveStreamPlayer'));
const SeriesView = lazy(() => import('./paged/SeriesView'));
const AuthPage = lazy(() => import('./paged/AuthPage'));
const UpdatePassword = lazy(() => import('./paged/UpdatePassword'));
const TorrentSearch = lazy(() => import('./paged/Torrentsearch'));
const LiveCricketTV = lazy(() => import('./paged/LiveCricketTV'));
import Homeies, { TournamentPage } from './paged/Homeies';
const LiveChannelsUpload = lazy(() => import('./paged/LiveChannelsUpload'));
const LiveChannelsPage = lazy(() => import('./paged/LiveChannelsPage'));
const MatchCenter = lazy(() => import('./paged/MatchCenter'));
const NewsViewer = lazy(() => import('./components/NewsReader'));
// --- Music Feature Imports ---
const HomeLandingPage = lazy(() => import('./paged/HomeLandingPage'));
const SearchResultsPage = lazy(() => import('./paged/SearchResultsPage'));
const TrackDetailPage = lazy(() => import('./paged/TrackDetailPage'));
import { MusicPlayerProvider } from './context/MusicPlayerContext';
import PersistentMiniPlayer from './components/PersistentMiniPlayer';

// ── Lockout Overlay ──
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

// ── Protected Routes ──
const ProtectedRoute = ({ children, session, initialized }) => {
  if (!initialized) return null;
  return session ? children : <Navigate to="/auth" />;
};

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
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // ── Anti-Inspect Logic ──
  useEffect(() => {
    const adminEmail = "sanjusanjay0444@gmail.com";

    const handleContextMenu = (e) => {
      if (session?.user?.email?.toLowerCase() !== adminEmail) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e) => {
      if (session?.user?.email?.toLowerCase() === adminEmail) return;
      if (
        e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
        (e.ctrlKey && e.keyCode === 85)
      ) {
        e.preventDefault();
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

  // ── Auth State ──
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

  // ── Navbar/CategoryBar hide logic ──
  const hidePaths = [
    "/login", "/auth", "/verify-account", "/reset-password",
    "/blogs", "/update-password", "/search-torrent", "/live-cricket-tv","/match-center",
    // Same page as /match-center, reached by its slug URL — hide the same chrome
    // so the two routes don't render differently.
    "/match"
  ];
  const isBlogViewerPath   = /^\/blogs\/[^/]+$/.test(location.pathname);
  const isWatchPath        = /^\/watch(\/[^/]+)?$/.test(location.pathname);
  /* Every full-screen player, not just our own. /mx-watch and /hls-watch render
     the same VideoPlayer as /watch/:slug but were not on this list, so they got
     the navbar and the footer wrapped around a player sized to the viewport —
     which is what pushed the page into scrolling and made them look nothing
     like our own playback page. */
  const isPlayerPath       = /^\/(player|mx-watch|hls-watch)(\/.*)?$/.test(location.pathname);
  const isAdminPath        = location.pathname.startsWith("/admin");
  const isLiveStreamPlayer = /^\/live-cricket\/player\/[^/]+$/.test(location.pathname);
  const isLiveCricketPath  = location.pathname === "/live-cricket";
  const isSportsPath       = location.pathname === "/sports";
  const isTournamentPath   = location.pathname.startsWith("/tournament");
  const isMusicPath        = location.pathname.startsWith("/music");
  // NOTE: /live-stream is NOT hidden — navbar shows on Live TV page

  const hideNavbar =
    hidePaths.includes(location.pathname) ||
    isBlogViewerPath ||
    isWatchPath ||
    isPlayerPath ||
    isAdminPath ||
    isLiveCricketPath ||
    isLiveStreamPlayer ||
    isSportsPath ||
    isTournamentPath ||
    isMusicPath;

  const handleNavigate = (name) => {
    navigate(`/category/${encodeURIComponent(name)}`);
  };

  return (
    <div className="bg-black min-h-screen text-white relative overflow-x-hidden">
      <LockoutOverlay />
      <ToastContainer position="top-center" autoClose={3000} theme="dark" />

      {/* Single Navbar — handles desktop + mobile internally */}
      {!hideNavbar && (
        <>
          <Navbar />
          <div className="hidden sm:block">
            <CategoryBar onNavigate={handleNavigate} />
          </div>
        </>
      )}



      {/* Every route below is code-split. The app shipped as one 2.4MB script,
          so a visitor landing on the home page downloaded the admin studio, the
          blog editor, the match centre and three video players before seeing
          anything. On a phone on mobile data that is the difference between a
          visit and a bounce. */}
      <Suspense fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
      <Routes>
        <Route path="/"                       element={<Home searchTerm={searchTerm} />} />
        <Route path="/movie/:code"            element={<MovieDetail />} />
        <Route path="/search"                 element={<SearchResults searchTerm={searchTerm} />} />
        <Route path="/category/:name"         element={<CategoryPage />} />
        <Route path="/latest"                 element={<LatestUploads />} />
        <Route path="/blogs"                  element={<BlogList />} />
        <Route path="/news"              element={<NewsViewer />} />
        <Route path="/blogs/:slug"            element={<BlogViewer />} />
        <Route path="/auth"                   element={session ? <Navigate to="/watch" /> : <AuthPage />} />
        <Route path="/update-password"        element={<UpdatePassword />} />
        <Route path="/watch"                  element={<WatchListPage />} />
        <Route path="/mx-watch"               element={<MXWatch />} />
        <Route path="/hls-watch"              element={<HlsWatch />} />
        <Route path="/watch/search"           element={<SearchPage />} />
        <Route path="/watch/:slug/*"          element={<WatchPage />} />
        <Route path="/player/:slug?"          element={<VideoPlayerPage />} />
        <Route path="/live-cricket/player/:slug" element={<LiveStreamPlayer />} />
        <Route path="/live-cricket"           element={<LiveCricket />} />
        <Route path="/search-torrent"         element={<TorrentSearch />} />
        <Route path="/sports"                 element={<Homeies />} />
        <Route path="/tournament/:slug"       element={<TournamentPage />} />
        <Route path="/live-cricket-tv"        element={<LiveCricketTV />} />
        {/* Readable, stable match URL — what the sitemap lists and Google indexes. */}
        <Route path="/match/:slug"            element={<MatchCenter />} />
        {/* Legacy base64 link, kept so shared URLs still open; it canonicalises
            itself to the /match/:slug version. */}
        <Route path="/match-center/:hash"     element={<MatchCenter />}
/>
        <Route path="/live-stream"            element={<LiveChannelsPage />} />

        {/* ── Music Feature Routes ── */}
        <Route path="/music"                  element={<HomeLandingPage />} />
        <Route path="/music/search"           element={<SearchResultsPage />} />
        <Route path="/music/track/:id"        element={<TrackDetailPage />} />

        <Route path="/profile"                element={
          <ProtectedRoute session={session} initialized={initialized}>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/verify-account"         element={<EmailVerify />} />

        {!isLoggedIn && (
          <>
            <Route path="/login"          element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </>
        )}

        <Route
          path="/admin/*"
          element={
            <ProtectedAdminRoute session={session} initialized={initialized}>
              <Routes>
                <Route index                   element={<Navigate to="upload" replace />} />
                <Route path="upload"           element={<AdminUpload />} />
                <Route path="dashboard"        element={<AdminDashboard />} />
                <Route path="blog-editor"      element={<BlogEditor />} />
                <Route path="stories"          element={<AdminStories />} />
                <Route path="upload-watch-html" element={<UploadWatchHtml />} />
                <Route path="live-upload"      element={<AdminLiveMatchUpload />} />
                <Route path="members"          element={<AdminMembers />} />
                <Route path="up4stream"        element={<AdminUp4streamFiles />} />
                <Route path="live-channels"    element={<LiveChannelsUpload />} />
              </Routes>
            </ProtectedAdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

      {/* Bottom Ad slots and scripts for all pages except admin */}
      {!isAdminPath && (
        <>
          <MbidadmBanner key={`banner-bottom-${location.pathname}`} />
          <AdScriptLoader />
          <PopAdsScript />
          <AdPopup />
        </>
      )}

      {/* Crawlable links into the catalogue, on every page that has chrome.
          Without this the language collections had nothing pointing at them:
          the navbar's dropdown renders no markup until it is opened. */}
      {!hideNavbar && <SiteFooter />}

      {/* Persistent music mini player — shows on all pages when minimized */}
      <PersistentMiniPlayer />
    </div>
  );
};

const App = () => (
  <MusicPlayerProvider>
    <AppContent />
  </MusicPlayerProvider>
);

export default App;
