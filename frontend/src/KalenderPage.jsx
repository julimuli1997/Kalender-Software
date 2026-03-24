import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/de';
import './Calendar.css';

moment.locale('de');
const localizer = momentLocalizer(moment);

const API_URL = 'http://localhost:8000/api/termine';

function KalenderPage() {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(API_URL);
                const data = await response.json();
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

        // Optional: Add auto-refresh for TV view
        const intervalId = setInterval(fetchEvents, 60000); // Refresh every 60 seconds

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);

    return (
        <div>
            <h2>Kalender-Ansicht (TV)</h2>
            <div style={{ height: '80vh' }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    toolbar={false} // Hide the toolbar for a cleaner look
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

export default KalenderPage;
