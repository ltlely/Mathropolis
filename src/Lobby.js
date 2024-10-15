import React from 'react';
import { useLocation } from 'react-router-dom';

const Lobby = () => {
  const location = useLocation(); // Get the location object
  const username = location.username || 'Unknown Player'; // Extract the username from state

  console.log('Lobby component rendered. Username:', username); // Log the username to debug

  return (
    <div>
      <h1>Welcome to the Lobby</h1>
      <p>Your Username: {username}</p> {/* Display the username */}
    </div>
  );
};

export default Lobby;
