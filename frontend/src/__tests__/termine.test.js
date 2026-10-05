import { describe, expect, it } from 'vitest';
import { canEdit, sameId, toTerminPayload, newTermin } from '../utils/termine';

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
      allDay: false, mitarbeiter_id: 'm1', auto_id: 'a1', beschreibung: 'neu',
    });
  });
  it('builds the POST body, forcing the resolved employee', () => {
    const t = newTermin({ title: 'x', mitarbeiter_id: 'wrong', auto_id: '' }, { start: 's', end: 'e' }, 'm2');
    expect(t).toMatchObject({ title: 'x', mitarbeiter_id: 'm2', start: 's', end: 'e', allDay: false, beschreibung: '' });
  });
  it('sameId ignores type', () => expect(sameId(1, '1')).toBe(true));
});
