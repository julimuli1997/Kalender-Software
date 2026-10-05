import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main  # noqa: E402  (importing chdirs into backend/; each test re-chdirs below)
from core import auth, login_guard  # noqa: E402


@pytest.fixture
def client(tmp_path, monkeypatch):
    """App running against an empty, throw-away data directory."""
    monkeypatch.chdir(tmp_path)
    auth.SESSIONS.clear()
    login_guard._STATE.clear()
    with TestClient(main.app) as c:
        yield c


def login(client, username, password):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin(client):
    """Headers of an admin that already replaced the default password."""
    token = login(client, "admin", "admin123").json()["token"]
    h = auth_header(token)
    r = client.post("/api/account/change-password",
                    json={"current_password": "admin123", "new_password": "Sicher123"}, headers=h)
    assert r.status_code == 200, r.text
    return h


@pytest.fixture
def make_user(client, admin):
    """Create an employee and return (headers, user_json)."""
    def _make(username="max", name="Max", role="mitarbeiter", password="Passwort1"):
        r = client.post("/api/users", headers=admin,
                        json={"username": username, "password": password, "name": name, "role": role})
        assert r.status_code == 200, r.text
        token = login(client, username, password).json()["token"]
        return auth_header(token), r.json()
    return _make
