"""
Local events: manual calendar + best-effort Facebook community page scrape.
Facebook often blocks server requests — manual events always work as fallback.
"""

import json
import os
import re
import time
import urllib.error
import urllib.request
import urllib.parse
from html import unescape

FB_CACHE_TTL = 60 * 60 * 24  # 24 hours — avoid hammering Facebook
HTTP_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CompetitorWatch/1.0)"}


def _events_path(data_dir):
    return os.path.join(data_dir, "events.json")


def _fb_cache_path(data_dir):
    return os.path.join(data_dir, "fb_events_cache.json")


def load_manual_events(data_dir):
    path = _events_path(data_dir)
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            obj = json.load(f)
        return obj.get("events", []) if isinstance(obj, dict) else obj
    except Exception:
        return []


def save_manual_event(data_dir, event):
    path = _events_path(data_dir)
    events = load_manual_events(data_dir)
    events.append(event)
    os.makedirs(data_dir, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"events": events, "updated_at": time.strftime("%Y-%m-%d %H:%M")}, f, indent=2)
    return events


def _parse_mbasic_events(html, page_label):
    """Extract event-like entries from mbasic Facebook HTML."""
    out = []
    # Event links: /events/123456/ or events permalink
    chunks = re.split(r'<a[^>]+href="(/events/[^"]+)"[^>]*>', html, flags=re.I)
    seen = set()
    for i in range(1, len(chunks), 2):
        href = chunks[i]
        rest = chunks[i + 1] if i + 1 < len(chunks) else ""
        title_m = re.search(r'>([^<]{4,120})<', rest)
        if not title_m:
            continue
        title = unescape(re.sub(r"\s+", " ", title_m.group(1))).strip()
        if not title or title.lower() in ("events", "see all", "create event"):
            continue
        key = (page_label, title.lower())
        if key in seen:
            continue
        seen.add(key)
        # Try to find a date nearby (Jun 7, 2026-06-07, etc.)
        date_str = ""
        ctx = rest[:400]
        dm = re.search(
            r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}"
            r"|\d{4}-\d{2}-\d{2}",
            ctx, re.I
        )
        if dm:
            date_str = dm.group(0)
        out.append({
            "name": title[:120],
            "date": date_str,
            "source": "facebook",
            "page": page_label,
            "type": "community",
            "url": "https://www.facebook.com" + href.split("?")[0],
        })
    return out[:15]


def _load_fb_cache(cache_path):
    if not os.path.exists(cache_path):
        return None
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def scrape_facebook_pages(pages, data_dir, refresh=False):
    """
    Best-effort scrape of public Facebook page events via mbasic.
    Only hits Facebook when refresh=True; otherwise uses cache only.
    """
    cache_path = _fb_cache_path(data_dir)
    cached = _load_fb_cache(cache_path)

    # Normal page load: never scrape — manual events + cached FB only
    if not refresh:
        if cached is not None:
            return cached.get("events", []), cached.get("errors", [])
        return [], ["Facebook not fetched yet — click Refresh forecast to try (once per day)."]

    # Refresh: use cache if still fresh
    if cached and time.time() - cached.get("_epoch", 0) < FB_CACHE_TTL:
        return cached.get("events", []), cached.get("errors", [])

    all_events = []
    errors = []
    rate_limited = False
    for page in pages:
        if rate_limited:
            break
        slug = (page.get("slug") or "").strip().strip("/")
        label = page.get("label") or slug
        if not slug:
            continue
        urls = [
            f"https://mbasic.facebook.com/{slug}/events/",
            f"https://m.facebook.com/{slug}/events/",
        ]
        fetched = False
        for url in urls:
            try:
                req = urllib.request.Request(url, headers=HTTP_HEADERS)
                with urllib.request.urlopen(req, timeout=20) as r:
                    html = r.read().decode("utf-8", errors="replace")
                if "login" in html.lower() and len(html) < 5000:
                    continue
                evs = _parse_mbasic_events(html, label)
                if evs:
                    all_events.extend(evs)
                    fetched = True
                    break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    rate_limited = True
                    errors.append("Facebook rate limit (429) — try again later or add events manually.")
                    break
                errors.append(f"{label}: HTTP {e.code}")
            except Exception as e:
                errors.append(f"{label}: {e}")
        if not fetched and not rate_limited and not any(e.startswith(label) for e in errors):
            errors.append(f"{label}: no public events parsed (page may require login)")

    # Dedupe
    seen = set()
    deduped = []
    for e in all_events:
        k = (e["page"], e["name"].lower())
        if k in seen:
            continue
        seen.add(k)
        deduped.append(e)

    try:
        os.makedirs(data_dir, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump({
                "_epoch": time.time(),
                "events": deduped,
                "errors": errors,
                "scraped_at": time.strftime("%Y-%m-%d %H:%M"),
            }, f, indent=2)
    except Exception:
        pass
    return deduped, errors


def gather_events(cfg, data_dir, refresh=False):
    """Merge manual + Facebook events, apply boost types from config."""
    manual = load_manual_events(data_dir)
    fb_pages = cfg.get("facebook_pages", [])
    fb_events, fb_errors = scrape_facebook_pages(fb_pages, data_dir, refresh=refresh)

    boosts = cfg.get("event_type_boosts", {})
    merged = []
    for e in manual + fb_events:
        etype = e.get("type", "community")
        e = dict(e)
        e["boosts"] = boosts.get(etype, boosts.get("community", {}))
        if not e.get("boosts") and e.get("boost"):
            e["boosts"] = {k: 1.15 for k in e["boost"]}
        merged.append(e)

    # Sort: dated first, then name
    def sort_key(ev):
        return (ev.get("date") or "9999", ev.get("name", ""))

    merged.sort(key=sort_key)
    return {
        "events": merged[:30],
        "manual_count": len(manual),
        "facebook_count": len(fb_events),
        "facebook_errors": fb_errors,
        "facebook_note": (
            "Facebook community pages scraped best-effort. If empty, add events manually "
            "or check page slugs in config.json → facebook_pages."
        ),
    }
