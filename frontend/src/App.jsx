import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import AdminPage from './pages/AdminPage';
import KalenderPage from './pages/KalenderPage';
import LoginPage from './pages/LoginPage';
import './styles/App.css';
import './styles/Header.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Laden...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Navigation() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <NavLink className="logo" to="/">Kalender</NavLink>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              👤 {user.name} ({user.role === 'admin' ? 'Admin' : 'Mitarbeiter'})
            </span>
            <button
              onClick={logout}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Abmelden
            </button>
          </div>
        ) : (
          <NavLink to="/login" style={{ marginLeft: '1rem' }}>
            Anmelden
          </NavLink>
        )}
      </nav>
    </header>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Navigation />
      <main className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="/kalender" element={<KalenderPage />} />
          <Route path="/" element={
            <div style={{ textAlign: 'center', paddingTop: '5rem' }}>
              <h2>Willkommen bei der Kalender-Anwendung</h2>
              <p>Bitte melden Sie sich an oder öffnen Sie die TV-Ansicht.</p>
            </div>
          } />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;