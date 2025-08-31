import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../utils/supabaseClient";
import axios from "axios";
import { backendUrl } from "../utils/api";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [movies, setMovies] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Load login state from localStorage
  useEffect(() => {
    try {
      const storedLogin = localStorage.getItem("isLoggedIn") === "true";
      const rawUser = localStorage.getItem("userData");

      const storedUser =
        rawUser && rawUser !== "undefined" ? JSON.parse(rawUser) : null;

      if (storedLogin && storedUser) {
        setIsLoggedIn(true);
        setUserData(storedUser);
        setIsAdmin(storedUser.email === "sanjusanjay0444@gmail.com");
      } else {
        setIsLoggedIn(false);
        setUserData(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error loading localStorage:", error.message);
      setIsLoggedIn(false);
      setUserData(null);
      setIsAdmin(false);
    }
  }, []);

  // 🔐 Check if user is authenticated
  const getAuthState = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const { data } = await axios.get(`${backendUrl}/api/auth/is-auth`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setIsLoggedIn(true);
        await getUserData();
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("getAuthState error:", error.message);
      setIsLoggedIn(false);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // ✅ Fetch user details
  const getUserData = async () => {
    try {
      const token = localStorage.getItem("token");

      const { data } = await axios.get(`${backendUrl}/api/user/data`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setUserData(data.userData);
        localStorage.setItem("userData", JSON.stringify(data.userData));
        localStorage.setItem("isLoggedIn", "true");
        setIsAdmin(data.userData.email === "sanjusanjay0444@gmail.com");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      console.error("getUserData error:", error);
    }
  };

  // 🎬 Get all movies
  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 🔥 Ensure showOnHomepage is boolean
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

  // ➕ Add movie
  const addMovie = async (movie) => {
    try {
      if (!userData?.email) {
        toast.error("You must be logged in to upload");
        return;
      }
  
      const movieWithUploader = {
        ...movie,
        uploaded_by: userData.email, // 👈 save uploader’s email
      };
  
      const { data: newMovie, error } = await supabase
        .from("movies")
        .insert([movieWithUploader])
        .select()
        .single();
  
      if (error) throw error;
  
      setMovies((prev) => [newMovie, ...prev].slice(0, 160));
    } catch (err) {
      console.error("Supabase insert error:", err.message || err);
      toast.error("Failed to upload movie");
    }
  };
  

  // ❌ Delete movie
  const deleteMovie = async (slug) => {
    try {
      const { error } = await supabase.from("movies").delete().eq("slug", slug);
      if (error) throw error;

      toast.success("Movie deleted");
      await fetchMovies();
    } catch (err) {
      console.error("Supabase delete error:", err.message || err);
      toast.error("Failed to delete movie");
    }
  };

  /// 🏠 Toggle homepage flag
const toggleHomepage = async (movie) => {
  try {
    const newValue = !movie.showOnHomepage;

    console.log("Updating movie:", movie.id, "→", newValue); // 🐛 Debug log

    const { data, error } = await supabase
      .from("movies")
      .update({ showOnHomepage: newValue })
      .eq("id", movie.id) // ✅ keep as string (uuid)
      .select("*")
      .single();

    if (error) throw error;

    if (!data) {
      toast.error("⚠️ No row was updated. Double-check Supabase RLS policies.");
      return;
    }

    toast.success(
      `✅ ${movie.title} ${newValue ? "added to" : "removed from"} homepage`
    );

    // ✅ Update local state instantly
    setMovies((prev) =>
      prev.map((m) =>
        m.id === movie.id ? { ...m, showOnHomepage: newValue } : m
      )
    );
  } catch (err) {
    console.error("toggleHomepage error:", err.message || err);
    toast.error("❌ Failed to update homepage flag");
  }
};


  // 📦 Initial load
  useEffect(() => {
    fetchMovies();
    getAuthState();
  }, []);

  return (
    <AppContext.Provider
      value={{
        backendUrl,
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,
        movies,
        setMovies,
        fetchMovies,
        addMovie,
        deleteMovie,
        toggleHomepage,
        getUserData,
        isAdmin,
        setIsAdmin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
