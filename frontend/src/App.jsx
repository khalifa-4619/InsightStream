import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'
import Dashboard from './pages/Dashboard';

function App() {

  // Simple check: do we have a token in localStorage?
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* If user is logged in, show Dashboard. If not, send to login */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        {/* Default path */}
        <Route path="/" element={<Navigate to={isAuthenticated? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App