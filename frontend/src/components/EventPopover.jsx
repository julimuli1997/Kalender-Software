import React from 'react';

const formatTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

function EventPopover({
  popoverInfo,
  mitarbeiter,
  autos,
  editBeschreibung,
  setEditBeschreibung,
  onSaveNotes,
  onDeleteTermin,
  onClose
}) {
  if (!popoverInfo) return null;

  return (
    <div 
      className="odoo-popover-card popover-with-form" 
      style={{ top: popoverInfo.y, left: popoverInfo.x, zIndex: 9995 }}
    >
      <div className="popover-header">
        <h4 className="popover-title">{popoverInfo.event.title}</h4>
        <span className="popover-close" onClick={onClose}>✕</span>
      </div>
      <div className="popover-body">
        <div className="popover-detail-row">
          <span className="popover-icon">🕒</span> 
          {formatTime(popoverInfo.event.start)} - {formatTime(popoverInfo.event.end)} Uhr
        </div>
        <div className="popover-detail-row">
          <span className="popover-icon">👤</span> 
          {mitarbeiter.find(x => x.id === popoverInfo.event.extendedProps.mitarbeiter_id)?.name || 'Nicht zugewiesen'}
        </div>
        <div className="popover-detail-row">
          <span className="popover-icon">🚐</span> 
          {autos.find(x => x.id === popoverInfo.event.extendedProps.auto_id)?.name || 'Kein Fahrzeug'}
        </div>

        <div className="popover-form-group">
          <label className="popover-form-label">Beschreibung (Notizen)</label>
          <textarea 
            className="popover-textarea" 
            value={editBeschreibung} 
            onChange={(e) => setEditBeschreibung(e.target.value)} 
            placeholder="Notizen hinzufügen..."
            rows={4}
          />
        </div>
      </div>
      <div className="popover-footer">
        <button className="btn-save-popover" onClick={onSaveNotes}>
          💾 Speichern
        </button>
        <button className="btn-delete-popover" onClick={onDeleteTermin}>
          🗑️ Löschen
        </button>
      </div>
    </div>
  );
}

export default EventPopover;
