import { useState } from 'react';
import EditUserModal from './EditUserModal';
import ResetPasswordModal from './ResetPasswordModal';
import CreateUserModal from '../CreateUserModal';

const GROUPS = [
  { role: 'admin', title: 'Administratoren' },
  { role: 'mitarbeiter', title: 'Mitarbeiter' },
];

function UserGroup({ role, title, users, currentUserId, onEdit, onReset, onDelete }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`cfg-group cfg-group-${role}`}>
      <button
        type="button"
        className="cfg-group-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`cfg-chevron${open ? ' open' : ''}`} aria-hidden="true">▶</span>
        <span className="cfg-group-title">{title}</span>
        <span className="cfg-badge">{users.length}</span>
      </button>

      {open && (
        users.length === 0 ? (
          <p className="cfg-hint cfg-group-empty">Keine Einträge.</p>
        ) : (
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
                        <button className="cfg-btn" onClick={() => onEdit(u)}>Bearbeiten</button>
                        <button className="cfg-btn" onClick={() => onReset(u)}>Passwort</button>
                        <button className="cfg-btn cfg-btn-danger" disabled={isSelf} onClick={() => onDelete(u)}>Löschen</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

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

      {GROUPS.map(({ role, title }) => (
        <UserGroup
          key={role}
          role={role}
          title={title}
          users={users.filter((u) => (u.role === 'admin' ? 'admin' : 'mitarbeiter') === role)}
          currentUserId={currentUserId}
          onEdit={setEditing}
          onReset={setResetting}
          onDelete={onDelete}
        />
      ))}

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
