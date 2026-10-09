// Small helpers shared by the calendar pages. The backend enforces the same rules; these only
// give the user instant feedback.

export const sameId = (a, b) => String(a) === String(b);

export const STATUS = {
  geplant: 'Geplant',
  in_arbeit: 'In Arbeit',
  erledigt: 'Erledigt',
  abgesagt: 'Abgesagt',
};

// "TV-Ansicht Tage": only today ('1') or today and tomorrow ('2'); older stored values count as '2'.
export const tvDayCount = (visibleDays) => (Number(visibleDays) >= 2 ? 2 : 1);

// Admins may edit everything, everyone else only their own appointments.
export function canEdit(user, mitarbeiterId) {
  if (user?.role === 'admin') return true;
  return user?.mitarbeiter_id != null && sameId(mitarbeiterId, user.mitarbeiter_id);
}

// Every employee on an appointment (works for a calendar event's props and for a raw record).
// Appointments saved before multi-assignment only have `mitarbeiter_id`.
export function assignedIds(props) {
  const ids = (props?.mitarbeiter_ids ?? []).map(String);
  const main = props?.mitarbeiter_id;
  if (main != null && main !== '' && !ids.includes(String(main))) ids.unshift(String(main));
  return ids;
}

// Date or ISO string -> "YYYY-MM-DDTHH:mm" in local time, the format <input type="datetime-local"> uses.
export function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const emptyForm = (start = '', end = '', mitarbeiterIds = []) => ({
  title: '', start: toLocalInput(start), end: toLocalInput(end), mitarbeiter_ids: mitarbeiterIds,
  auto_id: '', kunde: '', ort: '', telefon: '', status: 'geplant', beschreibung: '',
});

// FullCalendar event -> values for the appointment form.
export function formFromEvent(event) {
  const p = event.extendedProps;
  return {
    title: event.title,
    start: toLocalInput(event.start),
    end: toLocalInput(event.end || event.start),
    mitarbeiter_ids: assignedIds(p),
    auto_id: p.auto_id || '',
    kunde: p.kunde || '',
    ort: p.ort || '',
    telefon: p.telefon || '',
    status: p.status || 'geplant',
    beschreibung: p.beschreibung || '',
  };
}

// The selected employees plus who is responsible. Employees only ever act as themselves;
// for admins the current owner stays responsible as long as they remain selected.
export function resolveAssignment(user, ids, currentMain) {
  const list = [...new Set(ids.map(String))];
  if (user?.role !== 'admin' && user?.mitarbeiter_id != null) {
    const own = String(user.mitarbeiter_id);
    return { mitarbeiter_id: own, mitarbeiter_ids: [own, ...list.filter((i) => i !== own)] };
  }
  const main = currentMain != null && list.includes(String(currentMain)) ? String(currentMain) : list[0] ?? '';
  return { mitarbeiter_id: main, mitarbeiter_ids: list.includes(main) ? list : [main, ...list] };
}

// What the form must satisfy before saving; returns an error message or ''.
export function validateForm(form) {
  if (!form.title.trim()) return 'Bitte eine Bezeichnung eingeben.';
  if (form.mitarbeiter_ids.length === 0) return 'Bitte mindestens einen Mitarbeiter wählen.';
  if (!form.start || !form.end) return 'Bitte Beginn und Ende angeben.';
  if (new Date(form.end) <= new Date(form.start)) return 'Das Ende muss nach dem Beginn liegen.';
  return '';
}

// FullCalendar event -> body for PUT /termine/:id (`overrides` replaces single fields).
export function toTerminPayload(event, overrides = {}) {
  const p = event.extendedProps;
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr || event.startStr,
    allDay: false,
    mitarbeiter_id: p.mitarbeiter_id,
    mitarbeiter_ids: assignedIds(p),
    auto_id: p.auto_id,
    beschreibung: p.beschreibung || '',
    kunde: p.kunde || '',
    ort: p.ort || '',
    telefon: p.telefon || '',
    status: p.status || 'geplant',
    ...overrides,
  };
}

// Appointment form -> body for POST /termine (`assignment` from resolveAssignment).
export function newTermin(form, assignment) {
  return { id: Date.now().toString(), ...form, ...assignment, allDay: false };
}
