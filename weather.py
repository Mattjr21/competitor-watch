"""
Weather forecast for store location via Open-Meteo (free, no API key).
Returns today + next 2 days with category-level playbook multipliers.
"""

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

CACHE_TTL = 60 * 60 * 6  # 6 hours fresh
STALE_OK = 60 * 60 * 48   # serve up to 48h old on rate-limit / outage

WMO_LABELS = {
    0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Fog", 51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
    61: "Rain", 63: "Rain", 65: "Heavy rain", 71: "Snow", 73: "Snow",
    80: "Showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorm",
}


def _classify_day(temp_max, temp_min, rain_prob, rain_mm):
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


def _read_cache(cache_path, max_age):
    if not cache_path or not os.path.exists(cache_path):
        return None
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            cached = json.load(f)
        if time.time() - cached.get("_epoch", 0) < max_age:
            return cached
    except Exception:
        pass
    return None


def _write_cache(cache_path, days, stale=False):
    if not cache_path:
        return
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump({
                "_epoch": time.time(),
                "days": days,
                "stale": stale,
            }, f)
    except Exception:
        pass


def _days_from_api(loc):
    lat = loc.get("latitude", 34.5037)
    lon = loc.get("longitude", -84.9510)
    tz = loc.get("timezone", "America/New_York")
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
    return days


def fetch_forecast(loc, cache_path=None, refresh=False):
    """
    loc: dict with latitude, longitude, timezone
    Returns (days_list, meta_dict).
    On 429/outage returns stale cache instead of raising.
    """
    meta = {"stale": False, "warning": ""}

    if not refresh:
        fresh = _read_cache(cache_path, CACHE_TTL)
        if fresh and fresh.get("days"):
            meta["stale"] = bool(fresh.get("stale"))
            return fresh["days"], meta

    try:
        days = _days_from_api(loc)
        _write_cache(cache_path, days, stale=False)
        return days, meta
    except urllib.error.HTTPError as e:
        if e.code == 429:
            meta["warning"] = "Weather API busy — showing last saved forecast."
        else:
            meta["warning"] = f"Weather API error ({e.code}) — showing last saved forecast."
    except Exception as e:
        meta["warning"] = f"Weather unavailable — showing last saved forecast."

    stale = _read_cache(cache_path, STALE_OK)
    if stale and stale.get("days"):
        meta["stale"] = True
        return stale["days"], meta

    # Last resort: mild placeholder so UI never hard-fails
    meta["warning"] = meta["warning"] or "Weather data temporarily unavailable."
    meta["stale"] = True
    return [{
        "date": time.strftime("%Y-%m-%d"),
        "label": "Today",
        "temp_high_f": None,
        "temp_low_f": None,
        "rain_prob_pct": 0,
        "rain_mm": 0,
        "weather": "Unavailable",
        "profile": "mild",
        "multipliers": {k: 1.0 for k in (
            "grocery", "meat", "produce", "deli", "hot_food", "frozen", "desserts", "snacks"
        )},
        "push_categories": ["meat", "produce", "grocery"],
        "skip_categories": [],
        "playbook_note": "Weather feed paused (rate limit). Run normal weekend mix until refresh works.",
    }], meta
