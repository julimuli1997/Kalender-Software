import json
import os
import threading

from core.database import read_json, write_json


def test_settings_reject_unknown_keys_and_values(client, admin):
    assert client.post("/api/settings", headers=admin, json={"theme": "dark"}).status_code == 200
    assert client.post("/api/settings", headers=admin, json={"theme": "pink"}).status_code == 422
    assert client.post("/api/settings", headers=admin, json={"evil": "x"}).status_code == 422
    assert client.get("/api/settings").json()["theme"] == "dark"


def test_settings_need_login_and_network_mode_is_admin_only(client, make_user):
    assert client.post("/api/settings", json={"theme": "dark"}).status_code == 401
    h, _ = make_user()
    assert client.post("/api/settings", headers=h, json={"theme": "dark"}).status_code == 200
    assert client.post("/api/settings", headers=h, json={"networkMode": "network"}).status_code == 403


def test_corrupt_file_is_moved_aside_not_overwritten(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    with open("db.json", "w") as f:
        f.write("{not json")
    assert read_json("db.json") == []
    backups = [n for n in os.listdir(".") if n.startswith("db.json.corrupt-")]
    assert len(backups) == 1
    assert open(backups[0]).read() == "{not json"


def test_write_is_atomic_and_leaves_no_temp_file(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    write_json("x.json", [1, 2])
    assert json.load(open("x.json")) == [1, 2]
    assert not os.path.exists("x.json.tmp")


def test_concurrent_creates_lose_no_appointments(client, admin):
    errors = []

    def create(i):
        r = client.post("/api/termine", headers=admin, json={"id": str(i), "title": "t", "start": "2026-01-01"})
        if r.status_code != 200:
            errors.append(r.text)

    threads = [threading.Thread(target=create, args=(i,)) for i in range(25)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert not errors
    assert len(client.get("/api/termine").json()) == 25


def test_user_ids_are_unique(client, admin):
    ids = set()
    for i in range(5):
        r = client.post("/api/users", headers=admin,
                        json={"username": f"u{i}", "password": "Passwort1", "name": f"U{i}"})
        ids.add(r.json()["id"])
    assert len(ids) == 5
