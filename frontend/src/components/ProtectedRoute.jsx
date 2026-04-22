import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // We check localStorage directly. This is instant.
  const token = localStorage.getItem('token');
  
  if (!token) {
    // If no token, redirect to login
    return <Navigate to="/Login" replace />;
  }

  // If token exists, show the Dashboard
  return children;
};

export default ProtectedRoute;