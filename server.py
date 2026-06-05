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

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
CACHE_DIR = os.path.join(ROOT, "cache")
DATA_DIR = os.path.join(ROOT, "data")
CONFIG_PATH = os.path.join(ROOT, "config.json")
FACTS_PATH = os.path.join(DATA_DIR, "sales_facts.json")
TRENDING_PATH = os.path.join(DATA_DIR, "trending.json")
WEATHER_CACHE_PATH = os.path.join(DATA_DIR, "weather_cache.json")
TRENDING_TTL = 60 * 60 * 12  # 12 hours

FLIPP_BASE = "https://backflipp.wishabi.com/flipp/items/search"
CACHE_TTL = 60 * 60 * 6  # 6 hours
HTTP_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

# Optional shared password for team access on a public URL.
# Set the APP_PASSWORD env var to require it; leave unset for open/local use.
APP_PASSWORD = os.environ.get("APP_PASSWORD", "").strip()

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


def is_latino_merchant(name, latino_list):
    n = (name or "").lower()
    return any(kw in n for kw in latino_list)


def clean_item(raw, latino_list=None, zip_code=""):
    merchant = raw.get("merchant_name") or "Unknown"
    return {
        "merchant": merchant,
        "name": raw.get("name") or "",
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


def gather_category(cat, zips, competitor_filter, latino_list):
    """Aggregate, dedupe and sort deals for one category across all ZIPs."""
    seen = set()
    out = []
    for term in cat["terms"]:
        for z in zips:
            for raw in flipp_search(term, z):
                item = clean_item(raw, latino_list, z)
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
    return any(bad in item["name"].lower() for bad in NONFOOD_NAME)


def _food_cat_match(item):
    label = (item["l1"] + " " + item["category_l2"]).lower()
    return any(f in label for f in FOOD_CAT)


def gather_combos(cfg, zips, latino_list):
    """Find combo / multi-buy / weekend-pack style deals (food only), Latino-first.

    Each combo carries the ZIP code(s) where it was seen so the team can read
    deals by area.
    """
    combo_kw = [k.lower() for k in cfg.get("combo_keywords", [])]
    search_terms = cfg.get("combo_search_terms") or [
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
                if not (_food_cat_match(item) or item["is_latino"]):
                    continue
                key = (item["merchant"].lower(), item["name"].lower())
                if key in seen:
                    if z not in seen[key]["zips"]:
                        seen[key]["zips"].append(z)
                    continue
                item["zips"] = [z]
                seen[key] = item
    out = list(seen.values())
    # Latino groceries first, then priced
    out.sort(key=lambda i: (not i["is_latino"], i["price"] is None, i["price"] if i["price"] is not None else 9e9))
    return out[:60]


def cheapest_priced(deals):
    priced = [d for d in deals if isinstance(d.get("price"), (int, float))]
    return priced[0] if priced else None


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


def _read_trending_cache():
    if not os.path.exists(TRENDING_PATH):
        return None
    try:
        with open(TRENDING_PATH, "r", encoding="utf-8") as f:
            obj = json.load(f)
        if time.time() - obj.get("_epoch", 0) <= TRENDING_TTL:
            return obj
    except Exception:
        pass
    return None


def _write_trending_cache(obj):
    try:
        out = dict(obj)
        out["_epoch"] = time.time()
        with open(TRENDING_PATH, "w", encoding="utf-8") as f:
            json.dump(out, f)
    except Exception:
        pass


def gather_trending(cfg, refresh=False):
    """Most-advertised products this week across major US Latino metros.

    "Trending" = how broadly a product is being advertised right now (how many
    distinct stores and metro areas feature it). Split into Latino vs mainstream
    supermarkets. Heavily cached because it scans many ZIP/term combinations.
    """
    if not refresh:
        cached = _read_trending_cache()
        if cached is not None:
            return cached

    zips = cfg.get("trending_zips", [])
    terms = cfg.get("trending_terms", [])
    latino_list = [k.lower() for k in cfg.get("latino_merchants", [])]

    latino_b, main_b = {}, {}
    seen = set()
    for term in terms:
        for z in zips:
            for raw in flipp_search(term, z):
                item = clean_item(raw, latino_list, z)
                if not item["name"] or _has_nonfood(item):
                    continue
                # Latino grocers are food-only; for mainstream stores require a
                # food category so cookware / apparel / candles don't sneak in.
                if not item["is_latino"] and not _food_cat_match(item):
                    continue
                ddk = (item["merchant"].lower(), item["name"].lower(), z)
                if ddk in seen:
                    continue
                seen.add(ddk)
                key = _norm_product(item["name"])
                if not key:
                    continue
                bucket = latino_b if item["is_latino"] else main_b
                e = bucket.get(key)
                if e is None:
                    e = {"name": item["name"], "count": 0, "merchants": set(),
                         "areas": set(), "prices": [], "image": item["image"]}
                    bucket[key] = e
                e["count"] += 1
                e["merchants"].add(item["merchant"])
                e["areas"].add(z)
                if isinstance(item["price"], (int, float)):
                    e["prices"].append(item["price"])

    def top(bucket, n=10):
        rows = []
        for e in bucket.values():
            rows.append({
                "name": e["name"][:52],
                "stores": len(e["merchants"]),
                "areas": len(e["areas"]),
                "count": e["count"],
                "min": round(min(e["prices"]), 2) if e["prices"] else None,
                "max": round(max(e["prices"]), 2) if e["prices"] else None,
                "merchants": sorted(e["merchants"])[:4],
                "image": e["image"],
            })
        rows.sort(key=lambda r: (r["areas"], r["stores"], r["count"]), reverse=True)
        return rows[:n]

    result = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
        "scanned_zips": zips,
        "latino": top(latino_b),
        "mainstream": top(main_b),
    }
    _write_trending_cache(result)
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


def build_forecast_payload(cfg, facts=None, refresh=False):
    """Weather playbooks + local events + category daily targets."""
    facts = facts or load_facts(cfg)
    loc = cfg.get("store_location", {})
    weather_days = weather.fetch_forecast(loc, WEATHER_CACHE_PATH, refresh=refresh)
    ev_payload = local_events.gather_events(cfg, DATA_DIR, refresh=refresh)
    targets = forecast.build_targets(cfg, facts, weather_days, ev_payload)
    return {
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
        "location": loc,
        "weather_days": weather_days,
        "events": ev_payload,
        "targets": targets,
        "weather_categories": cfg.get("weather_categories", []),
    }


def build_payload(cfg, zips=None):
    zips = zips or cfg["zips"]
    cfilter = cfg.get("competitor_filter") or []
    latino_list = [k.lower() for k in cfg.get("latino_merchants", [])]
    deals_by_cat = {}
    for cat in cfg["categories"]:
        print(f"  gathering: {cat['label']} ...")
        deals_by_cat[cat["key"]] = gather_category(cat, zips, cfilter, latino_list)

    print("  gathering: combos & weekend packs ...")
    combos = gather_combos(cfg, zips, latino_list)

    all_deals = [d for deals in deals_by_cat.values() for d in deals]
    merchants = sorted({d["merchant"] for d in all_deals})
    latino_merchants = sorted({d["merchant"] for d in all_deals + combos if d["is_latino"]})
    facts = load_facts(cfg)
    recs = build_recommendations(cfg, deals_by_cat, combos, facts)
    week_signal = build_week_signal(deals_by_cat, combos)
    return {
        "store_name": cfg["store_name"],
        "primary_zip": cfg["primary_zip"],
        "zips": zips,
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
        "categories": cfg["categories"],
        "deals_by_category": deals_by_cat,
        "merchants": merchants,
        "latino_merchants": latino_merchants,
        "combos": combos,
        "area_presets": cfg.get("area_presets", []),
        "recommendations": recs,
        "week_signal": week_signal,
        "facts": facts,
        "data_source": facts.get("source_label", "default"),
        "search_hints": cfg.get("trending_terms", [])[:10],
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # quiet

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
        self.send_header("WWW-Authenticate", 'Basic realm="Competitor Watch"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def _send_json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
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
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
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

        if parsed.path != "/api/upload":
            self._send_json({"error": "not found"}, status=404)
            return
        try:
            fname = self.headers.get("X-Filename", "uploaded sales data")
            cfg = load_config()
            facts = sales.analyze(raw, cfg["categories"], cfg.get("weather_categories"))
            label = f"{fname} ({facts['orders']:,} orders, ${facts['total_revenue']:,.0f})"
            save_facts(facts, label)
            print(f"[upload] {label}")
            self._send_json({"ok": True, "source_label": label, "facts": facts})
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path

        if route == "/api/health":
            self._send_json({"ok": True})
            return

        if not self._authed():
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
                print(f"[{time.strftime('%H:%M:%S')}] building trending (refresh={refresh}) ...")
                self._send_json(gather_trending(cfg, refresh))
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

        if route == "/api/data":
            try:
                cfg = load_config()
                qs = urllib.parse.parse_qs(parsed.query)
                force = "refresh" in qs
                zips = None
                if qs.get("zips"):
                    zips = [z.strip() for z in qs["zips"][0].split(",") if z.strip()]
                if force:
                    for fn in os.listdir(CACHE_DIR):
                        try:
                            os.remove(os.path.join(CACHE_DIR, fn))
                        except Exception:
                            pass
                print(f"[{time.strftime('%H:%M:%S')}] building payload (refresh={force}, zips={zips or 'default'}) ...")
                payload = build_payload(cfg, zips)
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
