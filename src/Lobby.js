import './Lobby.css';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import Chat from './Chat.js'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const Lobby = () => {
  const [players, setPlayers] = useState([]);
  const [gameReady, setGameReady] = useState(false);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [isGameStarting, setIsGameStarting] = useState(false);
  const dialogRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || 'Unknown Player';
  const [avatar, setAvatar] = useState(localStorage.getItem(`avatar-${location.state?.username || 'Unknown Player'}`) || null);

  // Initialize socket and store it in state to prevent multiple connections
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, { query: { username } });
    setSocket(newSocket);

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

    // This handler updates the state with the latest queue information
    const handleUpdateQueue = (data) => {
      setPlayers(data.players);
      setQueueCount(data.players.length);
      setGameReady(data.players.length === 4);
      if (data.players.length === 4) {
        setIsGameStarting(true);
        setTimeout(() => {
          navigate('/game', { state: { username, avatar, players: data.players } });
        }, 3000);
      }
    };

    const handlePlayerLeft = (data) => {
      setPlayers((prevPlayers) => {
        const updatedPlayers = prevPlayers.filter((player) => player.id !== data.id);
        setQueueCount(updatedPlayers.length);
        setGameReady(updatedPlayers.length === 4);
        return updatedPlayers;
      });
    };

    const handleMaxPlayersReached = () => {
      alert('The game is full. Please try again later.');
      handleLeaveQueue();
    };

    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      // Only navigate if not in the middle of starting the game
      if (!isGameStarting) {
        navigate('/');
      }
    };

    // Listen for queue updates from the server
    socket.on('updateQueue', handleUpdateQueue);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('maxPlayersReached', handleMaxPlayersReached);
    socket.on('disconnect', handleDisconnect);

    // Cleanup function to remove the listener when the component is unmounted
    return () => {
      socket.off('updateQueue', handleUpdateQueue);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('maxPlayersReached', handleMaxPlayersReached);
      socket.off('disconnect', handleDisconnect);
    };
  }, [navigate, socket, username, avatar, isGameStarting]);

  const handleAvatarChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const avatarURL = URL.createObjectURL(event.target.files[0]);
      setAvatar(avatarURL);
      localStorage.setItem(`avatar-${username}`, avatarURL);
    }
  };

  const handleAvatarClick = () => {
    setIsDialogVisible((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        setIsDialogVisible(false);
      }
    };
    if (isDialogVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDialogVisible]);

  const handleLogout = () => {
    if (socket) {
      socket.emit('playerLeft', { id: socket.id });
      socket.disconnect();
      setSocket(null);
    }
    navigate('/');
  };

  const handleJoinQueue = () => {
    if (socket) {
      socket.emit('joinQueue', { username });
      setIsQueueing(true);
    }
  };

  const handleLeaveQueue = () => {
    if (socket) {
      socket.emit('leaveQueue', { username });
      setIsQueueing(false);
    }
  };

  return (
    <>
      <div className={`lobby-container ${isGameStarting ? 'game-starting' : ''}`}>
        <div className="header">
          <h1>Welcome to the Game Lobby!</h1>
        </div>
        <div className="user-info">
          <div className="avatar-placeholder" onClick={handleAvatarClick}>
            {avatar ? (
              <img src={avatar} alt="Avatar" className="avatar-image" />
            ) : (
              <div style={{ textAlign: 'center' }}>No Avatar</div>
            )}
          </div>
          {isDialogVisible && (
            <div className="hover-dialog" ref={dialogRef}>
              <p style={{ color: '#ffffff' }}>Username: {username}</p>
              <label className="upload-button">
                Upload Avatar
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </label>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
        {!gameReady && !isQueueing && players.length < 4 && (
          <button className="join-queue-button" onClick={handleJoinQueue}>
            Join Game
          </button>
        )}
        {!gameReady && isQueueing && (
          <>
            <p className="waiting-text">Waiting for players... ({queueCount}/4)</p>
            <button className="leave-queue-button" onClick={handleLeaveQueue}>
              Leave Queue
            </button>
          </>
        )}
        {gameReady && isGameStarting && <p className="game-ready-text">Game is starting...</p>}
      </div>
      <Chat username={username} />
    </>
  );
};

export default Lobby;
