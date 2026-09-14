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
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'var(--surface)',
        color: 'var(--text-main)',
        padding: '2rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border-color)'
      }}>
        <h2 className="modal-title" style={{ marginTop: 0, marginBottom: '1.2rem', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 700 }}>
          📅 Neuer Termin
        </h2>

        <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
            Bezeichnung
          </label>
          <input 
            type="text" 
            value={formData.title} 
            onChange={e => setFormData({ ...formData, title: e.target.value })} 
            placeholder="z.B. Heizungswartung Mustermann"
            style={{
              padding: '0.65rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
            Mitarbeiter
          </label>
          <select 
            value={formData.mitarbeiter_id} 
            onChange={e => setFormData({ ...formData, mitarbeiter_id: e.target.value })}
            style={{
              padding: '0.65rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              boxSizing: 'border-box'
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}>-- Bitte wählen --</option>
            {mitarbeiter.map(m => (
              <option key={m.id} value={m.id} style={{ backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}>
                👤 {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
            Fahrzeug
          </label>
          <select 
            value={formData.auto_id} 
            onChange={e => setFormData({ ...formData, auto_id: e.target.value })}
            style={{
              padding: '0.65rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              boxSizing: 'border-box'
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}>-- Keines --</option>
            {autos.map(a => (
              <option key={a.id} value={a.id} style={{ backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}>
                🚐 {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button 
            type="button" 
            className="btn-cancel" 
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Abbruch
          </button>
          <button 
            type="button" 
            className="btn-edit" 
            onClick={onSave}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTerminModal;
