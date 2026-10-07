import { createTerminApi, updateTerminApi, deleteTerminApi } from '../utils/api';
import { canEdit, newTermin, resolveAssignment, sameId, toTerminPayload } from '../utils/termine';

/**
 * Create / edit / move / delete appointments for the admin calendar.
 * Every action returns true on success and tells the user itself when it fails.
 */
export function useTerminActions({ user, setTermine, reload }) {
  const replace = (payload) =>
    setTermine((prev) => prev.map((t) => (sameId(t.id, payload.id) ? payload : t)));

  const create = async (form) => {
    if (!(await createTerminApi(newTermin(form, resolveAssignment(user, form.mitarbeiter_ids))))) {
      window.alert('Fehler beim Erstellen des Termins.');
      return false;
    }
    await reload();
    return true;
  };

  const update = async (event, changes, deniedMessage, errorMessage) => {
    if (!canEdit(user, event.extendedProps.mitarbeiter_id)) {
      window.alert(deniedMessage);
      return false;
    }
    const payload = toTerminPayload(event, changes);
    replace(payload);
    if (await updateTerminApi(payload.id, payload)) return true;
    await reload(); // drop the optimistic change
    if (errorMessage) window.alert(errorMessage);
    return false;
  };

  const saveBeschreibung = (event, beschreibung) =>
    update(event, { beschreibung }, 'Sie können nur Beschreibungen eigener Termine ändern.', 'Fehler beim Speichern der Beschreibung.');

  // Full edit from the form: details, time and the list of employees.
  const edit = (event, form) =>
    update(
      event,
      { ...form, ...resolveAssignment(user, form.mitarbeiter_ids, event.extendedProps.mitarbeiter_id) },
      'Sie können nur eigene Termine bearbeiten.',
      'Fehler beim Speichern des Termins.',
    );

  const move = (event) => update(event, {}, 'Sie können nur eigene Termine verschieben.');

  const remove = async (event) => {
    if (!canEdit(user, event.extendedProps.mitarbeiter_id)) {
      window.alert('Sie können nur eigene Termine löschen.');
      return false;
    }
    if (!window.confirm('Termin wirklich löschen?')) return false;
    if (!(await deleteTerminApi(event.id))) return false;
    setTermine((prev) => prev.filter((t) => !sameId(t.id, event.id)));
    return true;
  };

  return { create, edit, saveBeschreibung, move, remove };
}
