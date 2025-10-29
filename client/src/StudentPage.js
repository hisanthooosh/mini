// mini/client/src/StudentPage.js

import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Make sure this import is correct and present
import { Link } from 'react-router-dom';

// Use environment variable for Node API URL, fallback for local dev
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:3001';

// Public Header Component
const PublicHeader = () => {
  return (
    <header className="public-header">
      <div className="public-header-logo">
        Project<span>Portal</span>
      </div>
      <nav className="public-header-nav">
        <Link to="/login">Faculty Login</Link>
      </nav>
    </header>
  );
};

// Student Form Component
const StudentForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    title: '',
    abstract: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Submitting...');
    setMessageType('');
    try {
      const response = await axios.post(`${API_URL}/submit`, formData);
      setMessage(response.data.message);
      setMessageType('success');
      setFormData({ name: '', rollNumber: '', title: '', abstract: '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'An error occurred.');
      setMessageType('error');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
         <h3>Student Project Submission</h3>
      </div>
      <div className="card-content">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name:</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Roll Number:</label>
            <input type="text" name="rollNumber" value={formData.rollNumber} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Project Title:</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Project Abstract:</label>
            <textarea name="abstract" value={formData.abstract} onChange={handleChange} required></textarea>
          </div>
          <button type="submit">Submit Project</button>
        </form>
        {message && <p className={`message ${messageType} mt-2`}>{message}</p>}
      </div>
    </div>
  );
};

// Main StudentPage component
function StudentPage() {
  return (
    <div className="public-layout">
      <PublicHeader />
      <div className="public-content">
        <StudentForm />
      </div>
    </div>
  );
}

export default StudentPage;