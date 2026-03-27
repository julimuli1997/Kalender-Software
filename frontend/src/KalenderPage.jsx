import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';
import './Calendar.css';

const API_URL = 'http://localhost:8000/api/termine';

// --- Farbpalette ---
const colorPalette = [
  'var(--primary)', '#28a745', '#f39c12', '#dc3545', '#17a2b8', '#6f42c1'
];

// --- Funktion zum Färben überlappender Termine ---
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

    coloredEvents.push({
      ...event,
      backgroundColor: availableColor,
      borderColor: availableColor
    });
  });

  return coloredEvents;
};

function KalenderPage() {
    const [events, setEvents] = useState([]);

    // 1. Termine laden (wie bisher)
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(API_URL);
                const data = await response.json();
                setEvents(assignColors(data));
            } catch (error) {
                console.error('Fehler beim Laden der Termine (TV-Ansicht):', error);
            }
        };

        fetchEvents();
        const intervalId = setInterval(fetchEvents, 60000); 
        return () => clearInterval(intervalId);
    }, []);

    // 2. NEU: Die Auto-Scroll Funktion
    useEffect(() => {
        let scrollInterval;
        let timeoutId;

        const startScrolling = () => {
            // FullCalendar erstellt mehrere ".fc-scroller" Klassen (für Header und Inhalt).
            // Der zweite Scroller ist der Bereich mit den Uhrzeiten, den wir bewegen wollen.
            const scrollers = document.querySelectorAll('.fc-scroller');
            const scroller = scrollers.length > 1 ? scrollers[1] : scrollers[0];

            if (!scroller) return;

            scrollInterval = setInterval(() => {
                // Prüfen, ob wir das Ende der Seite erreicht haben
                // (Die +1 ist ein Sicherheitspuffer für Rundungsfehler bei verschiedenen Bildschirmen)
                if (scroller.scrollTop + scroller.clientHeight + 1 >= scroller.scrollHeight) {
                    
                    // 1. Scrollen stoppen
                    clearInterval(scrollInterval);
                    
                    // 2. Nach 3 Sekunden Pause weich nach oben gleiten
                    timeoutId = setTimeout(() => {
                        scroller.scrollTo({ top: 0, behavior: 'smooth' });
                        
                        // 3. Nach weiteren 3 Sekunden wieder von vorne anfangen zu scrollen
                        timeoutId = setTimeout(startScrolling, 3000);
                    }, 3000);
                    
                } else {
                    // Weiter scrollen (1 Pixel nach unten)
                    scroller.scrollTop += 1;
                }
            }, 40); // 40 Millisekunden = Geschwindigkeit (kleiner = schneller)
        };

        // Starte das Scrollen erst 3 Sekunden nach dem Laden, 
        // damit der Nutzer sich kurz orientieren kann
        timeoutId = setTimeout(startScrolling, 3000);

        // Aufräumen, falls die Komponente geschlossen wird
        return () => {
            clearInterval(scrollInterval);
            clearTimeout(timeoutId);
        };
    }, [events]); // Wird neu gestartet, falls sich Termine ändern

    return (
        <div style={{ height: '95vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            
            <h2 style={{ textAlign: 'center', margin: '0.5rem 0', color: 'var(--text-color)', fontSize: '1.5rem' }}>
                Heutige Termine
            </h2>
            
            {/* WICHTIG: pointerEvents: 'none' verhindert, dass versehentliches Klicken das Scrollen stört */}
            <div style={{ flexGrow: 1, backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: '8px', overflow: 'hidden', pointerEvents: 'none' }}>
                <FullCalendar
                    plugins={[timeGridPlugin]}
                    initialView="timeGridDay" 
                    locale={deLocale}
                    events={events} 
                    
                    editable={false}
                    selectable={false}
                    nowIndicator={true} 
                    headerToolbar={false}
                    allDaySlot={false}
                    slotMinTime="08:00:00"
                    slotMaxTime="20:00:00"
                    height="100%"
                />
            </div>
        </div>
    );
}

export default KalenderPage;