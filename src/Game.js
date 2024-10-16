// Game.js
import './Game.css';
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNavigate, useLocation } from 'react-router-dom';


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const socket = io(BACKEND_URL);

const Game = () => {
  const numbers = [0,1,2,3,4,5,6,7,8,9];
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Separate state variables for each problem
  const [problemOne, setProblemOne] = useState('');
  const [problemTwo, setProblemTwo] = useState('');
  const [numOfPlacementOne, setNumOfPlacementOne] = useState(0);
  const [numOfPlacementTwo, setNumOfPlacementTwo] = useState(0);
  const [answerOne, setAnswerOne] = useState('');
  const [answerTwo, setAnswerTwo] = useState('');
  const [userAnswerOne, setUserAnswerOne] = useState([]);
  const [userAnswerTwo, setUserAnswerTwo] = useState([]);

  const [isProblemOneIncorrect, setIsProblemOneIncorrect] = useState(false);
  const [isProblemTwoIncorrect, setIsProblemTwoIncorrect] = useState(false);

  const [players, setPlayers] = useState([
    { id: 1, username: 'Player1', avatar: '/path/to/avatar1.png', score: 0 },
    { id: 2, username: 'Player2', avatar: '/path/to/avatar2.png', score: 0 },
    { id: 3, username: 'Player3', avatar: '/path/to/avatar3.png', score: 0 },
    { id: 4, username: 'Player4', avatar: '/path/to/avatar4.png', score: 0 }
  ]);

  const [activePlayer, setActivePlayer] = useState(null);

  const [countdown, setCountdown] = useState(5); // Add countdown state, starting at 5 seconds
  const [isGameActive, setIsGameActive] = useState(false); // To control when the game is active

  // Get the username and avatar from the previous page (Lobby)
  const location = useLocation();
  const username = location.state?.username || 'Unknown Player'; // Retrieve the username from the state
  const avatar = location.state?.avatar || '/path/to/default/avatar.png';

  const [round, setRound] = useState(1); // Keep track of the current round
  const [teamOneLevel, setTeamOneLevel] = useState(1); // Level for Team One
  const [teamTwoLevel, setTeamTwoLevel] = useState(1); // Level for Team Two


  const navigate = useNavigate();
  const handleQuit = () => {
    // Perform any necessary cleanup here
    socket.disconnect(); // Disconnect from Socket.IO if needed
    navigate('/lobby'); // Navigate back to the lobby
  };


  useEffect(() => {
    // Update players' usernames and avatars based on their IDs
    setPlayers(prevPlayers =>
      prevPlayers.map(player => {
        if (player.id === 1) {
          return { ...player, username, avatar }; // Update with the username and avatar from location.state
        } else {
          return player; // No changes for other players
        }
      })
    );

    // Set activePlayer to id 1
    setActivePlayer(1);
  }, [username, avatar]);

  useEffect(() => {
    // Socket listeners (if you're using sockets)
    socket.on('playerJoined', (data) => {
      setPlayers((prevPlayers) => [...prevPlayers, data.playerData]);
      generateMathProblemForPlayer(data.playerData.id);
    });

    socket.on('playerLeft', (data) => {
      setPlayers((prevPlayers) => prevPlayers.filter((player) => player.id !== data.id));
    });

    return () => {
      socket.off('playerJoined');
      socket.off('playerLeft');
    };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsGameActive(true); // Enable game interaction after countdown
    }
  }, [countdown]);

  const renderPlayers = () => (
    <div className="players-row">
      {players.map((player) => (
        <div
          key={player.id}
          className={`player-card ${activePlayer === player.id ? 'active-player' : ''}`}
        >
          <div className="avatar-container">
            <img src={player.avatar} className="avatar" alt={`${player.username}'s avatar`} />
          </div>
          <p className="player-name">{player.username}</p>
          <div className="player-stats">
            <p className="player-score">Score: {player.score}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const randomNumberGenerator = () => Math.floor(Math.random() * 1001);

  const randomOperatorGenerator = () => {
    const operators = ['+', '-', '*', '÷'];
    return operators[Math.floor(Math.random() * operators.length)];
  };

  const randomMathProblemGeneratorOne = () => {
    let result = null;
    let num1 = 0;
    let num2 = 0;
    let operator = '';

    while (result === null || result < 10 || result > 9999) {
      num1 = randomNumberGenerator();
      num2 = randomNumberGenerator();
      operator = randomOperatorGenerator();

      result = calculateAnswer(num1, num2, operator);

      if (result === 'undefined' || !Number.isInteger(result)) {
        result = null;
      }
    }

    const newProblem = `${num1} ${operator} ${num2}`;
    setProblemOne(newProblem);

    const resultString = result.toString();
    setNumOfPlacementOne(resultString.length);
    setAnswerOne(resultString);
    setUserAnswerOne(Array(resultString.length).fill('')); // Reset user's input and match answer length
  };

  const randomMathProblemGeneratorTwo = () => {
    let result = null;
    let num1 = 0;
    let num2 = 0;
    let operator = '';

    while (result === null || result < 10 || result > 9999) {
      num1 = randomNumberGenerator();
      num2 = randomNumberGenerator();
      operator = randomOperatorGenerator();

      result = calculateAnswer(num1, num2, operator);

      if (result === 'undefined' || !Number.isInteger(result)) {
        result = null;
      }
    }

    const newProblem = `${num1} ${operator} ${num2}`;
    setProblemTwo(newProblem);

    const resultString = result.toString();
    setNumOfPlacementTwo(resultString.length);
    setAnswerTwo(resultString);
    setUserAnswerTwo(Array(resultString.length).fill('')); // Reset user's input and match answer length
  };

  const calculateAnswer = (num1, num2, operator) => {
    switch (operator) {
      case '+':
        return num1 + num2;
      case '-':
        return num1 - num2;
      case '*':
        return num1 * num2;
      case '÷':
        return num2 !== 0 ? num1 / num2 : 'undefined';
      default:
        return null;
    }
  };

  useEffect(() => {
    randomMathProblemGeneratorOne();
    randomMathProblemGeneratorTwo();
  }, []);

  const handleButtonClick = (value) => {
    if (!isGameActive) return; // Disable clicks until the countdown is over

    if (activePlayer === null) return; // No active player selected

    // Determine which team the active player belongs to
    const teamId = activePlayer === 1 || activePlayer === 2 ? 1 : 2;
    const teamLevel = teamId === 1 ? teamOneLevel : teamTwoLevel;

    if (activePlayer === 1 || activePlayer === 2) {
      // For problemOne
      const lastIndex = userAnswerOne.length - 1;

      if (activePlayer === 1) {
        // Player 1 can fill all boxes except the last one
        const nextAvailableIndex = userAnswerOne.findIndex((answerVal, idx) => {
          return !(
            (numOfPlacementOne === 3 && idx === 0 && answerOne[0]) || 
            (numOfPlacementOne === 4 && idx === 0 && answerOne[0]) || 
            (numOfPlacementOne === 4 && idx === 1 && answerOne[1])
          ) && !answerVal && idx !== lastIndex;
        });

        if (nextAvailableIndex !== -1) {
          const newUserAnswerOne = [...userAnswerOne];
          newUserAnswerOne[nextAvailableIndex] = value.toString();

          // Check if the input digit matches the corresponding digit in answerOne
          if (newUserAnswerOne[nextAvailableIndex] !== answerOne[nextAvailableIndex]) {
            // Incorrect answer
            setIsProblemOneIncorrect(true);
            handleIncorrectAnswerAtLevel10(teamLevel, teamId);

            // Move to next question after 1 second
            setTimeout(() => {
              setIsProblemOneIncorrect(false);
              randomMathProblemGeneratorOne();
            }, 1000);
          } else {
            // Correct so far, update userAnswerOne
            setUserAnswerOne(newUserAnswerOne);
            // Check if the answer is complete
            if (newUserAnswerOne.every((val, idx) => val === answerOne[idx])) {
              // The answer is correct
              updateScoreAndLevel(activePlayer);

              // Check for winning condition
              checkWinningCondition(teamLevel + 1, teamId);

              randomMathProblemGeneratorOne();
            }
          }
        }
      } else if (activePlayer === 2) {
        // Player 2 can only fill the last box
        if (!userAnswerOne[lastIndex]) {
          const newUserAnswerOne = [...userAnswerOne];
          newUserAnswerOne[lastIndex] = value.toString();

          // Check if the input digit matches the corresponding digit in answerOne
          if (newUserAnswerOne[lastIndex] !== answerOne[lastIndex]) {
            // Incorrect answer
            setIsProblemOneIncorrect(true);
            handleIncorrectAnswerAtLevel10(teamLevel, teamId);

            // Move to next question after 1 second
            setTimeout(() => {
              setIsProblemOneIncorrect(false);
              randomMathProblemGeneratorOne();
            }, 1000);
          } else {
            // Correct so far, update userAnswerOne
            setUserAnswerOne(newUserAnswerOne);
            // Check if the answer is complete
            if (newUserAnswerOne.every((val, idx) => val === answerOne[idx])) {
              // The answer is correct
              updateScoreAndLevel(activePlayer);

              // Check for winning condition
              checkWinningCondition(teamLevel + 1, teamId);

              randomMathProblemGeneratorOne();
            }
          }
        }
      }
    } else if (activePlayer === 3 || activePlayer === 4) {
      // For problemTwo
      const lastIndex = userAnswerTwo.length - 1;

      if (activePlayer === 3) {
        // Player 3 can fill all boxes except the last one
        const nextAvailableIndex = userAnswerTwo.findIndex((answerVal, idx) => {
          return !(
            (numOfPlacementTwo === 3 && idx === 0 && answerTwo[0]) || 
            (numOfPlacementTwo === 4 && idx === 0 && answerTwo[0]) || 
            (numOfPlacementTwo === 4 && idx === 1 && answerTwo[1])
          ) && !answerVal && idx !== lastIndex;
        });

        if (nextAvailableIndex !== -1) {
          const newUserAnswerTwo = [...userAnswerTwo];
          newUserAnswerTwo[nextAvailableIndex] = value.toString();

          // Check if the input digit matches the corresponding digit in answerTwo
          if (newUserAnswerTwo[nextAvailableIndex] !== answerTwo[nextAvailableIndex]) {
            // Incorrect answer
            setIsProblemTwoIncorrect(true);
            handleIncorrectAnswerAtLevel10(teamLevel, teamId);

            // Move to next question after 1 second
            setTimeout(() => {
              setIsProblemTwoIncorrect(false);
              randomMathProblemGeneratorTwo();
            }, 1000);
          } else {
            // Correct so far, update userAnswerTwo
            setUserAnswerTwo(newUserAnswerTwo);
            // Check if the answer is complete
            if (newUserAnswerTwo.every((val, idx) => val === answerTwo[idx])) {
              // The answer is correct
              updateScoreAndLevel(activePlayer);

              // Check for winning condition
              checkWinningCondition(teamLevel + 1, teamId);

              randomMathProblemGeneratorTwo();
            }
          }
        }
      } else if (activePlayer === 4) {
        // Player 4 can only fill the last box
        if (!userAnswerTwo[lastIndex]) {
          const newUserAnswerTwo = [...userAnswerTwo];
          newUserAnswerTwo[lastIndex] = value.toString();

          // Check if the input digit matches the corresponding digit in answerTwo
          if (newUserAnswerTwo[lastIndex] !== answerTwo[lastIndex]) {
            // Incorrect answer
            setIsProblemTwoIncorrect(true);
            handleIncorrectAnswerAtLevel10(teamLevel, teamId);

            // Move to next question after 1 second
            setTimeout(() => {
              setIsProblemTwoIncorrect(false);
              randomMathProblemGeneratorTwo();
            }, 1000);
          } else {
            // Correct so far, update userAnswerTwo
            setUserAnswerTwo(newUserAnswerTwo);
            // Check if the answer is complete
            if (newUserAnswerTwo.every((val, idx) => val === answerTwo[idx])) {
              // The answer is correct
              updateScoreAndLevel(activePlayer);

              // Check for winning condition
              checkWinningCondition(teamLevel + 1, teamId);

              randomMathProblemGeneratorTwo();
            }
          }
        }
      }
    }

    // Call handleEndOfRound after each answer attempt
    handleEndOfRound();
  };

  const updateScoreAndLevel = (playerId) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player.id === playerId ? { ...player, score: player.score + 1 } : player
      )
    );

    // Determine which team the player belongs to
    if (playerId === 1 || playerId === 2) {
      // Team One
      setTeamOneLevel(prevLevel => prevLevel + 1);
    } else if (playerId === 3 || playerId === 4) {
      // Team Two
      setTeamTwoLevel(prevLevel => prevLevel + 1);
    }
  };

  const handleEndOfRound = () => {
    setRound(prevRound => prevRound + 1);

    // After every 5 rounds, switch players within teams
    if ((round + 1) % 5 === 1) {
      switchPlayersInTeams();
    }
  };

  const switchPlayersInTeams = () => {
    setPlayers(prevPlayers => {
      // Assuming players 1 & 2 are Team One, 3 & 4 are Team Two
      const newPlayers = [...prevPlayers];

      // Switch positions within Team One
      [newPlayers[0], newPlayers[1]] = [newPlayers[1], newPlayers[0]];

      // Switch positions within Team Two
      [newPlayers[2], newPlayers[3]] = [newPlayers[3], newPlayers[2]];

      return newPlayers;
    });
  };

  const checkWinningCondition = (teamLevel, teamId) => {
    if (teamLevel >= 10) {
      // Team has reached level 10 and answered correctly
      setPlayers(prevPlayers =>
        prevPlayers.map(player => {
          if ((teamId === 1 && (player.id === 1 || player.id === 2)) ||
              (teamId === 2 && (player.id === 3 || player.id === 4))) {
            // Award 100 points to each team member
            return { ...player, score: player.score + 100 };
          } else {
            return player;
          }
        })
      );
      // You can display a winning message or end the game here
      alert(`Team ${teamId} wins!`);
    }
  };

  const handleIncorrectAnswerAtLevel10 = (teamLevel, teamId) => {
    if (teamLevel >= 10) {
      // Deduct 100 points from each team member unless score is 0
      setPlayers(prevPlayers =>
        prevPlayers.map(player => {
          if ((teamId === 1 && (player.id === 1 || player.id === 2)) ||
              (teamId === 2 && (player.id === 3 || player.id === 4))) {
            const newScore = Math.max(0, player.score - 100);
            return { ...player, score: newScore };
          } else {
            return player;
          }
        })
      );
    }
  };

  return (
    <>
      <div className="game-header">
        <button onClick={handleQuit} className="quit-button">Quit</button>
      </div>
      <div className="container">
        {/* Countdown overlay */}
        {!isGameActive && (
          <div className="countdown-overlay">
            <h1>{countdown}</h1>
            <p>Get Ready!</p>
          </div>
        )}
        <div className={`container-item1 ${isProblemOneIncorrect ? 'incorrect' : ''}`}>
          <p class="team">Team One Round: {teamOneLevel}</p>
          <p className='displayProblem' style={{ fontSize: '60px' }}>{problemOne}</p>
          {Array.from({ length: numOfPlacementOne }).map((_, index) => (
            <div
              key={index}
              className="inputBox"
              style={{ fontSize: '40px', color: '#00000', zIndex: 10 }}
            >
              {(numOfPlacementOne === 3 && index === 0 && answerOne[0]) ||
              (numOfPlacementOne === 4 && index === 0 && answerOne[0]) ||
              (numOfPlacementOne === 4 && index === 1 && answerOne[1])
                ? answerOne[index]
                : userAnswerOne[index]}
            </div>
          ))}
        </div>
        <div className={`container-item2 ${isProblemTwoIncorrect ? 'incorrect' : ''}`}>
          <p class="team">Team Two Round: {teamTwoLevel}</p>
     
          <p className='displayProblem' style={{ fontSize: '60px' }}>{problemTwo}</p>
          {Array.from({ length: numOfPlacementTwo }).map((_, index) => (
            <div
              key={index}
              className="inputBox"
              style={{ fontSize: '40px', color: '#00000', zIndex: 10 }}
            >
              {(numOfPlacementTwo === 3 && index === 0 && answerTwo[0]) ||
              (numOfPlacementTwo === 4 && index === 0 && answerTwo[0]) ||
              (numOfPlacementTwo === 4 && index === 1 && answerTwo[1])
                ? answerTwo[index]
                : userAnswerTwo[index]}
            </div>
          ))}
        </div>
        <div className="numberButtons">
          {numbers.map((number, index) => (
            <button
              key={number}
              style={{
                margin: '12px',
                width: '40px',
                borderRadius: '5px',
                height: '50px',
                backgroundColor: hoveredIndex === index ? '#7a575e' : '#E5989B',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleButtonClick(number)}
            >
              {number}
            </button>
          ))}
        </div>
      </div>
      <div className="players-container">{renderPlayers()}</div>
    </>
  );
};

export default Game;
