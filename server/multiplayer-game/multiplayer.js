const io = new Server(server);

let playerCount = 0; // Track number of connected players
const maxPlayers = 4;

io.on('connection', (socket) => {
  const username = socket.handshake.query.username; // Get username from query when connecting

  if (playerCount >= maxPlayers) {
    socket.emit('maxPlayersReached');
    socket.disconnect();
    return;
  }

  playerCount++; // Increment player count when someone connects
  const playerNumber = playerCount;

  // Emit the player's ID, number, and username to the client
  io.emit('playerJoined', { id: socket.id, playerNumber, username });

  // Handle disconnection
  socket.on('disconnect', () => {
    io.emit('playerLeft', { id: socket.id });
    playerCount--;
  });
});
