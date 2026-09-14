import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login fehlgeschlagen. Überprüfen Sie Ihre Daten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '4rem auto',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: 'var(--shadow)',
      backgroundColor: 'var(--surface)',
      color: 'var(--text-main)',
      border: '1px solid var(--border-color)'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
        🔐 Kalender Login
      </h2>

      {error && (
        <div style={{
          backgroundColor: 'var(--error-bg)',
          color: 'var(--error-text)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          border: '1px solid var(--border-color)'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-main)' }}>
            Benutzername:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="z.B. admin oder mitarbeiter1"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-main)' }}>
            Passwort:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Passwort eingeben"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: '6px',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background-color 0.2s ease'
          }}
        >
          {loading ? 'Anmelden...' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
