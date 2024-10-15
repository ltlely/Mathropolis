import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import App from './App.js';
import Game from './Game.js';
import Lobby from './Lobby.js';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </Router>
  )
}

export default AppRouter