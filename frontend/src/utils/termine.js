// Small helpers shared by the calendar pages. The backend enforces the same rules; these only
// give the user instant feedback.

export const sameId = (a, b) => String(a) === String(b);

// Admins may edit everything, everyone else only their own appointments.
export function canEdit(user, mitarbeiterId) {
  if (user?.role === 'admin') return true;
  return user?.mitarbeiter_id != null && sameId(mitarbeiterId, user.mitarbeiter_id);
}

// FullCalendar event -> body for PUT /termine/:id (`overrides` replaces single fields).
export function toTerminPayload(event, overrides = {}) {
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr || event.startStr,
    allDay: false,
    mitarbeiter_id: event.extendedProps.mitarbeiter_id,
    auto_id: event.extendedProps.auto_id,
    beschreibung: event.extendedProps.beschreibung || '',
    ...overrides,
  };
}

// Create-form data -> body for POST /termine.
export function newTermin(formData, times, mitarbeiterId) {
  return {
    id: Date.now().toString(),
    ...formData,
    mitarbeiter_id: mitarbeiterId,
    ...times,
    allDay: false,
    beschreibung: '',
  };
}
