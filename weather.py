"""
Weather forecast for store location.
Primary: US National Weather Service (weather.gov) — free, no key, reliable.
Fallback: wttr.in by ZIP, then Open-Meteo.
"""

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict

CACHE_TTL = 60 * 60 * 6
STALE_OK = 60 * 60 * 48
NWS_UA = "CompetitorWatch/1.0 (La Bodega Supermarket; Calhoun GA; github.com/Mattjr21/competitor-watch)"


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


def _build_day(date, label, tmax, tmin, rain_p, rain_mm, weather_text, source):
    profile = _classify_day(tmax, tmin, rain_p, rain_mm)
    mults, push, skip, note = _multipliers(profile)
    return {
        "date": date,
        "label": label,
        "temp_high_f": round(tmax, 1) if tmax is not None else None,
        "temp_low_f": round(tmin, 1) if tmin is not None else None,
        "rain_prob_pct": rain_p or 0,
        "rain_mm": rain_mm or 0,
        "weather": weather_text or "Mixed",
        "profile": profile,
        "multipliers": mults,
        "push_categories": push,
        "skip_categories": skip,
        "playbook_note": note,
        "source": source,
    }


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


def _write_cache(cache_path, days, stale=False, source=""):
    if not cache_path:
        return
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump({"_epoch": time.time(), "days": days, "stale": stale, "source": source}, f)
    except Exception:
        pass


def _nws_headers():
    return {"User-Agent": NWS_UA, "Accept": "application/geo+json"}


def _days_from_nws(loc):
    lat = loc.get("latitude", 34.5037)
    lon = loc.get("longitude", -84.9510)
    pts_url = f"https://api.weather.gov/points/{lat},{lon}"
    req = urllib.request.Request(pts_url, headers=_nws_headers())
    with urllib.request.urlopen(req, timeout=20) as r:
        pts = json.loads(r.read().decode("utf-8"))
    forecast_url = pts["properties"]["forecast"]
    req2 = urllib.request.Request(forecast_url, headers=_nws_headers())
    with urllib.request.urlopen(req2, timeout=20) as r:
        fc = json.loads(r.read().decode("utf-8"))

    by_date = OrderedDict()
    for p in fc["properties"]["periods"]:
        date = p["startTime"][:10]
        slot = by_date.setdefault(date, {
            "highs": [], "lows": [], "text": [], "rain": [],
        })
        if p.get("isDaytime"):
            slot["highs"].append(p["temperature"])
            slot["text"].append(p.get("shortForecast", ""))
        else:
            slot["lows"].append(p["temperature"])
        pop = p.get("probabilityOfPrecipitation") or {}
        if pop.get("value") is not None:
            slot["rain"].append(pop["value"])

    days = []
    labels = ["Today", "Tomorrow", "Day after"]
    for i, (date, slot) in enumerate(list(by_date.items())[:3]):
        tmax = max(slot["highs"]) if slot["highs"] else (max(slot["lows"]) if slot["lows"] else None)
        tmin = min(slot["lows"]) if slot["lows"] else (min(slot["highs"]) if slot["highs"] else None)
        rain_p = max(slot["rain"]) if slot["rain"] else 0
        text = slot["text"][0] if slot["text"] else "Forecast"
        days.append(_build_day(date, labels[i] if i < 3 else date, tmax, tmin, rain_p, 0, text, "NWS"))
    return days


def _days_from_wttr(loc):
    """wttr.in JSON by ZIP — simple fallback."""
    z = loc.get("zip", "30701")
    url = f"https://wttr.in/{z}?format=j1"
    req = urllib.request.Request(url, headers={"User-Agent": NWS_UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        data = json.loads(r.read().decode("utf-8"))
    days = []
    labels = ["Today", "Tomorrow", "Day after"]
    for i, w in enumerate((data.get("weather") or [])[:3]):
        max_c = int(w.get("maxtempF") or w.get("maxtempC") or 0)
        min_c = int(w.get("mintempF") or w.get("mintempC") or 0)
        if "maxtempC" in w and "maxtempF" not in w:
            max_c = round(max_c * 9 / 5 + 32)
            min_c = round(min_c * 9 / 5 + 32)
        hourly = w.get("hourly") or [{}]
        rain = 0
        for h in hourly:
            if "chanceofrain" in h:
                rain = max(rain, int(h["chanceofrain"]))
        text = (hourly[4].get("weatherDesc") or [{}])[0].get("value", "Forecast") if len(hourly) > 4 else "Forecast"
        date = w.get("date", time.strftime("%Y-%m-%d"))
        days.append(_build_day(date, labels[i], max_c, min_c, rain, 0, text, "wttr.in"))
    return days


def _days_from_openmeteo(loc):
    lat = loc.get("latitude", 34.5037)
    lon = loc.get("longitude", -84.9510)
    tz = loc.get("timezone", "America/New_York")
    params = urllib.parse.urlencode({
        "latitude": lat, "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weathercode",
        "timezone": tz, "forecast_days": 3, "temperature_unit": "fahrenheit",
    })
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": NWS_UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode("utf-8"))
    daily = data.get("daily", {})
    labels = {0: "Today", 1: "Tomorrow", 2: "Day after"}
    wmo = {0: "Clear", 61: "Rain", 63: "Rain", 80: "Showers", 95: "Thunderstorm"}
    days = []
    for i, date in enumerate((daily.get("time") or [])[:3]):
        tmax = (daily.get("temperature_2m_max") or [None])[i]
        tmin = (daily.get("temperature_2m_min") or [None])[i]
        rain_p = (daily.get("precipitation_probability_max") or [0])[i] or 0
        rain_mm = (daily.get("precipitation_sum") or [0])[i] or 0
        wcode = (daily.get("weathercode") or [0])[i]
        days.append(_build_day(
            date, labels.get(i, date), tmax, tmin, rain_p, rain_mm,
            wmo.get(wcode, "Mixed"), "Open-Meteo"
        ))
    return days


def _fetch_live(loc):
    """Try providers in order; return (days, source_name)."""
    errors = []
    for name, fn in (
        ("National Weather Service", _days_from_nws),
        ("wttr.in", _days_from_wttr),
        ("Open-Meteo", _days_from_openmeteo),
    ):
        try:
            days = fn(loc)
            if days:
                return days, name
        except Exception as e:
            errors.append(f"{name}: {e}")
    raise RuntimeError("; ".join(errors) or "all weather providers failed")


def fetch_forecast(loc, cache_path=None, refresh=False):
    """Returns (days_list, meta_dict). Never raises — stale cache or placeholder last."""
    meta = {"stale": False, "warning": "", "source": ""}

    if not refresh:
        fresh = _read_cache(cache_path, CACHE_TTL)
        if fresh and fresh.get("days"):
            meta["stale"] = bool(fresh.get("stale"))
            meta["source"] = fresh.get("source", "")
            return fresh["days"], meta

    try:
        days, source = _fetch_live(loc)
        meta["source"] = source
        _write_cache(cache_path, days, stale=False, source=source)
        return days, meta
    except Exception as e:
        meta["warning"] = f"Weather refresh failed ({e}) — showing last saved forecast."

    stale = _read_cache(cache_path, STALE_OK)
    if stale and stale.get("days"):
        meta["stale"] = True
        meta["source"] = stale.get("source", "cache")
        return stale["days"], meta

    meta["warning"] = meta["warning"] or "Weather temporarily unavailable."
    meta["stale"] = True
    return [_build_day(
        time.strftime("%Y-%m-%d"), "Today", 75, 60, 20, 0,
        "Unavailable — add events manually; run normal weekend mix",
        "fallback",
    )], meta
