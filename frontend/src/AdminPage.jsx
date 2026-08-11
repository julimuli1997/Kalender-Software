import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timegridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import SettingsPanel from './SettingsPanel';
import './Calendar.css';

const API_URL = 'http://localhost:8000/api';

const odooColors = ['#017e84', '#b05c38', '#875a7b', '#21b799', '#3b7ebf', '#e4a900', '#d83232', '#8f8f8f'];

const assignColors = (rawEvents, mitarbeiterList) => {
  const colorMap = {};
  mitarbeiterList.forEach((m, index) => {
    colorMap[m.id] = odooColors[index % odooColors.length];
  });

  return rawEvents.map(event => {
    const color = colorMap[event.mitarbeiter_id] || '#6c757d'; 
    return { ...event, backgroundColor: color, borderColor: color };
  });
};

function AdminPage() {
  const [events, setEvents] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [autos, setAutos] = useState([]);
  const [visibleDays, setVisibleDays] = useState("1");
  const [theme, setTheme] = useState('light');
  const [networkMode, setNetworkMode] = useState('localhost');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTerminTimes, setNewTerminTimes] = useState({ start: '', end: '', allDay: false });
  const [formData, setFormData] = useState({ title: '', mitarbeiter_id: '', auto_id: '' });

  const [popoverInfo, setPopoverInfo] = useState(null);
  const [editBeschreibung, setEditBeschreibung] = useState('');

  // --- NEU: Der bombensichere Klick-Überwacher ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Wenn der Klick IN dem Kästchen passiert -> ignorieren
      if (e.target.closest('.odoo-popover-card')) return;
      // Wenn der Klick AUF einem Kalender-Event passiert -> ignorieren (das macht Fullcalendar)
      if (e.target.closest('.fc-event')) return;
      
      // Ansonsten: Kästchen schließen
      setPopoverInfo(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Localhost guard: check networkMode and current hostname
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch(`${API_URL}/network-info`);
        const data = await res.json();
        const mode = data.networkMode || 'localhost';
        setNetworkMode(mode);
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        if (mode === 'localhost' && !isLocal) {
          setAccessDenied(true);
        }
      } catch (e) { /* silently ignore */ }
    };
    checkAccess();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [t, m, a, s] = await Promise.all([
          fetch(`${API_URL}/termine`), fetch(`${API_URL}/mitarbeiter`),
          fetch(`${API_URL}/autos`), fetch(`${API_URL}/settings`)
        ]);
        const mData = await m.json();
        const tData = await t.json();
        
        setMitarbeiter(mData);
        setEvents(assignColors(tData, mData));
        setAutos(await a.json());
        
        const sd = await s.json();
        if (sd?.visibleDays) setVisibleDays(sd.visibleDays);
        if (sd?.theme) {
          setTheme(sd.theme);
          if (sd.theme === 'light') document.body.classList.add('light-theme');
          else document.body.classList.remove('light-theme');
        } else {
          document.body.classList.add('light-theme'); 
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.classList.toggle('light-theme');
    await fetch(`${API_URL}/settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme })
    });
  };

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
    if (res.ok) {
      if (type === 'mitarbeiter') {
        const newM = [...mitarbeiter, item];
        setMitarbeiter(newM);
        setEvents(assignColors(events, newM)); 
      } else setAutos([...autos, item]);
    }
  };

  const deleteItem = async (type, id) => {
    if (!window.confirm("Wirklich löschen?")) return;
    if ((await fetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' })).ok) {
      type === 'mitarbeiter' ? setMitarbeiter(mitarbeiter.filter(x => x.id !== id)) : setAutos(autos.filter(x => x.id !== id));
    }
  };

  const handleUpdateBeschreibung = async () => {
    if (!popoverInfo) return;
    const currentEvent = popoverInfo.event;
    
    const updatedEventData = {
      id: currentEvent.id,
      title: currentEvent.title,
      start: currentEvent.startStr,
      end: currentEvent.endStr || currentEvent.startStr,
      allDay: false,
      mitarbeiter_id: currentEvent.extendedProps.mitarbeiter_id,
      auto_id: currentEvent.extendedProps.auto_id,
      beschreibung: editBeschreibung
    };

    try {
      const res = await fetch(`${API_URL}/termine/${updatedEventData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEventData)
      });

      if (res.ok) {
        setEvents(prev => assignColors(prev.map(e => e.id === updatedEventData.id ? updatedEventData : e), mitarbeiter));
        setPopoverInfo(null);
      } else {
        window.alert("Fehler beim Speichern der Beschreibung.");
      }
    } catch (error) {
      console.error(error);
      window.alert("Netzwerkfehler.");
    }
  };

  const renderEventContent = (info) => (
    <div className="event-card-body">
      <div className="event-card-title">{info.event.title}</div>
      <div className="event-card-meta">
        <div>👤 {mitarbeiter.find(x => x.id === info.event.extendedProps.mitarbeiter_id)?.name || '-'}</div>
        <div>🚐 {autos.find(x => x.id === info.event.extendedProps.auto_id)?.name || '-'}</div>
      </div>
    </div>
  );

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Access denied screen
  if (accessDenied) {
    return (
      <div className="access-denied-screen">
        <div className="access-denied-card">
          <div className="access-denied-icon">🔒</div>
          <h2 className="access-denied-title">Zugriff verweigert</h2>
          <p className="access-denied-desc">
            Die Admin-Seite ist nur auf dem lokalen Gerät zugänglich.<br />
            Bitte öffnen Sie die Seite direkt auf dem Server-PC.
          </p>
          <div className="access-denied-hint">
            <span>Tipp: Der Administrator kann den Netzwerkzugriff in den Einstellungen aktivieren.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* SETTINGS PANEL */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={toggleTheme}
        visibleDays={visibleDays}
        onVisibleDaysChange={handleSettingsChange}
      />

      {/* HEADER */}
      <div className="admin-header">
        <div className="header-logo-container">
          <h2 className="header-logo">BTL-Kalender</h2>
          <span className="header-subtitle">J.O Design ™</span>
        </div>
        
        <div className="header-controls">
          <button
            id="settings-gear-btn"
            className="settings-gear-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Einstellungen"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="admin-layout">
        {/* SIDEBAR */}
        <div className="admin-sidebar">
          <div className="sidebar-group-box">
            <div className="sidebar-header">
              <h3>Mitarbeiter</h3>
              <button className="btn-add-square" onClick={() => addItem('mitarbeiter')}>+</button>
            </div>
            <div className="sidebar-list">
              {mitarbeiter.map(m => (
                <div key={m.id} className="sidebar-item">
                  <span>👤 {m.name}</span>
                  <span className="delete-x" onClick={() => deleteItem('mitarbeiter', m.id)}>✕</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-group-box">
            <div className="sidebar-header">
              <h3>Fahrzeuge</h3>
              <button className="btn-add-square" onClick={() => addItem('autos')}>+</button>
            </div>
            <div className="sidebar-list">
              {autos.map(a => (
                <div key={a.id} className="sidebar-item">
                  <span>🚐 {a.name}</span>
                  <span className="delete-x" onClick={() => deleteItem('autos', a.id)}>✕</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CALENDAR */}
        <div className="calendar-main-container">
          <FullCalendar
            plugins={[dayGridPlugin, timegridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={deLocale}
            weekends={false}
            allDaySlot={false}
            expandRows={true}
            events={events}
            eventContent={renderEventContent}
            editable={true} selectable={true} height="100%"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            select={(info) => {
              setPopoverInfo(null); 
              setNewTerminTimes({ start: info.startStr, end: info.endStr, allDay: false });
              setFormData({ title: '', mitarbeiter_id: '', auto_id: '' });
              setIsCreateModalOpen(true);
            }}
            eventClick={(info) => {
              // Kein stopPropagation mehr nötig, der native Listener regelt das
              const rect = info.el.getBoundingClientRect();
              const safeY = rect.top + 350 > window.innerHeight ? window.innerHeight - 360 : rect.top;
              
              setEditBeschreibung(info.event.extendedProps.beschreibung || '');

              setPopoverInfo({
                event: info.event,
                x: rect.right + 280 > window.innerWidth ? rect.left - 280 : rect.right + 10,
                y: safeY,
              });
            }}
            eventDrop={async (info) => {
              const up = { 
                id: info.event.id, 
                title: info.event.title, 
                start: info.event.startStr, 
                end: info.event.endStr || info.event.startStr, 
                allDay: false, 
                mitarbeiter_id: info.event.extendedProps.mitarbeiter_id, 
                auto_id: info.event.extendedProps.auto_id, 
                beschreibung: info.event.extendedProps.beschreibung || '' 
              };
              setEvents(prev => assignColors(prev.map(e => e.id === up.id ? up : e), mitarbeiter));
              await fetch(`${API_URL}/termine/${up.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(up) });
            }}
          />
        </div>
      </div>

      {/* POPOVER KÄSTCHEN */}
      {popoverInfo && (
        <div 
          className="odoo-popover-card popover-with-form" 
          style={{ top: popoverInfo.y, left: popoverInfo.x, zIndex: 9995 }}
        >
          <div className="popover-header">
            <h4 className="popover-title">{popoverInfo.event.title}</h4>
            <span className="popover-close" onClick={() => setPopoverInfo(null)}>✕</span>
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
            <button className="btn-save-popover" onClick={handleUpdateBeschreibung}>
              💾 Speichern
            </button>
            <button className="btn-delete-popover" onClick={async () => {
              if (window.confirm("Termin wirklich löschen?")) {
                await fetch(`${API_URL}/termine/${popoverInfo.event.id}`, { method: 'DELETE' });
                setEvents(events.filter(e => e.id !== popoverInfo.event.id));
                setPopoverInfo(null);
              }
            }}>
              🗑️ Löschen
            </button>
          </div>
        </div>
      )}

      {/* MODAL ZUM ERSTELLEN */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Neuer Termin</h2>
            <div className="form-group"><label>Bezeichnung</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
            <div className="form-group"><label>Mitarbeiter</label><select value={formData.mitarbeiter_id} onChange={e => setFormData({...formData, mitarbeiter_id: e.target.value})}><option value="">--</option>{mitarbeiter.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div className="form-group"><label>Fahrzeug</label><select value={formData.auto_id} onChange={e => setFormData({...formData, auto_id: e.target.value})}><option value="">--</option>{autos.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="modal-actions"><button className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>Abbruch</button><button className="btn-edit" onClick={async () => {
                const n = { id: Date.now().toString(), ...formData, ...newTerminTimes, allDay: false, beschreibung: '' };
                await fetch(`${API_URL}/termine`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) });
                setEvents(assignColors([...events, n], mitarbeiter)); 
                setIsCreateModalOpen(false);
              }}>Speichern</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;