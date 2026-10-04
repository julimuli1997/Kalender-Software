// API calls for the admin configuration page (users, security settings, own password).
import { API_URL, getAuthHeaders } from './api';

async function request(path, method = 'GET', body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Anfrage fehlgeschlagen';
    throw new Error(detail);
  }
  return data;
}

export const updateUser = (id, changes) => request(`/users/${id}`, 'PUT', changes);
export const resetUserPassword = (id, newPassword) =>
  request(`/users/${id}/reset-password`, 'POST', { new_password: newPassword });
export const changeOwnPassword = (currentPassword, newPassword) =>
  request('/account/change-password', 'POST', { current_password: currentPassword, new_password: newPassword });

export const fetchSecuritySettings = () => request('/admin/security');
export const saveSecuritySettings = (settings) => request('/admin/security', 'PUT', settings);
export const fetchLockedAccounts = () => request('/admin/security/locked');
export const unlockAccount = (username) => request(`/admin/security/unlock/${encodeURIComponent(username)}`, 'POST');
