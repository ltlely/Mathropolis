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
  const [avatar, setAvatar] = useState(localStorage.getItem(`avatar-${username}`) || null);

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (username === 'Unknown Player') {
      navigate('/');
      return;
    }

    const newSocket = io(BACKEND_URL, { query: { username } });
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('playerLeft', { id: newSocket.id });
        newSocket.disconnect();
      }
    };
  }, [username, navigate]);

  useEffect(() => {
    if (socket && avatar) {
      socket.emit('playerJoined', { username, avatar });
    }
  }, [avatar, username, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdateQueue = (data) => {
      setPlayers(data.players);
      setQueueCount(data.queueCount);
      setGameReady(data.queueCount === 4);
      setIsQueueing(data.players.some(player => player.username === username));
      
      if (data.queueCount === 4) {
        setIsGameStarting(true);
        setTimeout(() => {
          navigate('/game', { state: { username, avatar, players: data.players } });
        }, 3000);
      }
    };

    const handlePlayerLeft = (data) => {
      setPlayers((prevPlayers) => prevPlayers.filter((player) => player.id !== data.id));
      // The server will send an updateQueue event, so we don't need to update queueCount here
    };

    const handleMaxPlayersReached = () => {
      alert('The game is full. Please try again later.');
    };

    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      if (!isGameStarting) {
        navigate('/');
      }
    };

    socket.on('updateQueue', handleUpdateQueue);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('maxPlayersReached', handleMaxPlayersReached);
    socket.on('disconnect', handleDisconnect);

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
      // We'll rely on the server's response to update the queue state
    }
  };

  const handleLeaveQueue = () => {
    if (socket) {
      socket.emit('leaveQueue', { username });
      // We'll rely on the server's response to update the queue state
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket) {
        socket.emit('playerLeft', { id: socket.id });
        socket.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket]);

  return (
    <>
      <div className={`lobby-container ${isGameStarting ? 'game-starting' : ''}`}>
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
        {!gameReady && !isQueueing && (
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