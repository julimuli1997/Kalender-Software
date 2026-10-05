from tests.conftest import auth_header, login


def test_default_admin_must_change_password(client):
    r = login(client, "admin", "admin123")
    assert r.status_code == 200
    assert r.json()["user"]["must_change_password"] is True
    h = auth_header(r.json()["token"])

    assert client.get("/api/auth/me", headers=h).status_code == 200
    # everything else is blocked until the password is changed
    assert client.get("/api/users", headers=h).status_code == 403
    assert client.post("/api/termine", headers=h, json={"id": "1", "title": "x", "start": "2026-01-01"}).status_code == 403


def test_changing_password_lifts_the_lock(client):
    h = auth_header(login(client, "admin", "admin123").json()["token"])
    body = {"current_password": "admin123", "new_password": "Sicher123"}
    assert client.post("/api/account/change-password", json=body, headers=h).status_code == 200
    assert client.get("/api/users", headers=h).status_code == 200
    assert login(client, "admin", "admin123").status_code == 400
    assert login(client, "admin", "Sicher123").json()["user"]["must_change_password"] is False


def test_new_password_must_differ_and_follow_policy(client):
    h = auth_header(login(client, "admin", "admin123").json()["token"])
    same = {"current_password": "admin123", "new_password": "admin123"}
    assert client.post("/api/account/change-password", json=same, headers=h).status_code == 400
    weak = {"current_password": "admin123", "new_password": "abc"}
    assert client.post("/api/account/change-password", json=weak, headers=h).status_code == 400


def test_wrong_password_and_lockout(client):
    for _ in range(5):
        assert login(client, "admin", "falsch").status_code == 400
    assert login(client, "admin", "admin123").status_code == 429


def test_requests_without_token_are_rejected(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/users").status_code == 401
    assert client.get("/api/auth/me", headers=auth_header("nope")).status_code == 401


def test_logout_invalidates_token(client, admin):
    assert client.post("/api/auth/logout", headers=admin).status_code == 200
    assert client.get("/api/auth/me", headers=admin).status_code == 401


def test_non_admin_cannot_use_admin_endpoints(client, make_user):
    h, _ = make_user()
    assert client.get("/api/users", headers=h).status_code == 403
    assert client.post("/api/autos", headers=h, json={"id": "1", "name": "Bus"}).status_code == 403
    assert client.get("/api/admin/security", headers=h).status_code == 403
