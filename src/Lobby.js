// Lobby.js

import './Lobby.css';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const socket = io(BACKEND_URL, {
  withCredentials: true,
  extraHeaders: {
    'my-custom-header': 'abcd',
  },
});

const Lobby = () => {
  const [avatar, setAvatar] = useState(null);
  const [players, setPlayers] = useState([]); // State for connected players
  const [gameReady, setGameReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || 'Unknown Player';

  // Initialize socket with username as query parameter
  const socket = io(BACKEND_URL, {
    query: { username },
  });

  useEffect(() => {
    // Emit 'playerJoined' when avatar is selected
    if (avatar) {
      socket.emit('playerJoined', { username, avatar });
    }
  }, [avatar, username, socket]);

  useEffect(() => {
    // Handle player joined
    const handlePlayerJoined = (data) => {
      setPlayers((prevPlayers) => {
        const updatedPlayers = [...prevPlayers, data.playerData];
        // If player count reaches 4, set gameReady to true
        if (updatedPlayers.length === 4) {
          setGameReady(true);
        }
        return updatedPlayers;
      });
    };

    // Handle player left
    const handlePlayerLeft = (data) => {
      setPlayers((prevPlayers) =>
        prevPlayers.filter((player) => player.id !== data.id)
      );
    };

    // Listen for events
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('playerLeft', handlePlayerLeft);

    // Handle max players reached
    socket.on('maxPlayersReached', () => {
      alert('The game is full. Please try again later.');
      navigate('/'); // Navigate to home or another appropriate page
    });

    // Handle game ready
    socket.on('gameReady', (data) => {
      setGameReady(true);
      // Navigate to game with players data
      navigate('/game', { state: { username, avatar, players: data.players } });
    });

    return () => {
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('maxPlayersReached');
      socket.off('gameReady');
    };
  }, [navigate, socket, username, avatar]);

  const handleAvatarChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const avatarURL = URL.createObjectURL(event.target.files[0]);
      setAvatar(avatarURL);
    }
  };

  return (
    <div className="lobby-container">
      <h1>Welcome to the Game Lobby!</h1>
      <div className="user-info">
        <div className="avatar-preview">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="avatar-image" />
          ) : (
            <div className="avatar-placeholder">No Avatar</div>
          )}
        </div>
        <p className="username-display">Username: {username}</p>
        <label className="upload-button">
          Upload Avatar
          <input type="file" accept="image/*" onChange={handleAvatarChange} />
        </label>
      </div>
      {!gameReady && (
        <p className="waiting-text">Waiting for players...</p>
      )}
    </div>
  );
};

export default Lobby;
