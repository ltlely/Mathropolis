// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create an Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

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

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
