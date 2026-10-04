import { useState } from 'react';
import ConfigModal from './ConfigModal';

function ResetPasswordModal({ user, onReset, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await onReset(user.id, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <ConfigModal title={`Passwort zurücksetzen: @${user.username}`} onClose={onClose}>
      {done ? (
        <>
          <p className="cfg-success">Passwort geändert. Bestehende Sitzungen dieses Benutzers wurden beendet.</p>
          <div className="cfg-actions">
            <button className="cfg-btn cfg-btn-primary" onClick={onClose}>Schließen</button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="cfg-form">
          {error && <div className="cfg-error">{error}</div>}
          <label>Neues Passwort
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          </label>
          <div className="cfg-actions">
            <button type="button" className="cfg-btn" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="cfg-btn cfg-btn-primary">Zurücksetzen</button>
          </div>
        </form>
      )}
    </ConfigModal>
  );
}

export default ResetPasswordModal;
