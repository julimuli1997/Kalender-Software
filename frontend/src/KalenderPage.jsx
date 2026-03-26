import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import deLocale from '@fullcalendar/core/locales/de'; // Deutsches Sprachpaket
import './Calendar.css';

const API_URL = 'http://localhost:8000/api/termine';

function KalenderPage() {
    const [events, setEvents] = useState([]);

    // Termine vom Backend laden
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(API_URL);
                const data = await response.json();
                setEvents(data);
            } catch (error) {
                console.error('Fehler beim Laden der Termine (TV-Ansicht):', error);
            }
        };

        // Sofort beim Start laden
        fetchEvents();

        // TV-Ansicht-Feature: Aktualisiert sich alle 60 Sekunden automatisch
        const intervalId = setInterval(fetchEvents, 60000); 

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div>
            {/* Minimalistischer Text für die TV-Ansicht */}
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-color)' }}>
                Kalender-Ansicht (TV)
            </h2>
            
            <div style={{ height: '85vh', minHeight: '600px', backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
                <FullCalendar
                    plugins={[timeGridPlugin, dayGridPlugin]}
                    
                    // Für einen TV-Monitor ist oft die Tages- oder Wochenansicht am besten
                    initialView="timeGridDay" 
                    
                    locale={deLocale}
                    events={events}
                    
                    // --- WICHTIG FÜR TV-ANSICHT ---
                    editable={false} // Kein Drag & Drop
                    selectable={false} // Kein Markieren von Zeiten
                    
                    // Zeigt eine rote Linie bei der aktuellen Uhrzeit an!
                    nowIndicator={true} 
                    
                    // Oben nur das Datum anzeigen, keine Knöpfe zum Klicken
                    headerToolbar={{
                        left: '',
                        center: 'title',
                        right: ''
                    }}
                    
                    height="100%"
                />
            </div>
        </div>
    );
}

export default KalenderPage;