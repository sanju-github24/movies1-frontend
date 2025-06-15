import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from '../utils/supabaseClient';
import axios from "axios";
import { backendUrl } from "../utils/api";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [movies, setMovies] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ On first load — get userData & login status from localStorage
  useEffect(() => {
    try {
      const storedLogin = localStorage.getItem("isLoggedIn") === "true";
      const storedUser = JSON.parse(localStorage.getItem("userData") || "null");

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setIsLoggedIn(true);
        await getUserData(); // will also update localStorage
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("getAuthState error:", error.message);
      setIsLoggedIn(false);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // ✅ Get user data from backend and store it
  const getUserData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/data`);
      if (data.success) {
        setUserData(data.userData);
        localStorage.setItem("userData", JSON.stringify(data.userData));
        localStorage.setItem("isLoggedIn", "true");
        setIsAdmin(data.userData.email === "sanjusanjay0444@gmail.com");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
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
      setMovies(data || []);
    } catch (err) {
      console.error("Supabase fetch error:", err.message || err);
      toast.error("Failed to fetch movies");
    }
  };

  // ➕ Add movie and clean old ones
  const addMovie = async (movie) => {
    try {
      const { data: newMovie, error } = await supabase
        .from("movies")
        .insert([movie])
        .select()
        .single();

      if (error) throw error;

      const updatedMovies = [newMovie, ...movies];

      if (updatedMovies.length > 160) {
        const extras = updatedMovies.slice(160);

        for (const m of extras) {
          try {
            await supabase.from("movies").delete().eq("slug", m.slug);
          } catch (err) {
            console.warn(`Failed to delete ${m.slug}:`, err.message);
          }
        }

        setMovies(updatedMovies.slice(0, 160));
      } else {
        setMovies(updatedMovies);
      }
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

  // 📦 Initial load — fetch movies & check auth
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
        getUserData,
        isAdmin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
