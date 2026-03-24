import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/de'; // German locale for moment
import './Calendar.css';

moment.locale('de');
const localizer = momentLocalizer(moment);

const API_URL = 'http://localhost:8000/api/termine';

function AdminPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch events from the backend
    const fetchEvents = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        // react-big-calendar expects Date objects
        const formattedEvents = data.map(event => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
        setEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []);

  const handleSelectSlot = async ({ start, end }) => {
    const title = window.prompt('Neuer Termin Titel:');
    if (title) {
      const newEvent = {
        id: new Date().getTime(), // Simple unique ID
        title,
        start: start.toISOString(),
        end: end.toISOString(),
      };

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newEvent),
        });
        
        if (response.ok) {
          // Add event to local state to update UI immediately
          setEvents(prevEvents => [
            ...prevEvents,
            { ...newEvent, start: new Date(newEvent.start), end: new Date(newEvent.end) },
          ]);
        } else {
          console.error('Failed to save event');
        }
      } catch (error) {
        console.error('Error saving event:', error);
      }
    }
  };

  return (
    <div>
      <h2>Admin-Ansicht</h2>
      <p>Klicken Sie in den Kalender, um einen neuen Termin zu erstellen.</p>
      <div style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable={true}
          onSelectSlot={handleSelectSlot}
          messages={{
            next: "Nächster",
            previous: "Zurück",
            today: "Heute",
            month: "Monat",
            week: "Woche",
            day: "Tag",
            agenda: "Agenda",
            date: "Datum",
            time: "Zeit",
            event: "Termin",
            noEventsInRange: "Keine Termine in diesem Bereich.",
            showMore: total => `+ ${total} weitere`,
          }}
        />
      </div>
    </div>
  );
}

export default AdminPage;
