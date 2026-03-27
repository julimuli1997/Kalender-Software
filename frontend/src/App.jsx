import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import AdminPage from './AdminPage';
import KalenderPage from './KalenderPage';
import './App.css';
import './Header.css';

function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <NavLink className="logo" to="/">Kalender</NavLink>
        <nav>
          <NavLink to="/admin">
            Admin-Steuerung
          </NavLink>
          {/* NEU: target="_blank" öffnet den Link in einem neuen Tab/Fenster */}
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