export const API_URL = `${window.location.origin}/api`;

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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return { ok: res.ok, item };
}

export async function deleteItemApi(type, id) {
  const res = await fetch(`${API_URL}/${type}/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function createTerminApi(terminData) {
  const res = await fetch(`${API_URL}/termine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(terminData)
  });
  return res.ok;
}

export async function updateTerminApi(id, terminData) {
  const res = await fetch(`${API_URL}/termine/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(terminData)
  });
  return res.ok;
}

export async function deleteTerminApi(id) {
  const res = await fetch(`${API_URL}/termine/${id}`, { method: 'DELETE' });
  return res.ok;
}
