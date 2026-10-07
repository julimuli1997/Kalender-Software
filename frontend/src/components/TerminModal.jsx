import React, { useState } from 'react';
import { STATUS, sameId, validateForm } from '../utils/termine';

// Shared form for creating and editing an appointment.
function TerminModal({
  isOpen,
  heading,
  formData,
  setFormData,
  mitarbeiter,
  autos,
  lockedMitarbeiterId,
  onSave,
  onClose
}) {
  const [error, setError] = useState('');
  if (!isOpen) return null;

  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const toggleMitarbeiter = (id) => {
    const selected = formData.mitarbeiter_ids.some((x) => sameId(x, id));
    setFormData({
      ...formData,
      mitarbeiter_ids: selected
        ? formData.mitarbeiter_ids.filter((x) => !sameId(x, id))
        : [...formData.mitarbeiter_ids, String(id)],
    });
  };

  const handleSave = () => {
    const problem = validateForm(formData);
    setError(problem);
    if (!problem) onSave();
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay termin-modal-overlay">
      <div className="modal-content termin-modal">
        <h2 className="modal-title termin-modal-title">{heading}</h2>

        <div className="termin-form-group">
          <label className="termin-form-label">Bezeichnung</label>
          <input
            className="termin-input"
            type="text"
            value={formData.title}
            onChange={set('title')}
            placeholder="z.B. Heizungswartung Mustermann"
          />
        </div>

        <div className="termin-form-row">
          <div className="termin-form-group">
            <label className="termin-form-label">Beginn</label>
            <input className="termin-input" type="datetime-local" value={formData.start} onChange={set('start')} />
          </div>
          <div className="termin-form-group">
            <label className="termin-form-label">Ende</label>
            <input className="termin-input" type="datetime-local" value={formData.end} onChange={set('end')} />
          </div>
        </div>

        <div className="termin-form-group">
          <label className="termin-form-label">Mitarbeiter ({formData.mitarbeiter_ids.length})</label>
          <div className="termin-chip-list">
            {mitarbeiter.map((m) => {
              const selected = formData.mitarbeiter_ids.some((x) => sameId(x, m.id));
              const locked = lockedMitarbeiterId != null && sameId(lockedMitarbeiterId, m.id);
              return (
                <label key={m.id} className={`termin-chip${selected ? ' selected' : ''}${locked ? ' locked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={locked}
                    onChange={() => toggleMitarbeiter(m.id)}
                  />
                  👤 {m.name}
                </label>
              );
            })}
          </div>
        </div>

        <div className="termin-form-row">
          <div className="termin-form-group">
            <label className="termin-form-label">Fahrzeug</label>
            <select className="termin-input" value={formData.auto_id} onChange={set('auto_id')}>
              <option value="">-- Keines --</option>
              {autos.map((a) => (
                <option key={a.id} value={a.id}>🚐 {a.name}</option>
              ))}
            </select>
          </div>
          <div className="termin-form-group">
            <label className="termin-form-label">Status</label>
            <select className="termin-input" value={formData.status} onChange={set('status')}>
              {Object.entries(STATUS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="termin-form-row">
          <div className="termin-form-group">
            <label className="termin-form-label">Kunde</label>
            <input className="termin-input" type="text" value={formData.kunde} onChange={set('kunde')} placeholder="Name des Kunden" />
          </div>
          <div className="termin-form-group">
            <label className="termin-form-label">Telefon</label>
            <input className="termin-input" type="tel" value={formData.telefon} onChange={set('telefon')} placeholder="Telefonnummer" />
          </div>
        </div>

        <div className="termin-form-group">
          <label className="termin-form-label">Ort / Adresse</label>
          <input className="termin-input" type="text" value={formData.ort} onChange={set('ort')} placeholder="Straße, Hausnummer, Ort" />
        </div>

        <div className="termin-form-group">
          <label className="termin-form-label">Beschreibung (Notizen)</label>
          <textarea className="termin-input" rows={3} value={formData.beschreibung} onChange={set('beschreibung')} placeholder="Notizen hinzufügen..." />
        </div>

        {error && <div className="termin-error">{error}</div>}

        <div className="modal-actions termin-actions">
          <button type="button" className="btn-cancel termin-btn-cancel" onClick={handleClose}>
            Abbruch
          </button>
          <button type="button" className="btn-edit termin-btn-save" onClick={handleSave}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

export default TerminModal;
