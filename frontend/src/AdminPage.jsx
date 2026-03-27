import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';

const API_URL = 'http://localhost:8000/api/termine';

// --- NEU: Farbpalette für überlappende Termine ---
const colorPalette = [
  'var(--primary)', // Dein Standard-Blau
  '#28a745',        // Grün
  '#f39c12',        // Orange
  '#dc3545',        // Rot
  '#17a2b8',        // Türkis
  '#6f42c1'         // Lila
];

// --- NEU: Funktion, die Überlappungen erkennt und Farben verteilt ---
const assignColors = (rawEvents) => {
  // 1. Termine nach Startzeit sortieren
  const sorted = [...rawEvents].sort((a, b) => new Date(a.start) - new Date(b.start));
  const coloredEvents = [];

  sorted.forEach(event => {
    // 2. Prüfen, welche bereits gefärbten Termine sich mit diesem überschneiden
    const overlapping = coloredEvents.filter(e => {
      const startA = new Date(event.start);
      const endA = new Date(event.end || event.start);
      const startB = new Date(e.start);
      const endB = new Date(e.end || e.start);
      return startB < endA && endB > startA; // Logik für zeitliche Überschneidung
    });

    // 3. Schauen, welche Farben von den Nachbarn schon belegt sind
    const usedColors = overlapping.map(e => e.backgroundColor);

    // 4. Erste freie Farbe aus der Palette nehmen (oder Standard-Blau, falls alle belegt)
    const availableColor = colorPalette.find(color => !usedColors.includes(color)) || colorPalette[0];

    // 5. Dem Termin die Farbe zuweisen
    coloredEvents.push({
      ...event,
      backgroundColor: availableColor,
      borderColor: availableColor
    });
  });

  return coloredEvents;
};

function AdminPage() {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        // Farben direkt beim Laden berechnen
        setEvents(assignColors(data));
      } catch (error) {
        console.error('Fehler beim Laden:', error);
      }
    };
    fetchEvents();
  }, []);

  const handleDateSelect = async (selectInfo) => {
    const title = window.prompt('Neuer Termin Titel:');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); 

    if (title) {
      const newEvent = {
        id: new Date().getTime().toString(),
        title,
        start: selectInfo.startStr,
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
          // Farben neu berechnen, wenn ein neuer Termin dazu kommt
          setEvents(prev => assignColors([...prev, newEvent]));
        }
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
      }
    }
  };

  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      const response = await fetch(`${API_URL}/${selectedEvent.id}`, { method: 'DELETE' });
      if (response.ok) {
        const updatedEvents = events.filter(e => e.id !== selectedEvent.id);
        setEvents(assignColors(updatedEvents)); // Farben neu anpassen, falls Lücken entstehen
        closeModal();
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  const handleEdit = async () => {
    if (!selectedEvent) return;
    const neuerTitel = window.prompt('Titel bearbeiten:', selectedEvent.title);
    
    if (neuerTitel && neuerTitel !== selectedEvent.title) {
      const updatedEvent = {
        id: selectedEvent.id,
        title: neuerTitel,
        start: selectedEvent.startStr,
        end: selectedEvent.endStr || selectedEvent.startStr,
        allDay: selectedEvent.allDay
      };

      try {
        const response = await fetch(`${API_URL}/${selectedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEvent),
        });

        if (response.ok) {
          const updatedEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
          setEvents(assignColors(updatedEvents));
          closeModal();
        }
      } catch (error) {
        console.error('Fehler beim Bearbeiten:', error);
      }
    }
  };

  const handleEventChange = async (changeInfo) => {
    const updatedEvent = {
      id: changeInfo.event.id,
      title: changeInfo.event.title,
      start: changeInfo.event.startStr,
      end: changeInfo.event.endStr || changeInfo.event.startStr,
      allDay: changeInfo.event.allDay
    };

    // Optimistisches Update im Frontend (inklusive Neuberechnung der Farben beim Ziehen!)
    const updatedEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    setEvents(assignColors(updatedEvents));

    try {
      const response = await fetch(`${API_URL}/${updatedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });

      if (!response.ok) throw new Error('Backend Update fehlgeschlagen');
    } catch (error) {
      console.error('Fehler:', error);
      changeInfo.revert(); 
    }
  };

  return (
    <div>
      <h2>Admin-Ansicht</h2>
      <p>Klicken und ziehen für neue Termine. Drag & Drop zum Verschieben. Klick auf einen Termin für Details.</p>
      
      <div style={{ height: '85vh', minHeight: '700px', backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: '8px', position: 'relative' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek" 
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale={deLocale}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          height="100%" 
          
          // --- NEU: Termine werden sauber nebeneinander platziert ---
          slotEventOverlap={false}
          
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
        />
      </div>

      {/* Detail-Box (Modal) */}
      {isModalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Termin Details</h3>
            <p><strong>Titel:</strong> {selectedEvent.title}</p>
            <p><strong>Start:</strong> {new Date(selectedEvent.start).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            {selectedEvent.end && (
              <p><strong>Ende:</strong> {new Date(selectedEvent.end).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={closeModal} style={{ marginRight: 'auto' }}>Abbrechen</button>
              <button className="btn-edit" onClick={handleEdit}>Bearbeiten</button>
              <button className="btn-delete" onClick={handleDelete}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;