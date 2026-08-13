import json
import os

def read_json(filename):
    if not os.path.exists(filename):
        return []
    with open(filename, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return []

def write_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
