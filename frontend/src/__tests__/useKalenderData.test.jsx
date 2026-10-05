import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKalenderData } from '../hooks/useKalenderData';

let sockets;
class FakeWebSocket {
  constructor(url) { this.url = url; this.closed = false; sockets.push(this); }
  close() { this.closed = true; }
}

let data;
beforeEach(() => {
  sockets = [];
  data = {
    '/termine': [{ id: 't1', title: 'A', start: 's', mitarbeiter_id: 'm1' }],
    '/mitarbeiter': [{ id: 'm1', name: 'Max Mustermann' }],
    '/autos': [{ id: 'a1', name: 'Bus' }],
    '/settings': { theme: 'dark' },
    '/users': [{ id: 'm1', username: 'max', name: 'Max Mustermann', role: 'mitarbeiter' }],
  };
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('fetch', vi.fn((url) => {
    const path = url.replace(/^.*\/api/, '');
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data[path]) });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); document.body.className = ''; });

describe('useKalenderData', () => {
  it('loads everything, colours events and applies the theme', async () => {
    const { result } = renderHook(() => useKalenderData());
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(result.current.events[0].backgroundColor).toBeTruthy();
    expect(result.current.autos[0].name).toBe('Bus');
    expect(document.body.classList.contains('light-theme')).toBe(false); // theme "dark"
    // without admin rights the user list is derived from the employees
    expect(result.current.users[0]).toMatchObject({ name: 'Max Mustermann', username: 'maxmustermann' });
  });

  it('only loads /users for admins', async () => {
    const { result } = renderHook(() => useKalenderData({ includeUsers: true }));
    await waitFor(() => expect(result.current.users[0]?.username).toBe('max'));
  });

  it('reloads when the server sends "update" over the WebSocket', async () => {
    const { result } = renderHook(() => useKalenderData());
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    data['/termine'] = [...data['/termine'], { id: 't2', title: 'B', start: 's', mitarbeiter_id: 'm1' }];
    act(() => sockets[0].onmessage({ data: 'update' }));
    await waitFor(() => expect(result.current.events).toHaveLength(2));
  });

  it('reconnects after the socket drops and closes it on unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { unmount } = renderHook(() => useKalenderData());
    expect(sockets).toHaveLength(1);
    act(() => sockets[0].onclose());
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(sockets).toHaveLength(2);
    unmount();
    expect(sockets[1].closed).toBe(true);
    vi.useRealTimers();
  });
});
