"""Persisted integration provider choice, credentials, and sync status."""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTEGRATION_PATH = os.path.join(ROOT, "data", "integration.json")


def load_integration_state():
    default = {
        "provider": "odoo",
        "credentials": {},
        "last_sync_at": None,
        "last_sync_status": None,
        "last_sync_error": None,
        "last_source_label": None,
    }
    if not os.path.exists(INTEGRATION_PATH):
        return default
    try:
        with open(INTEGRATION_PATH, "r", encoding="utf-8") as f:
            stored = json.load(f)
        default.update(stored)
        default.setdefault("credentials", {})
    except Exception:
        pass
    return default


def save_integration_state(state):
    os.makedirs(os.path.dirname(INTEGRATION_PATH), exist_ok=True)
    with open(INTEGRATION_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def get_credentials(provider_id):
    state = load_integration_state()
    return (state.get("credentials") or {}).get(provider_id) or {}
