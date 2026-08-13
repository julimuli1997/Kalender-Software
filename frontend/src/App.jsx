import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import KalenderPage from './pages/KalenderPage';
import './styles/App.css';
import './styles/Header.css';

function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <NavLink className="logo" to="/">Kalender</NavLink>
        <nav>
          <NavLink to="/admin">
            Admin-Steuerung
          </NavLink>
          <NavLink 
            to="/kalender" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            TV-Ansicht
          </NavLink>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/kalender" element={<KalenderPage />} />
          <Route path="/" element={
            <div style={{ textAlign: 'center', paddingTop: '5rem' }}>
              <h2>Willkommen bei der Kalender-Anwendung</h2>
              <p>Bitte wählen Sie eine Ansicht aus der Navigation oben.</p>
            </div>
          } />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;