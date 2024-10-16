// server.js

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();

// Create an HTTP server
const server = http.createServer(app);

// Configure CORS options
const allowedOrigins = [
  'http://localhost:3000',
  'https://mathropolis-qsl6fppb6-lylys-projects.vercel.app',
  'https://www.themathropolis.com',
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Apply CORS middleware to Express
app.use(cors(corsOptions));

// Middleware to parse JSON and URL-encoded data from the request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: corsOptions,
});

// PostgreSQL pool connection
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test the database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.stack);
    throw err;
  }
  console.log('Connected to Supabase PostgreSQL database');
  release();
});

// === Authentication Routes ===

// Sign Up Route
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if the username or email already exists
    const checkUserEmailQuery = 'SELECT * FROM mathropolis WHERE username = $1 OR email = $2';
    const result = await pool.query(checkUserEmailQuery, [username, email]);
    const rows = result.rows;

    // Variables to track which are taken
    let usernameTaken = false;
    let emailTaken = false;

    // Loop through the results to check for username and email
    rows.forEach(user => {
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
    const insertQuery = 'INSERT INTO mathropolis (username, email, password_hash) VALUES ($1, $2, $3)';
    await pool.query(insertQuery, [username, email, hashedPassword]);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error processing sign-up:', error.message);
    return res.status(500).json({ error: 'Sign-up process failed', details: error.message });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body; // Get user input from request body

  try {
    // Check if the username exists in the database
    const query = 'SELECT * FROM mathropolis WHERE username = $1';
    const result = await pool.query(query, [username]);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (isPasswordValid) {
      res.status(200).json({ message: 'Login successful!', username: user.username });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).json({ error: 'Login process failed', details: err.message });
  }
});

// === Socket.IO Logic ===

let playerCount = 0;
const maxPlayers = 4;
const teams = { team1: [], team2: [] };
let players = []; // Maintain a list of all connected players

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle 'playerJoined' event from client
  socket.on('playerJoined', (data) => {
    const { username, avatar } = data;

    if (playerCount >= maxPlayers) {
      socket.emit('maxPlayersReached', { message: 'Maximum players reached.' });
      socket.disconnect();
      return;
    }

    playerCount++;

    // Assign player to a team alternately
    const team = playerCount % 2 === 0 ? 'team2' : 'team1';

    const playerData = {
      id: socket.id,
      username,
      avatar: avatar || '/path/to/default/avatar.png',
      score: 0,
      team,
    };

    teams[team].push(playerData);
    players.push(playerData);

    io.emit('playerJoined', { id: socket.id, username, team, playerData });

    // If max players have joined, emit 'gameReady'
    if (playerCount === maxPlayers) {
      io.emit('gameReady', { players });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    // Remove player from teams and players list
    ['team1', 'team2'].forEach((team) => {
      teams[team] = teams[team].filter((player) => player.id !== socket.id);
    });
    players = players.filter((player) => player.id !== socket.id);
    playerCount--;

    io.emit('playerLeft', { id: socket.id });
  });
});


// === Serve Static Files ===

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});