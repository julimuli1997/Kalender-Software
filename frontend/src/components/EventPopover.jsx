import React, { useLayoutEffect, useRef } from 'react';
import { STATUS, assignedIds, canEdit, sameId } from '../utils/termine';

const formatTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDuration = (start, end) => {
  if (!start || !end) return '';
  const minutes = Math.round((end - start) / 60000);
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} Std.`, m && `${m} Min.`].filter(Boolean).join(' ');
};

function EventPopover({
  popoverInfo,
  user,
  mitarbeiter,
  autos,
  editBeschreibung,
  setEditBeschreibung,
  onSaveNotes,
  onEditTermin,
  onDeleteTermin,
  onClose
}) {
  const cardRef = useRef(null);

  // The card's height depends on the details shown: pull it up so the footer buttons stay on screen.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !popoverInfo) return;
    const overflow = card.getBoundingClientRect().bottom - (window.innerHeight - 10);
    card.style.top = `${Math.max(10, popoverInfo.y - Math.max(0, overflow))}px`;
  }, [popoverInfo, editBeschreibung]);

  if (!popoverInfo) return null;

  const { event } = popoverInfo;
  const p = event.extendedProps;
  const names = assignedIds(p).map((id) => mitarbeiter.find((x) => sameId(x.id, id))?.name).filter(Boolean);
  const auto = autos.find((x) => sameId(x.id, p.auto_id))?.name;
  const duration = formatDuration(event.start, event.end);
  const editable = canEdit(user, p.mitarbeiter_id);

  return (
    <div 
      ref={cardRef}
      className="odoo-popover-card popover-with-form" 
      style={{ top: popoverInfo.y, left: popoverInfo.x, zIndex: 9995 }}
    >
      <div className="popover-header">
        <h4 className="popover-title">{event.title}</h4>
        <span className="popover-close" onClick={onClose}>✕</span>
      </div>
      <div className="popover-body">
        <span className={`popover-status status-${p.status || 'geplant'}`}>
          {STATUS[p.status] || STATUS.geplant}
        </span>
        <div className="popover-detail-row">
          <span className="popover-icon">📅</span>
          {formatDate(event.start)}
        </div>
        <div className="popover-detail-row">
          <span className="popover-icon">🕒</span> 
          {formatTime(event.start)} - {formatTime(event.end)} Uhr{duration && ` (${duration})`}
        </div>
        <div className="popover-detail-row">
          <span className="popover-icon">👤</span> 
          {names.length ? names.join(', ') : 'Nicht zugewiesen'}
        </div>
        <div className="popover-detail-row">
          <span className="popover-icon">🚐</span> 
          {auto || 'Kein Fahrzeug'}
        </div>
        {p.kunde && (
          <div className="popover-detail-row">
            <span className="popover-icon">🏢</span>
            {p.kunde}
          </div>
        )}
        {p.ort && (
          <div className="popover-detail-row">
            <span className="popover-icon">📍</span>
            {p.ort}
          </div>
        )}
        {p.telefon && (
          <div className="popover-detail-row">
            <span className="popover-icon">📞</span>
            <a href={`tel:${p.telefon}`} className="popover-link">{p.telefon}</a>
          </div>
        )}

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
        {editable && (
          <button className="btn-save-popover btn-edit-popover" onClick={onEditTermin}>
            ✏️ Bearbeiten
          </button>
        )}
        <button className="btn-delete-popover" onClick={onDeleteTermin}>
          🗑️ Löschen
        </button>
      </div>
    </div>
  );
}

export default EventPopover;
