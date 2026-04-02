import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../utils/supabaseClient";
import axios from "axios";
import { backendUrl } from "../utils/api";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const navigate = useNavigate();
  
  // Retrieve token from localStorage directly for reliable API calls
  const [token, setToken] = useState(localStorage.getItem("token")); 
  
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  const [userData, setUserData] = useState(
    localStorage.getItem("userData")
      ? JSON.parse(localStorage.getItem("userData"))
      : null
  );

  const [isAdmin, setIsAdmin] = useState(
    userData?.email === "sanjusanjay0444@gmail.com"
  );

  const [movies, setMovies] = useState([]);
  const [allUsersCount, setAllUsersCount] = useState(0);

  // ✅ Navigation handler exposed to components
  const handleNavigate = (name) => {
    if (!name) return;
    navigate(`/category/${encodeURIComponent(name)}`);
  };

  // ✅ Simple login function (UPDATED to accept and store token)
  const login = (user, authToken) => {
    setIsLoggedIn(true);
    setUserData(user);
    setIsAdmin(user.email === "sanjusanjay0444@gmail.com");
    setToken(authToken); // Store token in state

    // Store user data combined with the token for convenience (optional)
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userData", JSON.stringify({ ...user, token: authToken }));
    localStorage.setItem("token", authToken);

    toast.success("Logged in successfully");
  };

  // ✅ Simple logout function (CLEANUP ADDED)
  const logout = async () => {
    try {
      // 1. Attempt to log out from the backend (clear HTTP-only cookie).
      await axios.post(
        `/api/auth/logout`, 
        {},
        { withCredentials: true }
      );
      console.log("Backend cookie clear attempted (via proxy).");
    } catch (err) {
      console.warn("Backend logout failed/CORS blocked. Proceeding with client cleanup.", err.message);
    }
    
    try {
        // 2. Clear Supabase session 
        await supabase.auth.signOut();
    } catch (err) {
        console.error("Supabase sign out failed:", err);
    }

    // 3. Client-side cleanup (MUST RUN)
    setIsLoggedIn(false);
    setUserData(null);
    setIsAdmin(false);
    setToken(null); // Clear token state
    
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userData");
    localStorage.removeItem("token");
    
    // 4. Final actions
    toast.success("You have been logged out.");
    navigate("/login");
  };

  // ✅ Fetch all movies
  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map((m) => ({
        ...m,
        showOnHomepage:
          m.showOnHomepage === true || m.showOnHomepage === "true",
      }));

      setMovies(normalized);
    } catch (err) {
      console.error("Supabase fetch error:", err.message || err);
      toast.error("Failed to fetch movies");
    }
  };

  // ✅ Fetch users count (admin only - UPDATED token access)
  const fetchAllUsersCount = async () => {
    // Rely on state or localStorage for the current token
    const currentToken = token || localStorage.getItem("token");

    if (!currentToken) {
        console.warn("Attempted to fetch user count without token.");
        return;
    }

    try {
      const res = await axios.get(`${backendUrl}/api/user/count`, {
        // Use the token in the Authorization header
        headers: { Authorization: `Bearer ${currentToken}` },
        withCredentials: true,
      });

      if (res.data.success) {
        setAllUsersCount(res.data.count || 0);
      } else {
        toast.error(res.data.message || "Failed to fetch users count");
      }
    } catch (err) {
      console.error("fetchAllUsersCount error:", err);
      toast.error("Error fetching users count");
    }
  };

  // ✅ Initial load
  useEffect(() => {
    fetchMovies();
  }, []);

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,
        isAdmin,
        setIsAdmin,
        movies,
        setMovies,
        fetchMovies,
        allUsersCount,
        fetchAllUsersCount,
        login, // expose login
        logout, // expose logout
        backendUrl,
        onNavigate: handleNavigate, // ✅ expose navigation
      }}
    >
      {children}
    </AppContext.Provider>
  );
};