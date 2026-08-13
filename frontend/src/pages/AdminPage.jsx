import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timegridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';

import SettingsPanel from '../components/SettingsPanel';
import Header from '../components/Header';
import AdminSidebar from '../components/AdminSidebar';
import EventPopover from '../components/EventPopover';
import CreateTerminModal from '../components/CreateTerminModal';
import AccessDenied from '../components/AccessDenied';

import { assignColors } from '../utils/colors';
import {
  fetchTermine,
  fetchMitarbeiter,
  fetchAutos,
  fetchSettings,
  updateSettings,
  fetchNetworkInfo,
  addItemApi,
  deleteItemApi,
  createTerminApi,
  updateTerminApi,
  deleteTerminApi
} from '../utils/api';

import '../styles/Calendar.css';

function AdminPage() {
  const [events, setEvents] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [autos, setAutos] = useState([]);
  const [visibleDays, setVisibleDays] = useState("1");
  const [theme, setTheme] = useState('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTerminTimes, setNewTerminTimes] = useState({ start: '', end: '', allDay: false });
  const [formData, setFormData] = useState({ title: '', mitarbeiter_id: '', auto_id: '' });

  const [popoverInfo, setPopoverInfo] = useState(null);
  const [editBeschreibung, setEditBeschreibung] = useState('');

  // Outside click listener to dismiss event detail popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.odoo-popover-card')) return;
      if (e.target.closest('.fc-event')) return;
      setPopoverInfo(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Localhost guard check
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const data = await fetchNetworkInfo();
        const mode = data.networkMode || 'localhost';
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        if (mode === 'localhost' && !isLocal) {
          setAccessDenied(true);
        }
      } catch (e) { /* silently ignore */ }
    };
    checkAccess();
  }, []);

  // Initial data loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tData, mData, aData, sd] = await Promise.all([
          fetchTermine(),
          fetchMitarbeiter(),
          fetchAutos(),
          fetchSettings()
        ]);
        
        setMitarbeiter(mData);
        setEvents(assignColors(tData, mData));
        setAutos(aData);
        
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
    await updateSettings({ theme: newTheme });
  };

  const handleSettingsChange = async (e) => {
    const v = e.target.value;
    setVisibleDays(v);
    await updateSettings({ visibleDays: v });
  };

  const handleAddItem = async (type) => {
    const name = window.prompt(`${type === 'mitarbeiter' ? 'Mitarbeiter' : 'Fahrzeug'} Name:`);
    if (!name) return;

    const { ok, item } = await addItemApi(type, name);
    if (ok) {
      if (type === 'mitarbeiter') {
        const newM = [...mitarbeiter, item];
        setMitarbeiter(newM);
        setEvents(assignColors(events, newM)); 
      } else {
        setAutos([...autos, item]);
      }
    }
  };

  const handleDeleteItem = async (type, id) => {
    if (!window.confirm("Wirklich löschen?")) return;
    if (await deleteItemApi(type, id)) {
      if (type === 'mitarbeiter') {
        setMitarbeiter(mitarbeiter.filter(x => x.id !== id));
      } else {
        setAutos(autos.filter(x => x.id !== id));
      }
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
      const ok = await updateTerminApi(updatedEventData.id, updatedEventData);
      if (ok) {
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

  const handleDeleteTermin = async () => {
    if (!popoverInfo) return;
    if (window.confirm("Termin wirklich löschen?")) {
      await deleteTerminApi(popoverInfo.event.id);
      setEvents(events.filter(e => e.id !== popoverInfo.event.id));
      setPopoverInfo(null);
    }
  };

  const handleCreateTerminSave = async () => {
    const n = {
      id: Date.now().toString(),
      ...formData,
      ...newTerminTimes,
      allDay: false,
      beschreibung: ''
    };
    await createTerminApi(n);
    setEvents(assignColors([...events, n], mitarbeiter)); 
    setIsCreateModalOpen(false);
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

  if (accessDenied) {
    return <AccessDenied />;
  }

  return (
    <div className="app-container">
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={toggleTheme}
        visibleDays={visibleDays}
        onVisibleDaysChange={handleSettingsChange}
      />

      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <div className="admin-layout">
        <AdminSidebar
          mitarbeiter={mitarbeiter}
          autos={autos}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
        />

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
            editable={true}
            selectable={true}
            height="100%"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            select={(info) => {
              setPopoverInfo(null); 
              setNewTerminTimes({ start: info.startStr, end: info.endStr, allDay: false });
              setFormData({ title: '', mitarbeiter_id: '', auto_id: '' });
              setIsCreateModalOpen(true);
            }}
            eventClick={(info) => {
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
              await updateTerminApi(up.id, up);
            }}
          />
        </div>
      </div>

      <EventPopover
        popoverInfo={popoverInfo}
        mitarbeiter={mitarbeiter}
        autos={autos}
        editBeschreibung={editBeschreibung}
        setEditBeschreibung={setEditBeschreibung}
        onSaveNotes={handleUpdateBeschreibung}
        onDeleteTermin={handleDeleteTermin}
        onClose={() => setPopoverInfo(null)}
      />

      <CreateTerminModal
        isOpen={isCreateModalOpen}
        formData={formData}
        setFormData={setFormData}
        mitarbeiter={mitarbeiter}
        autos={autos}
        onSave={handleCreateTerminSave}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

export default AdminPage;
