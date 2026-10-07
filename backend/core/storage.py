"""Pluggable persistence behind core.database (read_json / write_json).

Every "document" (users, termine, autos, ...) is addressed by its file name from
core.paths. A backend only has to implement `read(name)` and `write(name, data)`:

    KALENDER_STORAGE=json   (default) one JSON file per document, in the app folder
    KALENDER_STORAGE=mysql  one row per document in a MySQL/MariaDB table

MySQL settings (environment):
    KALENDER_MYSQL_HOST      default 127.0.0.1
    KALENDER_MYSQL_PORT      default 3306
    KALENDER_MYSQL_USER      default kalender
    KALENDER_MYSQL_PASSWORD  default empty
    KALENDER_MYSQL_DATABASE  default kalender   (must already exist)
    KALENDER_MYSQL_TABLE     default kalender_documents (created on first use)

To add another backend, subclass `Storage` and register it in `_BACKENDS`.
"""
import json
import logging
import os
import re
import time
from abc import ABC, abstractmethod

log = logging.getLogger("kalender")


class Storage(ABC):
    @abstractmethod
    def read(self, name: str):
        """Return the stored document, or [] if it does not exist (or is unreadable)."""

    @abstractmethod
    def write(self, name: str, data) -> None:
        """Replace the stored document. Must not leave a half-written document behind."""


class JsonFileStorage(Storage):
    def read(self, name):
        if not os.path.exists(name):
            return []
        try:
            with open(name, "r", encoding="utf-8") as f:
                return json.load(f)
        except ValueError:
            # Corrupt file: move it aside instead of letting the next write silently
            # replace it with an empty list. The data stays recoverable by hand.
            backup = f"{name}.corrupt-{int(time.time())}"
            os.replace(name, backup)
            log.error("%s is not valid JSON, moved to %s", name, backup)
            return []

    def write(self, name, data):
        # Write to a temp file and swap it in, so a crash mid-write cannot truncate the real file.
        tmp = f"{name}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, name)


class MySQLStorage(Storage):
    """Stores each document as one JSON value in a single table (name -> data).

    Opens a short-lived connection per call, so a MySQL restart or `wait_timeout`
    never leaves the app holding a dead connection. Callers already serialise
    access with core.database.db_lock.
    """

    def __init__(self, host="127.0.0.1", port=3306, user="kalender", password="",
                 database="kalender", table="kalender_documents", connect=None):
        if not re.fullmatch(r"[A-Za-z0-9_]+", table):
            raise ValueError(f"Invalid MySQL table name: {table!r}")
        self.table = table
        self._connect = connect or self._default_connect
        self._params = dict(host=host, port=int(port), user=user, password=password,
                            database=database, charset="utf8mb4", autocommit=True)
        self._ensure_table()

    @classmethod
    def from_env(cls):
        env = os.environ.get
        return cls(
            host=env("KALENDER_MYSQL_HOST", "127.0.0.1"),
            port=env("KALENDER_MYSQL_PORT", "3306"),
            user=env("KALENDER_MYSQL_USER", "kalender"),
            password=env("KALENDER_MYSQL_PASSWORD", ""),
            database=env("KALENDER_MYSQL_DATABASE", "kalender"),
            table=env("KALENDER_MYSQL_TABLE", "kalender_documents"),
        )

    def _default_connect(self, **params):
        try:
            import pymysql  # imported lazily: only needed when MySQL is selected
        except ImportError as e:
            raise RuntimeError("KALENDER_STORAGE=mysql needs PyMySQL (pip install PyMySQL)") from e
        return pymysql.connect(**params)

    def _execute(self, sql, args=(), fetch=False):
        conn = self._connect(**self._params)
        try:
            with conn.cursor() as cur:
                cur.execute(sql, args)
                return cur.fetchone() if fetch else None
        finally:
            conn.close()

    def _ensure_table(self):
        self._execute(
            f"CREATE TABLE IF NOT EXISTS `{self.table}` ("
            " name VARCHAR(191) NOT NULL PRIMARY KEY,"
            " data JSON NOT NULL,"
            " updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
            ") CHARACTER SET utf8mb4"
        )

    def read(self, name):
        row = self._execute(f"SELECT data FROM `{self.table}` WHERE name = %s", (name,), fetch=True)
        if row is None:
            return []
        raw = row[0]
        if isinstance(raw, (bytes, bytearray)):
            raw = raw.decode("utf-8")
        return json.loads(raw) if isinstance(raw, str) else raw

    def write(self, name, data):
        self._execute(
            f"REPLACE INTO `{self.table}` (name, data) VALUES (%s, %s)",
            (name, json.dumps(data, ensure_ascii=False)),
        )


_BACKENDS = {"json": JsonFileStorage, "mysql": MySQLStorage.from_env}
_storage: Storage | None = None


def get_storage() -> Storage:
    """The active backend, created on first use from KALENDER_STORAGE."""
    global _storage
    if _storage is None:
        kind = os.environ.get("KALENDER_STORAGE", "json").strip().lower()
        if kind not in _BACKENDS:
            raise RuntimeError(f"Unknown KALENDER_STORAGE={kind!r} (expected: {', '.join(_BACKENDS)})")
        _storage = _BACKENDS[kind]()
        log.info("Storage backend: %s", kind)
    return _storage


def set_storage(storage: Storage | None) -> None:
    """Install a backend explicitly (tests, embedding); None re-reads the environment."""
    global _storage
    _storage = storage
