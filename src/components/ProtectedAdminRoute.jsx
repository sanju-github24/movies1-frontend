// components/ProtectedAdminRoute.jsx
import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import AdminUpload from '../context/AdminUpload';

const ProtectedAdminRoute = () => {
  const { isLoggedIn, isAdmin } = useContext(AppContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait a tick to allow AppContext to hydrate from localStorage
    const timeout = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) return null; // or show loader

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <AdminUpload />;
};

export default ProtectedAdminRoute;
