import json

import pytest

from core import storage
from core.database import read_dict, read_list, write_json
from core.storage import JsonFileStorage, MySQLStorage


class FakeMySQL:
    """Just enough of a DB-API connection to run MySQLStorage's four statements."""

    def __init__(self):
        self.rows = {}
        self.statements = []

    def connect(self, **params):
        self.params = params
        return self

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def close(self):
        pass

    def execute(self, sql, args=()):
        self.statements.append(sql)
        self._result = None
        if sql.startswith("SELECT"):
            self._result = (self.rows[args[0]],) if args[0] in self.rows else None
        elif sql.startswith("REPLACE"):
            self.rows[args[0]] = args[1]

    def fetchone(self):
        return self._result


@pytest.fixture
def mysql():
    fake = FakeMySQL()
    store = MySQLStorage(connect=fake.connect, database="kal")
    storage.set_storage(store)
    yield fake
    storage.set_storage(None)


def test_mysql_creates_table_and_roundtrips_documents(mysql):
    assert mysql.statements[0].startswith("CREATE TABLE IF NOT EXISTS `kalender_documents`")
    assert mysql.params["database"] == "kal" and mysql.params["autocommit"] is True

    assert read_list("db.json") == []                       # missing -> empty
    write_json("db.json", [{"id": "1", "title": "Ä ü"}])
    assert json.loads(mysql.rows["db.json"]) == [{"id": "1", "title": "Ä ü"}]
    assert read_list("db.json") == [{"id": "1", "title": "Ä ü"}]

    write_json("settings.json", {"theme": "dark"})
    assert read_dict("settings.json") == {"theme": "dark"}


def test_mysql_rejects_unsafe_table_name():
    with pytest.raises(ValueError):
        MySQLStorage(table="x`; DROP TABLE y", connect=FakeMySQL().connect)


def test_backend_is_chosen_from_environment(monkeypatch):
    storage.set_storage(None)
    monkeypatch.delenv("KALENDER_STORAGE", raising=False)
    assert isinstance(storage.get_storage(), JsonFileStorage)

    storage.set_storage(None)
    monkeypatch.setenv("KALENDER_STORAGE", "nonsense")
    with pytest.raises(RuntimeError):
        storage.get_storage()
    storage.set_storage(None)
