def termin(id, mitarbeiter_id, title="Montage"):
    return {"id": id, "title": title, "start": "2026-05-09T08:00", "mitarbeiter_id": mitarbeiter_id}


def test_employee_can_manage_only_own_appointments(client, admin, make_user):
    h_max, max_ = make_user("max", "Max")
    h_eva, eva = make_user("eva", "Eva")

    assert client.post("/api/termine", headers=h_max, json=termin("t1", max_["mitarbeiter_id"])).status_code == 200
    # cannot create for someone else
    assert client.post("/api/termine", headers=h_max, json=termin("t2", eva["mitarbeiter_id"])).status_code == 403
    # cannot edit or delete someone else's
    assert client.put("/api/termine/t1", headers=h_eva, json=termin("t1", eva["mitarbeiter_id"])).status_code == 403
    assert client.delete("/api/termine/t1", headers=h_eva).status_code == 403
    # cannot hand an own appointment over to someone else
    assert client.put("/api/termine/t1", headers=h_max, json=termin("t1", eva["mitarbeiter_id"])).status_code == 403
    # owner and admin can
    assert client.put("/api/termine/t1", headers=h_max, json=termin("t1", max_["mitarbeiter_id"], "neu")).status_code == 200
    assert client.delete("/api/termine/t1", headers=admin).status_code == 200
    assert client.delete("/api/termine/t1", headers=admin).status_code == 404


def test_deleting_user_removes_their_appointments(client, admin, make_user):
    h, user = make_user()
    client.post("/api/termine", headers=h, json=termin("t1", user["mitarbeiter_id"]))
    assert client.delete(f"/api/users/{user['id']}", headers=admin).status_code == 200
    assert client.get("/api/termine").json() == []
    assert client.get("/api/auth/me", headers=h).status_code == 401  # session revoked


def test_calendar_is_public_by_default_and_closable(client, admin):
    assert client.get("/api/termine").status_code == 200
    assert client.get("/api/mitarbeiter").status_code == 200
    assert client.get("/api/network-info").status_code == 401  # never public

    r = client.put("/api/admin/security", headers=admin, json={"public_calendar_view": False})
    assert r.status_code == 200
    for path in ("/api/termine", "/api/mitarbeiter", "/api/autos", "/api/settings"):
        assert client.get(path).status_code == 401, path
        assert client.get(path, headers=admin).status_code == 200, path


def test_websocket_requires_token_when_calendar_is_closed(client, admin):
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with client.websocket_connect("/ws"):
        pass  # public by default
    client.put("/api/admin/security", headers=admin, json={"public_calendar_view": False})
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws"):
            pass
    token = admin["Authorization"].split()[1]
    with client.websocket_connect(f"/ws?token={token}"):
        pass
