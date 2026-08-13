import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timegridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';
import TvHeader from '../components/TvHeader';
import { assignColors } from '../utils/colors';
import { fetchTermine, fetchMitarbeiter, fetchAutos, fetchSettings } from '../utils/api';
import '../styles/Calendar.css';

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
        const [tData, mData, aData, sd] = await Promise.all([
          fetchTermine(),
          fetchMitarbeiter(),
          fetchAutos(),
          fetchSettings()
        ]);

        setMitarbeiter(mData);
        setEvents(assignColors(tData, mData));
        setAutos(aData);

        if (sd?.visibleDays) setVisibleDays(parseInt(sd.visibleDays));
        if (sd?.theme === 'light') document.body.classList.add('light-theme');
        else document.body.classList.remove('light-theme');
      } catch (e) { console.error(e); }
    };
    
    fetchData();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);
    ws.onmessage = (e) => e.data === "update" && fetchData();
    return () => ws.close();
  }, []);

  const renderEventContent = (info) => (
    <div className="event-card-body-tv">
      <div className="event-card-title-tv">{info.event.title}</div>
      <div className="event-card-meta-tv" style={{marginTop:'auto', borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'8px'}}>
        <div className="tv-meta-row">👤 {mitarbeiter.find(x => x.id === info.event.extendedProps.mitarbeiter_id)?.name || '-'}</div>
        <div className="tv-meta-row">🚐 {autos.find(x => x.id === info.event.extendedProps.auto_id)?.name || '-'}</div>
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
      <TvHeader currentTime={currentTime} />

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
