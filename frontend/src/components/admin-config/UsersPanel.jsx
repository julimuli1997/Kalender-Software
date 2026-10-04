import { useState } from 'react';
import EditUserModal from './EditUserModal';
import ResetPasswordModal from './ResetPasswordModal';
import CreateUserModal from '../CreateUserModal';

function UsersPanel({ users, currentUserId, onCreate, onUpdate, onReset, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [creating, setCreating] = useState(false);

  return (
    <section className="cfg-card">
      <div className="cfg-card-head">
        <h3>Benutzer & Rollen</h3>
        <button className="cfg-btn cfg-btn-primary" onClick={() => setCreating(true)}>+ Neuer Benutzer</button>
      </div>

      <div className="cfg-table-wrap">
        <table className="cfg-table">
          <thead>
            <tr><th>Name</th><th>Benutzername</th><th>Rolle</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = String(u.id) === String(currentUserId);
              return (
                <tr key={u.id}>
                  <td>{u.name}{isSelf && <span className="cfg-badge">Du</span>}</td>
                  <td>@{u.username}</td>
                  <td><span className={`cfg-role cfg-role-${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Mitarbeiter'}</span></td>
                  <td className="cfg-row-actions">
                    <button className="cfg-btn" onClick={() => setEditing(u)}>Bearbeiten</button>
                    <button className="cfg-btn" onClick={() => setResetting(u)}>Passwort</button>
                    <button className="cfg-btn cfg-btn-danger" disabled={isSelf} onClick={() => onDelete(u)}>Löschen</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          isSelf={String(editing.id) === String(currentUserId)}
          onSave={onUpdate}
          onClose={() => setEditing(null)}
        />
      )}
      {resetting && <ResetPasswordModal user={resetting} onReset={onReset} onClose={() => setResetting(null)} />}
      <CreateUserModal isOpen={creating} onClose={() => setCreating(false)} onSave={onCreate} />
    </section>
  );
}

export default UsersPanel;
