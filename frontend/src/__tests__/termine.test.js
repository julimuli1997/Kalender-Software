import { describe, expect, it } from 'vitest';
import { canEdit, sameId, toTerminPayload, newTermin, assignedIds, resolveAssignment, tvDayCount, validateForm, toLocalInput } from '../utils/termine';

describe('canEdit', () => {
  it('lets admins edit everything', () => {
    expect(canEdit({ role: 'admin' }, 'x')).toBe(true);
  });
  it('lets employees edit only their own, comparing ids as strings', () => {
    const user = { role: 'mitarbeiter', mitarbeiter_id: '5' };
    expect(canEdit(user, 5)).toBe(true);
    expect(canEdit(user, '6')).toBe(false);
  });
  it('never grants access when the user has no mitarbeiter_id', () => {
    expect(canEdit({ role: 'mitarbeiter' }, undefined)).toBe(false);
    expect(canEdit(null, '1')).toBe(false);
  });
});

describe('payload helpers', () => {
  const event = {
    id: 't1', title: 'Montage', startStr: '2026-05-09T08:00', endStr: '',
    extendedProps: { mitarbeiter_id: 'm1', auto_id: 'a1' },
  };
  it('builds the PUT body from a calendar event', () => {
    expect(toTerminPayload(event, { beschreibung: 'neu' })).toEqual({
      id: 't1', title: 'Montage', start: '2026-05-09T08:00', end: '2026-05-09T08:00',
      allDay: false, mitarbeiter_id: 'm1', mitarbeiter_ids: ['m1'], auto_id: 'a1', beschreibung: 'neu',
      kunde: '', ort: '', telefon: '', status: 'geplant',
    });
  });
  it('builds the POST body from the form and the resolved assignment', () => {
    const t = newTermin({ title: 'x', start: 's', end: 'e' }, { mitarbeiter_id: 'm2', mitarbeiter_ids: ['m2', 'm3'] });
    expect(t).toMatchObject({ title: 'x', mitarbeiter_id: 'm2', mitarbeiter_ids: ['m2', 'm3'], start: 's', end: 'e', allDay: false });
  });
  it('sameId ignores type', () => expect(sameId(1, '1')).toBe(true));
});

describe('assignment', () => {
  it('assignedIds includes the responsible employee, also for legacy records', () => {
    expect(assignedIds({ mitarbeiter_id: 5 })).toEqual(['5']);
    expect(assignedIds({ mitarbeiter_id: '1', mitarbeiter_ids: ['2'] })).toEqual(['1', '2']);
    expect(assignedIds({})).toEqual([]);
  });
  it('employees always stay responsible themselves', () => {
    const user = { role: 'mitarbeiter', mitarbeiter_id: 'm1' };
    expect(resolveAssignment(user, ['m2'])).toEqual({ mitarbeiter_id: 'm1', mitarbeiter_ids: ['m1', 'm2'] });
  });
  it('admins keep the current owner while still selected, else the first selected', () => {
    const admin = { role: 'admin' };
    expect(resolveAssignment(admin, ['a', 'b'], 'b')).toEqual({ mitarbeiter_id: 'b', mitarbeiter_ids: ['a', 'b'] });
    expect(resolveAssignment(admin, ['a', 'b'], 'x')).toEqual({ mitarbeiter_id: 'a', mitarbeiter_ids: ['a', 'b'] });
  });
});

describe('validateForm', () => {
  const ok = { title: 'x', mitarbeiter_ids: ['1'], start: '2026-05-09T08:00', end: '2026-05-09T09:00' };
  it('accepts a complete form', () => expect(validateForm(ok)).toBe(''));
  it('rejects missing title, employees and inverted times', () => {
    expect(validateForm({ ...ok, title: ' ' })).not.toBe('');
    expect(validateForm({ ...ok, mitarbeiter_ids: [] })).not.toBe('');
    expect(validateForm({ ...ok, end: ok.start })).not.toBe('');
  });
});

describe('toLocalInput', () => {
  it('formats local time for datetime-local inputs', () => {
    expect(toLocalInput(new Date(2026, 4, 9, 8, 5))).toBe('2026-05-09T08:05');
    expect(toLocalInput('')).toBe('');
  });
});

describe('tvDayCount', () => {
  it('shows only today or today and tomorrow', () => {
    expect(tvDayCount('1')).toBe(1);
    expect(tvDayCount('2')).toBe(2);
    expect(tvDayCount('5')).toBe(2);
    expect(tvDayCount(undefined)).toBe(1);
  });
});
