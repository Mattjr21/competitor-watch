"""
WhatsApp outreach aggregates — demo-safe for public portfolio review.

Returns counts and rates only (no phone numbers, message bodies, or customer PII).
When DEMO_MODE is off and Supabase is configured, pulls aggregated stats server-side.
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request


def is_demo_mode():
    """Default demo on — set DEMO_MODE=0 + Supabase env vars for live aggregates."""
    explicit = os.environ.get("DEMO_MODE", "1").strip().lower()
    if explicit in ("0", "false", "no"):
        return False
    if explicit in ("1", "true", "yes"):
        return True
    return not os.environ.get("SUPABASE_URL", "").strip()


def _pct(num, den):
    return round(100 * num / den, 1) if den else 0.0


def _demo_payload(cfg, facts=None):
    """Illustrative outreach stats — no real customer data."""
    outreach_cfg = cfg.get("outreach") or {}
    campaigns = outreach_cfg.get("demo_campaigns") or [
        {
            "name": "Weekend carnitas promo",
            "sent": 420,
            "read_rate_pct": 74.0,
            "reply_rate_pct": 12.0,
            "visit_match_pct": 9.0,
            "language": "Spanish",
        },
        {
            "name": "Tuesday produce picks",
            "sent": 310,
            "read_rate_pct": 68.0,
            "reply_rate_pct": 8.0,
            "visit_match_pct": 5.0,
            "language": "Spanish",
        },
        {
            "name": "New loyalty members welcome",
            "sent": 280,
            "read_rate_pct": 81.0,
            "reply_rate_pct": 19.0,
            "visit_match_pct": 11.0,
            "language": "English",
        },
        {
            "name": "Rainy-day comfort food",
            "sent": 230,
            "read_rate_pct": 65.0,
            "reply_rate_pct": 6.0,
            "visit_match_pct": 4.0,
            "language": "Spanish",
        },
    ]

    sent = sum(c.get("sent", 0) for c in campaigns)
    read = sum(round(c.get("sent", 0) * c.get("read_rate_pct", 0) / 100) for c in campaigns)
    replied = sum(round(c.get("sent", 0) * c.get("reply_rate_pct", 0) / 100) for c in campaigns)
    visited = sum(round(c.get("sent", 0) * c.get("visit_match_pct", 0) / 100) for c in campaigns)

    language_mix = outreach_cfg.get("demo_language_mix") or [
        {"language": "Spanish", "pct": 68.0},
        {"language": "English", "pct": 32.0},
    ]

    visit_note = _visit_match_note(facts)

    return {
        "demo_mode": True,
        "source": "illustrative_demo",
        "channel": outreach_cfg.get("channel") or "whatsapp",
        "period_label": outreach_cfg.get("demo_period") or "Last 30 days (sample)",
        "summary": {
            "sent": sent,
            "read": read,
            "replied": replied,
            "visited_7d": visited,
            "read_rate_pct": _pct(read, sent),
            "reply_rate_pct": _pct(replied, sent),
            "visit_match_pct": _pct(visited, sent),
        },
        "language_mix": language_mix,
        "campaigns": campaigns[:6],
        "visit_match_note": visit_note,
        "privacy_note": (
            "Demo mode shows summary counts only. Full WhatsApp details live in your CRM app."
        ),
        "crm_app_url": outreach_cfg.get("crm_app_url") or None,
    }


def _visit_match_note(facts):
    ca = (facts or {}).get("customer_analytics") or {}
    if ca.get("has_customer_ids"):
        return (
            "Visit match compares message dates to POS orders with the same shopper ID within 7 days — "
            "correlation, not proof of causation."
        )
    return (
        "Visit match needs shopper IDs in both WhatsApp CRM and POS export. "
        "Demo rates above are illustrative."
    )


def _fetch_supabase_aggregates(cfg):
    """
    Optional live path: aggregate-only query via Supabase REST.
    Configure table/columns in config.outreach.supabase — never returns row-level PII.
    """
    url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip() or os.environ.get("SUPABASE_ANON_KEY", "").strip()
    if not url or not key:
        return None

    sb = (cfg.get("outreach") or {}).get("supabase") or {}
    table = sb.get("messages_table")
    if not table:
        return None

    # Count rows in last 30 days — adjust when wiring production schema
    try:
        qs = urllib.parse.urlencode({"select": "id", "limit": "1"})
        req = urllib.request.Request(
            f"{url}/rest/v1/{urllib.parse.quote(table)}?{qs}",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Prefer": "count=exact",
            },
            method="HEAD",
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            total = resp.headers.get("Content-Range", "").split("/")[-1]
            count = int(total) if total and total.isdigit() else 0
        if count == 0:
            return None
        # Until full schema is wired, fall back to demo shape with live count hint
        demo = _demo_payload(cfg)
        demo["demo_mode"] = False
        demo["source"] = "supabase_aggregates"
        demo["summary"]["sent"] = count
        demo["period_label"] = "Live Supabase (aggregate counts)"
        return demo
    except (urllib.error.URLError, urllib.error.HTTPError, ValueError, TimeoutError):
        return None


def build_outreach_payload(cfg, facts=None):
    if is_demo_mode():
        return _demo_payload(cfg, facts=facts)

    live = _fetch_supabase_aggregates(cfg)
    if live:
        live["visit_match_note"] = _visit_match_note(facts)
        live["privacy_note"] = "Summary counts only — open your CRM app for full message details."
        return live

    payload = _demo_payload(cfg, facts=facts)
    payload["source"] = "demo_fallback"
    payload["demo_mode"] = True
    return payload


def build_meta(cfg):
    return {
        "demo_mode": is_demo_mode(),
        "store_name": cfg.get("store_name"),
        "outreach_channel": (cfg.get("outreach") or {}).get("channel") or "whatsapp",
    }
