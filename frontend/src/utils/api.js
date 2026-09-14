export const API_URL = `${window.location.origin}/api`;

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

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function loginApi(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login fehlgeschlagen' }));
    throw new Error(err.detail || 'Login fehlgeschlagen');
  }
  return res.json();
}

export async function fetchMeApi() {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    setAuthToken(null);
    return null;
  }
  return res.json();
}

export async function fetchUsersApi() {
  const res = await fetch(`${API_URL}/users`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createUserApi(userData) {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(userData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Fehler beim Erstellen des Benutzers' }));
    throw new Error(err.detail || 'Fehler beim Erstellen');
  }
  return res.json();
}

export async function deleteUserApi(userId) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.ok;
}

export async function fetchTermine() {
  const res = await fetch(`${API_URL}/termine`);
  return res.json();
}

export async function fetchMitarbeiter() {
  const res = await fetch(`${API_URL}/mitarbeiter`);
  return res.json();
}

export async function fetchAutos() {
  const res = await fetch(`${API_URL}/autos`);
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_URL}/settings`);
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(settings)
  });
  return res.json();
}

export async function fetchNetworkInfo() {
  const res = await fetch(`${API_URL}/network-info`);
  return res.json();
}

export async function addItemApi(type, name) {
  const item = { id: Date.now().toString(), name };
  const res = await fetch(`${API_URL}/${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(item)
  });
  return { ok: res.ok, item };
}

export async function deleteItemApi(type, id) {
  const res = await fetch(`${API_URL}/${type}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.ok;
}

export async function createTerminApi(terminData) {
  const res = await fetch(`${API_URL}/termine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(terminData)
  });
  return res.ok;
}

export async function updateTerminApi(id, terminData) {
  const res = await fetch(`${API_URL}/termine/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(terminData)
  });
  return res.ok;
}

export async function deleteTerminApi(id) {
  const res = await fetch(`${API_URL}/termine/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return res.ok;
}
