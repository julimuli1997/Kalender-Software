import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000/api';

function SettingsPanel({ isOpen, onClose, theme, onThemeChange, visibleDays, onVisibleDaysChange }) {
  const [networkMode, setNetworkMode] = useState('localhost');
  const [serverIps, setServerIps] = useState([]);
  const [copied, setCopied] = useState(null);
  const [loadingNetwork, setLoadingNetwork] = useState(true);

  // Fetch network info when panel opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingNetwork(true);
    fetch(`${API_URL}/network-info`)
      .then(r => r.json())
      .then(data => {
        setServerIps(data.ips || []);
        setNetworkMode(data.networkMode || 'localhost');
      })
      .catch(() => {})
      .finally(() => setLoadingNetwork(false));
  }, [isOpen]);

  // Save networkMode setting to backend
  const handleNetworkModeChange = async (mode) => {
    setNetworkMode(mode);
    await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ networkMode: mode }),
    });
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // Detect production port vs dev port
  const port = window.location.port || '8000';
  const adminUrls = serverIps.map(ip => `http://${ip}:${port}/admin`);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`settings-backdrop ${isOpen ? 'settings-backdrop--visible' : ''}`}
        onClick={onClose}
      />

      {/* Slide-in Drawer */}
      <div className={`settings-panel ${isOpen ? 'settings-panel--open' : ''}`}>
        {/* Panel Header */}
        <div className="settings-panel-header">
          <div className="settings-panel-title">
            <span className="settings-panel-icon">⚙️</span>
            <h3>Einstellungen</h3>
          </div>
          <button className="settings-close-btn" onClick={onClose} id="settings-close-btn">✕</button>
        </div>

        <div className="settings-panel-body">

          {/* ── APPEARANCE ── */}
          <div className="settings-section">
            <div className="settings-section-label">Darstellung</div>

            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-title">Farbschema</span>
                <span className="settings-row-desc">{theme === 'dark' ? 'Dunkles Design' : 'Helles Design'}</span>
              </div>
              <div className="theme-switch-wrapper">
                <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                <label className="theme-switch">
                  <input
                    type="checkbox"
                    checked={theme === 'light'}
                    onChange={onThemeChange}
                    id="settings-theme-toggle"
                  />
                  <span className="slider" />
                </label>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-title">TV-Ansicht Tage</span>
                <span className="settings-row-desc">Wie viele Tage werden angezeigt</span>
              </div>
              <div className="settings-select-box">
                <select
                  value={visibleDays}
                  onChange={onVisibleDaysChange}
                  id="settings-visible-days"
                >
                  {[1, 2, 3, 5].map(d => (
                    <option key={d} value={d}>{d} {d === 1 ? 'Tag' : 'Tage'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── NETWORK ── */}
          <div className="settings-section">
            <div className="settings-section-label">Netzwerk</div>

            <div className="settings-network-modes">
              {/* Localhost only */}
              <label
                className={`network-mode-card ${networkMode === 'localhost' ? 'network-mode-card--active' : ''}`}
                htmlFor="mode-localhost"
              >
                <input
                  type="radio"
                  id="mode-localhost"
                  name="networkMode"
                  value="localhost"
                  checked={networkMode === 'localhost'}
                  onChange={() => handleNetworkModeChange('localhost')}
                />
                <div className="network-mode-icon">🔒</div>
                <div className="network-mode-info">
                  <span className="network-mode-title">Nur Localhost</span>
                  <span className="network-mode-desc">Admin-Seite nur auf diesem PC erreichbar</span>
                </div>
                {networkMode === 'localhost' && <span className="network-mode-badge">Aktiv</span>}
              </label>

              {/* Network visible */}
              <label
                className={`network-mode-card ${networkMode === 'network' ? 'network-mode-card--active' : ''}`}
                htmlFor="mode-network"
              >
                <input
                  type="radio"
                  id="mode-network"
                  name="networkMode"
                  value="network"
                  checked={networkMode === 'network'}
                  onChange={() => handleNetworkModeChange('network')}
                />
                <div className="network-mode-icon">🌐</div>
                <div className="network-mode-info">
                  <span className="network-mode-title">Im Netzwerk sichtbar</span>
                  <span className="network-mode-desc">Admin-Seite auch von anderen PCs erreichbar</span>
                </div>
                {networkMode === 'network' && <span className="network-mode-badge">Aktiv</span>}
              </label>
            </div>

            {/* Server IPs */}
            {networkMode === 'network' && (
              <div className="settings-ip-section">
                <div className="settings-ip-label">
                  📡 Admin-Seite über folgende Adressen erreichbar:
                </div>
                {loadingNetwork ? (
                  <div className="settings-ip-loading">Lade Netzwerkinfo…</div>
                ) : adminUrls.length > 0 ? (
                  <div className="settings-ip-list">
                    {adminUrls.map(url => (
                      <div key={url} className="settings-ip-row">
                        <code className="settings-ip-code">{url}</code>
                        <button
                          className={`settings-copy-btn ${copied === url ? 'settings-copy-btn--done' : ''}`}
                          onClick={() => handleCopy(url)}
                          title="URL kopieren"
                        >
                          {copied === url ? '✓' : '📋'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="settings-ip-loading">Keine LAN-IP gefunden</div>
                )}
              </div>
            )}

            {networkMode === 'localhost' && (
              <div className="settings-ip-section settings-ip-section--locked">
                <span>🔐</span>
                <span>Zugriff von anderen Geräten wird blockiert.</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

export default SettingsPanel;
