import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchTermine, fetchMitarbeiter, fetchAutos, fetchSettings, fetchUsersApi, wsUrl,
} from '../utils/api';
import { assignColors } from '../utils/colors';

const RECONNECT_MS = 3000;

/**
 * Loads appointments, employees, vehicles and settings, applies the theme and keeps everything
 * live: the server sends "update" over the WebSocket after every change and we reload.
 * Used by both the admin calendar and the TV view.
 */
export function useKalenderData({ includeUsers = false } = {}) {
  const [termine, setTermine] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [autos, setAutos] = useState([]);
  const [settings, setSettings] = useState({});
  const [userList, setUserList] = useState([]);

  const fetchAll = useCallback(async () => {
    const [t, m, a, s] = await Promise.all([fetchTermine(), fetchMitarbeiter(), fetchAutos(), fetchSettings()]);
    return { t, m, a, s, u: includeUsers ? await fetchUsersApi() : [] };
  }, [includeUsers]);

  const apply = useCallback(({ t, m, a, s, u }) => {
    setTermine(t);
    setMitarbeiter(m);
    setAutos(a);
    setSettings(s);
    setUserList(u);
  }, []);

  const reload = useCallback(
    () => fetchAll().then(apply).catch((e) => console.error(e)),
    [fetchAll, apply],
  );

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then((data) => { if (!cancelled) apply(data); })
      .catch((e) => console.error(e));

    let ws;
    let retryTimer;
    let closed = false;
    let dropped = false;
    const connect = () => {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => { if (dropped) reload(); }; // catch up on updates missed while offline
      ws.onmessage = (e) => { if (e.data === 'update') reload(); };
      ws.onclose = () => {
        dropped = true;
        if (!closed) retryTimer = setTimeout(connect, RECONNECT_MS);
      };
    };
    connect();

    return () => {
      cancelled = true;
      closed = true;
      clearTimeout(retryTimer);
      ws.close();
    };
  }, [fetchAll, apply, reload]);

  useEffect(() => {
    document.body.classList.toggle('light-theme', (settings.theme ?? 'light') === 'light');
  }, [settings.theme]);

  const events = useMemo(() => assignColors(termine, mitarbeiter), [termine, mitarbeiter]);

  // Employees without admin rights can't list users; show the employee list instead.
  const users = useMemo(
    () => (includeUsers
      ? userList
      : mitarbeiter.map((m) => ({
          id: m.id, name: m.name, username: m.name.toLowerCase().replace(/\s+/g, ''), role: 'mitarbeiter',
        }))),
    [includeUsers, userList, mitarbeiter],
  );

  return { events, mitarbeiter, autos, users, settings, setSettings, setTermine, reload };
}
