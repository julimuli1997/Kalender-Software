import json
import logging
import os
import threading
import time

log = logging.getLogger("kalender")

# One process-wide lock for all JSON files. Re-entrant, so a handler can hold it
# across a whole read-modify-write (`with db_lock:`) and still call read/write inside.
# Never `await` while holding it.
db_lock = threading.RLock()


def read_json(filename):
    with db_lock:
        if not os.path.exists(filename):
            return []
        try:
            with open(filename, "r", encoding="utf-8") as f:
                return json.load(f)
        except ValueError:
            # Corrupt file: move it aside instead of letting the next write silently
            # replace it with an empty list. The data stays recoverable by hand.
            backup = f"{filename}.corrupt-{int(time.time())}"
            os.replace(filename, backup)
            log.error("%s is not valid JSON, moved to %s", filename, backup)
            return []


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
        # Write to a temp file and swap it in, so a crash mid-write cannot truncate the real file.
        tmp = f"{filename}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, filename)
