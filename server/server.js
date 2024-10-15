const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const cors = require('cors'); 
require('dotenv').config();


app.use(cors({
  origin: 'http://localhost:3000',
}));

// Middleware to parse JSON and URL-encoded data from the request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Create a MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,     // Loaded from .env
    user: process.env.DB_USER,   
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME  
  });

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
    throw err;
  }
  console.log('Connected to MySQL');
});


app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
  
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    try {
      // Check if the username or email already exists
      const checkUserEmailQuery = 'SELECT * FROM mathropolis WHERE username = ? OR email = ?';
      db.query(checkUserEmailQuery, [username, email], async (err, results) => {
        if (err) {
          console.error('Database error:', err.message);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
  
        // Variables to track which are taken
        let usernameTaken = false;
        let emailTaken = false;
  
        // Loop through the results to check for username and email
        results.forEach(user => {
          if (user.username === username) usernameTaken = true;
          if (user.email === email) emailTaken = true;
        });
  
        // Return appropriate error messages
        if (usernameTaken && emailTaken) {
          return res.status(409).json({ error: 'Both username and email are already taken' });
        } else if (usernameTaken) {
          return res.status(409).json({ error: 'Username is already taken' });
        } else if (emailTaken) {
          return res.status(409).json({ error: 'Email is already taken' });
        }
  
        // If both are available, insert the new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = 'INSERT INTO mathropolis (username, email, password_hash) VALUES (?, ?, ?)';
        db.query(insertQuery, [username, email, hashedPassword], (err, result) => {
          if (err) {
            console.error('Error inserting into database:', err.message);
            return res.status(500).json({ error: 'User creation failed', details: err.message });
          }
          res.status(201).json({ message: 'User created successfully' });
        });
      });
    } catch (error) {
      console.error('Error processing sign-up:', error.message);
      return res.status(500).json({ error: 'Sign-up process failed', details: error.message });
    }
  });
  
  
  

// Login Route
app.post('/login', (req, res) => {
  const { username, password } = req.body; // Get user input from request body

  // Check if the username exists in the database
  const query = 'SELECT * FROM mathropolis WHERE username = ?';
  db.query(query, [username], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (isPasswordValid) {
      res.status(200).json({ message: 'Login successful!' , username: user.username});
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  });
});

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
});


// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
