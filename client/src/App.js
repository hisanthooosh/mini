// mini/client/src/App.js

import React, { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import './App.css'; // Make sure this import is correct and present

// Import our pages
import StudentPage from './StudentPage';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';

// This is the main router component
const AppRouter = () => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    setIsAdminLoggedIn(true);
    navigate('/dashboard'); // Go to dashboard on login
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    navigate('/login'); // Go to login on logout
  };

  return (
    <Routes>
      {/* Route 1: The Login Page (Full-screen) */}
      <Route
        path="/login"
        element={
          !isAdminLoggedIn ? (
            <LoginPage onLogin={handleLogin} />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Route 2: The Dashboard (Protected) */}
      <Route
        path="/dashboard"
        element={
          isAdminLoggedIn ? (
            <DashboardPage onLogout={handleLogout} /> // Pass onLogout here
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Route 3: The Student Page (Public Homepage) */}
      <Route
        path="/"
        element={
          <StudentPage />
        }
      />

      {/* Catch-all: Redirect to homepage */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;