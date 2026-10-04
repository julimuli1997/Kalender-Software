import { useState } from 'react';
import ConfigModal from './ConfigModal';

function EditUserModal({ user, isSelf, onSave, onClose }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await onSave(user.id, { name, role });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <ConfigModal title={`Benutzer bearbeiten: @${user.username}`} onClose={onClose}>
      <form onSubmit={submit} className="cfg-form">
        {error && <div className="cfg-error">{error}</div>}
        <label>Anzeigename
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>Rolle
          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf}>
            <option value="mitarbeiter">Mitarbeiter</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {isSelf && <small className="cfg-hint">Die eigene Rolle kann nicht geändert werden.</small>}
        <div className="cfg-actions">
          <button type="button" className="cfg-btn" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="cfg-btn cfg-btn-primary">Speichern</button>
        </div>
      </form>
    </ConfigModal>
  );
}

export default EditUserModal;
