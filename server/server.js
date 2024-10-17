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

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://mathropolis-8u5v79y7m-lylys-projects.vercel.app',
  'https://www.themathropolis.com'
];

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('CORS policy violation: Origin not allowed:', origin);
      callback(new Error('CORS policy violation: Origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Allow cookies and Authorization headers
};

// Apply the CORS middleware to all routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

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
  const { username, password } = req.body;

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

// Store chat messages for up to 3 hours (in-memory storage)
let chatMessages = [];

// Limit message history to 3 hours or a maximum number of messages
const MAX_MESSAGE_AGE = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
const MAX_MESSAGE_COUNT = 100; // Max number of messages to store

// Function to filter out old messages
const filterOldMessages = () => {
  const now = Date.now();
  chatMessages = chatMessages.filter(
    (msg) => now - msg.timestamp < MAX_MESSAGE_AGE
  );
};

// Socket.IO Logic
let players = []; // Maintain a list of all connected users
let queuedPlayers = []; // Track the queued players

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Send current queue state to the newly connected user
  socket.emit('updateQueue', { players: queuedPlayers });

  // Add user to connected players list
  socket.on('registerUser', (username) => {
    if (!players.find(player => player.username === username)) {
      players.push({ id: socket.id, username });
      io.emit('updateUserList', players.map(player => player.username)); // Broadcast updated user list
    }
  });

  // Handle player joining the queue
  socket.on('joinQueue', ({ username }) => {
    if (!queuedPlayers.find(player => player.id === socket.id)) {
      queuedPlayers.push({ id: socket.id, username });
    }

    // Broadcast updated queue to all clients
    io.emit('updateQueue', { players: queuedPlayers });

    // Start game when queue is full
    if (queuedPlayers.length === 4) {
      io.emit('gameReady', { players: queuedPlayers });
      queuedPlayers = []; // Clear the queue after the game is ready
    }
  });

  // Handle player leaving the queue
  socket.on('leaveQueue', ({ username }) => {
    queuedPlayers = queuedPlayers.filter(player => player.id !== socket.id);

    // Broadcast updated queue to all clients
    io.emit('updateQueue', { players: queuedPlayers });
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    players = players.filter((player) => player.id !== socket.id);
    queuedPlayers = queuedPlayers.filter((player) => player.id !== socket.id); // Remove from queue if queued
    
    // Broadcast updated queue and user list to all clients
    io.emit('updateQueue', { players: queuedPlayers });
    io.emit('updateUserList', players.map(player => player.username)); // Broadcast updated user list
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
