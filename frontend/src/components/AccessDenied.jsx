import React from 'react';

function AccessDenied() {
  return (
    <div className="access-denied-screen">
      <div className="access-denied-card">
        <div className="access-denied-icon">🔒</div>
        <h2 className="access-denied-title">Zugriff verweigert</h2>
        <p className="access-denied-desc">
          Die Admin-Seite ist nur auf dem lokalen Gerät zugänglich.<br />
          Bitte öffnen Sie die Seite direkt auf dem Server-PC.
        </p>
        <div className="access-denied-hint">
          <span>Tipp: Der Administrator kann den Netzwerkzugriff in den Einstellungen aktivieren.</span>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;
