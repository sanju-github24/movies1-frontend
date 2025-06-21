// components/ProtectedAdminRoute.jsx
import React, { useContext, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom'; // ✅ add Outlet
import { AppContext } from '../context/AppContext';

const ProtectedAdminRoute = () => {
  const { isLoggedIn, isAdmin } = useContext(AppContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) return null; // or show loader

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />; // ✅ this renders the nested route (upload or blog-editor)
};

export default ProtectedAdminRoute;
