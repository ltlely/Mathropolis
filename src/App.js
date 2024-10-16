import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();

  // Function to toggle between Login and Sign Up forms
  function toggleForm() {
    setIsLogin(!isLogin);
    setErrorMessage('');  // Clear error message when switching forms
    setUsernameError('');  // Clear specific errors
    setEmailError('');
  }

   // Handle login form submission
   async function handleLogin(event) {
    event.preventDefault();

    const formData = {
      username: event.target[0].value, // Capture username
      password: event.target[1].value, // Capture password
    };

    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();

      if (response.status === 200) {
        console.log('Navigating to lobby with username:', data.username);
        // Navigate to the lobby and pass the username in state
        navigate('/lobby', { state: { username: data.username } });
      }
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred during login.');
    }
  }


  // Handle sign-up form submission
  async function handleSignUp(event) {
    event.preventDefault();  // Prevent form from refreshing the page

    const formData = {
      username: event.target.username.value,
      password: event.target.password.value,
      confirmPassword: event.target.confirmPassword.value,
      email: event.target.email.value,
      confirmEmail: event.target.confirmEmail.value,
    };

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match!');
      return;
    }

    // Check if emails match
    if (formData.email !== formData.confirmEmail) {
      setErrorMessage('Emails do not match!');
      return;
    }

    // Proceed with sign-up process if no validation errors
    try {
      const response = await fetch(`${BACKEND_URL}/signup`, { // Ensure correct API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Parse error response

        // Check if the error is related to username, email, or both
        if (errorData.error === 'Both username and email are already taken') {
          setUsernameError('Username is already taken');
          setEmailError('Email is already taken');
        } else if (errorData.error === 'Username is already taken') {
          setUsernameError('Username is already taken');
          setEmailError('');  // Clear email error
        } else if (errorData.error === 'Email is already taken') {
          setEmailError('Email is already taken');
          setUsernameError('');  // Clear username error
        } else {
          setErrorMessage(errorData.error);  // Set general error message
        }
        throw new Error(errorData.error || 'Sign-up failed');
      }

      const data = await response.json();

      if (response.status === 201) {
        // If user is created successfully, switch to login
        setIsLogin(true);
        setErrorMessage('');  // Clear any previous errors
        setUsernameError('');  // Clear specific errors
        setEmailError('');
      }
    } catch (error) {
      console.error('Error signing up:', error);
      setErrorMessage(error.message || 'An error occurred. Please try again.');
    }
  }

  return (
    <div className="container-form">
      {isLogin ? (
        <div className="form-container">
          <h2 id="login">Login</h2>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Username" required />
            <input type="password" placeholder="Password" required />
            <button type="submit">Login</button>
            <p>
              Don't have an account?{' '}
              <span onClick={toggleForm}>Sign up</span>
            </p>
          </form>
        </div>
      ) : (
        <div className="form-container">
          <h2>Sign Up</h2>
          <form onSubmit={handleSignUp}>
            <div className="input-group">
              <input type="text" name="username" placeholder="Username" required />
              {usernameError && (
                <p className="error" style={{ color: 'red' }}>{usernameError}</p>
              )}
            </div>

            <div className="input-group">
              <input type="password" name="password" placeholder="Password" required />
              <input type="password" name="confirmPassword" placeholder="Confirm Password" required />
              {errorMessage.includes("Passwords") && (
                <p className="error" style={{ color: 'red' }}>{errorMessage}</p>
              )}
            </div>

            <div className="input-group">
              <input type="email" name="email" placeholder="Email" required />
              <input type="email" name="confirmEmail" placeholder="Confirm Email" required />
              {emailError && (
                <p className="error" style={{ color: 'red' }}>{emailError}</p>
              )}
            </div>

            <button type="submit">Sign Up</button>

            {/* Display any other errors not related to inputs */}
            {!usernameError && !emailError && errorMessage && (
              <p className="error" style={{ color: 'red' }}>{errorMessage}</p>
            )}

            <p>
              Already have an account?{' '}
              <span onClick={toggleForm}>Login</span>
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
