const path = require('path'); // <-- ADD THIS LINE

const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const cors = require('cors');

// --- 1. SETUP ---
const app = express();
app.use(cors());      // Allows your React app to talk to this server
app.use(express.json()); // Allows server to read JSON data from requests

// --- 2. GOOGLE SHEETS AUTHENTICATION ---

// <<< PASTE YOUR ACTUAL SPREADSHEET ID HERE >>>
const SPREADSHEET_ID = '1mkyheoBCl7HkYTEQjeVLbinN_QNeUcEdMmSAddd5wjc'; // Replace with your Sheet ID

const auth = new google.auth.GoogleAuth({
    // Try absolute path Render often uses for secrets
    keyFile: '/etc/secrets/credentials.json',
    // If the above doesn't work after deploying, try this one:
    // keyFile: '/opt/render/project/src/credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
});
// Google Sheets API client
let sheets;
auth.getClient().then(client => {
    sheets = google.sheets({ version: 'v4', auth: client });
    console.log("Google Sheets client initialized successfully.");
}).catch(err => {
    console.error("Error initializing Google Sheets client:", err);
});

// --- 3. API ENDPOINT for Student Submissions (POST /submit) ---
app.post('/submit', async (req, res) => {
    // Ensure sheets client is ready before proceeding
    if (!sheets) {
        return res.status(503).json({ message: 'Google Sheets service not ready. Please try again later.' });
    }
    try {
        const { name, rollNumber, title, abstract } = req.body;

        if (!name || !rollNumber || !title || !abstract) {
            return res.status(400).json({ message: 'All fields (Name, Roll Number, Title, Abstract) are required.' });
        }

        const newRow = [[name, rollNumber, title, abstract]]; // Data format for Sheets API

        // Append the new row to 'Sheet1'
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:D', // Assuming columns are A=Name, B=Roll, C=Title, D=Abstract
            valueInputOption: 'USER_ENTERED', // How the input data should be interpreted
            resource: {
                values: newRow,
            },
        });

        console.log("Submission successful for:", rollNumber);
        res.status(200).json({ message: 'Project submitted successfully!' });

    } catch (error) {
        console.error('Error submitting to Google Sheets:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error submitting project to Google Sheets.' });
    }
});

// --- 4. API ENDPOINT for Faculty Login (POST /login) ---
app.post('/login', async (req, res) => {
    // Ensure sheets client is ready
    if (!sheets) {
        return res.status(503).json({ message: 'Google Sheets service not ready. Please try again later.' });
    }
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        // Read credentials from the 'Faculty' tab
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Faculty!A2:B', // Read Username (A) and Password (B) from row 2 onwards
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.warn("Login attempt failed: No faculty accounts found in sheet.");
            return res.status(404).json({ message: 'No faculty accounts configured.' });
        }

        // Find user matching provided credentials
        const userFound = rows.find(row => row[0] === username && row[1] === password);

        if (userFound) {
            console.log("Login successful for user:", username);
            res.status(200).json({ message: 'Login successful' });
        } else {
            console.warn("Login attempt failed for user:", username);
            res.status(401).json({ message: 'Invalid username or password' });
        }

    } catch (error) {
        console.error('Error during login verification:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Server error during login process.' });
    }
});

// --- 5. API ENDPOINT to get ALL projects (GET /projects) ---
app.get('/projects', async (req, res) => {
    // Ensure sheets client is ready
    if (!sheets) {
        return res.status(503).json({ message: 'Google Sheets service not ready. Please try again later.' });
    }
    try {
        // Read project data from 'Sheet1'
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A2:D', // Read Name, Roll, Title, Abstract from row 2 onwards
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'No projects found in the sheet.' });
        }

        // Format data as an array of objects
        const projects = rows.map(row => ({
            name: row[0] || 'N/A', // Default values if cell is empty
            rollNumber: row[1] || 'N/A',
            title: row[2] || 'No Title',
            abstract: row[3] || 'No Abstract'
        }));

        console.log(`Fetched ${projects.length} projects.`);
        res.status(200).json(projects);

    } catch (error) {
        console.error('Error fetching projects from Google Sheets:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error fetching projects.' });
    }
});


// --- 6. API ENDPOINT for Similarity Analysis (GET /analyze) ---
app.get('/analyze', async (req, res) => {
    // Ensure sheets client is ready
    if (!sheets) {
        return res.status(503).json({ message: 'Google Sheets service not ready. Please try again later.' });
    }
    try {
        // *** MODIFIED PART STARTS HERE ***

        // 1. Read all TITLES AND ABSTRACTS from the Google Sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!C2:D', // Get Title (C) and Abstract (D) from row 2 onwards
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'No projects found to analyze.' });
        }

        // Separate titles and abstracts into lists
        const titlesList = rows.map(row => row[0] || ''); // Get title (col C), default to empty string
        const abstractsList = rows.map(row => row[1] || ''); // Get abstract (col D), default to empty string

        console.log(`Sending ${titlesList.length} titles/abstracts to Python service for analysis.`);

        // 2. Send BOTH lists to the Python NLP service
        // Use environment variable for Python service URL, fallback for local dev
        const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:5001/analyze';

        const nlpResponse = await axios.post(pythonApiUrl, {
            titles: titlesList,      // Send titles list
            abstracts: abstractsList // Send abstracts list
        });

        // *** MODIFIED PART ENDS HERE ***

        // 3. Send the full response (including similarity matrix and uniqueness ranks) back to the React app
        console.log("Analysis received from Python service.");
        res.status(200).json(nlpResponse.data);

    } catch (error) {
        // Log detailed error information
        if (error.response) {
            // Error from Python service or Google Sheets API during read
            console.error('Error during analysis (API responded):', error.response.data);
            res.status(error.response.status || 500).json({ message: `Analysis failed: ${error.response.data.error || 'External service error'}` });
        } else if (error.request) {
            // Error connecting to Python service
            console.error('Error during analysis (No response from Python service):', error.message);
            res.status(503).json({ message: 'Analysis service unavailable. Is the Python service running?' });
        } else {
            // Other errors
            console.error('Error setting up analysis request:', error.message);
            res.status(500).json({ message: 'Error analyzing projects.' });
        }
    }
});


// --- 7. START THE SERVER ---
const PORT = 3001; // Port for the Node.js server
app.listen(PORT, () => {
    console.log(`Node.js server listening on http://127.0.0.1:${PORT}`);
});