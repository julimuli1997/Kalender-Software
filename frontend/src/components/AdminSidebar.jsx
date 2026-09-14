import React from 'react';

function AdminSidebar({ users, autos, isAdmin, onAddUser, onDeleteUser, onAddAuto, onDeleteAuto }) {
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
        <div className="sidebar-list">
          {users.map(u => (
            <div key={u.id} className="sidebar-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>👤 {u.name}</span>
                {isAdmin && u.username !== 'admin' && (
                  <span className="delete-x" onClick={() => onDeleteUser(u.id)}>✕</span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, paddingLeft: '1.2rem' }}>
                @{u.username} • <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-group-box">
        <div className="sidebar-header">
          <h3>Fahrzeuge</h3>
          {isAdmin && (
            <button className="btn-add-square" onClick={onAddAuto}>+</button>
          )}
        </div>
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
      </div>
    </div>
  );
}

export default AdminSidebar;
