// mini/client/src/LoginPage.js

import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Make sure this import is correct and present
import { useNavigate } from 'react-router-dom';

// Use environment variable for Node API URL, fallback for local dev
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:3001';

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(`${API_URL}/login`, { username, password });
      onLogin(); // Sets login state in parent App.js
      // navigate('/dashboard'); // Navigation is handled in App.js now based on state
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        <h2>Faculty Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Login</button>
        </form>
        {error && <p className="message error mt-2">{error}</p>}
      </div>
    </div>
  );
}

export default LoginPage;