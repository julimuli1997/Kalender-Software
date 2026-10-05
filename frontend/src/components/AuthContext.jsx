import { useState, useEffect } from 'react';
import { loginApi, fetchMeApi, setAuthToken, AUTH_EXPIRED_EVENT } from '../utils/api';
import { AuthContext } from '../hooks/useAuth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeApi().then(setUser).finally(() => setLoading(false));
  }, []);

  // The server rejected our token (session expired): drop the user so the app shows the login.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = async (username, password) => {
    const data = await loginApi(username, password);
    setAuthToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
