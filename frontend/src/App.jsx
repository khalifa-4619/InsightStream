import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Analytics from './pages/Analytics';
import { Toaster } from "sonner";
import DataSources from './pages/DataSources';

function App() {
  return (
    <>
    <Toaster richColors position="top-right" />
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path='/analytics'
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
          />
        <Route
          path="/data-sources"
          element={
            <ProtectedRoute>
              <DataSources />
            </ProtectedRoute>
          }
          />
        {/* Use the ProtectedRoute component as a wrapper */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect root to dashboard; ProtectedRoute will catch it if not logged in */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
    </>
  );
}

export default App