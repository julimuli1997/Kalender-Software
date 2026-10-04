import { useState } from 'react';
import { changeOwnPassword } from '../../utils/adminApi';

function MyPasswordPanel() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [message, setMessage] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await changeOwnPassword(current, next);
      setCurrent('');
      setNext('');
      setMessage({ type: 'ok', text: 'Passwort geändert.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <section className="cfg-card">
      <div className="cfg-card-head"><h3>Mein Passwort</h3></div>
      {message && <div className={message.type === 'ok' ? 'cfg-success' : 'cfg-error'}>{message.text}</div>}
      <form onSubmit={submit} className="cfg-form">
        <label>Aktuelles Passwort
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </label>
        <label>Neues Passwort
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
        </label>
        <div className="cfg-actions">
          <button type="submit" className="cfg-btn cfg-btn-primary">Passwort ändern</button>
        </div>
      </form>
    </section>
  );
}

export default MyPasswordPanel;
