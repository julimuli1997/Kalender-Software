import logging
import threading

from core.storage import get_storage

log = logging.getLogger("kalender")

# One process-wide lock for all stored documents. Re-entrant, so a handler can hold it
# across a whole read-modify-write (`with db_lock:`) and still call read/write inside.
# Never `await` while holding it.
db_lock = threading.RLock()


def read_json(filename):
    """Load a document through the active storage backend (JSON files or MySQL, see core.storage)."""
    with db_lock:
        return get_storage().read(filename)


def read_list(filename) -> list:
    """read_json for files that must hold a list (anything else counts as empty)."""
    data = read_json(filename)
    return data if isinstance(data, list) else []


def read_dict(filename) -> dict:
    """read_json for files that must hold an object (anything else counts as empty)."""
    data = read_json(filename)
    return data if isinstance(data, dict) else {}


def write_json(filename, data):
    with db_lock:
        get_storage().write(filename, data)
