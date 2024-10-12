import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import App from './App';
import Lobby from './Lobby';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/lobby" element={<Lobby />} />
      </Routes>
    </Router>
  )
}

export default AppRouter