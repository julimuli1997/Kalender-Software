import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import './Calendar.css';

const API_URL = 'http://localhost:8000/api';

// Farbpalette für überlappende Termine
const colorPalette = ['var(--primary)', '#28a745', '#f39c12', '#dc3545', '#17a2b8', '#6f42c1'];

// Funktion zur automatischen Farbzuweisung bei Überschneidungen
const assignColors = (rawEvents) => {
  const sorted = [...rawEvents].sort((a, b) => new Date(a.start) - new Date(b.start));
  const coloredEvents = [];
  sorted.forEach(event => {
    const overlapping = coloredEvents.filter(e => {
      const startA = new Date(event.start);
      const endA = new Date(event.end || event.start);
      const startB = new Date(e.start);
      const endB = new Date(e.end || e.start);
      return startB < endA && endB > startA; 
    });
    const usedColors = overlapping.map(e => e.backgroundColor);
    const availableColor = colorPalette.find(color => !usedColors.includes(color)) || colorPalette[0];
    coloredEvents.push({ ...event, backgroundColor: availableColor, borderColor: availableColor });
  });
  return coloredEvents;
};

function AdminPage() {
  const [events, setEvents] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [autos, setAutos] = useState([]);
  
  // Modals Steuerung
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Daten-States
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newTerminTimes, setNewTerminTimes] = useState({ start: '', end: '', allDay: false });
  const [formData, setFormData] = useState({ title: '', mitarbeiter_id: '', auto_id: '' });

  // Initiales Laden der Daten
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [termineRes, mitarbeiterRes, autosRes] = await Promise.all([
          fetch(`${API_URL}/termine`),
          fetch(`${API_URL}/mitarbeiter`),
          fetch(`${API_URL}/autos`)
        ]);
        setEvents(assignColors(await termineRes.json()));
        setMitarbeiter(await mitarbeiterRes.json());
        setAutos(await autosRes.json());
      } catch (error) {
        console.error('Fehler beim Laden:', error);
      }
    };
    fetchData();
  }, []);

  // --- FUNKTIONEN FÜR MITARBEITER & AUTOS ---
  const addItem = async (type) => {
    const label = type === 'mitarbeiter' ? 'Mitarbeiter Name' : 'Fahrzeug Name';
    const name = window.prompt(`${label} hinzufügen:`);
    if (!name) return;

    const newItem = { id: Date.now().toString(), name };
    try {
      const res = await fetch(`${API_URL}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        if (type === 'mitarbeiter') setMitarbeiter([...mitarbeiter, newItem]);
        else setAutos([...autos, newItem]);
      }
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (type, id) => {
    if (!window.confirm("Eintrag wirklich löschen?")) return;
    try {
      const res = await fetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (type === 'mitarbeiter') setMitarbeiter(mitarbeiter.filter(m => m.id !== id));
        else setAutos(autos.filter(a => a.id !== id));
      }
    } catch (e) { console.error(e); }
  };

  // --- TERMIN FUNKTIONEN ---
  const handleDateSelect = (selectInfo) => {
    setNewTerminTimes({ start: selectInfo.startStr, end: selectInfo.endStr, allDay: selectInfo.allDay });
    setFormData({ title: '', mitarbeiter_id: '', auto_id: '' });
    setIsCreateModalOpen(true);
    selectInfo.view.calendar.unselect();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const newEvent = {
      id: Date.now().toString(),
      ...formData,
      ...newTerminTimes
    };

    const res = await fetch(`${API_URL}/termine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    });

    if (res.ok) {
      setEvents(prev => assignColors([...prev, newEvent]));
      setIsCreateModalOpen(false);
    }
  };

  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setIsDetailModalOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm("Termin löschen?")) return;
    const res = await fetch(`${API_URL}/termine/${selectedEvent.id}`, { method: 'DELETE' });
    if (res.ok) {
      setEvents(prev => assignColors(prev.filter(e => e.id !== selectedEvent.id)));
      setIsDetailModalOpen(false);
    }
  };

  const handleEventChange = async (changeInfo) => {
    const updated = {
      id: changeInfo.event.id,
      title: changeInfo.event.title,
      start: changeInfo.event.startStr,
      end: changeInfo.event.endStr || changeInfo.event.startStr,
      allDay: changeInfo.event.allDay,
      mitarbeiter_id: changeInfo.event.extendedProps.mitarbeiter_id,
      auto_id: changeInfo.event.extendedProps.auto_id
    };
    setEvents(prev => assignColors(prev.map(e => e.id === updated.id ? updated : e)));
    await fetch(`${API_URL}/termine/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  // Helfer für Anzeige
  const getName = (list, id) => list.find(i => i.id === id)?.name || 'Nicht zugewiesen';

  return (
    <div className="container-fluid">
      <h2 className="mb-4">Admin-Zentrale</h2>
      
      <div className="admin-layout">
        {/* SIDEBAR */}
        <div className="admin-sidebar">
          <div className="sidebar-header">
            <h3>👤 Mitarbeiter</h3>
            <button className="btn-add-small" onClick={() => addItem('mitarbeiter')}>+</button>
          </div>
          <ul>
            {mitarbeiter.map(m => (
              <li key={m.id} className="sidebar-item">
                <span>👤 {m.name}</span>
                <button className="btn-delete-icon" onClick={() => deleteItem('mitarbeiter', m.id)}>🗑️</button>
              </li>
            ))}
          </ul>

          <div className="sidebar-header mt-4">
            <h3>🚐 Fahrzeuge</h3>
            <button className="btn-add-small" onClick={() => addItem('autos')}>+</button>
          </div>
          <ul>
            {autos.map(a => (
              <li key={a.id} className="sidebar-item">
                <span>🚐 {a.name}</span>
                <button className="btn-delete-icon" onClick={() => deleteItem('autos', a.id)}>🗑️</button>
              </li>
            ))}
          </ul>
        </div>

        {/* KALENDER */}
        <div className="admin-calendar-wrapper">
          <div style={{ height: '85vh', backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
              locale={deLocale}
              events={events}
              editable={true}
              selectable={true}
              selectMirror={true}
              height="100%"
              slotEventOverlap={false}
              views={{ dayGridMonth: { eventDisplay: 'block' } }}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventChange}
              eventResize={handleEventChange}
            />
          </div>
        </div>
      </div>

      {/* MODAL: ERSTELLEN */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Neuer Termin</h3>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Titel</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Mitarbeiter</label>
                <select value={formData.mitarbeiter_id} onChange={e => setFormData({...formData, mitarbeiter_id: e.target.value})}>
                  <option value="">-- Wählen --</option>
                  {mitarbeiter.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fahrzeug</label>
                <select value={formData.auto_id} onChange={e => setFormData({...formData, auto_id: e.target.value})}>
                  <option value="">-- Wählen --</option>
                  {autos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>Abbrechen</button>
                <button type="submit" className="btn-edit">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAILS */}
      {isDetailModalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Termin-Details</h3>
            <p><strong>Titel:</strong> {selectedEvent.title}</p>
            <p><strong>Mitarbeiter:</strong> {getName(mitarbeiter, selectedEvent.extendedProps.mitarbeiter_id)}</p>
            <p><strong>Fahrzeug:</strong> {getName(autos, selectedEvent.extendedProps.auto_id)}</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsDetailModalOpen(false)} style={{marginRight: 'auto'}}>Schließen</button>
              <button className="btn-delete" onClick={handleDeleteEvent}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;