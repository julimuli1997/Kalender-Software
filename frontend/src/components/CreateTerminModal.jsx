import React from 'react';

function CreateTerminModal({
  isOpen,
  formData,
  setFormData,
  mitarbeiter,
  autos,
  onSave,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Neuer Termin</h2>
        <div className="form-group">
          <label>Bezeichnung</label>
          <input 
            type="text" 
            value={formData.title} 
            onChange={e => setFormData({ ...formData, title: e.target.value })} 
          />
        </div>
        <div className="form-group">
          <label>Mitarbeiter</label>
          <select 
            value={formData.mitarbeiter_id} 
            onChange={e => setFormData({ ...formData, mitarbeiter_id: e.target.value })}
          >
            <option value="">--</option>
            {mitarbeiter.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Fahrzeug</label>
          <select 
            value={formData.auto_id} 
            onChange={e => setFormData({ ...formData, auto_id: e.target.value })}
          >
            <option value="">--</option>
            {autos.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Abbruch</button>
          <button className="btn-edit" onClick={onSave}>Speichern</button>
        </div>
      </div>
    </div>
  );
}

export default CreateTerminModal;
