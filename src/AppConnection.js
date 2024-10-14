import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001'); // Connect to the backend server

const App = () => {
  const [players, setPlayers] = useState({});
  const [playerId, setPlayerId] = useState(null);

  useEffect(() => {
    // Listen for connection
    socket.on('connect', () => {
      setPlayerId(socket.id);
      console.log('Connected with ID:', socket.id);
    });

    // Listen for new players joining
    socket.on('playerJoined', (data) => {
      setPlayers((prev) => ({ ...prev, [data.id]: { x: 0, y: 0 } }));
    });

    // Listen for player leaving
    socket.on('playerLeft', (data) => {
      setPlayers((prev) => {
        const newPlayers = { ...prev };
        delete newPlayers[data.id];
        return newPlayers;
      });
    });

    // Listen for player movements
    socket.on('updatePlayerMove', (data) => {
      setPlayers((prev) => ({ ...prev, [data.id]: { x: data.x, y: data.y } }));
    });

    return () => {
      socket.off('connect');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('updatePlayerMove');
    };
  }, []);

 
  return (
    <div>
      <h1>Multiplayer Game</h1>
      <p>Your Player ID: {playerId}</p>
      <div>
        {Object.keys(players).map((id) => (
          <div key={id} style={{ position: 'absolute', left: players[id].x, top: players[id].y }}>
            Player {id}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
