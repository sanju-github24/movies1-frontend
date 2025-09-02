// src/components/ProtectedAdminRoute.jsx
import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AppContext } from "../context/AppContext";

const ProtectedAdminRoute = () => {
  const { userData, isLoggedIn, isAdmin } = useContext(AppContext);

  // ✅ If not logged in, redirect to login
  if (!isLoggedIn || !userData) {
    return <Navigate to="/login" replace />;
  }

  // ✅ If user is logged in but not admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // ✅ If user is admin, render the nested routes
  return <Outlet />;
};

export default ProtectedAdminRoute;
