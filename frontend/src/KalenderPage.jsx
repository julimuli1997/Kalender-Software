import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import deLocale from '@fullcalendar/core/locales/de';
import './Calendar.css';

const API_URL = 'http://localhost:8000/api';

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
    
    // NEU: States für Mitarbeiter und Autos
    const [mitarbeiter, setMitarbeiter] = useState([]);
    const [autos, setAutos] = useState([]);

    // 1. Alle Daten laden (Termine, Mitarbeiter, Autos)
// 1. Alle Daten laden und auf Live-Updates warten
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [termineRes, mitarbeiterRes, autosRes] = await Promise.all([
                    fetch(`${API_URL}/termine`),
                    fetch(`${API_URL}/mitarbeiter`),
                    fetch(`${API_URL}/autos`)
                ]);
                
                const termine = await termineRes.json();
                setMitarbeiter(await mitarbeiterRes.json());
                setAutos(await autosRes.json());
                
                setEvents(assignColors(termine));
            } catch (error) {
                console.error('Fehler beim Laden der Daten (TV-Ansicht):', error);
            }
        };

        // Direkt beim Start einmal laden
        fetchData();

        // --- NEU: Live-Verbindung (WebSocket) zum Backend aufbauen ---
        const ws = new WebSocket('ws://localhost:8000/ws');

        ws.onopen = () => {
            console.log("Live-Verbindung zum Backend hergestellt!");
        };

        // Wenn das Backend eine Nachricht schickt...
        ws.onmessage = (event) => {
            if (event.data === "update") {
                console.log("Änderung erkannt! Lade Daten sofort neu...");
                fetchData(); // Lädt die frischen Daten sofort in den Kalender!
            }
        };

        // Fehlerbehandlung und Neuladen absichern
        ws.onclose = () => {
            console.log("Live-Verbindung getrennt.");
        };

        // Als Backup, falls die Live-Verbindung mal abbricht (z.B. bei W-LAN Abbruch), 
        // laden wir trotzdem alle 5 Minuten (300.000 ms) im Hintergrund neu.
        const backupIntervalId = setInterval(fetchData, 300000); 

        // Aufräumen, wenn die Seite geschlossen wird
        return () => {
            clearInterval(backupIntervalId);
            ws.close();
        };
    }, []);

    // 2. Die Auto-Scroll Funktion (bleibt unverändert)
    useEffect(() => {
        let scrollInterval;
        let timeoutId;

        const startScrolling = () => {
            const scrollers = document.querySelectorAll('.fc-scroller');
            const scroller = scrollers.length > 1 ? scrollers[1] : scrollers[0];

            if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;

            scrollInterval = setInterval(() => {
                if (scroller.scrollTop + scroller.clientHeight + 1 >= scroller.scrollHeight) {
                    clearInterval(scrollInterval);
                    timeoutId = setTimeout(() => {
                        scroller.scrollTo({ top: 0, behavior: 'smooth' });
                        timeoutId = setTimeout(startScrolling, 3000);
                    }, 3000);
                } else {
                    scroller.scrollTop += 1;
                }
            }, 40); 
        };

        timeoutId = setTimeout(startScrolling, 3000);

        return () => {
            clearInterval(scrollInterval);
            clearTimeout(timeoutId);
        };
    }, [events]); 

    // --- NEU: Custom Layout für die Termin-Blöcke ---
    // Diese Funktion bestimmt, wie das Innere eines Termins auf dem TV aussieht
    const renderEventContent = (eventInfo) => {
        const event = eventInfo.event;
        
        // Finde den Namen des Mitarbeiters anhand der ID
        const m = mitarbeiter.find(m => m.id === event.extendedProps.mitarbeiter_id);
        const mitarbeiterName = m ? m.name : '';

        // Finde den Namen des Autos anhand der ID
        const a = autos.find(a => a.id === event.extendedProps.auto_id);
        const autoName = a ? a.name : '';

        return (
            <div style={{ padding: '2px 4px', fontSize: '0.95rem', lineHeight: '1.4' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {event.title}
                </div>
                {/* Zeigt Emojis + Namen, wenn sie existieren */}
                {mitarbeiterName && <div>👤 {mitarbeiterName}</div>}
                {autoName && <div>🚐 {autoName}</div>}
            </div>
        );
    };

    return (
        <div style={{ height: '95vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ flexGrow: 1, backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
                <FullCalendar
                    plugins={[timeGridPlugin]} 
                    initialView="timeGridDay" 
                    locale={deLocale}
                    events={events} 
                    
                    editable={false}
                    selectable={false}
                    nowIndicator={true} 
                    
                    headerToolbar={{
                        left: '',
                        center: 'title',
                        right: ''
                    }}
                    
                    slotMinTime="05:00:00"
                    slotMaxTime="24:00:00"
                    slotEventOverlap={false} 
                    height="100%"
                    
                    // --- NEU: Hier übergeben wir unser Custom Layout ---
                    eventContent={renderEventContent}
                />
            </div>
        </div>
    );
}

export default KalenderPage;