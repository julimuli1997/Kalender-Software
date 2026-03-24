import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './AdminPage';
import KalenderPage from './KalenderPage';
import './App.css'; 

function App() {
  return (
    <BrowserRouter>
      <div className="container mt-4">
        <header className="mb-4">
          <h1 className="display-4">Kalender Anwendung</h1>
          <nav className="nav nav-pills">
            <Link className="nav-link" to="/admin">
              Admin-Steuerung
            </Link>
            <Link className="nav-link" to="/kalender">
              TV-Ansicht
            </Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/kalender" element={<KalenderPage />} />
            <Route path="/" element={
              <div className="text-center p-5 border rounded bg-light">
                <h2>Willkommen</h2>
                <p className="lead">Bitte wählen Sie eine Ansicht aus der Navigation oben.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
