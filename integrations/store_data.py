"""
Orchestrate store-data sync: Odoo API, CSV bundle, future POS adapters.
"""

import time

import sales
from integrations import csv_bundle, odoo
from integrations.providers import CSV_FILE_TYPES, get_provider, list_providers, provider_fields
from integrations.state import get_credentials, load_integration_state, save_integration_state

SECRET_KEYS = {"api_key", "password", "access_token", "client_secret"}


def build_status_payload():
    state = load_integration_state()
    pid = state.get("provider") or "odoo"
    provider = get_provider(pid) or get_provider("odoo")
    return {
        "provider": pid,
        "providers": list_providers(),
        "provider_fields": {p["id"]: provider_fields(p["id"]) for p in list_providers() if p.get("mode") == "api"},
        "csv_file_types": CSV_FILE_TYPES,
        "last_sync_at": state.get("last_sync_at"),
        "last_sync_status": state.get("last_sync_status"),
        "last_sync_error": state.get("last_sync_error"),
        "last_source_label": state.get("last_source_label"),
        "connection": {
            "odoo": odoo.public_connection(),
        },
        "active_provider": provider,
    }


def set_provider(provider_id):
    p = get_provider(provider_id)
    if not p:
        raise ValueError(f"Unknown provider: {provider_id}")
    if not p.get("available"):
        raise ValueError(f"{p['label']} is not enabled yet — use Odoo or CSV for now.")
    state = load_integration_state()
    state["provider"] = provider_id
    save_integration_state(state)
    return build_status_payload()


def save_credentials(provider_id, payload):
    p = get_provider(provider_id)
    if not p:
        raise ValueError(f"Unknown provider: {provider_id}")
    if p.get("mode") != "api":
        raise ValueError(f"{p['label']} does not use API credentials.")

    fields = provider_fields(provider_id)
    state = load_integration_state()
    existing = (state.get("credentials") or {}).get(provider_id) or {}
    creds = dict(existing)

    for field in fields:
        key = field["key"]
        val = payload.get(key)
        if val is None or (isinstance(val, str) and not val.strip()):
            if field.get("secret") and creds.get(key):
                continue
            if field.get("required") and not (field.get("secret") and creds.get(key)):
                raise ValueError(f"{field['label']} is required.")
            continue
        creds[key] = val.strip() if isinstance(val, str) else val

    for field in fields:
        if not field.get("required"):
            continue
        if field.get("secret") and not creds.get(field["key"]):
            raise ValueError(f"{field['label']} is required.")
        if not field.get("secret") and creds.get(field["key"]) in (None, ""):
            raise ValueError(f"{field['label']} is required.")

    state.setdefault("credentials", {})[provider_id] = creds
    state["provider"] = provider_id
    save_integration_state(state)
    return build_status_payload()


def test_connection(provider_id=None):
    pid = provider_id or load_integration_state().get("provider") or "odoo"
    if pid == "odoo":
        return odoo.test_connection()
    p = get_provider(pid)
    if not p or not p.get("available"):
        raise ValueError(f"{p['label'] if p else pid} API is not enabled yet.")
    raise ValueError(f"{p['label']} test connection is not implemented yet.")


def _facts_label(facts, meta, prefix):
    orders = facts.get("orders", 0)
    rev = facts.get("total_revenue", 0)
    src = meta.get("source", prefix)
    return f"{src} ({orders:,} orders, ${rev:,.0f})"


def analyze_from_lines(lines, cfg, meta=None):
    extra = dict(meta or {})
    extra["loaded_at"] = time.strftime("%Y-%m-%d %H:%M")
    extra.setdefault("combo_keywords", cfg.get("combo_keywords") or [])
    return sales.analyze_lines(
        lines,
        cfg["categories"],
        cfg.get("weather_categories"),
        store_location=cfg.get("store_location"),
        zip_centroids=cfg.get("zip_centroids"),
        extra=extra,
    )


def ingest_csv_bundle(files, cfg):
    lines, meta = csv_bundle.build_lines_from_bundle(files)
    facts = analyze_from_lines(lines, cfg, meta)
    label = _facts_label(facts, meta, "CSV bundle")
    return facts, label, meta


def ingest_single_csv(csv_text, cfg, filename="uploaded sales data"):
    lines = sales.lines_from_csv(csv_text)
    meta = {"source": "csv", "filename": filename}
    facts = analyze_from_lines(lines, cfg, meta)
    label = f"{filename} ({facts['orders']:,} orders, ${facts['total_revenue']:,.0f})"
    return facts, label, meta


def sync_provider(cfg, provider_id=None):
    state = load_integration_state()
    pid = provider_id or state.get("provider") or "odoo"
    p = get_provider(pid)
    if not p or not p.get("available"):
        raise ValueError(f"Provider {pid} is not available.")

    try:
        if pid == "odoo":
            lines, meta = odoo.fetch_sale_lines()
            facts = analyze_from_lines(lines, cfg, meta)
            label = _facts_label(facts, meta, "Odoo sync")
        elif pid in ("square", "toast", "clover"):
            raise ValueError(f"{p['label']} integration is planned — use Odoo API or CSV upload for now.")
        else:
            raise ValueError("Sync is only for API providers. Upload CSV files for manual mode.")
        state["last_sync_at"] = time.strftime("%Y-%m-%d %H:%M")
        state["last_sync_status"] = "ok"
        state["last_sync_error"] = None
        state["last_source_label"] = label
        state["provider"] = pid
        save_integration_state(state)
        return facts, label, meta
    except Exception as e:
        state["last_sync_at"] = time.strftime("%Y-%m-%d %H:%M")
        state["last_sync_status"] = "error"
        state["last_sync_error"] = str(e)
        save_integration_state(state)
        raise
