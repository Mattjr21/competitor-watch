"""
Competitor Watch - local app for La Bodega.

Pulls live competitor weekly-ad deals from the Flipp/Wishabi backend by ZIP code,
compares them to La Bodega's own sales patterns, and generates a data-driven
"what to feature this weekend" recommendation set.

Runs on the Python standard library only - no pip installs.
Start it with:  python server.py
Then open:      http://localhost:8000
"""

import base64
import json
import os
import re
import time
import hashlib
import urllib.request
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import sales
import weather
import events as local_events
import forecast
import outreach
import benchmark
from integrations import store_data

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "frontend/dist")
CACHE_DIR = os.path.join(ROOT, "cache")
DATA_DIR = os.path.join(ROOT, "data")
CONFIG_PATH = os.path.join(ROOT, "config.json")
FACTS_PATH = os.path.join(DATA_DIR, "sales_facts.json")
TRENDING_PATH = os.path.join(DATA_DIR, "trending.json")
WEATHER_CACHE_PATH = os.path.join(DATA_DIR, "weather_cache.json")
FORECAST_CACHE_PATH = os.path.join(DATA_DIR, "forecast_cache.json")
FORECAST_CACHE_TTL = 60 * 30  # 30 min — whole payload cache
TRENDING_TTL = 60 * 60 * 12  # 12 hours

FLIPP_BASE = "https://backflipp.wishabi.com/flipp/items/search"
CACHE_TTL = 60 * 60 * 6  # 6 hours
HTTP_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

# Optional shared password for team access on a public URL.
# Set the APP_PASSWORD env var to require it; leave unset for open/local use.
APP_PASSWORD = os.environ.get("APP_PASSWORD", "").strip()

# Allowed browser origin(s) for cross-origin API calls (frontend on Vercel
# calling this backend on Render). Set ALLOWED_ORIGIN to your Vercel URL
# (e.g. https://your-app.vercel.app) to lock it down; defaults to "*".
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*").strip()

os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


def load_facts(cfg):
    """Config facts, overlaid with uploaded sales facts if present."""
    facts = dict(cfg.get("facts", {}))
    if os.path.exists(FACTS_PATH):
        try:
            with open(FACTS_PATH, "r", encoding="utf-8") as f:
                stored = json.load(f)
            facts.update(stored.get("facts", {}))
            facts["source_label"] = stored.get("source_label", "uploaded sales data")
        except Exception:
            facts.setdefault("source_label", "default (May sales analysis)")
    else:
        facts.setdefault("source_label", "default (May sales analysis)")
    return facts


def save_facts(facts, source_label):
    with open(FACTS_PATH, "w", encoding="utf-8") as f:
        json.dump({"source_label": source_label, "saved_at": time.strftime("%Y-%m-%d %H:%M"), "facts": facts}, f, indent=2)


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _cache_path(key):
    h = hashlib.md5(key.encode("utf-8")).hexdigest()
    return os.path.join(CACHE_DIR, f"{h}.json")


def _cache_get(key):
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    if time.time() - os.path.getmtime(path) > CACHE_TTL:
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _cache_put(key, value):
    try:
        with open(_cache_path(key), "w", encoding="utf-8") as f:
            json.dump(value, f)
    except Exception:
        pass


def flipp_search(term, zip_code):
    """Fetch raw items for one term + ZIP, with caching."""
    key = f"{term}|{zip_code}"
    cached = _cache_get(key)
    if cached is not None:
        return cached
    q = urllib.parse.urlencode({"q": term, "postal_code": zip_code, "locale": "en-us"})
    url = f"{FLIPP_BASE}?{q}"
    req = urllib.request.Request(url, headers=HTTP_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            data = json.loads(r.read().decode("utf-8"))
        items = data.get("items", []) or []
        _cache_put(key, items)
        return items
    except Exception as e:
        print(f"  ! flipp_search failed ({term}/{zip_code}): {e}")
        return []


def _merchant_words(name):
    return [w for w in re.split(r"[^a-z0-9]+", (name or "").lower()) if w]


def _merchant_keyword_match(merchant, keyword):
    """Match ethnic chain names without false positives (e.g. h mart vs Health Mart)."""
    m = (merchant or "").lower().strip()
    kw = (keyword or "").lower().strip()
    if not kw or not m:
        return False
    if " " in kw:
        parts = [p for p in re.split(r"[^a-z0-9]+", kw) if p]
        words = _merchant_words(m)
        if len(parts) > 1:
            for i in range(len(words) - len(parts) + 1):
                if words[i : i + len(parts)] == parts:
                    return True
            return False
    words = _merchant_words(m)
    if len(kw) <= 4:
        return kw in words
    return kw in m or kw in words


def is_latino_merchant(name, latino_list):
    return any(_merchant_keyword_match(name, kw) for kw in latino_list)


def _item_display_name(raw, item=None):
    """Flipp often omits product titles for ethnic circulars — fall back to category."""
    if item is None:
        item = {}
    for src in (item, raw):
        for key in ("name", "sale_story", "pre"):
            val = (src.get(key) if key != "pre" else src.get("pre_price_text")) or ""
            val = val.strip()
            if val:
                return val
    cat = (item.get("category_l2") or raw.get("_L2") or "").strip()
    if cat:
        return cat
    return ""


def clean_item(raw, latino_list=None, zip_code=""):
    merchant = (raw.get("merchant_name") or "Unknown").strip()
    name = (raw.get("name") or "").strip()
    return {
        "merchant": merchant,
        "name": name,
        "price": raw.get("current_price"),
        "original_price": raw.get("original_price"),
        "unit": raw.get("post_price_text") or "",
        "pre": raw.get("pre_price_text") or "",
        "sale_story": raw.get("sale_story") or "",
        "valid_to": (raw.get("valid_to") or "")[:10],
        "image": raw.get("clean_image_url") or "",
        "category_l2": raw.get("_L2") or "",
        "l1": raw.get("_L1") or "",
        "is_latino": is_latino_merchant(merchant, latino_list or []),
        "zip": zip_code,
    }


MEAT_AD_NOISE = (
    "hungry-man",
    "salisbury",
    "banquet ",
    "marie callender",
    "tv dinner",
    "hot pocket",
    "dog food",
    "cat food",
    "pet food",
    "breaded",
    "battered",
    " nugget",
    "popcorn chicken",
    "chicken patty",
    "chicken burger",
    "chicken sausage",
    "piece baked",
    "rotisserie",
    "fully cooked",
    "precooked",
    "pre-cooked",
    " beef patty",
    " beef burger",
    " beef slider",
    "frozen patty",
    "frozen patties",
    "marinated pork",
    "marinated filet",
    "breakfast sausage",
    "smoked sausage",
    " bacon",
)


def _is_meat_ad_noise(name):
    n = (name or "").lower()
    return any(bad in n for bad in MEAT_AD_NOISE)


def gather_category(cat, zips, competitor_filter, latino_list):
    """Aggregate, dedupe and sort deals for one category across all ZIPs."""
    seen = set()
    out = []
    filter_meat_noise = cat.get("key") == "meat"
    for term in cat["terms"]:
        for z in zips:
            for raw in flipp_search(term, z):
                item = clean_item(raw, latino_list, z)
                if filter_meat_noise and _is_meat_ad_noise(item["name"]):
                    continue
                if competitor_filter and item["merchant"] not in competitor_filter:
                    continue
                if item["price"] is None and not item["sale_story"]:
                    continue
                dedupe_key = (item["merchant"].lower(), item["name"].lower())
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)
                out.append(item)
    # Sort: priced items ascending by price first, then story-only deals
    out.sort(key=lambda i: (i["price"] is None, i["price"] if i["price"] is not None else 9e9))
    return out


# Positive food signals in Flipp's category labels.
FOOD_CAT = (
    "food", "grocery", "meat", "seafood", "poultry", "produce", "dairy",
    "deli", "bakery", "beverage", "drink", "snack", "pantry", "frozen",
    "fruit", "vegetable", "cheese",
)
# Obvious non-grocery items that still match grocery search terms.
NONFOOD_NAME = (
    "cutlery", "knife", "knives", "firewood", "plastic", "towel", "detergent",
    "bounce", "downy", "febreze", "tool", "tire", "plate", "plates", "cup",
    "napkin", "battery", "light", "ammo", "tackle", "rod", "tarp", "blanket",
    "pillow", "apparel", "shirt", "sock", "shoe", "shoes", "toy", "game", "jean",
    "jeans", "levi", "lotion", "candle", "perfume", "fragrance", "body works",
    "cookware", "skillet", "fry pan", "cast iron", "non-stick", "nonstick",
    "pots", "pan ", "pan,", "espresso", "coffee maker", "greenpan", "t-fal",
)


def _has_nonfood(item):
    name = (item.get("name") or "").lower()
    if not name:
        return False
    return any(bad in name for bad in NONFOOD_NAME)


def _food_cat_match(item):
    label = (item["l1"] + " " + item["category_l2"]).lower()
    return any(f in label for f in FOOD_CAT)


def gather_combos(cfg, zips, latino_list, search_terms=None, profile_id="latino"):
    """Find combo / multi-buy / weekend-pack style deals (food only)."""
    combo_kw = [k.lower() for k in cfg.get("combo_keywords", [])]
    search_terms = search_terms or cfg.get("combo_search_terms") or [
        "combo", "paquete", "fin de semana", "family pack", "carne asada",
    ]
    seen = {}
    for term in search_terms:
        for z in zips:
            for raw in flipp_search(term, z):
                item = clean_item(raw, latino_list, z)
                hay = (item["name"] + " " + item["sale_story"]).lower()
                if not any(k in hay for k in combo_kw):
                    continue
                # reject obvious non-food packs by name
                if _has_nonfood(item):
                    continue
                # keep grocery combos, or any deal from a Latino grocer
                if not (_food_cat_match(item) or _merchant_matches_profile(
                    item["merchant"], latino_list, profile_id, item.get("is_latino")
                )):
                    continue
                key = (item["merchant"].lower(), item["name"].lower())
                if key in seen:
                    if z not in seen[key]["zips"]:
                        seen[key]["zips"].append(z)
                    continue
                item["zips"] = [z]
                seen[key] = item
    out = list(seen.values())
    out.sort(
        key=lambda i: (
            not _merchant_matches_profile(i["merchant"], latino_list, profile_id, i.get("is_latino")),
            i["price"] is None,
            i["price"] if i["price"] is not None else 9e9,
        )
    )
    return out[:60]


def cheapest_priced(deals):
    priced = [d for d in deals if isinstance(d.get("price"), (int, float))]
    return priced[0] if priced else None


def market_price_stats(deals):
    """Low / median / high from priced competitor ads in a category."""
    priced = sorted(
        [float(d["price"]) for d in deals if isinstance(d.get("price"), (int, float))]
    )
    if not priced:
        return None
    mid = len(priced) // 2
    median = priced[mid] if len(priced) % 2 else (priced[mid - 1] + priced[mid]) / 2
    cheap = cheapest_priced(deals)
    return {
        "low": round(priced[0], 2),
        "median": round(median, 2),
        "high": round(priced[-1], 2),
        "count": len(priced),
        "cheapest_merchant": cheap["merchant"] if cheap else None,
        "cheapest_deal": cheap["name"] if cheap else None,
        "cheapest_unit": cheap.get("unit") if cheap else None,
    }


def build_price_comparison(cfg, deals_by_cat, facts):
    """Compare La Bodega category averages to live competitor ad prices."""
    own = facts.get("own_price_by_cat") or {}
    rows = []
    for cat in cfg["categories"]:
        key = cat["key"]
        stats = market_price_stats(deals_by_cat.get(key, []))
        own_avg = own.get(key)
        if own_avg is None and not stats:
            continue

        position = "no_data"
        gap_pct = None
        suggested = "Upload sales CSV to see your average price in this category."

        if own_avg is not None and stats:
            low = stats["low"]
            gap_pct = round(100 * (own_avg - low) / low, 1) if low else None
            if own_avg <= low * 1.03:
                position = "competitive"
                suggested = f"You are at or below the market floor (${low}). Hold price; promote availability."
            elif own_avg <= stats["median"] * 1.05:
                position = "mid_market"
                suggested = (
                    f"Near market median (${stats['median']}). Match weekend ads on {stats['cheapest_merchant']} "
                    f"or bundle with high-margin add-ons."
                )
            else:
                position = "above_market"
                suggested = (
                    f"Above market low by {gap_pct}%+. Consider a weekend-only promo near ${low} "
                    f"or highlight quality/freshness vs {stats['cheapest_merchant']}."
                )
        elif stats and own_avg is None:
            suggested = (
                f"Market low ${stats['low']} at {stats['cheapest_merchant']}. "
                "Upload sales data to compare your shelf price."
            )
        elif own_avg is not None and not stats:
            suggested = "No competitor ads this week — you set the price."

        rows.append(
            {
                "key": key,
                "label": cat["label"],
                "own_avg": own_avg,
                "market": stats,
                "position": position,
                "gap_vs_low_pct": gap_pct,
                "suggested_action": suggested,
            }
        )
    return rows


def build_segment_deal_suggestions(cfg, deals_by_cat, facts, recommendations):
    """Tailor week vs weekend promos — capped, deduped, segment-first."""
    ca = facts.get("customer_analytics") or {}
    attach = facts.get("attach_rates_pct") or {}
    suggestions = {"weekday": [], "weekend": []}
    seen_titles = set()

    def _title_key(title):
        return (title or "").lower().strip()[:80]

    def _add(bucket, item):
        key = _title_key(item.get("title"))
        if not key or key in seen_titles:
            return
        seen_titles.add(key)
        suggestions[bucket].append(item)

    wd = facts.get("weekday_rev_per_day") or 0
    we = facts.get("weekend_rev_per_day") or 0
    if wd and we and we > wd * 1.2:
        _add(
            "weekday",
            {
                "segment": "All shoppers",
                "title": "2× loyalty points Tue & Wed",
                "reason": f"Weekdays earn ${wd:,.0f}/day vs ${we:,.0f} on weekends — pull trips midweek.",
                "action": "Run double points on slow days; keep meat promos for Sat/Sun.",
            },
        )

    for tier in ca.get("loyalty_tiers") or []:
        if tier["key"] == "new":
            _add(
                "weekend",
                {
                    "segment": tier["label"],
                    "title": "Welcome bundle on first meat purchase",
                    "reason": f"{tier['pct']}% of identified shoppers are one-time visitors.",
                    "action": "Sat/Sun: free salsa or tortillas with first $40+ meat basket.",
                },
            )
        elif tier["key"] in ("loyal", "champion"):
            _add(
                "weekday",
                {
                    "segment": tier["label"],
                    "title": "VIP early access on produce",
                    "reason": f"{tier['count']} shoppers averaging ${tier['avg_spend']} lifetime spend.",
                    "action": "Text Tue AM with fresh produce picks before weekend rush.",
                },
            )

    for rhythm in ca.get("rhythm_segments") or []:
        if rhythm["key"] == "weekend_primary":
            _add(
                "weekend",
                {
                    "segment": rhythm["label"],
                    "title": "Weekend taquiza pack",
                    "reason": f"{rhythm['pct']}% of customers shop mostly Sat/Sun.",
                    "action": "Bundle hero meat + tortillas + charcoal at one weekend price.",
                },
            )
        elif rhythm["key"] == "weekday_primary":
            _add(
                "weekday",
                {
                    "segment": rhythm["label"],
                    "title": "Quick dinner attach",
                    "reason": f"{rhythm['pct']}% prefer weekday trips — smaller baskets, less time.",
                    "action": "Hot food + soda combo near checkout Mon–Thu.",
                },
            )

    low_attach = sorted(
        ((k, v) for k, v in attach.items() if k != "meat"),
        key=lambda x: x[1],
    )[:1]
    for key, rate in low_attach:
        cat = next((c for c in cfg["categories"] if c["key"] == key), None)
        if not cat:
            continue
        cheap = cheapest_priced(deals_by_cat.get(key, []))
        _add(
            "weekend",
            {
                "segment": "Meat shoppers",
                "title": f"Stack {cat['label']} at the meat case",
                "reason": f"Only {rate}% attach rate — room to grow baskets.",
                "action": (
                    f"Weekend endcap + bonus points. "
                    + (
                        f"Competitors advertising {cat['label'].lower()} at ${cheap['price']}."
                        if cheap
                        else "No competitor ad — easy impulse add-on."
                    )
                ),
            },
        )

    # At most one market-driven card per bucket — skip if segment logic already filled it
    for rec in recommendations or []:
        tone = rec.get("tone")
        bucket = "weekend" if tone in ("anchor", "attach", "protect") else "weekday"
        if len(suggestions[bucket]) >= 3:
            continue
        _add(
            bucket,
            {
                "segment": rec.get("goal") or "Market-driven",
                "title": rec.get("title"),
                "reason": rec.get("plain") or rec.get("tag"),
                "action": rec.get("body", "")[:180] + ("…" if len(rec.get("body", "")) > 180 else ""),
                "from_recommendation": True,
            },
        )

    for bucket in suggestions:
        suggestions[bucket] = suggestions[bucket][:3]

    return suggestions


def gather_search(query, zips, latino_list, competitor_filter=None, latino_only=False, limit=50):
    """Search weekly ads for any product term across ZIP codes."""
    q = (query or "").strip()
    if len(q) < 2:
        return []
    seen = {}
    for z in zips:
        for raw in flipp_search(q, z):
            item = clean_item(raw, latino_list, z)
            if latino_only and not item["is_latino"]:
                continue
            if competitor_filter and item["merchant"] not in competitor_filter:
                continue
            if item["price"] is None and not item["sale_story"]:
                continue
            key = (item["merchant"].lower(), item["name"].lower())
            if key in seen:
                if z not in seen[key]["zips"]:
                    seen[key]["zips"].append(z)
                continue
            item["zips"] = [z]
            seen[key] = item
    out = list(seen.values())
    out.sort(key=lambda i: (i["price"] is None, i["price"] if i["price"] is not None else 9e9))
    return out[:limit]


_TREND_STOP = {
    "oz", "lb", "lbs", "ct", "pk", "pack", "ea", "each", "kg", "ml", "fl", "count",
    "pkg", "gal", "with", "card", "and", "the", "for", "your", "size", "value",
    "selected", "varieties", "assorted", "limit", "off", "save", "free", "buy",
}


def _norm_product(name):
    """Collapse an ad title to a coarse product key so variants group together."""
    n = (name or "").lower()
    n = re.sub(r"[0-9]+([.,][0-9]+)?", " ", n)
    n = re.sub(r"[^a-z& ]", " ", n)
    words = [w for w in n.split() if len(w) > 2 and w not in _TREND_STOP]
    return " ".join(words[:4])


def _trending_scope_key(profile_id, zips):
    z = ",".join(sorted(str(x) for x in zips))
    return hashlib.md5(f"{profile_id}|{z}|flipp-discover-v3".encode()).hexdigest()[:16]


def _trending_cache_path(scope_key):
    return os.path.join(DATA_DIR, f"trending_{scope_key}.json")


def _read_trending_cache(scope_key):
    path = _trending_cache_path(scope_key)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            obj = json.load(f)
        if time.time() - obj.get("_epoch", 0) <= TRENDING_TTL:
            return obj
    except Exception:
        pass
    return None


def _write_trending_cache(scope_key, obj):
    try:
        out = dict(obj)
        out["_epoch"] = time.time()
        with open(_trending_cache_path(scope_key), "w", encoding="utf-8") as f:
            json.dump(out, f)
    except Exception:
        pass


def _merchant_matches_profile(merchant, merchant_list, profile_id, is_latino_flag):
    if any(_merchant_keyword_match(merchant, kw) for kw in merchant_list):
        return True
    return profile_id == "latino" and bool(is_latino_flag)


MERCHANT_DISCOVERY_TTL = 60 * 60 * 24  # 24 hours


def _merchant_discovery_cache_path(scope_key):
    return os.path.join(DATA_DIR, f"flipp_merchants_{scope_key}.json")


def _read_merchant_discovery_cache(scope_key):
    path = _merchant_discovery_cache_path(scope_key)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            obj = json.load(f)
        if time.time() - obj.get("_epoch", 0) <= MERCHANT_DISCOVERY_TTL:
            return obj.get("merchants") or []
    except Exception:
        pass
    return None


def _write_merchant_discovery_cache(scope_key, merchants):
    try:
        with open(_merchant_discovery_cache_path(scope_key), "w", encoding="utf-8") as f:
            json.dump({"merchants": merchants, "_epoch": time.time()}, f)
    except Exception:
        pass


def _merchant_flipp_queries(merchant_name):
    """Build Flipp q= strings for a discovered store (exact name + short form)."""
    name = (merchant_name or "").strip()
    if not name:
        return []
    queries = [name]
    words = _merchant_words(name)
    if len(words) >= 2:
        short = " ".join(words[: min(3, len(words))])
        if short.lower() != name.lower():
            queries.append(short)
    return list(dict.fromkeys(queries))


def discover_flipp_merchants(
    profile, profile_id, zips, merchant_list, cfg, latino_list, refresh=False, scope_key=None
):
    """Find ethnic grocer names actually advertising on Flipp in selected ZIPs.

    Step 1: probe known chain seeds + product terms to learn which stores exist.
    Step 2: callers search Flipp again using these exact store names for deals.
    """
    if scope_key and not refresh:
        cached = _read_merchant_discovery_cache(scope_key)
        if cached is not None:
            return cached

    latino_list = latino_list or []
    seeds = list(
        dict.fromkeys(
            (benchmark.profile_merchant_search_terms(profile) or [])
            + [kw for kw in merchant_list if len(kw) >= 5 and " " in kw]
        )
    )
    product_terms = benchmark.profile_trending_terms(profile, cfg)[:8]
    if not product_terms:
        product_terms = (cfg.get("trending_terms") or [])[:8]

    hits = {}  # merchant_name -> ad count

    def _note(raw, zip_code):
        item = clean_item(raw, latino_list, zip_code)
        name = item["merchant"]
        if not name or name == "Unknown":
            return
        if _merchant_matches_profile(name, merchant_list, profile_id, item.get("is_latino")):
            hits[name] = hits.get(name, 0) + 1

    for seed in seeds:
        for z in zips:
            for raw in flipp_search(seed, z):
                _note(raw, z)

    for term in product_terms:
        for z in zips:
            for raw in flipp_search(term, z):
                _note(raw, z)

    merchants = [m for m, _ in sorted(hits.items(), key=lambda kv: (-kv[1], kv[0].lower()))][:16]
    if scope_key:
        _write_merchant_discovery_cache(scope_key, merchants)
    return merchants


def gather_trending(cfg, refresh=False, zips=None, profile_id=None):
    """Most-advertised products in selected ZIPs, split ethnic vs mainstream.

    Ethnic bucket uses the active benchmark profile's merchant list (e.g. Latino,
    halal, H-Mart). Mainstream = everything else in the same ZIPs.
    """
    profile, active_pid = benchmark.resolve_profile(profile_id)
    if isinstance(zips, str):
        zips = [z.strip() for z in zips.split(",") if z.strip()]
    elif zips:
        zips = [str(z).strip() for z in zips if str(z).strip()]
    elif profile and profile.get("trending_zips"):
        zips = list(profile["trending_zips"])
    else:
        zips = cfg.get("trending_zips", [])

    merchant_list = (
        profile.get("merchants")
        if profile and profile.get("merchants")
        else [k.lower() for k in cfg.get("latino_merchants", [])]
    )
    profile_label = (profile or {}).get("label") or "Latino grocery"
    scope_key = _trending_scope_key(active_pid, zips)

    if not refresh:
        cached = _read_trending_cache(scope_key)
        if cached is not None:
            return cached

    latino_list = [k.lower() for k in cfg.get("latino_merchants", [])]
    discovered_merchants = discover_flipp_merchants(
        profile,
        active_pid,
        zips,
        merchant_list,
        cfg,
        latino_list,
        refresh=refresh,
        scope_key=scope_key,
    )

    product_terms = benchmark.profile_trending_terms(profile, cfg)
    if not product_terms:
        product_terms = cfg.get("trending_terms", [])

    # Prefer discovered store names (exact Flipp spelling) over static seeds.
    merchant_queries = []
    for merchant in discovered_merchants:
        merchant_queries.extend(_merchant_flipp_queries(merchant))
    seed_terms = benchmark.profile_merchant_search_terms(profile)
    search_terms = list(dict.fromkeys(merchant_queries + seed_terms + product_terms))
    merchant_term_set = set(merchant_queries) | set(seed_terms)
    ethnic_b, main_b = {}, {}
    seen = set()
    for term in search_terms:
        from_merchant_search = term in merchant_term_set or any(
            term.lower() in m.lower() or m.lower() in term.lower() for m in discovered_merchants
        )
        for z in zips:
            for raw in flipp_search(term, z):
                item = clean_item(raw, merchant_list, z)
                display_name = _item_display_name(raw, item)
                if not display_name:
                    continue
                if _has_nonfood({**item, "name": display_name}):
                    continue
                is_ethnic = _merchant_matches_profile(
                    item["merchant"], merchant_list, active_pid, item.get("is_latino")
                )
                if from_merchant_search and is_ethnic:
                    pass  # merchant-chain search: keep ethnic bucket items
                elif not is_ethnic and not _food_cat_match(item):
                    continue
                ddk = (item["merchant"].lower(), display_name.lower(), z)
                if ddk in seen:
                    continue
                seen.add(ddk)
                key = _norm_product(display_name)
                if not key:
                    continue
                bucket = ethnic_b if is_ethnic else main_b
                e = bucket.get(key)
                if e is None:
                    e = {
                        "name": display_name[:52],
                        "count": 0,
                        "merchants": set(),
                        "areas": set(),
                        "prices": [],
                        "image": item["image"],
                    }
                    bucket[key] = e
                e["count"] += 1
                e["merchants"].add(item["merchant"])
                e["areas"].add(z)
                if isinstance(item["price"], (int, float)):
                    e["prices"].append(item["price"])

    def top(bucket, n=10):
        rows = []
        for e in bucket.values():
            rows.append(
                {
                    "name": e["name"][:52],
                    "stores": len(e["merchants"]),
                    "areas": len(e["areas"]),
                    "count": e["count"],
                    "min": round(min(e["prices"]), 2) if e["prices"] else None,
                    "max": round(max(e["prices"]), 2) if e["prices"] else None,
                    "merchants": sorted(e["merchants"])[:4],
                    "image": e["image"],
                }
            )
        rows.sort(key=lambda r: (r["areas"], r["stores"], r["count"]), reverse=True)
        return rows[:n]

    ethnic_rows = top(ethnic_b)
    result = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
        "profile_id": active_pid,
        "profile_label": profile_label,
        "scanned_zips": zips,
        "discovered_merchants": discovered_merchants,
        "ethnic": ethnic_rows,
        "mainstream": top(main_b),
        "latino": ethnic_rows,
    }
    _write_trending_cache(scope_key, result)
    return result


def _meat_cut(name):
    n = (name or "").lower()
    table = [
        ("chicken", "chicken"), ("pollo", "chicken"), ("leg quarter", "chicken leg quarters"),
        ("sparerib", "pork ribs"), ("rib", "ribs"), ("chuck", "beef chuck"),
        ("ground", "ground beef"), ("asada", "carne asada"), ("skirt", "skirt steak"),
        ("steak", "steak"), ("pork", "pork"), ("brisket", "brisket"), ("chorizo", "chorizo"),
    ]
    for kw, label in table:
        if kw in n:
            return label
    return "that cut"


def _pick_combo_idea(combos):
    """Best combo to copy: Latino + meat/taco-ish + priced wins."""
    if not combos:
        return None
    hot = ("taquiza", "carnitas", "asada", "fajita", "carne", "torta", "taco",
           "family", "familiar", "meat", "parrilla", "pollo", "barbacoa")

    def score(c):
        s = 0
        hay = c["name"].lower()
        if c.get("is_latino"):
            s += 50
        if any(k in hay for k in hot):
            s += 30
        if isinstance(c.get("price"), (int, float)):
            s += 10
        return s

    best = max(combos, key=score)
    return best if score(best) >= 30 else None


def build_recommendations(cfg, deals_by_cat, combos, facts):
    """Weekend plan generated from THIS WEEK's live competitor ads + your sales.

    It changes week to week: which meat cut to match, what price to hit, which
    add-ons to push, and whether competitors are running tortilla deals or
    weekend packs all come from the live data each time it's built.
    """
    recs = []
    attach_rates = facts.get("attach_rates_pct") or {}
    pr = 0

    # ---------- ANCHOR: meat, driven by live meat ads ----------
    meat = deals_by_cat.get("meat", [])
    priced_meat = [d for d in meat if isinstance(d.get("price"), (int, float))]
    cheap_meat = priced_meat[0] if priced_meat else None
    mb, nmb = facts.get("meat_basket_avg"), facts.get("nonmeat_basket_avg")
    basket_line = (
        f"In your sales, a basket with meat averages ${mb} vs ${nmb} without it - meat is what fills the cart. "
        if mb and nmb else "Meat is what fills the cart. "
    )
    pr += 1
    if cheap_meat:
        cut = _meat_cut(cheap_meat["name"])
        unit = cheap_meat["unit"] or "lb"
        title = f"Match the sharpest meat ad nearby - {cut}, Sat & Sun only"
        body = (
            basket_line +
            f"{len(priced_meat)} competitor meat ad{'s' if len(priced_meat) != 1 else ''} are running near you right now. "
            f"The sharpest is {cheap_meat['merchant']} - {cheap_meat['name']} ${cheap_meat['price']}/{unit} (thru {cheap_meat['valid_to']}). "
            "Match or beat it on one cut, gate it to Saturday & Sunday, and push the marinated version for better margin."
        )
    else:
        title = "Set your own meat headline this weekend"
        body = (
            basket_line +
            "No competitor meat ads turned up near you this week, so you set the price. Put one cut "
            "(carne asada, pork ribs, or chicken leg quarters) on a sharp Saturday & Sunday-only price to pull weekend trips."
        )
    recs.append({
        "priority": pr, "tag": "BRING PEOPLE IN",
        "plain": "Door-driver - get them through the door",
        "goal": "More weekend customers", "tone": "anchor",
        "title": title, "body": body, "benchmark": cheap_meat,
    })

    # ---------- COMBO IDEA: copy a competitor weekend pack (live) ----------
    combo = _pick_combo_idea(combos)
    if combo:
        pr += 1
        price_txt = f" at ${combo['price']}" if isinstance(combo.get("price"), (int, float)) else ""
        zips = combo.get("zips") or []
        where = f" (seen near {', '.join(zips[:3])})" if zips else ""
        recs.append({
            "priority": pr, "tag": "GROW THE BASKET",
            "plain": "Copy a competitor's weekend pack", "goal": "Bigger baskets", "tone": "attach",
            "title": "Build your own weekend pack - competitors are running one",
            "body": (
                f"Spotted near you: {combo['merchant']} \"{combo['name']}\"{price_txt}{where}. "
                "Copy the idea - bundle your hero meat + tortillas + salsa (a taquiza / carnitas style pack) and "
                "price it as one weekend deal so people buy the whole cookout in one trip."
            ),
            "benchmark": combo,
        })

    # ---------- PROTECT: tortilla, only loud if competitors are dealing it ----------
    tort = deals_by_cat.get("tortilla", [])
    cheap_tort = cheapest_priced(tort)
    hero = facts.get("hero_seller", "your top tortilla")
    pr += 1
    if cheap_tort:
        body = (
            f"A competitor is running a tortilla deal this week: {cheap_tort['merchant']} - {cheap_tort['name']} "
            f"${cheap_tort['price']} (thru {cheap_tort['valid_to']}). Do NOT match it on {hero} - it sells out anyway, "
            "so a discount just gives away margin. Stock it deep; if you want a tortilla on ad, feature the #2 brand (La Hidalguense)."
        )
        title = f"Don't chase the tortilla price war - hold {hero}"
    else:
        body = (
            f"No competitor tortilla deals near you this week, so there's nothing to chase. Hold {hero} at its normal "
            "price and order extra - it sells out on weekends, so the win is staying in stock, not discounting."
        )
        title = f"Keep {hero} at normal price, stock it deep"
    recs.append({
        "priority": pr, "tag": "PROTECT MARGIN",
        "plain": "Don't discount this - just keep it in stock",
        "goal": "Protect profit", "tone": "protect",
        "title": title, "body": body, "benchmark": cheap_tort,
    })

    # ---------- ATTACH: rank add-ons by headroom + whether they're being advertised ----------
    attach_keys = ["charcoal", "soda", "queso", "crema", "salsa"]
    scored = []
    for key in attach_keys:
        cat = next((c for c in cfg["categories"] if c["key"] == key), None)
        if not cat:
            continue
        rate = attach_rates.get(key)
        cheap = cheapest_priced(deals_by_cat.get(key, []))
        headroom = (100 - rate) if rate is not None else 50
        score = headroom + (15 if cheap else 0)  # boost categories competitors are featuring
        scored.append((score, cat, rate, cheap))
    scored.sort(key=lambda x: x[0], reverse=True)

    for score, cat, rate, cheap in scored[:3]:
        pr += 1
        pct_txt = f"Only {rate}% of your meat baskets" if rate is not None else "Few meat baskets"
        if cheap:
            hot_line = (
                f"Competitors are advertising {cat['label'].lower()} this week (cheapest nearby: "
                f"{cheap['merchant']} ${cheap['price']} {cheap['unit']}), so shoppers already have it on the brain - "
                "ride that. Stack it beside the meat case and add weekend bonus points; don't price-war it."
            )
        else:
            hot_line = (
                "Stack it right beside the meat case and add weekend bonus points so people grab it on impulse - "
                "don't price-war it, just make it easy to reach."
            )
        recs.append({
            "priority": pr, "tag": "GROW THE BASKET",
            "plain": "Add-on - put it next to the meat so people grab it",
            "goal": "Bigger baskets", "tone": "attach",
            "title": f"Push {cat['label']} at the meat counter",
            "body": f"{pct_txt} add {cat['label'].lower()} today - lots of room to grow, and it's high margin. {hot_line}",
            "benchmark": cheap,
        })

    # ---------- MIDWEEK ----------
    we = facts.get("weekend_rev_per_day") or 0
    wd = facts.get("weekday_rev_per_day") or 0
    pr += 1
    recs.append({
        "priority": pr, "tag": "LIFT SLOW DAYS",
        "plain": "Reward shopping on the quiet days",
        "goal": "Midweek sales", "tone": "midweek",
        "title": "Double loyalty points on Tuesday & Wednesday",
        "body": (
            f"Weekends earn about ${we:,.0f}/day vs only ${wd:,.0f}/day midweek. "
            "Run 2x points on the slow days (Tue/Wed) to pull people in then, and keep weekends focused on "
            "the meat hook + add-ons."
        ),
        "benchmark": None,
    })

    return recs


def build_week_signal(deals_by_cat, combos):
    """One-line read of what's live this week, so it's obvious it changes."""
    priced_meat = [d for d in deals_by_cat.get("meat", []) if isinstance(d.get("price"), (int, float))]
    cheap_meat = priced_meat[0] if priced_meat else None
    total_priced = sum(
        1 for deals in deals_by_cat.values() for d in deals if isinstance(d.get("price"), (int, float))
    )
    parts = [
        f"{len(priced_meat)} meat ad{'s' if len(priced_meat) != 1 else ''}",
        f"{len(combos)} weekend pack{'s' if len(combos) != 1 else ''}",
        f"{total_priced} priced deals total",
    ]
    if cheap_meat:
        parts.append(f"cheapest meat {cheap_meat['merchant']} ${cheap_meat['price']}/{cheap_meat['unit'] or 'lb'}")
    return "This week near you: " + " · ".join(parts) + "."


def _read_forecast_cache():
    if not os.path.exists(FORECAST_CACHE_PATH):
        return None
    try:
        with open(FORECAST_CACHE_PATH, "r", encoding="utf-8") as f:
            obj = json.load(f)
        if time.time() - obj.get("_epoch", 0) < FORECAST_CACHE_TTL:
            return obj
    except Exception:
        pass
    return None


def _write_forecast_cache(payload):
    try:
        out = dict(payload)
        out["_epoch"] = time.time()
        with open(FORECAST_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(out, f)
    except Exception:
        pass


def build_forecast_payload(cfg, facts=None, refresh=False):
    """Weather playbooks + local events + category daily targets."""
    if not refresh:
        cached = _read_forecast_cache()
        if cached is not None:
            out = dict(cached)
            out.pop("_epoch", None)
            return out

    facts = facts or load_facts(cfg)
    loc = cfg.get("store_location", {})
    warnings = []

    weather_days, wmeta = weather.fetch_forecast(loc, WEATHER_CACHE_PATH, refresh=refresh)
    if wmeta.get("warning"):
        warnings.append(wmeta["warning"])

    if cfg.get("show_local_events", True):
        ev_payload = local_events.gather_events(cfg, DATA_DIR, refresh=refresh)
    else:
        ev_payload = {
            "events": [],
            "manual_count": 0,
            "web_count": 0,
            "facebook_count": 0,
            "web_errors": [],
            "facebook_errors": [],
            "events_note": "Local events hidden — set show_local_events in config to re-enable.",
        }
    targets = forecast.build_targets(cfg, facts, weather_days, ev_payload)

    payload = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
        "location": loc,
        "weather_days": weather_days,
        "weather_source": wmeta.get("source", ""),
        "weather_stale": wmeta.get("stale", False),
        "show_local_events": cfg.get("show_local_events", True),
        "events": ev_payload,
        "targets": targets,
        "weather_categories": cfg.get("weather_categories", []),
        "warnings": warnings,
    }
    _write_forecast_cache(payload)
    return payload


def _normalize_zips(zips):
    if isinstance(zips, str):
        return [z.strip() for z in zips.split(",") if z.strip()]
    if zips:
        return [str(z).strip() for z in zips if str(z).strip()]
    return []


def _zips_key(zips):
    return ",".join(sorted(_normalize_zips(zips)))


def _gather_market_data(cfg, zips, cfilter, merchant_list, categories=None, combo_terms=None, profile_id="latino"):
    cats = categories or cfg.get("categories", [])
    deals_by_cat = {}
    for cat in cats:
        print(f"  gathering: {cat['label']} ({len(zips)} ZIPs) ...")
        deals_by_cat[cat["key"]] = gather_category(cat, zips, cfilter, merchant_list)
    print("  gathering: combos & weekend packs ...")
    combos = gather_combos(cfg, zips, merchant_list, search_terms=combo_terms, profile_id=profile_id)
    return deals_by_cat, combos


def build_payload(cfg, zips=None, profile_id=None, refresh_national=False, home_zips=None):
    compare_zips = _normalize_zips(zips) or list(cfg["zips"])
    home_zips = _normalize_zips(home_zips) or list(cfg["zips"])
    profile, active_pid = benchmark.resolve_profile(profile_id)
    cfilter = cfg.get("competitor_filter") or []
    if profile and profile.get("merchants"):
        merchant_list = profile["merchants"]
    else:
        merchant_list = [k.lower() for k in cfg.get("latino_merchants", [])]

    compare_categories = benchmark.profile_categories(profile, cfg)
    home_categories = cfg.get("categories", [])
    compare_combo_terms = benchmark.profile_combo_terms(profile, cfg)
    home_combo_terms = cfg.get("combo_search_terms") or []

    compare_deals, compare_combos = _gather_market_data(
        cfg,
        compare_zips,
        cfilter,
        merchant_list,
        compare_categories,
        compare_combo_terms,
        active_pid,
    )

    if _zips_key(compare_zips) == _zips_key(home_zips) and active_pid == "latino":
        home_deals, home_combos = compare_deals, compare_combos
    else:
        print(f"  gathering home-market intel ({len(home_zips)} ZIPs) for recommendations ...")
        home_deals, home_combos = _gather_market_data(
            cfg,
            home_zips,
            cfilter,
            merchant_list,
            home_categories,
            home_combo_terms,
            "latino",
        )

    all_deals = [d for deals in compare_deals.values() for d in deals]
    merchants = sorted({d["merchant"] for d in all_deals})
    latino_merchants = sorted(
        {d["merchant"] for d in all_deals + compare_combos if d["is_latino"]}
    )
    facts = load_facts(cfg)
    recs = build_recommendations(cfg, home_deals, home_combos, facts)
    week_signal = build_week_signal(home_deals, home_combos)
    price_comparison = build_price_comparison(cfg, home_deals, facts)
    segment_suggestions = build_segment_deal_suggestions(cfg, home_deals, facts, recs)

    area_presets = (profile or {}).get("area_presets") or cfg.get("area_presets", [])
    national_bench = None
    if profile:
        if refresh_national:
            print(f"  building national benchmark ({active_pid}) ...")
            national_bench = benchmark.gather_national_benchmarks(
                cfg, profile, gather_category, market_price_stats, refresh=True
            )
        else:
            national_bench = benchmark.read_national_cache(active_pid)
    national_ranking = benchmark.build_national_ranking(price_comparison, national_bench, facts)

    return {
        "store_name": cfg["store_name"],
        "primary_zip": cfg["primary_zip"],
        "zips": compare_zips,
        "home_zips": home_zips,
        "benchmarking_other_market": _zips_key(compare_zips) != _zips_key(home_zips),
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
        "categories": compare_categories,
        "home_categories": home_categories,
        "deals_by_category": compare_deals,
        "merchants": merchants,
        "latino_merchants": latino_merchants,
        "combos": compare_combos,
        "area_presets": area_presets,
        "benchmark_profile": active_pid,
        "benchmark_profile_label": (profile or {}).get("label"),
        "benchmark_profiles": benchmark.list_profiles(),
        "recommendations": recs,
        "week_signal": week_signal,
        "facts": facts,
        "data_source": facts.get("source_label", "default"),
        "price_comparison": price_comparison,
        "national_ranking": national_ranking,
        "segment_suggestions": segment_suggestions,
        "search_hints": benchmark.profile_trending_terms(profile, cfg)[:10]
        or cfg.get("trending_terms", [])[:10],
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # quiet

    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Authorization, Content-Type, X-Filename",
        )
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _authed(self):
        if not APP_PASSWORD:
            return True
        hdr = self.headers.get("Authorization", "")
        if hdr.startswith("Basic "):
            try:
                decoded = base64.b64decode(hdr[6:]).decode("utf-8")
                # accept "user:pass" or just "pass"
                supplied = decoded.split(":", 1)[-1]
                if supplied == APP_PASSWORD:
                    return True
            except Exception:
                pass
        self.send_response(401)
        self._send_cors()
        self.send_header("WWW-Authenticate", 'Basic realm="Competitor Watch"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def _send_json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self._send_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path):
        ctype = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
        }.get(os.path.splitext(path)[1].lower(), "application/octet-stream")
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self._send_cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        rel = os.path.basename(path).lower()
        ext = os.path.splitext(path)[1].lower()
        if rel == "index.html":
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        elif "/assets/" in path.replace("\\", "/") and ext in (".js", ".css"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if not self._authed():
            return
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8", errors="replace")

        if parsed.path == "/api/events":
            try:
                cfg = load_config()
                ev = json.loads(raw) if raw.strip() else {}
                if not ev.get("name"):
                    self._send_json({"error": "name required"}, status=400)
                    return
                ev.setdefault("type", "community")
                ev.setdefault("source", "manual")
                local_events.save_manual_event(DATA_DIR, ev)
                payload = local_events.gather_events(cfg, DATA_DIR)
                self._send_json({"ok": True, "events": payload})
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
            return

        if parsed.path == "/api/integration/credentials":
            try:
                body = json.loads(raw) if raw.strip() else {}
                pid = (body.get("provider") or "").strip()
                creds = body.get("credentials") or body
                payload = store_data.save_credentials(pid, creds)
                self._send_json({"ok": True, **payload})
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
            return

        if parsed.path == "/api/integration/test":
            try:
                body = json.loads(raw) if raw.strip() else {}
                pid = (body.get("provider") or "").strip() or None
                result = store_data.test_connection(provider_id=pid)
                self._send_json({"ok": True, **result})
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
            return

        if parsed.path == "/api/integration/provider":
            try:
                body = json.loads(raw) if raw.strip() else {}
                pid = (body.get("provider") or "").strip()
                payload = store_data.set_provider(pid)
                self._send_json({"ok": True, **payload})
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
            return

        if parsed.path == "/api/integration/sync":
            try:
                cfg = load_config()
                body = json.loads(raw) if raw.strip() else {}
                pid = (body.get("provider") or "").strip() or None
                facts, label, meta = store_data.sync_provider(cfg, provider_id=pid)
                save_facts(facts, label)
                print(f"[sync] {label}")
                self._send_json({"ok": True, "source_label": label, "facts": facts, "meta": meta})
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
            return

        if parsed.path == "/api/upload/bundle":
            try:
                cfg = load_config()
                body = json.loads(raw) if raw.strip() else {}
                files = body.get("files") or {}
                facts, label, meta = store_data.ingest_csv_bundle(files, cfg)
                save_facts(facts, label)
                state = store_data.load_integration_state()
                state["provider"] = "csv"
                state["last_source_label"] = label
                state["last_sync_at"] = time.strftime("%Y-%m-%d %H:%M")
                state["last_sync_status"] = "ok"
                state["last_sync_error"] = None
                store_data.save_integration_state(state)
                print(f"[upload/bundle] {label}")
                self._send_json({"ok": True, "source_label": label, "facts": facts, "meta": meta})
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
            return

        if parsed.path == "/api/upload":
            try:
                fname = self.headers.get("X-Filename", "uploaded sales data")
                cfg = load_config()
                facts, label, meta = store_data.ingest_single_csv(raw, cfg, filename=fname)
                save_facts(facts, label)
                state = store_data.load_integration_state()
                state["provider"] = "csv"
                state["last_source_label"] = label
                state["last_sync_at"] = time.strftime("%Y-%m-%d %H:%M")
                state["last_sync_status"] = "ok"
                state["last_sync_error"] = None
                store_data.save_integration_state(state)
                print(f"[upload] {label}")
                self._send_json({"ok": True, "source_label": label, "facts": facts, "meta": meta})
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
            return

        self._send_json({"error": "not found"}, status=404)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path

        if route == "/api/health":
            self._send_json({"ok": True})
            return

        if not self._authed():
            return

        if route == "/api/integration":
            try:
                self._send_json(store_data.build_status_payload())
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if route == "/api/meta":
            try:
                cfg = load_config()
                self._send_json(outreach.build_meta(cfg))
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if route == "/api/outreach":
            try:
                cfg = load_config()
                facts = load_facts(cfg)
                self._send_json(outreach.build_outreach_payload(cfg, facts=facts))
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if route == "/api/forecast":
            try:
                cfg = load_config()
                qs = urllib.parse.parse_qs(parsed.query)
                refresh = "refresh" in qs
                facts = load_facts(cfg)
                print(f"[{time.strftime('%H:%M:%S')}] building forecast (refresh={refresh}) ...")
                self._send_json(build_forecast_payload(cfg, facts, refresh=refresh))
                print("  forecast done.")
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if route == "/api/trending":
            try:
                cfg = load_config()
                qs = urllib.parse.parse_qs(parsed.query)
                refresh = "refresh" in qs
                zips = (qs.get("zips") or [None])[0]
                profile_id = (qs.get("profile") or [None])[0]
                print(
                    f"[{time.strftime('%H:%M:%S')}] building trending "
                    f"(refresh={refresh}, profile={profile_id or 'default'}, zips={'custom' if zips else 'default'}) ..."
                )
                self._send_json(gather_trending(cfg, refresh, zips=zips, profile_id=profile_id))
                print("  trending done.")
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if route == "/api/search":
            try:
                cfg = load_config()
                qs = urllib.parse.parse_qs(parsed.query)
                q = (qs.get("q") or [""])[0].strip()
                if len(q) < 2:
                    self._send_json({"error": "Enter at least 2 characters to search"}, status=400)
                    return
                zips = cfg["zips"]
                if qs.get("zips"):
                    zips = [z.strip() for z in qs["zips"][0].split(",") if z.strip()]
                latino_only = qs.get("latino", ["0"])[0] in ("1", "true", "yes")
                cfilter = cfg.get("competitor_filter") or []
                latino_list = [k.lower() for k in cfg.get("latino_merchants", [])]
                print(f"[{time.strftime('%H:%M:%S')}] search q={q!r} zips={len(zips)} latino_only={latino_only}")
                results = gather_search(q, zips, latino_list, cfilter, latino_only)
                self._send_json({
                    "query": q,
                    "zips": zips,
                    "count": len(results),
                    "results": results,
                })
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if route == "/api/benchmark-profiles":
            try:
                self._send_json({
                    "default_profile": benchmark.load_benchmark_catalog().get("default_profile", "latino"),
                    "profiles": benchmark.list_profiles(),
                })
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if route == "/api/national-ranking":
            try:
                cfg = load_config()
                qs = urllib.parse.parse_qs(parsed.query)
                profile_id = (qs.get("profile") or [None])[0]
                refresh = "refresh" in qs
                profile, pid = benchmark.resolve_profile(profile_id)
                facts = load_facts(cfg)
                if refresh and profile:
                    print(f"[{time.strftime('%H:%M:%S')}] national benchmark refresh ({pid}) ...")
                    national_bench = benchmark.gather_national_benchmarks(
                        cfg, profile, gather_category, market_price_stats, refresh=True
                    )
                else:
                    national_bench = benchmark.read_national_cache(pid) if profile else None
                # Local comparison optional — use empty if not provided
                price_comparison = []
                zips = cfg["zips"]
                if qs.get("zips"):
                    zips = [z.strip() for z in qs["zips"][0].split(",") if z.strip()]
                if national_bench or refresh:
                    cfilter = cfg.get("competitor_filter") or []
                    merchants = (profile or {}).get("merchants") or []
                    deals_by_cat = {
                        cat["key"]: gather_category(cat, zips, cfilter, merchants)
                        for cat in cfg["categories"]
                    }
                    price_comparison = build_price_comparison(cfg, deals_by_cat, facts)
                ranking = benchmark.build_national_ranking(price_comparison, national_bench, facts)
                self._send_json(ranking)
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if route == "/api/data":
            try:
                cfg = load_config()
                qs = urllib.parse.parse_qs(parsed.query)
                force = "refresh" in qs
                refresh_national = "refresh_national" in qs or force
                profile_id = (qs.get("profile") or [None])[0]
                zips = None
                home_zips = None
                if qs.get("zips"):
                    zips = [z.strip() for z in qs["zips"][0].split(",") if z.strip()]
                if qs.get("home_zips"):
                    home_zips = [z.strip() for z in qs["home_zips"][0].split(",") if z.strip()]
                if force:
                    for fn in os.listdir(CACHE_DIR):
                        try:
                            os.remove(os.path.join(CACHE_DIR, fn))
                        except Exception:
                            pass
                print(
                    f"[{time.strftime('%H:%M:%S')}] building payload "
                    f"(refresh={force}, profile={profile_id or 'default'}, "
                    f"compare_zips={zips or 'default'}, home_zips={home_zips or 'default'}) ..."
                )
                payload = build_payload(
                    cfg,
                    zips,
                    profile_id=profile_id,
                    refresh_national=refresh_national,
                    home_zips=home_zips,
                )
                print("  done.")
                self._send_json(payload)
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        # static files
        rel = route.lstrip("/")
        if rel == "":
            rel = "index.html"
        candidate = os.path.normpath(os.path.join(PUBLIC, rel))
        if candidate.startswith(PUBLIC) and os.path.isfile(candidate):
            self._send_file(candidate)
            return
        self._send_json({"error": "not found"}, status=404)


def main():
    port = int(os.environ.get("PORT", "8000"))
    # Disable address reuse so a stale/old instance can't silently shadow this one
    # (on Windows SO_REUSEADDR lets multiple servers bind the same port).
    ThreadingHTTPServer.allow_reuse_address = False
    try:
        server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    except OSError as e:
        print(f"  ! Could not bind port {port} - is another instance already running? ({e})")
        return
    print("=" * 56)
    print("  Competitor Watch - La Bodega")
    print(f"  Open in your browser:  http://localhost:{port}")
    print(f"  Team password: {'ON (APP_PASSWORD set)' if APP_PASSWORD else 'OFF (open access)'}")
    print("  Press Ctrl+C to stop.")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.shutdown()


if __name__ == "__main__":
    main()
