from core import login_guard
from core.auth import hash_password
from core.database import read_list, write_json
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


def test_user_management_edit_reset_and_role_validation(client, admin, make_user):
    h, user = make_user("max", "Max")
    uid = user["id"]

    r = client.put(f"/api/users/{uid}", headers=admin, json={"name": "Maximilian"})
    assert r.status_code == 200 and r.json()["name"] == "Maximilian"
    assert [m["name"] for m in client.get("/api/mitarbeiter").json()] == ["Maximilian"]

    assert client.put(f"/api/users/{uid}", headers=admin, json={"role": "chef"}).status_code == 422

    client.put(f"/api/users/{uid}", headers=admin, json={"role": "admin"})
    assert client.get("/api/auth/me", headers=h).status_code == 401  # role change ends the session

    assert client.post(f"/api/users/{uid}/reset-password", headers=admin, json={"new_password": "Neu12345"}).status_code == 200
    assert login(client, "max", "Passwort1").status_code == 400
    assert login(client, "max", "Neu12345").status_code == 200


def test_last_admin_and_main_admin_are_protected(client, admin):
    me = client.get("/api/auth/me", headers=admin).json()
    assert client.put(f"/api/users/{me['id']}", headers=admin, json={"role": "mitarbeiter"}).status_code == 400
    assert client.delete(f"/api/users/{me['id']}", headers=admin).status_code == 400
    assert client.delete("/api/users/gibts-nicht", headers=admin).status_code == 404


def test_reset_password_forces_a_change_that_stays_possible(client, admin, make_user):
    _, user = make_user("max", "Max")
    r = client.post(f"/api/users/{user['id']}/reset-password", headers=admin, json={"new_password": "Neu12345"})
    assert r.status_code == 200
    # self-change switched off after the reset must not trap the user on the change screen
    assert client.put("/api/admin/security", headers=admin, json={"allow_self_password_change": False}).status_code == 200
    r = login(client, "max", "Neu12345").json()
    assert r["user"]["must_change_password"] is True
    h = auth_header(r["token"])
    r = client.post("/api/account/change-password", headers=h,
                    json={"current_password": "Neu12345", "new_password": "Eigen1234"})
    assert r.status_code == 200, r.text
    # once changed, the admin setting applies again
    r = client.post("/api/account/change-password", headers=h,
                    json={"current_password": "Eigen1234", "new_password": "Eigen5678"})
    assert r.status_code == 403


def test_spa_route_serves_dist_files_and_nothing_outside(client, tmp_path):
    assert client.get("/kalender").status_code == 404  # no build yet
    (tmp_path / "dist" / "sub").mkdir(parents=True)
    (tmp_path / "dist" / "index.html").write_text("SPA")
    (tmp_path / "dist" / "favicon.svg").write_text("ICON")
    (tmp_path / "dist" / "sub" / "x.txt").write_text("NESTED")
    (tmp_path / "dist-evil").mkdir()
    (tmp_path / "dist-evil" / "s.txt").write_text("SECRET")
    (tmp_path / "users.json").write_text("SECRET")

    assert client.get("/favicon.svg").text == "ICON"
    assert client.get("/sub/x.txt").text == "NESTED"
    assert client.get("/kalender").text == "SPA"
    for path in ("/..%2Fusers.json", "/..%2Fdist-evil%2Fs.txt", "/sub/..%2F..%2Fusers.json",
                 f"/{str(tmp_path / 'users.json').replace('/', '%2F')}",
                 "/..%5Cusers.json", "/%5C%5Chost%5Cshare%5Cx", "///host/share/x", "/C:users.json", "/a%00b"):
        r = client.get(path)
        assert (r.status_code, r.text) == (200, "SPA"), path


def test_lockout_is_per_address_so_others_cannot_lock_out_the_owner(client, admin):
    for _ in range(5):
        login_guard.register_failure("admin", "10.0.0.66")  # someone else guessing
    assert login(client, "admin", "Sicher123").status_code == 200  # owner on another machine
    assert [l["username"] for l in client.get("/api/admin/security/locked", headers=admin).json()] == ["admin"]
    assert client.post("/api/admin/security/unlock/admin", headers=admin).status_code == 200
    assert client.get("/api/admin/security/locked", headers=admin).json() == []


def test_old_password_hashes_are_upgraded_on_login(client):
    hashed, salt = hash_password("Alt12345", iterations=100_000)
    write_json("users.json", [{"id": "u1", "username": "old", "role": "mitarbeiter", "name": "Old",
                               "mitarbeiter_id": "u1", "password_hash": hashed, "salt": salt}])
    assert login(client, "old", "Alt12345").status_code == 200
    [user] = read_list("users.json")
    assert user["iterations"] == 1000 and user["password_hash"] != hashed
    assert login(client, "old", "Alt12345").status_code == 200


def test_user_name_must_not_be_blank(client, admin):
    r = client.post("/api/users", headers=admin,
                    json={"username": "x", "password": "Passwort1", "name": "   ", "role": "mitarbeiter"})
    assert r.status_code == 400
