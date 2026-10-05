import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_EXPIRED_EVENT, request, setAuthToken, createTerminApi } from '../utils/api';

const respond = (status, body) => vi.fn().mockResolvedValue({
  ok: status < 400, status, json: () => Promise.resolve(body),
});

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe('request', () => {
  it('sends the token and JSON body', async () => {
    setAuthToken('abc');
    const fetchMock = respond(200, { ok: 1 });
    vi.stubGlobal('fetch', fetchMock);
    await request('/x', { method: 'POST', body: { a: 1 } });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers).toMatchObject({ Authorization: 'Bearer abc', 'Content-Type': 'application/json' });
    expect(opts.body).toBe('{"a":1}');
  });

  it('throws the server detail, or the fallback for non-string details', async () => {
    vi.stubGlobal('fetch', respond(400, { detail: 'Kaputt' }));
    await expect(request('/x')).rejects.toThrow('Kaputt');
    vi.stubGlobal('fetch', respond(422, { detail: [{ msg: 'x' }] }));
    await expect(request('/x', { fallbackError: 'Fallback' })).rejects.toThrow('Fallback');
  });

  it('drops the token and announces it on 401', async () => {
    setAuthToken('abc');
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    vi.stubGlobal('fetch', respond(401, { detail: 'abgelaufen' }));
    await expect(request('/x')).rejects.toThrow();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });

  it('boolean wrappers turn errors into false', async () => {
    vi.stubGlobal('fetch', respond(403, { detail: 'nein' }));
    expect(await createTerminApi({})).toBe(false);
    vi.stubGlobal('fetch', respond(200, {}));
    expect(await createTerminApi({})).toBe(true);
  });
});
