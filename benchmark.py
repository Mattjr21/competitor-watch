"""Ethnic benchmark profiles and national price ranking."""

import json
import os
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
PROFILES_PATH = os.path.join(ROOT, "benchmark_profiles.json")
DATA_DIR = os.path.join(ROOT, "data")
NATIONAL_TTL = 60 * 60 * 12  # 12 hours


def load_benchmark_catalog():
    try:
        with open(PROFILES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"default_profile": "latino", "profiles": {}}


def list_profiles():
    cat = load_benchmark_catalog()
    profiles = cat.get("profiles") or {}
    return [
        {
            "id": pid,
            "label": p.get("label", pid),
            "description": p.get("description", ""),
            "preset_count": len(p.get("area_presets") or []),
        }
        for pid, p in profiles.items()
    ]


def resolve_profile(profile_id=None):
    """Return active profile dict + id."""
    cat = load_benchmark_catalog()
    profiles = cat.get("profiles") or {}
    default_id = cat.get("default_profile", "latino")
    pid = profile_id if profile_id in profiles else default_id
    if pid not in profiles:
        return None, default_id
    p = profiles[pid]
    return {
        "id": pid,
        "label": p.get("label", pid),
        "description": p.get("description", ""),
        "merchants": [m.lower() for m in p.get("merchants", [])],
        "area_presets": p.get("area_presets", []),
        "trending_zips": p.get("trending_zips", []),
        "national_benchmark_zips": p.get("national_benchmark_zips", []),
    }, pid


def _national_cache_path(profile_id):
    return os.path.join(DATA_DIR, f"national_benchmark_{profile_id}.json")


def read_national_cache(profile_id):
    path = _national_cache_path(profile_id)
    if not os.path.exists(path):
        return None
    if time.time() - os.path.getmtime(path) > NATIONAL_TTL:
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def write_national_cache(profile_id, obj):
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(_national_cache_path(profile_id), "w", encoding="utf-8") as f:
            json.dump(obj, f, indent=2)
    except Exception:
        pass


def gather_national_benchmarks(cfg, profile, gather_category_fn, market_price_stats_fn, refresh=False):
    """Scan national ZIPs per category; cached 12h."""
    pid = profile["id"]
    if not refresh:
        cached = read_national_cache(pid)
        if cached is not None:
            return cached

    zips = profile.get("national_benchmark_zips") or []
    merchants = profile.get("merchants") or []
    cfilter = cfg.get("competitor_filter") or []
    by_cat = {}

    for cat in cfg.get("categories", []):
        deals = []
        for z in zips:
            deals.extend(gather_category_fn(cat, [z], cfilter, merchants))
        stats = market_price_stats_fn(deals)
        if stats:
            by_cat[cat["key"]] = {
                **stats,
                "label": cat["label"],
                "ad_count": len([d for d in deals if isinstance(d.get("price"), (int, float))]),
            }

    result = {
        "profile_id": pid,
        "profile_label": profile.get("label"),
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
        "scanned_zips": zips,
        "categories": by_cat,
    }
    write_national_cache(pid, result)
    return result


def _national_score(own_avg, benchmark):
    if own_avg is None or not benchmark:
        return None, "no_data", None
    low = benchmark.get("low")
    median = benchmark.get("median")
    if low is None:
        return None, "no_data", None
    if own_avg <= low * 1.03:
        return 95, "national_leader", 0.0
    if median and own_avg <= median:
        gap = round(100 * (own_avg - low) / low, 1) if low else None
        score = max(55, 90 - int(30 * (own_avg - low) / max(median - low, 0.01)))
        return score, "competitive", gap
    gap = round(100 * (own_avg - low) / low, 1) if low else None
    score = max(10, 50 - int(min(gap or 0, 40)))
    return score, "above_national", gap


def build_national_ranking(price_comparison, national_benchmark, facts):
    """Rank your shelf prices vs national ethnic benchmark markets."""
    nat_cats = (national_benchmark or {}).get("categories") or {}
    has_upload = not (facts.get("source_label") or "").lower().startswith("default")
    rows = []

    for pc in price_comparison or []:
        key = pc.get("key")
        nat = nat_cats.get(key)
        own = pc.get("own_avg")
        local = pc.get("market") or {}
        score, band, gap_nat = _national_score(own, nat)

        rows.append(
            {
                "key": key,
                "label": pc.get("label"),
                "own_avg": own,
                "local_low": local.get("low"),
                "local_median": local.get("median"),
                "national_low": nat.get("low") if nat else None,
                "national_median": nat.get("median") if nat else None,
                "national_cheapest": nat.get("cheapest_merchant") if nat else None,
                "local_position": pc.get("position"),
                "national_band": band,
                "national_score": score,
                "gap_vs_national_low_pct": gap_nat,
                "has_upload": has_upload,
            }
        )

    scored = [r for r in rows if r.get("national_score") is not None]
    scored.sort(key=lambda r: r["national_score"], reverse=True)
    for i, r in enumerate(scored):
        r["national_rank"] = i + 1

    overall = None
    if scored:
        overall = round(sum(r["national_score"] for r in scored) / len(scored))

    leaders = sum(1 for r in rows if r.get("national_band") == "national_leader")
    competitive = sum(1 for r in rows if r.get("national_band") == "competitive")

    return {
        "profile_id": (national_benchmark or {}).get("profile_id"),
        "profile_label": (national_benchmark or {}).get("profile_label"),
        "generated_at": (national_benchmark or {}).get("generated_at"),
        "scanned_zips": (national_benchmark or {}).get("scanned_zips") or [],
        "overall_score": overall,
        "categories_ranked": len(scored),
        "national_leaders": leaders,
        "competitive_count": competitive,
        "requires_upload": not has_upload,
        "rows": rows,
        "note": (
            "Scores compare your uploaded shelf averages to the lowest advertised prices "
            "across national benchmark ZIPs for this store type. 90+ = at or near national low."
        ),
    }
