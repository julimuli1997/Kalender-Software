// API calls for the admin configuration page (users, security settings, own password).
import { request } from './api';

export const updateUser = (id, changes) => request(`/users/${id}`, { method: 'PUT', body: changes });
export const resetUserPassword = (id, newPassword) =>
  request(`/users/${id}/reset-password`, { method: 'POST', body: { new_password: newPassword } });
export const changeOwnPassword = (currentPassword, newPassword) =>
  request('/account/change-password', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
  });

export const fetchSecuritySettings = () => request('/admin/security');
export const saveSecuritySettings = (settings) => request('/admin/security', { method: 'PUT', body: settings });
export const fetchLockedAccounts = () => request('/admin/security/locked');
export const unlockAccount = (username) => request(`/admin/security/unlock/${encodeURIComponent(username)}`, { method: 'POST' });
