// mini/client/src/DashboardPage.js

import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Make sure this import is correct and present
import { Link } from 'react-router-dom';

// Use environment variable for Node API URL, fallback for local dev
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:3001';

// Dashboard Content Component
function ProfessorDashboardContent() {
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [projects, setProjects] = useState([]);
    const [ranks, setRanks] = useState(null);
    const [error, setError] = useState('');
    const SIMILARITY_THRESHOLD = 0.60; // Or 0.70, whatever you want the cutoff to be
    const [similarPairs, setSimilarPairs] = useState([]);

    const loadProjects = async () => {
        setIsLoading(true);
        setError('');
        setProjects([]); // Clear existing projects before loading new ones
        setRanks(null); // Clear ranks when loading projects
        setAnalysisResults(null); // Clear matrix when loading projects
        try {
            const response = await axios.get(`${API_URL}/projects`);
            setProjects(response.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to load projects.');
        }
        setIsLoading(false);
    };

    const handleAnalyze = async () => {
        if (projects.length === 0) {
            setError('Please load projects before analyzing.');
            return;
        }
        setIsLoading(true);
        setError('');
        setAnalysisResults(null);
        setRanks(null);
        try {
            const response = await axios.get(`${API_URL}/analyze`);
            setAnalysisResults(response.data.similarity_matrix);
            setRanks(response.data.uniqueness_ranks);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to get analysis.');
        }
        setIsLoading(false);
    };

    // --- CORRECTED: Calculate Highly Similar Pairs ---


    React.useEffect(() => {
        // Make sure we have BOTH the matrix and the project details before calculating
        if (analysisResults && projects.length > 0 && analysisResults.length === projects.length) {
            const pairs = [];
            console.log("Calculating similar pairs with matrix:", analysisResults); // Debug log

            // Loop through the matrix
            for (let i = 0; i < analysisResults.length; i++) {
                // Only compare with projects AFTER the current one (j > i) to avoid duplicates and self-comparison
                for (let j = i + 1; j < analysisResults.length; j++) {
                    const score = analysisResults[i][j];
                    console.log(`Comparing P${i + 1} and P${j + 1}: Score = ${score}`); // Debug log

                    // Check if score meets the threshold
                    if (score >= SIMILARITY_THRESHOLD) {
                        console.log(`Found high similarity between P${i + 1} and P${j + 1}!`); // Debug log

                        // Ensure project data exists for both indices
                        if (projects[i] && projects[j]) {
                            pairs.push({
                                project1: projects[i], // Project corresponding to row i
                                project2: projects[j], // Project corresponding to column j
                                score: score,
                                key: `${i}-${j}` // Use indices for a simple key
                            });
                        } else {
                            console.warn(`Missing project data for index ${i} or ${j}`); // Debug warning
                        }
                    }
                }
            }

            // Sort pairs by score, highest first
            pairs.sort((a, b) => b.score - a.score);
            console.log("Final similar pairs list:", pairs); // Debug log
            setSimilarPairs(pairs);
        } else {
            // Clear pairs if data is missing or mismatched
            setSimilarPairs([]);
            if (analysisResults || projects.length > 0) {
                console.log("Skipping similar pairs calculation - data not ready or mismatched lengths."); // Debug log
            }
        }
        // Dependency array: re-run ONLY when analysisResults or projects change
    }, [analysisResults, projects]);
    // ------------------------------------
    return (
        <div className="content-page">
            {error && <p className={`message error mb-3`}>{error}</p>}

            <div className="dashboard-layout">

                {/* === LEFT COLUMN: CONTROLS & STATS === */}
                <div className="controls-column">
                    <div className="card">
                        <div className="card-header"><h3>Actions</h3></div>
                        <div className="card-content">
                            <div className="button-group">
                                <button onClick={loadProjects} disabled={isLoading}>
                                    {isLoading ? 'Loading...' : 'Load All Projects'}
                                </button>
                                <button onClick={handleAnalyze} disabled={isLoading || projects.length === 0}>
                                    {isLoading ? 'Analyzing...' : 'Analyze Similarity'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><h3>Summary</h3></div>
                        <div className="card-content">
                            <div className="stat-card">
                                <h3>Total Submissions</h3>
                                <p>{projects.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === RIGHT COLUMN: RESULTS === */}
                <div className="results-column">

                    {/* --- Highly Similar Pairs List --- */}
                    {similarPairs.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3>Highly Similar Project Pairs (Score &ge; {(SIMILARITY_THRESHOLD * 100).toFixed(0)}%)</h3>
                                <p>Projects with significant textual overlap.</p>
                            </div>
                            <div className="card-content">
                                <ul className="similar-pairs-list">
                                    {similarPairs.map((pair) => (
                                        <li key={pair.key}>
                                            <div className="pair-info">
                                                <span><strong>{pair.project1.name}</strong> ({pair.project1.rollNumber})</span>
                                                <span className="similarity-score">{(pair.score * 100).toFixed(1)}%</span>
                                                <span><strong>{pair.project2.name}</strong> ({pair.project2.rollNumber})</span>
                                            </div>
                                            <div className="pair-titles">
                                                <small><em>"{pair.project1.title}"</em> vs <em>"{pair.project2.title}"</em></small>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    {/* Show a message if analysis is done but no pairs found */}
                    {analysisResults && similarPairs.length === 0 && !error && ( // Added !error condition
                        <div className="card">
                            <div className="card-content">
                                <p className="text-center text-muted">No project pairs found above the {(SIMILARITY_THRESHOLD * 100).toFixed(0)}% similarity threshold.</p>
                            </div>
                        </div>
                    )}
                    {/* ------------------------------------ */}


                    {/* Uniqueness Ranking Table */}
                    {ranks && (
                        <div className="card table-card uniqueness-table">
                            <div className="card-header"><h3>Uniqueness Ranking (1 = Most Unique)</h3></div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '10%' }}>Rank</th>
                                        <th style={{ width: '20%' }}>Name</th>
                                        <th style={{ width: '45%' }}>Project Title</th>
                                        <th style={{ width: '10%' }}>Score</th>
                                        <th style={{ width: '15%' }}>Roll No.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ranks.map((rankData) => {
                                        const project = projects[rankData.index];
                                        return (
                                            project ? (
                                                <tr key={project.rollNumber}>
                                                    <td>{rankData.rank}</td>
                                                    <td>{project.name}</td>
                                                    <td className="title-cell">{project.title}</td>
                                                    <td>{(rankData.score * 100).toFixed(2)}%</td>
                                                    <td>{project.rollNumber}</td>
                                                </tr>
                                            ) : null
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* All Submitted Projects List */}
                    {projects.length > 0 && (
                        <div className="card table-card">
                            <div className="card-header"><h3>All Submitted Projects List</h3></div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '20%' }}>Roll Number</th>
                                        <th style={{ width: '20%' }}>Name</th>
                                        <th style={{ width: '60%' }}>Project Title</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.map((project) => (
                                        <tr key={project.rollNumber}>
                                            <td>{project.rollNumber}</td>
                                            <td>{project.name}</td>
                                            <td className="title-cell">{project.title}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* --- DELETED SIMILARITY MATRIX --- */}
                    {/* The Similarity Matrix table code that was here previously has been removed */}

                </div>
            </div>
        </div>
    );
}

// Full DashboardPage component including the portal layout
function DashboardPage({ onLogout }) {
    return (
        <div className="portal-layout">
            {/* --- SIDEBAR --- */}
            <nav className="sidebar">
                <div className="sidebar-header">
                    Project<span>Portal</span>
                </div>
                <div className="sidebar-nav">
                    <Link to="/">Student Portal</Link>
                    <Link to="/dashboard">Faculty Dashboard</Link>
                </div>
                <div className="sidebar-logout">
                    <button onClick={onLogout}>Logout</button>
                </div>
            </nav>

            {/* --- CONTENT AREA --- */}
            <main className="content-area">
                <header className="content-header">
                    <h2>Faculty Dashboard</h2>
                </header>
                <ProfessorDashboardContent /> {/* Use the renamed content component */}
            </main>
        </div>
    );
}

export default DashboardPage;