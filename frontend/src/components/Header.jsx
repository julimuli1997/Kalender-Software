import React from 'react';

function Header({ onOpenSettings }) {
  return (
    <div className="admin-header">
      <div className="header-logo-container">
        <h2 className="header-logo">Stürtz Heizung und Sanitär GmbH Kalender</h2>
        <span className="header-subtitle">BTL-Digital Design™</span>
      </div>
      
      <div className="header-controls">
        <button
          id="settings-gear-btn"
          className="settings-gear-btn"
          onClick={onOpenSettings}
          title="Einstellungen"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}

export default Header;
