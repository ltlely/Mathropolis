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

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://mathropolis-nb3noapoi-lylys-projects.vercel.app'], // Your frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Configure CORS for Express routes
app.use(cors({
  origin: 'https://mathropolis-nb3noapoi-lylys-projects.vercel.app', // Your frontend URL
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Authentication Routes
// ... (Your existing /signup and /login routes)

// Socket.IO Logic
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
      socket.emit('maxPlayersReached');
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

    // If four players have joined, emit 'gameReady'
    if (playerCount === maxPlayers) {
      io.emit('gameReady', { players });
    }

    // Handle player disconnection
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
      teams.team1 = teams.team1.filter((player) => player.id !== socket.id);
      teams.team2 = teams.team2.filter((player) => player.id !== socket.id);
      players = players.filter((player) => player.id !== socket.id);
      io.emit('playerLeft', { id: socket.id });
      playerCount--;
    });
  });
});

// Serve static files
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
