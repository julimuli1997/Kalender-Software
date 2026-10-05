export const API_URL = `${window.location.origin}/api`;

// Fired when the server rejects our token (expired session) so AuthContext can log the user out.
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// WebSocket URL; sends the token so live updates also work when the calendar view requires a login.
export function wsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = getAuthToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${protocol}//${window.location.host}/ws${query}`;
}

// The one place that talks to the API: adds the token, parses JSON, turns errors into Error(detail).
export async function request(path, { method = 'GET', body, fallbackError = 'Anfrage fehlgeschlagen' } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...getAuthHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && getAuthToken()) {
      setAuthToken(null);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new Error(typeof data?.detail === 'string' ? data.detail : fallbackError);
  }
  return data;
}

const succeeded = (promise) => promise.then(() => true, () => false);

// --- auth / users ---
export const loginApi = (username, password) =>
  request('/auth/login', { method: 'POST', body: { username, password }, fallbackError: 'Login fehlgeschlagen' });

export async function fetchMeApi() {
  if (!getAuthToken()) return null;
  try {
    return await request('/auth/me');
  } catch {
    return null;
  }
}

export const fetchUsersApi = () => request('/users').catch(() => []);

export const createUserApi = (userData) =>
  request('/users', { method: 'POST', body: userData, fallbackError: 'Fehler beim Erstellen des Benutzers' });

export const deleteUserApi = (userId) => succeeded(request(`/users/${userId}`, { method: 'DELETE' }));

// --- calendar data ---
export const fetchTermine = () => request('/termine');
export const fetchMitarbeiter = () => request('/mitarbeiter');
export const fetchAutos = () => request('/autos');
export const fetchSettings = () => request('/settings');
export const updateSettings = (settings) => request('/settings', { method: 'POST', body: settings });
export const fetchNetworkInfo = () => request('/network-info');

export async function addItemApi(type, name) {
  const item = { id: Date.now().toString(), name };
  return { ok: await succeeded(request(`/${type}`, { method: 'POST', body: item })), item };
}

export const deleteItemApi = (type, id) => succeeded(request(`/${type}/${id}`, { method: 'DELETE' }));

export const createTerminApi = (terminData) => succeeded(request('/termine', { method: 'POST', body: terminData }));
export const updateTerminApi = (id, terminData) => succeeded(request(`/termine/${id}`, { method: 'PUT', body: terminData }));
export const deleteTerminApi = (id) => succeeded(request(`/termine/${id}`, { method: 'DELETE' }));
