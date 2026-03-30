import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
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

function KalenderPage() {
  const [events, setEvents] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [autos, setAutos] = useState([]);
  const [visibleDays, setVisibleDays] = useState(1);

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
        if (sd?.visibleDays) setVisibleDays(parseInt(sd.visibleDays));
      } catch (e) { console.error(e); }
    };
    fetchData();

    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (e) => e.data === "update" && fetchData();
    return () => ws.close();
  }, []);

  useEffect(() => {
    let scrollInterval;
    const startScrolling = () => {
      const scrollers = document.querySelectorAll('.fc-scroller');
      const scroller = scrollers.length > 1 ? scrollers[1] : scrollers[0];
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
      scrollInterval = setInterval(() => {
        if (scroller.scrollTop + scroller.clientHeight + 1 >= scroller.scrollHeight) {
          clearInterval(scrollInterval);
          setTimeout(() => {
            scroller.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(startScrolling, 4000);
          }, 4000);
        } else {
          scroller.scrollTop += 1;
        }
      }, 50); 
    };
    const tId = setTimeout(startScrolling, 3000);
    return () => { clearInterval(scrollInterval); clearTimeout(tId); };
  }, [events, visibleDays]);

  const renderEventContent = (info) => {
    const m = mitarbeiter.find(x => x.id === info.event.extendedProps.mitarbeiter_id);
    const a = autos.find(x => x.id === info.event.extendedProps.auto_id);
    return (
      <div style={{ padding: '8px', color: 'white' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{info.event.title}</div>
        {m && <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>👤 {m.name}</div>}
        {a && <div style={{ fontSize: '0.9rem' }}>🚐 {a.name}</div>}
      </div>
    );
  };

  return (
    <div className="tv-screen-wrapper">
      <div className="tv-calendar-content">
        <FullCalendar
          key={visibleDays}
          plugins={[timeGridPlugin]}
          initialView={visibleDays === 1 ? 'timeGridDay' : 'timeGridCustom'}
          views={{ timeGridCustom: { type: 'timeGrid', duration: { days: visibleDays } } }}
          locale={deLocale}
          weekends={false}
          allDaySlot={false} // ENTFERNT "GANZTÄGIG"
          events={events}
          eventContent={renderEventContent}
          headerToolbar={{ left: '', center: 'title', right: '' }}
          slotMinTime="05:00:00" slotMaxTime="24:00:00"
          height="100%" nowIndicator={true}
        />
      </div>
    </div>
  );
}

export default KalenderPage;