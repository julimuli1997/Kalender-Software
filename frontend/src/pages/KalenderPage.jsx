import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timegridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';
import TvHeader from '../components/TvHeader';
import { useKalenderData } from '../hooks/useKalenderData';
import { odooColors } from '../utils/colors';
import { STATUS, assignedIds, sameId } from '../utils/termine';
import '../styles/Calendar.css';

function KalenderPage() {
  const { events, mitarbeiter, autos } = useKalenderData();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock for TV dashboard
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderEventContent = (info) => (
    <div className="event-card-body-tv">
      <div className="event-card-title-tv">{info.event.title}</div>
      <div className="event-card-meta-tv">
        <div className="tv-meta-row">🚐 {autos.find(x => sameId(x.id, info.event.extendedProps.auto_id))?.name || '-'}</div>
        {info.event.extendedProps.ort && (
          <div className="tv-meta-row">📍 {info.event.extendedProps.ort}</div>
        )}
        {assignedIds(info.event.extendedProps).length > 1 && (
          <div className="tv-meta-row">
            👥 {assignedIds(info.event.extendedProps).map(id => mitarbeiter.find(x => sameId(x.id, id))?.name).filter(Boolean).join(', ')}
          </div>
        )}
        {info.event.extendedProps.status && info.event.extendedProps.status !== 'geplant' && (
          <div className="tv-meta-row">● {STATUS[info.event.extendedProps.status]}</div>
        )}
        {info.event.extendedProps.beschreibung && (
          <div className="tv-meta-row tv-meta-note">
            📝 {info.event.extendedProps.beschreibung}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="tv-screen-wrapper">
      <TvHeader currentTime={currentTime} />

      <div className="tv-calendar-multi-columns">
        {mitarbeiter.length === 0 ? (
          <div className="tv-empty">Keine Mitarbeiter vorhanden.</div>
        ) : (
          mitarbeiter.map((m, index) => {
            const mEvents = events.filter(e => assignedIds(e).some(id => sameId(id, m.id)));
            const accentColor = mEvents[0]?.backgroundColor || odooColors[index % odooColors.length];

            return (
              <div key={m.id} className="tv-employee-column" style={{ '--accent': accentColor }}>
                <div className="tv-employee-head">
                  <h3 className="tv-employee-name">👤 {m.name}</h3>
                  <span className="tv-employee-count">{mEvents.length} Termine</span>
                </div>

                <div className="tv-employee-body">
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
