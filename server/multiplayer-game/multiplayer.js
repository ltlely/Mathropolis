const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);


  socket.broadcast.emit('playerJoined', { id: socket.id });


  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    socket.broadcast.emit('playerLeft', { id: socket.id });
  });

});

server.listen(3001, () => {
  console.log('Server is listening on port 3001');
});
