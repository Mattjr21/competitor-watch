"""
Weather forecast for store location via Open-Meteo (free, no API key).
Returns today + next 2 days with category-level playbook multipliers.
"""

import json
import time
import urllib.parse
import urllib.request

CACHE_TTL = 60 * 60 * 3  # 3 hours

WMO_LABELS = {
    0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Fog", 51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
    61: "Rain", 63: "Rain", 65: "Heavy rain", 71: "Snow", 73: "Snow",
    80: "Showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorm",
}


def _classify_day(temp_max, temp_min, rain_prob, rain_mm):
    """Return weather profile: hot_grill, rain_comfort, cold_comfort, mild."""
    if rain_prob >= 50 or (rain_mm or 0) >= 5:
        return "rain_comfort"
    if temp_max is not None and temp_max >= 82:
        return "hot_grill"
    if temp_max is not None and temp_max <= 50:
        return "cold_comfort"
    if temp_max is not None and temp_max >= 70 and (rain_prob or 0) < 30:
        return "hot_grill"
    return "mild"


def _multipliers(profile):
    """Category multipliers for each weather profile."""
    base = {k: 1.0 for k in (
        "grocery", "meat", "produce", "deli", "hot_food", "frozen", "desserts", "snacks"
    )}
    if profile == "hot_grill":
        base.update({
            "meat": 1.25, "produce": 1.15, "snacks": 1.2, "frozen": 1.3,
            "grocery": 1.05, "hot_food": 0.95, "desserts": 1.05, "deli": 1.0,
        })
        push = ["meat", "produce", "frozen", "snacks"]
        skip = ["hot_food"]
        note = "Grill weather — push carne, charcoal-adjacent drinks, ice, cold drinks, fresh produce."
    elif profile == "rain_comfort":
        base.update({
            "hot_food": 1.3, "grocery": 1.15, "deli": 1.1, "desserts": 1.1,
            "meat": 0.9, "produce": 0.95, "frozen": 0.85, "snacks": 1.05,
        })
        push = ["hot_food", "grocery", "deli"]
        skip = ["frozen"]
        note = "Rain day — push caldo/soup, prepared hot food, comfort groceries; ease off grill items."
    elif profile == "cold_comfort":
        base.update({
            "hot_food": 1.25, "grocery": 1.15, "deli": 1.1, "desserts": 1.1,
            "meat": 1.05, "frozen": 0.9, "produce": 1.0, "snacks": 1.0,
        })
        push = ["hot_food", "grocery", "meat"]
        skip = ["frozen"]
        note = "Cool day — push hot prepared food, stew cuts, caldo, warm comfort items."
    else:
        push = ["meat", "produce", "grocery"]
        skip = []
        note = "Mild day — run your normal mix; meat + produce as anchors."
    return base, push, skip, note


def fetch_forecast(loc, cache_path=None, refresh=False):
    """
    loc: dict with latitude, longitude, timezone
    Returns list of 3 day dicts with weather + playbooks.
    """
    lat = loc.get("latitude", 34.5037)
    lon = loc.get("longitude", -84.9510)
    tz = loc.get("timezone", "America/New_York")

    if cache_path and not refresh:
        try:
            import os
            if os.path.exists(cache_path):
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                if time.time() - cached.get("_epoch", 0) < CACHE_TTL:
                    return cached.get("days", [])
        except Exception:
            pass

    params = urllib.parse.urlencode({
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weathercode",
        "timezone": tz,
        "forecast_days": 3,
        "temperature_unit": "fahrenheit",
    })
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "CompetitorWatch/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode("utf-8"))

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    days = []
    for i, date in enumerate(dates[:3]):
        tmax = (daily.get("temperature_2m_max") or [None])[i]
        tmin = (daily.get("temperature_2m_min") or [None])[i]
        rain_p = (daily.get("precipitation_probability_max") or [0])[i] or 0
        rain_mm = (daily.get("precipitation_sum") or [0])[i] or 0
        wcode = (daily.get("weathercode") or [0])[i]
        profile = _classify_day(tmax, tmin, rain_p, rain_mm)
        mults, push, skip, note = _multipliers(profile)
        days.append({
            "date": date,
            "label": "Today" if i == 0 else ("Tomorrow" if i == 1 else "Day after"),
            "temp_high_f": round(tmax, 1) if tmax is not None else None,
            "temp_low_f": round(tmin, 1) if tmin is not None else None,
            "rain_prob_pct": rain_p,
            "rain_mm": rain_mm,
            "weather": WMO_LABELS.get(wcode, "Mixed"),
            "profile": profile,
            "multipliers": mults,
            "push_categories": push,
            "skip_categories": skip,
            "playbook_note": note,
        })

    if cache_path:
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump({"_epoch": time.time(), "days": days}, f)
        except Exception:
            pass
    return days
