"""
Local events: manual calendar + web search (DuckDuckGo) + optional Facebook scrape.
Web search finds community events without needing Facebook login.
"""

import json
import os
import re
import time
import urllib.error
import urllib.request
import urllib.parse
from html import unescape

FB_CACHE_TTL = 60 * 60 * 24
WEB_CACHE_TTL = 60 * 60 * 12  # 12 hours
HTTP_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CompetitorWatch/1.0)"}
WEB_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,text/calendar,*/*",
}


def _events_path(data_dir):
    return os.path.join(data_dir, "events.json")


def _fb_cache_path(data_dir):
    return os.path.join(data_dir, "fb_events_cache.json")


def _web_cache_path(data_dir):
    return os.path.join(data_dir, "web_events_cache.json")


def _guess_event_type(name):
    n = (name or "").lower()
    if any(k in n for k in ("football", "baseball", "softball", "soccer", "game", "tournament", "vs ")):
        return "sports"
    if any(k in n for k in ("festival", "fair", "fiesta", "carnival", "market")):
        return "festival"
    if any(k in n for k in ("church", "parish", "bible", "worship")):
        return "church"
    if any(k in n for k in ("school", "pta", "graduation")):
        return "school"
    return "community"


def _format_ical_date(raw):
    raw = (raw or "").strip()
    if not raw:
        return ""
    if "T" in raw:
        raw = raw.split("T")[0]
    if len(raw) >= 8 and raw[:8].isdigit():
        y, m, d = raw[:4], raw[4:6], raw[6:8]
        return f"{m}/{d}/{y}"
    return raw


def _parse_ical(text, feed_label, feed_url):
    """Parse iCalendar (ICS) feeds — used by local tourism & government sites."""
    unfolded = []
    for line in text.replace("\r\n", "\n").split("\n"):
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] += line[1:]
        else:
            unfolded.append(line)

    events = []
    cur = {}
    for line in unfolded:
        if line == "BEGIN:VEVENT":
            cur = {}
        elif line == "END:VEVENT":
            name = unescape(cur.get("SUMMARY", "")).strip()
            if name:
                desc = unescape(cur.get("DESCRIPTION", "")).strip()[:200]
                events.append({
                    "name": name[:140],
                    "date": _format_ical_date(cur.get("DTSTART", "")),
                    "source": "web",
                    "page": feed_label,
                    "type": _guess_event_type(name + " " + desc),
                    "url": cur.get("URL", feed_url),
                    "snippet": desc,
                })
            cur = {}
        elif ":" in line:
            key, val = line.split(":", 1)
            cur[key.split(";")[0]] = val
    return events


def _fetch_ical_feeds(feeds):
    events = []
    errors = []
    for feed in feeds or []:
        label = feed.get("label", "Calendar")
        url = feed.get("url", "")
        if not url:
            continue
        try:
            req = urllib.request.Request(url, headers=WEB_HEADERS)
            with urllib.request.urlopen(req, timeout=25) as r:
                text = r.read().decode("utf-8", errors="replace")
            events.extend(_parse_ical(text, label, url))
        except Exception as e:
            errors.append(f"{label}: {e}")
    return events, errors


def _scrape_event_pages(pages):
    """Best-effort scrape of public event listing pages."""
    events = []
    errors = []
    for page in pages or []:
        label = page.get("label", "Events")
        url = page.get("url", "")
        if not url:
            continue
        try:
            req = urllib.request.Request(url, headers=WEB_HEADERS)
            with urllib.request.urlopen(req, timeout=25) as r:
                html = r.read().decode("utf-8", errors="replace")
            for title in re.findall(
                r">([^<]{12,90}(?:Meeting|Event|Breakfast|Festival|Hours|Rodeo|BBQ|Concert|Market)[^<]{0,50})<",
                html, re.I
            ):
                name = unescape(re.sub(r"\s+", " ", title)).strip()
                if any(skip in name.lower() for skip in ("calendar of events", "where it all")):
                    continue
                events.append({
                    "name": name[:140],
                    "date": "",
                    "source": "web",
                    "page": label,
                    "type": _guess_event_type(name),
                    "url": url,
                    "snippet": "",
                })
        except Exception as e:
            errors.append(f"{label}: {e}")
    return events, errors


def _bing_rss_events(queries, loc):
    """Optional Bing RSS search — no API key; results vary."""
    import xml.etree.ElementTree as ET

    events = []
    errors = []
    city = loc.get("city", "Calhoun")
    state = loc.get("state", "GA")
    for q in (queries or [])[:2]:
        query = q.replace("{city}", city).replace("{state}", state)
        url = "https://www.bing.com/search?" + urllib.parse.urlencode({"q": query, "format": "rss"})
        try:
            req = urllib.request.Request(url, headers=WEB_HEADERS)
            with urllib.request.urlopen(req, timeout=20) as r:
                root = ET.fromstring(r.read())
            for item in root.findall(".//item")[:6]:
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                desc = unescape(re.sub(r"<[^>]+>", " ", item.findtext("description") or "")).strip()[:200]
                low = (title + " " + desc).lower()
                if not title or any(skip in low for skip in (
                    "wikipedia", "food service", "community college", "britannica"
                )):
                    continue
                if not any(k in low for k in ("calhoun", "gordon", "georgia", "ga ", "festival", "rodeo", "bbq", "event")):
                    continue
                events.append({
                    "name": title[:140],
                    "date": "",
                    "source": "web",
                    "page": "Web search",
                    "type": _guess_event_type(title + " " + desc),
                    "url": link,
                    "snippet": desc,
                })
        except Exception as e:
            errors.append(f"Search: {e}")
    return events, errors


def search_web_events(loc, cfg, data_dir, refresh=False):
    """Pull local events from public calendars + web (no Facebook login)."""
    cache_path = _web_cache_path(data_dir)
    if not refresh:
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                return cached.get("events", []), cached.get("errors", [])
            except Exception:
                pass
        refresh = True  # bootstrap on first visit

    all_events = []
    errors = []
    seen = set()

    def add_batch(batch):
        for ev in batch:
            key = ev["name"].lower()
            if key in seen:
                continue
            seen.add(key)
            all_events.append(ev)

    ical_ev, ical_err = _fetch_ical_feeds(cfg.get("event_ical_urls", []))
    add_batch(ical_ev)
    errors.extend(ical_err)

    page_ev, page_err = _scrape_event_pages(cfg.get("event_page_urls", []))
    add_batch(page_ev)
    errors.extend(page_err)

    rss_ev, rss_err = _bing_rss_events(cfg.get("event_search_queries", []), loc)
    add_batch(rss_ev)
    errors.extend(rss_err)

    try:
        os.makedirs(data_dir, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump({
                "_epoch": time.time(),
                "events": all_events,
                "errors": errors,
                "scraped_at": time.strftime("%Y-%m-%d %H:%M"),
            }, f, indent=2)
    except Exception:
        pass
    return all_events, errors


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
    """Merge manual + web search + Facebook events."""
    manual = load_manual_events(data_dir)
    loc = cfg.get("store_location", {})
    web_events, web_errors = search_web_events(loc, cfg, data_dir, refresh=refresh)

    fb_pages = cfg.get("facebook_pages", [])
    fb_events, fb_errors = scrape_facebook_pages(fb_pages, data_dir, refresh=refresh) if refresh else ([], [])

    boosts = cfg.get("event_type_boosts", {})
    merged = []
    for e in manual + web_events + fb_events:
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
        "web_count": len(web_events),
        "facebook_count": len(fb_events),
        "web_errors": web_errors,
        "facebook_errors": fb_errors,
        "events_note": (
            "Events from public local calendars (iCal/web) + your manual entries. "
            "Add feeds in config.json → event_ical_urls."
        ),
    }
