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
import { useAuth } from '../hooks/useAuth';

import { useKalenderData } from '../hooks/useKalenderData';
import { useTerminActions } from '../hooks/useTerminActions';
import {
  updateSettings,
  fetchNetworkInfo,
  createUserApi,
  deleteUserApi,
  addItemApi,
  deleteItemApi,
} from '../utils/api';
import { sameId } from '../utils/termine';

import '../styles/Calendar.css';

function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { events, mitarbeiter, autos, users, settings, setSettings, setTermine, reload } =
    useKalenderData({ includeUsers: isAdmin });
  const terminActions = useTerminActions({ user, setTermine, reload });
  const theme = settings.theme ?? 'light';
  const visibleDays = settings.visibleDays ?? '1';

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
      } catch { /* silently ignore */ }
    };
    checkAccess();
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setSettings((s) => ({ ...s, theme: next }));
    await updateSettings({ theme: next });
  };

  const handleSettingsChange = async (e) => {
    const next = e.target.value;
    setSettings((s) => ({ ...s, visibleDays: next }));
    await updateSettings({ visibleDays: next });
  };

  const handleAddUserSave = async (userData) => {
    await createUserApi(userData);
    await reload();
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Benutzerkonto und zugehöriges Profil wirklich löschen?")) return;
    if (await deleteUserApi(userId)) await reload();
  };

  const handleAddAuto = async () => {
    const name = window.prompt('Fahrzeug Name:');
    if (!name) return;
    const { ok } = await addItemApi('autos', name);
    if (ok) await reload();
  };

  const handleDeleteAuto = async (id) => {
    if (!window.confirm("Fahrzeug wirklich löschen?")) return;
    if (await deleteItemApi('autos', id)) await reload();
  };

  const handleSaveNotes = async () => {
    if (popoverInfo && await terminActions.saveBeschreibung(popoverInfo.event, editBeschreibung)) {
      setPopoverInfo(null);
    }
  };

  const handleDeleteTermin = async () => {
    if (popoverInfo && await terminActions.remove(popoverInfo.event)) {
      setPopoverInfo(null);
    }
  };

  const handleCreateTerminSave = async () => {
    if (await terminActions.create(formData, newTerminTimes)) setIsCreateModalOpen(false);
  };

  const renderEventContent = (info) => (
    <div className="event-card-body">
      <div className="event-card-title">{info.event.title}</div>
      <div className="event-card-meta">
        <div>👤 {mitarbeiter.find(x => sameId(x.id, info.event.extendedProps.mitarbeiter_id))?.name || '-'}</div>
        <div>🚐 {autos.find(x => sameId(x.id, info.event.extendedProps.auto_id))?.name || '-'}</div>
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
        isAdmin={isAdmin}
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
              if (!(await terminActions.move(info.event))) info.revert();
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
        onSaveNotes={handleSaveNotes}
        onDeleteTermin={handleDeleteTermin}
        onClose={() => setPopoverInfo(null)}
      />

      <CreateTerminModal
        isOpen={isCreateModalOpen}
        formData={formData}
        setFormData={setFormData}
        mitarbeiter={isAdmin ? mitarbeiter : mitarbeiter.filter(m => sameId(m.id, user?.mitarbeiter_id))}
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
