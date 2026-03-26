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

        // Aktualisiert die Anzeige alle 60 Sekunden automatisch
        const intervalId = setInterval(fetchEvents, 60000); 

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div>
            <h2>Kalender-Ansicht (TV)</h2>
            <div style={{ height: '80vh', minHeight: '600px' }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    toolbar={false} // Versteckt die Buttons, da es ein reiner Anzeige-Monitor ist
                    defaultView="day" // TV-Ansicht startet oft am besten in der Tagesansicht
                    step={15}
                    timeslots={4}
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