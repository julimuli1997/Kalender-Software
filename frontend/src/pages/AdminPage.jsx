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
import CreateUserModal from '../components/CreateUserModal';
import AccessDenied from '../components/AccessDenied';
import { useAuth } from '../components/AuthContext';

import { assignColors } from '../utils/colors';
import {
  fetchTermine,
  fetchMitarbeiter,
  fetchAutos,
  fetchSettings,
  updateSettings,
  fetchNetworkInfo,
  fetchUsersApi,
  createUserApi,
  deleteUserApi,
  addItemApi,
  deleteItemApi,
  createTerminApi,
  updateTerminApi,
  deleteTerminApi
} from '../utils/api';

import '../styles/Calendar.css';

function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [users, setUsers] = useState([]);
  const [autos, setAutos] = useState([]);
  const [visibleDays, setVisibleDays] = useState("1");
  const [theme, setTheme] = useState('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
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

        if (isAdmin) {
          const uData = await fetchUsersApi();
          setUsers(uData);
        } else {
          setUsers(mData.map(m => ({ id: m.id, name: m.name, username: m.name.toLowerCase().replace(/\s+/g, ''), role: 'mitarbeiter' })));
        }

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
  }, [isAdmin]);

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

  const handleAddUserSave = async (userData) => {
    const newUser = await createUserApi(userData);
    setUsers(prev => [...prev, newUser]);
    const mData = await fetchMitarbeiter();
    setMitarbeiter(mData);
    setEvents(prev => assignColors(prev, mData));
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Benutzerkonto und zugehöriges Profil wirklich löschen?")) return;
    if (await deleteUserApi(userId)) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      const mData = await fetchMitarbeiter();
      setMitarbeiter(mData);
      setEvents(prev => assignColors(prev, mData));
    }
  };

  const handleAddAuto = async () => {
    const name = window.prompt('Fahrzeug Name:');
    if (!name) return;

    const { ok, item } = await addItemApi('autos', name);
    if (ok) {
      setAutos(prev => [...prev, item]);
    }
  };

  const handleDeleteAuto = async (id) => {
    if (!window.confirm("Fahrzeug wirklich löschen?")) return;
    if (await deleteItemApi('autos', id)) {
      setAutos(prev => prev.filter(x => x.id !== id));
    }
  };

  const handleUpdateBeschreibung = async () => {
    if (!popoverInfo) return;
    const currentEvent = popoverInfo.event;
    
    const targetMitarbeiterId = currentEvent.extendedProps.mitarbeiter_id;
    if (!isAdmin && targetMitarbeiterId !== user?.mitarbeiter_id) {
      window.alert("Sie können nur Beschreibungen eigener Termine ändern.");
      return;
    }

    const updatedEventData = {
      id: currentEvent.id,
      title: currentEvent.title,
      start: currentEvent.startStr,
      end: currentEvent.endStr || currentEvent.startStr,
      allDay: false,
      mitarbeiter_id: targetMitarbeiterId,
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
    const targetMitarbeiterId = popoverInfo.event.extendedProps.mitarbeiter_id;
    if (!isAdmin && targetMitarbeiterId !== user?.mitarbeiter_id) {
      window.alert("Sie können nur eigene Termine löschen.");
      return;
    }

    if (window.confirm("Termin wirklich löschen?")) {
      const ok = await deleteTerminApi(popoverInfo.event.id);
      if (ok) {
        setEvents(prev => prev.filter(e => e.id !== popoverInfo.event.id));
        setPopoverInfo(null);
      }
    }
  };

  const handleCreateTerminSave = async () => {
    const selectedMitarbeiterId = isAdmin ? formData.mitarbeiter_id : (user?.mitarbeiter_id || formData.mitarbeiter_id);
    const n = {
      id: Date.now().toString(),
      ...formData,
      mitarbeiter_id: selectedMitarbeiterId,
      ...newTerminTimes,
      allDay: false,
      beschreibung: ''
    };

    const ok = await createTerminApi(n);
    if (ok) {
      setEvents(assignColors([...events, n], mitarbeiter)); 
      setIsCreateModalOpen(false);
    } else {
      window.alert("Fehler beim Erstellen des Termins.");
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
          users={users}
          autos={autos}
          isAdmin={isAdmin}
          onAddUser={() => setIsCreateUserModalOpen(true)}
          onDeleteUser={handleDeleteUser}
          onAddAuto={handleAddAuto}
          onDeleteAuto={handleDeleteAuto}
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
              setFormData({
                title: '',
                mitarbeiter_id: isAdmin ? '' : (user?.mitarbeiter_id || ''),
                auto_id: ''
              });
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
              const ownerId = info.event.extendedProps.mitarbeiter_id;
              if (!isAdmin && ownerId !== user?.mitarbeiter_id) {
                info.revert();
                window.alert("Sie können nur eigene Termine verschieben.");
                return;
              }

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
              const ok = await updateTerminApi(up.id, up);
              if (!ok) info.revert();
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
        mitarbeiter={isAdmin ? mitarbeiter : mitarbeiter.filter(m => m.id === user?.mitarbeiter_id)}
        autos={autos}
        onSave={handleCreateTerminSave}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSave={handleAddUserSave}
      />
    </div>
  );
}

export default AdminPage;
