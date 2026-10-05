import { useAuth } from '../hooks/useAuth';
import MyPasswordPanel from './admin-config/MyPasswordPanel';
import '../styles/AdminConfig.css';

// Shown instead of the app while the account still has a default/initial password.
function ForcePasswordChange() {
  const { user, setUser, logout } = useAuth();

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <p className="cfg-hint">
        Für <strong>{user.username}</strong> ist noch das Standard-Passwort gesetzt.
        Bitte vergib jetzt ein neues Passwort, bevor du fortfährst.
      </p>
      <MyPasswordPanel onSuccess={() => setUser({ ...user, must_change_password: false })} />
      <div className="cfg-actions">
        <button className="cfg-btn" onClick={logout}>Abmelden</button>
      </div>
    </div>
  );
}

export default ForcePasswordChange;
