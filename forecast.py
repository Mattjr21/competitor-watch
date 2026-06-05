"""
Daily category sales targets = day-of-week baseline × weather × local events.
"""

import datetime
import re


def _parse_date(s):
    if not s:
        return None
    s = str(s).strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%b %d", "%B %d"):
        try:
            d = datetime.datetime.strptime(s, fmt)
            return d.replace(year=datetime.date.today().year).date()
        except Exception:
            continue
    # "Jun 7" style without year
    m = re.search(
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})",
        s, re.I
    )
    if m:
        try:
            d = datetime.datetime.strptime(f"{m.group(1)} {m.group(2)}", "%b %d")
            return d.replace(year=datetime.date.today().year).date()
        except Exception:
            pass
    return None


def build_targets(cfg, facts, weather_days, events_payload):
    """
    Build per-day category targets for today + next 2 days.
    facts must include weather_baselines from sales.analyze().
    """
    wcats = cfg.get("weather_categories", [])
    if not wcats:
        return {"days": [], "note": "Upload sales data to enable category targets."}

    baselines = facts.get("weather_baselines") or {}
    if not baselines:
        return {
            "days": [],
            "note": "Upload sales CSV to calculate day-of-week baselines by category.",
        }

    today = datetime.date.today()
    target_dates = [today + datetime.timedelta(days=i) for i in range(3)]
    weather_by_date = {d["date"]: d for d in weather_days}
    events = events_payload.get("events", [])

    # Map events to dates
    events_by_date = {}
    for ev in events:
        ed = _parse_date(ev.get("date"))
        if ed:
            events_by_date.setdefault(ed.isoformat(), []).append(ev)

    out_days = []
    for i, tdate in enumerate(target_dates):
        iso = tdate.isoformat()
        dow = tdate.weekday()  # 0=Mon
        wday = weather_by_date.get(iso) or (weather_days[i] if i < len(weather_days) else None)
        wmults = (wday or {}).get("multipliers") or {}

        # Combine event boosts for this date
        event_mult = {c["key"]: 1.0 for c in wcats}
        day_events = events_by_date.get(iso, [])
        for ev in day_events:
            for k, v in (ev.get("boosts") or {}).items():
                event_mult[k] = max(event_mult.get(k, 1.0), v)

        categories = []
        total_base = 0.0
        total_target = 0.0
        for c in wcats:
            key = c["key"]
            base = (baselines.get(key) or {}).get(str(dow))
            if base is None:
                base = (baselines.get(key) or {}).get("avg") or 0
            wm = wmults.get(key, 1.0)
            em = event_mult.get(key, 1.0)
            target = round(base * wm * em, 0)
            reasons = []
            if wm != 1.0:
                reasons.append(f"weather ×{wm:.2f}")
            if em != 1.0:
                reasons.append(f"event ×{em:.2f}")
            categories.append({
                "key": key,
                "label": c["label"],
                "baseline": round(base, 0),
                "target": target,
                "multiplier": round(wm * em, 2),
                "why": " · ".join(reasons) if reasons else f"typical {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dow]}",
            })
            total_base += base
            total_target += target

        playbook = ""
        if wday:
            playbook = wday.get("playbook_note", "")

        out_days.append({
            "date": iso,
            "label": wday.get("label", f"Day {i}") if wday else ("Today" if i == 0 else f"+{i} days"),
            "dow": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dow],
            "weather_summary": (
                f"{wday.get('weather', '')} · {wday.get('temp_high_f', '?')}°F high · "
                f"{wday.get('rain_prob_pct', 0)}% rain"
            ) if wday else "",
            "playbook": playbook,
            "push": (wday or {}).get("push_categories", []),
            "events": [{"name": e["name"], "page": e.get("page", ""), "type": e.get("type", "")} for e in day_events],
            "categories": categories,
            "total_baseline": round(total_base, 0),
            "total_target": round(total_target, 0),
        })

    return {"days": out_days, "note": ""}
