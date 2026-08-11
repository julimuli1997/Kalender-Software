import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timegridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';
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

function KalenderPage() {
  const [events, setEvents] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [autos, setAutos] = useState([]);
  const [visibleDays, setVisibleDays] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live-Uhr für das TV-Dashboard
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
        if (sd?.visibleDays) setVisibleDays(parseInt(sd.visibleDays));
        if (sd?.theme === 'light') document.body.classList.add('light-theme');
        else document.body.classList.remove('light-theme');
      } catch (e) { console.error(e); }
    };
    
    fetchData();
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (e) => e.data === "update" && fetchData();
    return () => ws.close();
  }, []);

  const renderEventContent = (info) => (
    <div className="event-card-body-tv">
      <div className="event-card-title-tv">{info.event.title}</div>
      <div className="event-card-meta-tv" style={{marginTop:'auto', borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'8px'}}>
        <div className="tv-meta-row">👤 {mitarbeiter.find(x => x.id === info.event.extendedProps.mitarbeiter_id)?.name || '-'}</div>
        <div className="tv-meta-row">🚐 {autos.find(x => x.id === info.event.extendedProps.auto_id)?.name || '-'}</div>
        {/* Falls es eine Beschreibung gibt, wird sie auf dem TV dezent angedeutet */}
        {info.event.extendedProps.beschreibung && (
          <div className="tv-meta-row" style={{opacity: 0.8, marginTop: '4px'}}>
            📝 {info.event.extendedProps.beschreibung}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="tv-screen-wrapper">
      {/* NEUER TV HEADER */}
      <div className="tv-header">
        <div className="header-logo-container">
          <h2 className="header-logo tv-logo">Stürtz Heizung und Sanitär GmbH Kalender</h2>
          <span className="header-subtitle tv-subtitle">BTL-Digital Design™ • TV-Dashboard</span>
        </div>
        <div className="tv-clock">
          {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
        </div>
      </div>

      <div className="tv-calendar-content">
        <FullCalendar
          key={visibleDays}
          plugins={[timegridPlugin]}
          initialView={visibleDays === 1 ? 'timeGridDay' : 'timeGridCustom'}
          views={{ timeGridCustom: { type: 'timeGrid', duration: { days: visibleDays } } }}
          locale={deLocale}
          weekends={false}
          allDaySlot={false}
          events={events}
          eventContent={renderEventContent}
          headerToolbar={{ left: '', center: 'title', right: '' }}
          slotMinTime="06:00:00" slotMaxTime="18:00:00"
          height="100%" expandRows={true}
          nowIndicator={true}
          eventDisplay="block"
        />
      </div>
    </div>
  );
}

export default KalenderPage;