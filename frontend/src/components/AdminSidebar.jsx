import React, { useState } from 'react';

const USER_GROUPS = [
  { role: 'admin', title: 'Administratoren' },
  { role: 'mitarbeiter', title: 'Mitarbeiter' },
];

function UserGroup({ role, title, users, isAdmin, onDeleteUser }) {
  const [open, setOpen] = useState(true);
  if (users.length === 0) return null;

  return (
    <div className={`sidebar-user-group sidebar-user-group-${role}`}>
      <button
        type="button"
        className="sidebar-user-group-head"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className={`sidebar-chevron${open ? ' open' : ''}`} aria-hidden="true">▶</span>
        <span className="sidebar-user-group-title">{title}</span>
        <span className="sidebar-user-group-count">{users.length}</span>
      </button>

      {open && (
        <div className="sidebar-list">
          {users.map(u => (
            <div key={u.id} className="sidebar-item sidebar-item-user">
              <div className="sidebar-item-row">
                <span style={{ fontWeight: 600 }}>{role === 'admin' ? '🛡️' : '👤'} {u.name}</span>
                {isAdmin && u.username !== 'admin' && (
                  <span className="delete-x" onClick={() => onDeleteUser(u.id)}>✕</span>
                )}
              </div>
              <div className="sidebar-item-sub">
                @{u.username} • <span className="role">{u.role}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminSidebar({ users, autos, isAdmin, onAddUser, onDeleteUser, onAddAuto, onDeleteAuto }) {
  const [autosOpen, setAutosOpen] = useState(true);

  return (
    <div className="admin-sidebar">
      <div className="sidebar-group-box">
        <div className="sidebar-header">
          <h3>Mitarbeiter & Accounts</h3>
          {isAdmin && (
            <button
              className="btn-add-square"
              title="Neuen Benutzer-Account anlegen"
              onClick={onAddUser}
            >
              +
            </button>
          )}
        </div>
        {USER_GROUPS.map(({ role, title }) => (
          <UserGroup
            key={role}
            role={role}
            title={title}
            users={users.filter(u => (u.role === 'admin' ? 'admin' : 'mitarbeiter') === role)}
            isAdmin={isAdmin}
            onDeleteUser={onDeleteUser}
          />
        ))}
      </div>

      <div className="sidebar-group-box">
        <div className={`sidebar-header${autosOpen ? '' : ' collapsed'}`}>
          <button
            type="button"
            className="sidebar-header-toggle"
            aria-expanded={autosOpen}
            onClick={() => setAutosOpen(o => !o)}
          >
            <span className={`sidebar-chevron${autosOpen ? ' open' : ''}`} aria-hidden="true">▶</span>
            <h3>Fahrzeuge</h3>
            <span className="sidebar-user-group-count">{autos.length}</span>
          </button>
          {isAdmin && (
            <button className="btn-add-square" onClick={onAddAuto}>+</button>
          )}
        </div>
        {autosOpen && (
          <div className="sidebar-list">
            {autos.map(a => (
              <div key={a.id} className="sidebar-item">
                <span>🚐 {a.name}</span>
                {isAdmin && (
                  <span className="delete-x" onClick={() => onDeleteAuto(a.id)}>✕</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSidebar;
