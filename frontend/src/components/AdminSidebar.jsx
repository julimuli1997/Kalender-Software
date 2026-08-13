import React from 'react';

function AdminSidebar({ mitarbeiter, autos, onAddItem, onDeleteItem }) {
  return (
    <div className="admin-sidebar">
      <div className="sidebar-group-box">
        <div className="sidebar-header">
          <h3>Mitarbeiter</h3>
          <button className="btn-add-square" onClick={() => onAddItem('mitarbeiter')}>+</button>
        </div>
        <div className="sidebar-list">
          {mitarbeiter.map(m => (
            <div key={m.id} className="sidebar-item">
              <span>👤 {m.name}</span>
              <span className="delete-x" onClick={() => onDeleteItem('mitarbeiter', m.id)}>✕</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-group-box">
        <div className="sidebar-header">
          <h3>Fahrzeuge</h3>
          <button className="btn-add-square" onClick={() => onAddItem('autos')}>+</button>
        </div>
        <div className="sidebar-list">
          {autos.map(a => (
            <div key={a.id} className="sidebar-item">
              <span>🚐 {a.name}</span>
              <span className="delete-x" onClick={() => onDeleteItem('autos', a.id)}>✕</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminSidebar;
