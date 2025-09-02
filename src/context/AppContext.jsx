// AppContext.jsx
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../utils/supabaseClient";
import axios from "axios";
import { backendUrl } from "../utils/api";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
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

  // ✅ Simple login function
  const login = (user) => {
    setIsLoggedIn(true);
    setUserData(user);
    setIsAdmin(user.email === "sanjusanjay0444@gmail.com");

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userData", JSON.stringify(user));

    toast.success("Logged in successfully");
  };

  // ✅ Simple logout function
  const logout = async () => {
    try {
      await axios.post(`${backendUrl}/api/auth/logout`, {}, { withCredentials: true });

      setIsLoggedIn(false);
      setUserData(null);
      setIsAdmin(false);
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userData");

      toast.success("Logged out successfully");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error(err.response?.data?.message || "Failed to logout");
    }
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
        showOnHomepage: m.showOnHomepage === true || m.showOnHomepage === "true",
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
