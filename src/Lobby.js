// Lobby.js

import './Lobby.css';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const Lobby = () => {
  const [avatar, setAvatar] = useState(null);
  const [players, setPlayers] = useState([]); // State for connected players
  const [gameReady, setGameReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || 'Unknown Player';

  // Initialize socket and store it in state to prevent multiple connections
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Create a new socket connection
    const newSocket = io(BACKEND_URL, {
      query: { username },
    });

    setSocket(newSocket);

    // Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, [username]);

  useEffect(() => {
    if (socket && avatar) {
      socket.emit('playerJoined', { username, avatar });
    }
  }, [avatar, username, socket]);

  useEffect(() => {
    if (!socket) return;

    // Handle player joined
    const handlePlayerJoined = (data) => {
      setPlayers((prevPlayers) => {
        const updatedPlayers = [...prevPlayers, data.playerData];
        // If player count reaches maxPlayers, set gameReady to true
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

    // Handle max players reached
    const handleMaxPlayersReached = (data) => {
      alert('The game is full. Please try again later.');
      handleLogout(); // Automatically logout the user
    };

    // Handle game ready
    const handleGameReady = (data) => {
      setGameReady(true);
      // Navigate to game with players data
      navigate('/game', { state: { username, avatar, players: data.players } });
    };

    // Handle socket disconnection
    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      // Navigate to App.js page (assuming it's the home page at '/')
      navigate('/'); // Change the route as per your routing setup
    };

    // Listen for events
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('maxPlayersReached', handleMaxPlayersReached);
    socket.on('gameReady', handleGameReady);
    socket.on('disconnect', handleDisconnect);

    // Cleanup listeners on unmount or socket change
    return () => {
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('maxPlayersReached', handleMaxPlayersReached);
      socket.off('gameReady', handleGameReady);
      socket.off('disconnect', handleDisconnect);
    };
  }, [navigate, socket, username, avatar]);

  const handleAvatarChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const avatarURL = URL.createObjectURL(event.target.files[0]);
      setAvatar(avatarURL);
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.emit('playerLeft', { id: socket.id }); // Optional: Notify server
      socket.disconnect();
      setSocket(null);
    }
    // Optionally, clear user-related state or tokens here
    navigate('/'); // Navigate to App.js page (e.g., home page)
  };

  return (
    <div className="lobby-container">
      <div className="header">
        <h1>Welcome to the Game Lobby!</h1>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
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
      {gameReady && (
        <p className="game-ready-text">Game is ready to start!</p>
      )}
    </div>
  );
};

export default Lobby;
