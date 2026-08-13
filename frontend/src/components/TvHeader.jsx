import React from 'react';

function TvHeader({ currentTime }) {
  return (
    <div className="tv-header">
      <div className="header-logo-container">
        <h2 className="header-logo tv-logo">Stürtz Heizung und Sanitär GmbH Kalender</h2>
        <span className="header-subtitle tv-subtitle">BTL-Digital Design™ • TV-Dashboard</span>
      </div>
      <div className="tv-clock">
        {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
      </div>
    </div>
  );
}

export default TvHeader;
