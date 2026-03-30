import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import './Calendar.css';

const API_URL = 'http://localhost:8000/api';
const colorPalette = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6610f2', '#e83e8c'];

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
  const [visibleDays, setVisibleDays] = useState("1");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newTerminTimes, setNewTerminTimes] = useState({ start: '', end: '', allDay: false });
  const [formData, setFormData] = useState({ title: '', mitarbeiter_id: '', auto_id: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [t, m, a, s] = await Promise.all([
          fetch(`${API_URL}/termine`), fetch(`${API_URL}/mitarbeiter`),
          fetch(`${API_URL}/autos`), fetch(`${API_URL}/settings`)
        ]);
        setEvents(assignColors(await t.json()));
        setMitarbeiter(await m.json());
        setAutos(await a.json());
        const sd = await s.json();
        if (sd?.visibleDays) setVisibleDays(sd.visibleDays);
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  const handleSettingsChange = async (e) => {
    const v = e.target.value;
    setVisibleDays(v);
    await fetch(`${API_URL}/settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibleDays: v })
    });
  };

  const addItem = async (type) => {
    const name = window.prompt(`${type === 'mitarbeiter' ? 'Mitarbeiter' : 'Fahrzeug'} Name:`);
    if (!name) return;
    const item = { id: Date.now().toString(), name };
    const res = await fetch(`${API_URL}/${type}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (res.ok) type === 'mitarbeiter' ? setMitarbeiter([...mitarbeiter, item]) : setAutos([...autos, item]);
  };

  const deleteItem = async (type, id) => {
    if (!window.confirm("Löschen?")) return;
    if ((await fetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' })).ok) {
      type === 'mitarbeiter' ? setMitarbeiter(mitarbeiter.filter(x => x.id !== id)) : setAutos(autos.filter(x => x.id !== id));
    }
  };

  const renderEventContent = (info) => {
    const m = mitarbeiter.find(x => x.id === info.event.extendedProps.mitarbeiter_id);
    const a = autos.find(x => x.id === info.event.extendedProps.auto_id);
    return (
      <div style={{ padding: '4px', color: 'white' }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{info.event.title}</div>
        {m && <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>👤 {m.name}</div>}
        {a && <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>🚐 {a.name}</div>}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Steuerzentrale</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'var(--surface)', padding: '10px 20px', borderRadius: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>TV-Ansicht:</span>
          <select value={visibleDays} onChange={handleSettingsChange} style={{ background: 'none', color: 'white', border: 'none', fontWeight: 'bold', outline: 'none' }}>
            {[1, 2, 3, 5].map(d => <option key={d} value={d} style={{background: '#1a1d23'}}>{d} Tage</option>)}
          </select>
        </div>
      </div>

      <div className="admin-layout">
        <div className="admin-sidebar">
          <div className="sidebar-header">
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>👤 Mitarbeiter</h3>
            <button className="btn-edit" style={{padding: '5px 10px'}} onClick={() => addItem('mitarbeiter')}>+</button>
          </div>
          {mitarbeiter.map(m => (
            <div key={m.id} className="sidebar-item">
              <span>👤 {m.name}</span>
              <span onClick={() => deleteItem('mitarbeiter', m.id)} style={{color: '#dc3545', cursor: 'pointer'}}>✕</span>
            </div>
          ))}
          <div className="sidebar-header" style={{marginTop: '30px'}}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>🚐 Fahrzeuge</h3>
            <button className="btn-edit" style={{padding: '5px 10px'}} onClick={() => addItem('autos')}>+</button>
          </div>
          {autos.map(a => (
            <div key={a.id} className="sidebar-item">
              <span>🚐 {a.name}</span>
              <span onClick={() => deleteItem('autos', a.id)} style={{color: '#dc3545', cursor: 'pointer'}}>✕</span>
            </div>
          ))}
        </div>

        <div style={{ flexGrow: 1 }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={deLocale}
            weekends={false}
            allDaySlot={false} // ENTFERNT "GANZTÄGIG"
            events={events}
            eventContent={renderEventContent}
            editable={true} selectable={true} height="calc(100vh - 150px)"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            select={(info) => {
              setNewTerminTimes({ start: info.startStr, end: info.endStr, allDay: false });
              setFormData({ title: '', mitarbeiter_id: '', auto_id: '' });
              setIsCreateModalOpen(true);
            }}
            eventClick={(info) => { setSelectedEvent(info.event); setIsDetailModalOpen(true); }}
            eventDrop={async (info) => {
              const up = { id: info.event.id, title: info.event.title, start: info.event.startStr, end: info.event.endStr || info.event.startStr, allDay: false, mitarbeiter_id: info.event.extendedProps.mitarbeiter_id, auto_id: info.event.extendedProps.auto_id };
              setEvents(prev => assignColors(prev.map(e => e.id === up.id ? up : e)));
              await fetch(`${API_URL}/termine/${up.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(up) });
            }}
          />
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{marginTop: 0}}>Neuer Termin</h2>
            <div className="form-group">
              <label>Bezeichnung</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Mitarbeiter</label>
              <select value={formData.mitarbeiter_id} onChange={e => setFormData({...formData, mitarbeiter_id: e.target.value})}>
                <option value="">Nicht zugewiesen</option>
                {mitarbeiter.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Fahrzeug</label>
              <select value={formData.auto_id} onChange={e => setFormData({...formData, auto_id: e.target.value})}>
                <option value="">Nicht zugewiesen</option>
                {autos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>Abbruch</button>
              <button className="btn-edit" onClick={async () => {
                const n = { id: Date.now().toString(), ...formData, ...newTerminTimes, allDay: false };
                const res = await fetch(`${API_URL}/termine`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) });
                if (res.ok) { setEvents(assignColors([...events, n])); setIsCreateModalOpen(false); }
              }}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{marginTop: 0}}>Termin Details</h2>
            <p><strong>Was:</strong> {selectedEvent.title}</p>
            <p><strong>Wer:</strong> 👤 {mitarbeiter.find(x => x.id === selectedEvent.extendedProps.mitarbeiter_id)?.name || 'Keiner'}</p>
            <p><strong>Auto:</strong> 🚐 {autos.find(x => x.id === selectedEvent.extendedProps.auto_id)?.name || 'Keins'}</p>
            <div className="modal-actions">
              <button className="btn-delete" onClick={async () => {
                if (window.confirm("Löschen?")) {
                  await fetch(`${API_URL}/termine/${selectedEvent.id}`, { method: 'DELETE' });
                  setEvents(assignColors(events.filter(e => e.id !== selectedEvent.id)));
                  setIsDetailModalOpen(false);
                }
              }}>Löschen</button>
              <button className="btn-cancel" onClick={() => setIsDetailModalOpen(false)}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;