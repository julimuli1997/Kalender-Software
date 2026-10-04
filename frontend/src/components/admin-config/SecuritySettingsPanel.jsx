import { useEffect, useState } from 'react';
import {
  fetchSecuritySettings, saveSecuritySettings, fetchLockedAccounts, unlockAccount,
} from '../../utils/adminApi';

// Declarative field list: add a row here (and in core/security_settings.py) to add a setting.
const FIELDS = [
  { key: 'min_password_length', label: 'Minimale Passwortlänge', type: 'number', min: 4, max: 64 },
  { key: 'require_digit', label: 'Ziffer im Passwort erforderlich', type: 'bool' },
  { key: 'require_uppercase', label: 'Großbuchstabe im Passwort erforderlich', type: 'bool' },
  { key: 'session_timeout_minutes', label: 'Sitzungs-Timeout bei Inaktivität (Min.)', type: 'number', min: 5, max: 10080 },
  { key: 'max_failed_attempts', label: 'Fehlversuche bis Sperre (0 = aus)', type: 'number', min: 0, max: 50 },
  { key: 'lockout_minutes', label: 'Sperrdauer (Min.)', type: 'number', min: 1, max: 1440 },
  { key: 'allow_self_password_change', label: 'Mitarbeiter dürfen ihr Passwort selbst ändern', type: 'bool' },
];

function SecuritySettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [locked, setLocked] = useState([]);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }

  useEffect(() => {
    Promise.all([fetchSecuritySettings(), fetchLockedAccounts()])
      .then(([s, l]) => {
        setSettings(s.settings);
        setDefaults(s.defaults);
        setLocked(l);
      })
      .catch((e) => setMessage({ type: 'error', text: e.message }));
  }, []);

  const save = async () => {
    try {
      const res = await saveSecuritySettings(settings);
      setSettings(res.settings);
      setMessage({ type: 'ok', text: 'Gespeichert.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const unlock = async (username) => {
    await unlockAccount(username);
    setLocked(await fetchLockedAccounts());
  };

  if (!settings) return <section className="cfg-card">{message?.text || 'Laden...'}</section>;

  return (
    <section className="cfg-card">
      <div className="cfg-card-head"><h3>Sicherheit & Authentifizierung</h3></div>
      {message && <div className={message.type === 'ok' ? 'cfg-success' : 'cfg-error'}>{message.text}</div>}

      <div className="cfg-form">
        {FIELDS.map((f) => (
          <label key={f.key} className={f.type === 'bool' ? 'cfg-check' : ''}>
            {f.type === 'bool' ? (
              <>
                <input type="checkbox" checked={settings[f.key]}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.checked })} />
                {f.label}
              </>
            ) : (
              <>
                {f.label}
                <input type="number" min={f.min} max={f.max} value={settings[f.key]}
                  onChange={(e) => setSettings({ ...settings, [f.key]: Number(e.target.value) })} />
              </>
            )}
          </label>
        ))}
      </div>

      <div className="cfg-actions">
        <button className="cfg-btn" onClick={() => setSettings(defaults)}>Standardwerte</button>
        <button className="cfg-btn cfg-btn-primary" onClick={save}>Speichern</button>
      </div>

      <h4 className="cfg-subtitle">Gesperrte Konten</h4>
      {locked.length === 0 ? (
        <p className="cfg-hint">Keine gesperrten Konten.</p>
      ) : (
        <ul className="cfg-locked">
          {locked.map((l) => (
            <li key={l.username}>
              @{l.username} <span className="cfg-hint">(noch ~{l.minutes_left} Min.)</span>
              <button className="cfg-btn" onClick={() => unlock(l.username)}>Entsperren</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default SecuritySettingsPanel;
