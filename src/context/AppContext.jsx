import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../utils/supabaseClient";
import axios from "axios";
import { backendUrl } from "../utils/api";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const navigate = useNavigate();
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

  // ✅ Simple login function
  const login = (user) => {
    setIsLoggedIn(true);
    setUserData(user);
    setIsAdmin(user.email === "sanjusanjay0444@gmail.com");

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userData", JSON.stringify(user));

    toast.success("Logged in successfully");
  };

  // ✅ Simple logout function (FIXED)
  const logout = async () => {
    try {
      // 1. Attempt to log out from the backend (clear HTTP-only cookie).
      // 🚀 FIX: Using RELATIVE PATH to route through the Vite proxy, 
      // which prevents the CORS security block on cookie credentials.
      await axios.post(
        `/api/auth/logout`, // Use relative path instead of ${backendUrl}/...
        {},
        { withCredentials: true }
      );
      console.log("Backend cookie clear attempted (via proxy).");
    } catch (err) {
      // This catch block runs when CORS blocks the successful 200 response,
      // or if there is a real network issue. We log and continue cleanup.
      console.warn("Backend logout failed/CORS blocked. Proceeding with client cleanup.", err.message);
      
      // We will skip displaying the error here, as it's often a false positive (CORS block).
      // If needed, you can re-enable this: toast.error(err.response?.data?.message || "Failed to logout");
    }
    
    try {
        // 2. Clear Supabase session (good practice)
        await supabase.auth.signOut();
    } catch (err) {
        console.error("Supabase sign out failed:", err);
    }

    // 3. Client-side cleanup (MUST RUN even if backend call fails)
    setIsLoggedIn(false);
    setUserData(null);
    setIsAdmin(false);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userData");
    
    // 4. Final actions
    toast.success("You have been logged out.");
    navigate("/login"); // Ensure redirection happens after cleanup
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

  // ✅ Fetch users count (admin only)
  const fetchAllUsersCount = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/user/count`, {
        headers: { Authorization: `Bearer ${userData?.token || ""}` },
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
