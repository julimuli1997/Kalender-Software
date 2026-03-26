import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de'; // Deutsches Sprachpaket

const API_URL = 'http://localhost:8000/api/termine';

function AdminPage() {
  const [events, setEvents] = useState([]);

  // 1. Termine beim Laden der Seite vom Backend holen
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Fehler beim Laden der Termine:', error);
      }
    };

    fetchEvents();
  }, []);

  // 2. Termin erstellen (Auswählen eines Zeitraums)
  const handleDateSelect = async (selectInfo) => {
    const title = window.prompt('Neuer Termin Titel:');
    
    // Hebt die Markierung im Kalender auf
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); 

    if (title) {
      const newEvent = {
        id: new Date().getTime().toString(),
        title,
        start: selectInfo.startStr, // FullCalendar liefert direkt ISO-Strings
        end: selectInfo.endStr,
        allDay: selectInfo.allDay
      };

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent),
        });
        
        if (response.ok) {
          // Direkt in den State pushen, FullCalendar zeigt es sofort an
          setEvents([...events, newEvent]);
        }
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
      }
    }
  };

  // 3. Termin löschen (Klick auf das Event)
  const handleEventClick = async (clickInfo) => {
    if (window.confirm(`Möchten Sie den Termin "${clickInfo.event.title}" wirklich löschen?`)) {
      try {
        const response = await fetch(`${API_URL}/${clickInfo.event.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Event aus der Ansicht entfernen
          clickInfo.event.remove(); 
          // State updaten
          setEvents(events.filter(e => e.id !== clickInfo.event.id));
        }
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };

  // 4. Termin verschieben oder Dauer ändern (Drag & Drop)
  const handleEventChange = async (changeInfo) => {
    const updatedEvent = {
      id: changeInfo.event.id,
      title: changeInfo.event.title,
      start: changeInfo.event.startStr,
      end: changeInfo.event.endStr || changeInfo.event.startStr, // Falls kein Ende definiert ist
      allDay: changeInfo.event.allDay
    };

    try {
      const response = await fetch(`${API_URL}/${updatedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });

      if (!response.ok) {
        throw new Error('Backend Update fehlgeschlagen');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      // Das ist genial an FullCalendar: Wenn das Backend streikt, 
      // springt das Event einfach an seinen alten Platz zurück!
      changeInfo.revert(); 
    }
  };

  return (
    <div>
      <h2>Admin-Ansicht</h2>
      <p>Klicken und ziehen für neue Termine. Drag & Drop zum Verschieben. Klick auf einen Termin zum Löschen.</p>
      
      {/* Wrapper für die Höhe des Kalenders */}
      <div style={{ height: '75vh', minHeight: '600px', backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
        <FullCalendar
          // Die geladenen Plugins
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          
          // Ansicht beim Start
          initialView="timeGridWeek" 
          
          // Die Toolbar mit funktionierenden Buttons!
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          
          // Spracheinstellung
          locale={deLocale}
          
          // Termindaten
          events={events}
          
          // Funktionen aktivieren
          editable={true} // Erlaubt Drag & Drop
          selectable={true} // Erlaubt das Markieren von Zeiträumen
          selectMirror={true} // Zeigt beim Ziehen schon den "Geister-Termin"
          dayMaxEvents={true} // Wenn zu viele Termine am Tag sind, kommt ein "+ X weitere" Link
          
          // Höhe auf 100% des äußeren divs setzen (inkl. Scrollen in der Wochenansicht)
          height="100%" 
          
          // Event Listener verknüpfen
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventChange} // Auslöser fürs Verschieben
          eventResize={handleEventChange} // Auslöser fürs "Größer/Kleiner ziehen"
        />
      </div>
    </div>
  );
}

export default AdminPage;