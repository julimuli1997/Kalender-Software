import React, { useState } from 'react';

function CreateUserModal({ isOpen, onClose, onSave }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('mitarbeiter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSave({ username, password, name, role });
      setUsername('');
      setPassword('');
      setName('');
      setRole('mitarbeiter');
      onClose();
    } catch (err) {
      setError(err.message || 'Fehler beim Erstellen des Benutzers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--surface)',
        color: 'var(--text-main)',
        padding: '2rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border-color)',
        margin: 'auto'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.2rem', color: 'var(--text-main)' }}>👤 Neuen Benutzer-Account anlegen</h3>

        {error && (
          <div style={{
            backgroundColor: 'var(--error-bg)',
            color: 'var(--error-text)',
            padding: '0.6rem 0.8rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            border: '1px solid var(--border-color)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 500, color: 'var(--text-main)' }}>
              Name / Mitarbeiter-Bezeichnung:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Max Mustermann"
              style={{
                width: '100%', padding: '0.6rem', borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)', color: 'var(--text-main)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 500, color: 'var(--text-main)' }}>
              Benutzername (für Login):
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. mmustermann"
              style={{
                width: '100%', padding: '0.6rem', borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)', color: 'var(--text-main)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 500, color: 'var(--text-main)' }}>
              Passwort:
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort eingeben"
              style={{
                width: '100%', padding: '0.6rem', borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)', color: 'var(--text-main)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 500, color: 'var(--text-main)' }}>
              Rolle / Berechtigung:
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem', borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)', color: 'var(--text-main)',
                boxSizing: 'border-box'
              }}
            >
              <option value="mitarbeiter">Mitarbeiter (Kann nur eigene Termine bearbeiten)</option>
              <option value="admin">Administrator (Vollzugriff auf alle Termine & Accounts)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem', borderRadius: '6px',
                border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                color: 'var(--text-main)', cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.5rem 1rem', borderRadius: '6px',
                border: 'none', backgroundColor: 'var(--primary)', color: '#fff',
                fontWeight: 600, cursor: loading ? 'wait' : 'pointer'
              }}
            >
              {loading ? 'Speichere...' : 'Account Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;
