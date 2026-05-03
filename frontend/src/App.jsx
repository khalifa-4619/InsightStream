import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Analytics from './pages/Analytics';
import { Toaster } from "sonner";
import DataSources from './pages/DataSources';
import LogsTerminal from './pages/LogsTerminal';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Landing from './pages/Landing';

function App() {
  return (
    <>
    <Toaster richColors position="top-right" />
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />   
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
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
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <LogsTerminal />
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