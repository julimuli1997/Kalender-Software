import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timegridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';
import TvHeader from '../components/TvHeader';
import { assignColors, odooColors } from '../utils/colors';
import { fetchTermine, fetchMitarbeiter, fetchAutos, fetchSettings } from '../utils/api';
import '../styles/Calendar.css';

function KalenderPage() {
  const [events, setEvents] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [autos, setAutos] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock for TV dashboard
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
      <div className="event-card-meta-tv" style={{marginTop:'auto', borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'6px'}}>
        <div className="tv-meta-row">🚐 {autos.find(x => strIdMatch(x.id, info.event.extendedProps.auto_id))?.name || '-'}</div>
        {info.event.extendedProps.beschreibung && (
          <div className="tv-meta-row" style={{opacity: 0.85, marginTop: '4px'}}>
            📝 {info.event.extendedProps.beschreibung}
          </div>
        )}
      </div>
    </div>
  );

  const strIdMatch = (a, b) => String(a) === String(b);

  return (
    <div className="tv-screen-wrapper">
      <TvHeader currentTime={currentTime} />

      <div className="tv-calendar-multi-columns" style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '1rem',
        padding: '1rem',
        height: 'calc(100vh - 80px)',
        boxSizing: 'border-box',
        overflowX: 'auto'
      }}>
        {mitarbeiter.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.7 }}>
            Keine Mitarbeiter vorhanden.
          </div>
        ) : (
          mitarbeiter.map((m, index) => {
            const mEvents = events.filter(e => strIdMatch(e.mitarbeiter_id, m.id));
            const accentColor = mEvents[0]?.backgroundColor || odooColors[index % odooColors.length];

            return (
              <div
                key={m.id}
                className="tv-employee-column"
                style={{
                  flex: 1,
                  minWidth: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  borderTop: `6px solid ${accentColor}`
                }}
              >
                <div style={{
                  padding: '0.8rem 1rem',
                  backgroundColor: 'var(--surface-bright)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    👤 {m.name}
                  </h3>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    backgroundColor: accentColor,
                    color: '#fff'
                  }}>
                    {mEvents.length} Termine
                  </span>
                </div>

                <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                  <FullCalendar
                    plugins={[timegridPlugin]}
                    initialView="timeGridDay"
                    locale={deLocale}
                    weekends={true}
                    allDaySlot={false}
                    events={mEvents}
                    eventContent={renderEventContent}
                    headerToolbar={false}
                    slotMinTime="06:00:00"
                    slotMaxTime="18:00:00"
                    height="100%"
                    expandRows={true}
                    nowIndicator={true}
                    eventDisplay="block"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default KalenderPage;
