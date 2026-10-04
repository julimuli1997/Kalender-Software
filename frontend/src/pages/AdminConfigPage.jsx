import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import UsersPanel from '../components/admin-config/UsersPanel';
import SecuritySettingsPanel from '../components/admin-config/SecuritySettingsPanel';
import MyPasswordPanel from '../components/admin-config/MyPasswordPanel';
import { fetchUsersApi, createUserApi, deleteUserApi } from '../utils/api';
import { updateUser, resetUserPassword } from '../utils/adminApi';
import '../styles/AdminConfig.css';

const TABS = [
  { id: 'users', label: 'Benutzer & Rollen' },
  { id: 'security', label: 'Sicherheit' },
  { id: 'account', label: 'Mein Konto' },
];

function AdminConfigPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);

  const reload = async () => setUsers(await fetchUsersApi());
  useEffect(() => { fetchUsersApi().then(setUsers); }, []);

  const handleCreate = async (data) => { await createUserApi(data); await reload(); };
  const handleUpdate = async (id, changes) => { await updateUser(id, changes); await reload(); };

  const handleDelete = async (target) => {
    if (!window.confirm(`@${target.username} und alle zugehörigen Termine wirklich löschen?`)) return;
    if (await deleteUserApi(target.id)) await reload();
    else window.alert('Löschen fehlgeschlagen.');
  };

  return (
    <div className="cfg-page">
      <h2 className="cfg-title">Admin-Konfiguration</h2>
      <div className="cfg-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`cfg-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <UsersPanel
          users={users}
          currentUserId={user.id}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onReset={resetUserPassword}
          onDelete={handleDelete}
        />
      )}
      {tab === 'security' && <SecuritySettingsPanel />}
      {tab === 'account' && <MyPasswordPanel />}
    </div>
  );
}

export default AdminConfigPage;
