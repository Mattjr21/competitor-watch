"""
Sales CSV analyzer.

Takes a POS / sales export (the "sale.report" style: one row per order line,
with columns for Order, Order Date, Product, Qty Ordered, Total, Unit Price)
and computes the numbers the recommendation engine needs:
  - basket value with vs without meat (the anchor effect)
  - attach rates per category (how often each add-on rides with meat)
  - weekend vs weekday revenue per day
  - La Bodega's own average price per category (for price comparison)
  - the hero seller and its basket value

Standard library only.
"""

import csv
import io
import datetime
import math
import re


def _f(v):
    try:
        return float(str(v).replace(",", "").replace("$", "").strip())
    except Exception:
        return None


def _pick(headers, *candidates):
    low = {h.lower().strip(): h for h in headers}
    for c in candidates:
        if c.lower() in low:
            return low[c.lower()]
    # loose contains match
    for c in candidates:
        for h in headers:
            if c.lower() in h.lower():
                return h
    return None


def _parse_date(s):
    if not s:
        return None
    s = str(s).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.datetime.strptime(s, fmt)
        except Exception:
            continue
    try:
        return datetime.datetime.fromisoformat(s)
    except Exception:
        return None


def _match_cat(name, categories):
    """Return list of category keys this product name matches."""
    n = (name or "").lower()
    hits = []
    for c in categories:
        for kw in c.get("own_match", []):
            if kw in n:
                hits.append(c["key"])
                break
    return hits


def _normalize_zip(raw):
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw).strip())
    if len(digits) >= 5:
        return digits[:5]
    return None


def _mask_customer_id(cid):
    s = str(cid or "").strip()
    if not s:
        return "—"
    if len(s) <= 4:
        return "••••"
    return "••••" + s[-4:]


def _haversine_miles(lat1, lon1, lat2, lon2):
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * 2 * math.asin(min(1.0, math.sqrt(a)))


def _loyalty_tier_label(orders):
    if orders >= 11:
        return "Champion"
    if orders >= 4:
        return "Loyal"
    if orders >= 2:
        return "Returning"
    return "New"


def _csv_column_map(headers):
    """Map export headers to normalized sale-line fields."""
    return {
        "order_id": _pick(headers, "Order", "Order Ref", "Order Reference", "Receipt", "Ticket"),
        "date": _pick(headers, "Order Date", "Date", "Create Date"),
        "product": _pick(headers, "Product", "Product Variant", "Order Lines/Product", "Product Name", "Item"),
        "qty": _pick(headers, "Qty Ordered", "Order Lines/Quantity", "Quantity", "Qty"),
        "total": _pick(headers, "Total", "Order Lines/Total cost", "Subtotal", "Line Total", "Amount"),
        "unit_price": _pick(headers, "Unit Price", "Order Lines/Unit Price", "Price"),
        "customer": _pick(
            headers,
            "Customer",
            "Partner",
            "Contact",
            "Client",
            "Member",
            "Customer Name",
            "Customer ID",
            "Partner/ID",
        ),
        "zip": _pick(headers, "Zip", "ZIP", "Postal Code", "Postcode", "Zip Code", "Customer Zip"),
    }


def _row_to_line(row, cols):
    oid = (row.get(cols["order_id"]) or "").strip()
    if not oid:
        return None
    name = (row.get(cols["product"]) or "").strip()
    line_total = _f(row.get(cols["total"])) if cols["total"] else None
    if line_total is None:
        line_total = 0.0
    qty = _f(row.get(cols["qty"])) if cols["qty"] else None
    unit = _f(row.get(cols["unit_price"])) if cols["unit_price"] else None
    if unit is None and qty:
        unit = line_total / qty if qty else None
    cust = (row.get(cols["customer"]) or "").strip() if cols["customer"] else ""
    dt = _parse_date(row.get(cols["date"])) if cols["date"] else None
    z = _normalize_zip(row.get(cols["zip"])) if cols["zip"] else None
    return {
        "order_id": oid,
        "date": dt,
        "product": name,
        "qty": qty,
        "total": line_total,
        "unit_price": unit,
        "customer": cust or None,
        "zip": z,
    }


def lines_from_csv(csv_text):
    """Parse an order-line CSV export into normalized sale-line dicts."""
    reader = csv.DictReader(io.StringIO(csv_text))
    headers = reader.fieldnames or []
    if not headers:
        raise ValueError("No header row found in CSV.")
    cols = _csv_column_map(headers)
    if not (cols["order_id"] and cols["product"] and cols["total"]):
        raise ValueError(
            "CSV must have at least Order, Product and Total columns. "
            f"Found headers: {headers}"
        )
    lines = []
    for row in reader:
        line = _row_to_line(row, cols)
        if line:
            lines.append(line)
    if not lines:
        raise ValueError("No valid orders parsed from CSV.")
    return lines


def analyze_lines(lines, categories, weather_categories=None, store_location=None, zip_centroids=None, extra=None):
    """Build sales facts from normalized order-line records (API or merged CSV)."""
    cat_keys = [c["key"] for c in categories]
    orders = {}
    customers = {}
    prod_rev = {}
    prod_units = {}
    prod_price_sum = {}
    prod_price_wt = {}
    cat_price_rev = {k: 0.0 for k in cat_keys}
    cat_price_units = {k: 0.0 for k in cat_keys}

    wcats = weather_categories or []
    wkeys = [c["key"] for c in wcats]
    wcat_rev = {k: [0.0] * 7 for k in wkeys}
    wcat_dates = {k: [set() for _ in range(7)] for k in wkeys}

    rows = 0
    for line in lines:
        rows += 1
        oid = line["order_id"]
        name = line.get("product") or ""
        line_total = line.get("total") or 0.0
        qty = line.get("qty")
        unit = line.get("unit_price")
        cust = line.get("customer")
        o = orders.setdefault(oid, {"total": 0.0, "date": None, "cats": set(), "customer": cust, "zip": None})
        o["total"] += line_total
        if o["date"] is None and line.get("date"):
            o["date"] = line["date"]
        if cust and o["customer"] is None:
            o["customer"] = cust
        if line.get("zip") and o["zip"] is None:
            o["zip"] = line["zip"]

        cats = _match_cat(name, categories)
        for ck in cats:
            o["cats"].add(ck)

        if name:
            prod_rev[name] = prod_rev.get(name, 0.0) + line_total
            if qty:
                prod_units[name] = prod_units.get(name, 0.0) + qty
            if unit is not None:
                w = qty or 1
                prod_price_sum[name] = prod_price_sum.get(name, 0.0) + unit * w
                prod_price_wt[name] = prod_price_wt.get(name, 0.0) + w
        for ck in cats:
            if unit is not None:
                w = qty or 1
                cat_price_rev[ck] += unit * w
                cat_price_units[ck] += w

        if wcats and name:
            wc = _match_cat(name, wcats)
            if wc and o["date"]:
                wk = wc[0]
                dow = o["date"].weekday()
                wcat_rev[wk][dow] += line_total
                wcat_dates[wk][dow].add(o["date"].date())

    if not orders:
        raise ValueError("No valid orders parsed from sale lines.")

    for o in orders.values():
        cid = o.get("customer")
        if not cid:
            continue
        c = customers.setdefault(
            cid,
            {
                "orders": 0,
                "spend": 0.0,
                "weekend_orders": 0,
                "weekday_orders": 0,
                "cats": set(),
                "zips": {},
                "last_date": None,
            },
        )
        c["orders"] += 1
        c["spend"] += o["total"]
        c["cats"].update(o["cats"])
        d = o["date"]
        if o.get("zip"):
            c["zips"][o["zip"]] = c["zips"].get(o["zip"], 0) + 1
        if d:
            if c["last_date"] is None or d > c["last_date"]:
                c["last_date"] = d
            if d.weekday() >= 5:
                c["weekend_orders"] += 1
            else:
                c["weekday_orders"] += 1

    totals = [o["total"] for o in orders.values()]
    n_orders = len(orders)
    avg_basket = sum(totals) / n_orders

    meat_totals = [o["total"] for o in orders.values() if "meat" in o["cats"]]
    nonmeat_totals = [o["total"] for o in orders.values() if "meat" not in o["cats"]]

    def avg(lst):
        return round(sum(lst) / len(lst), 2) if lst else 0.0

    # weekend vs weekday
    we_rev, wd_rev = 0.0, 0.0
    we_days, wd_days = set(), set()
    we_orders = 0
    for o in orders.values():
        d = o["date"]
        if not d:
            continue
        if d.weekday() >= 5:  # Sat=5, Sun=6
            we_rev += o["total"]
            we_days.add(d.date())
            we_orders += 1
        else:
            wd_rev += o["total"]
            wd_days.add(d.date())

    # attach rates among meat orders
    meat_order_objs = [o for o in orders.values() if "meat" in o["cats"]]
    n_meat = len(meat_order_objs)
    attach = {}
    for c in categories:
        k = c["key"]
        if k == "meat":
            continue
        if n_meat:
            cnt = sum(1 for o in meat_order_objs if k in o["cats"])
            attach[k] = round(100 * cnt / n_meat, 1)
        else:
            attach[k] = 0.0

    # hero seller (top tortilla product by revenue), else top product overall.
    # Its basket value is approximated by the avg basket of tortilla-containing orders.
    tortilla_prods = {p: rev for p, rev in prod_rev.items() if "tortilla" in p.lower()}
    if tortilla_prods:
        hero = max(tortilla_prods, key=tortilla_prods.get)
    else:
        hero = max(prod_rev, key=prod_rev.get) if prod_rev else ""
    hero_basket_vals = [o["total"] for o in orders.values() if "tortilla" in o["cats"]]
    hero_basket_avg = avg(hero_basket_vals) if hero_basket_vals else avg(meat_totals)

    own_price_by_cat = {}
    for k in cat_keys:
        if cat_price_units[k] > 0:
            own_price_by_cat[k] = round(cat_price_rev[k] / cat_price_units[k], 2)

    top_products = []
    for name, rev in sorted(prod_rev.items(), key=lambda x: x[1], reverse=True)[:12]:
        wt = prod_price_wt.get(name, 0)
        avg_p = round(prod_price_sum[name] / wt, 2) if wt else None
        top_products.append(
            {
                "name": name,
                "revenue": round(rev, 2),
                "units": round(prod_units.get(name, 0), 1),
                "avg_price": avg_p,
            }
        )

    customer_analytics = _build_customer_analytics(
        customers, orders, store_location=store_location, zip_centroids=zip_centroids
    )

    weather_baselines = {}
    for k in wkeys:
        by_dow = {}
        for dow in range(7):
            n_days = len(wcat_dates[k][dow])
            if n_days:
                by_dow[str(dow)] = round(wcat_rev[k][dow] / n_days, 0)
        total_days = sum(len(wcat_dates[k][d]) for d in range(7))
        total_rev = sum(wcat_rev[k])
        if total_days:
            by_dow["avg"] = round(total_rev / total_days, 0)
        if by_dow:
            weather_baselines[k] = by_dow

    facts = {
        "rows": rows,
        "orders": n_orders,
        "total_revenue": round(sum(totals), 2),
        "avg_basket": round(avg_basket, 2),
        "meat_basket_avg": avg(meat_totals),
        "nonmeat_basket_avg": avg(nonmeat_totals),
        "weekend_avg_basket": avg([o["total"] for o in orders.values() if o["date"] and o["date"].weekday() >= 5]),
        "weekday_avg_basket": avg([o["total"] for o in orders.values() if o["date"] and o["date"].weekday() < 5]),
        "weekend_rev_per_day": round(we_rev / len(we_days), 0) if we_days else 0,
        "weekday_rev_per_day": round(wd_rev / len(wd_days), 0) if wd_days else 0,
        "weekend_orders_per_day": round(we_orders / len(we_days), 0) if we_days else 0,
        "attach_rates_pct": attach,
        "hero_seller": hero,
        "hero_basket_avg": hero_basket_avg,
        "own_price_by_cat": own_price_by_cat,
        "top_products": top_products,
        "customer_analytics": customer_analytics,
        "weather_baselines": weather_baselines,
    }
    if extra:
        facts["integration_meta"] = extra
    return facts


def analyze(csv_text, categories, weather_categories=None, store_location=None, zip_centroids=None, extra=None):
    """Analyze a single order-line CSV export (legacy upload path)."""
    lines = lines_from_csv(csv_text)
    return analyze_lines(
        lines,
        categories,
        weather_categories=weather_categories,
        store_location=store_location,
        zip_centroids=zip_centroids,
        extra=extra,
    )


def _build_trade_area(customers, orders, store_location=None, zip_centroids=None):
    """ZIP distribution and rough radius from store using known ZIP centroids."""
    store = store_location or {}
    store_lat = store.get("latitude")
    store_lon = store.get("longitude")
    store_zip = store.get("zip") or ""
    centroids = dict(zip_centroids or {})
    if store_zip and store_lat and store_lon:
        centroids.setdefault(store_zip, [store_lat, store_lon])

    empty = {
        "has_zip_data": False,
        "store_zip": store_zip,
        "store_city": store.get("city"),
        "within_5_mi_pct": None,
        "within_10_mi_pct": None,
        "top_zips": [],
        "note": "Add a ZIP or postal code field to your POS export to see trade-area reach.",
    }

    # Prefer one row per customer; fall back to order ZIP counts.
    zip_counts = {}
    if customers:
        for c in customers.values():
            if not c.get("zips"):
                continue
            primary = max(c["zips"], key=c["zips"].get)
            zip_counts[primary] = zip_counts.get(primary, 0) + 1
        subject_count = len([c for c in customers.values() if c.get("zips")])
    else:
        for o in orders.values():
            if o.get("zip"):
                zip_counts[o["zip"]] = zip_counts.get(o["zip"], 0) + 1
        subject_count = sum(zip_counts.values())

    if not zip_counts:
        return empty

    total = sum(zip_counts.values())
    top_zips = [
        {
            "zip": z,
            "count": n,
            "pct": round(100 * n / total, 1),
        }
        for z, n in sorted(zip_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    within_5 = within_10 = None
    if store_lat is not None and store_lon is not None and centroids:
        n5 = n10 = n_known = 0
        for z, n in zip_counts.items():
            coords = centroids.get(z)
            if not coords:
                continue
            dist = _haversine_miles(store_lat, store_lon, coords[0], coords[1])
            n_known += n
            if dist <= 5:
                n5 += n
            if dist <= 10:
                n10 += n
        if n_known:
            within_5 = round(100 * n5 / n_known, 1)
            within_10 = round(100 * n10 / n_known, 1)

    return {
        "has_zip_data": True,
        "store_zip": store_zip,
        "store_city": store.get("city"),
        "within_5_mi_pct": within_5,
        "within_10_mi_pct": within_10,
        "top_zips": top_zips,
        "customers_with_zip": subject_count if customers else None,
        "orders_with_zip": total if not customers else None,
        "note": None,
    }


def _build_top_customers(customers):
    if not customers:
        return []
    ranked = sorted(customers.items(), key=lambda x: x[1]["spend"], reverse=True)[:10]
    out = []
    for cid, c in ranked:
        last = c.get("last_date")
        out.append(
            {
                "id_masked": _mask_customer_id(cid),
                "orders": c["orders"],
                "spend": round(c["spend"], 2),
                "avg_basket": round(c["spend"] / c["orders"], 2) if c["orders"] else 0,
                "last_visit": last.strftime("%Y-%m-%d") if last else None,
                "tier": _loyalty_tier_label(c["orders"]),
                "primary_zip": max(c["zips"], key=c["zips"].get) if c.get("zips") else None,
            }
        )
    return out


def _build_customer_analytics(customers, orders, store_location=None, zip_centroids=None):
    """Segment shoppers by visit frequency, spend, and weekend vs weekday rhythm."""
    n_orders = len(orders)
    n_customers = len(customers)

    if not customers:
        small = [o["total"] for o in orders.values() if o["total"] < 25]
        medium = [o["total"] for o in orders.values() if 25 <= o["total"] < 55]
        large = [o["total"] for o in orders.values() if o["total"] >= 55]

        def basket_seg(key, label, lst):
            if not lst:
                return None
            return {
                "key": key,
                "label": label,
                "orders": len(lst),
                "pct": round(100 * len(lst) / n_orders, 1),
                "avg_basket": round(sum(lst) / len(lst), 2),
            }

        return {
            "has_customer_ids": False,
            "unique_customers": 0,
            "orders_with_customer": 0,
            "retention_rate_pct": None,
            "segments": [],
            "loyalty_tiers": [],
            "rhythm_segments": [],
            "basket_segments": [
                s
                for s in [
                    basket_seg("basket_small", "Small basket (<$25)", small),
                    basket_seg("basket_medium", "Medium ($25–$54)", medium),
                    basket_seg("basket_large", "Large ($55+)", large),
                ]
                if s
            ],
            "top_customers": [],
            "trade_area": _build_trade_area(
                {}, orders, store_location=store_location, zip_centroids=zip_centroids
            ),
        }

    repeat = sum(1 for c in customers.values() if c["orders"] >= 2)
    retention = round(100 * repeat / n_customers, 1) if n_customers else 0

    loyalty_defs = [
        ("new", "New (1 visit)", lambda c: c["orders"] == 1),
        ("returning", "Returning (2–3)", lambda c: 2 <= c["orders"] <= 3),
        ("loyal", "Loyal (4–10)", lambda c: 4 <= c["orders"] <= 10),
        ("champion", "Champion (11+)", lambda c: c["orders"] >= 11),
    ]
    loyalty_tiers = []
    for key, label, pred in loyalty_defs:
        matched = [c for c in customers.values() if pred(c)]
        if not matched:
            continue
        loyalty_tiers.append(
            {
                "key": key,
                "label": label,
                "count": len(matched),
                "pct": round(100 * len(matched) / n_customers, 1),
                "avg_spend": round(sum(c["spend"] for c in matched) / len(matched), 2),
                "avg_orders": round(sum(c["orders"] for c in matched) / len(matched), 1),
            }
        )

    spends = sorted(c["spend"] for c in customers.values())
    p33 = spends[len(spends) // 3] if spends else 0
    p66 = spends[(2 * len(spends)) // 3] if spends else 0

    value_defs = [
        ("value_low", "Value shoppers", lambda s: s <= p33),
        ("value_mid", "Core shoppers", lambda s: p33 < s <= p66),
        ("value_high", "High-value", lambda s: s > p66),
    ]
    segments = []
    for key, label, pred in value_defs:
        matched = [c for c in customers.values() if pred(c["spend"])]
        if not matched:
            continue
        segments.append(
            {
                "key": key,
                "label": label,
                "count": len(matched),
                "pct": round(100 * len(matched) / n_customers, 1),
                "avg_basket": round(sum(c["spend"] / c["orders"] for c in matched) / len(matched), 2),
                "avg_spend": round(sum(c["spend"] for c in matched) / len(matched), 2),
            }
        )

    rhythm_defs = [
        ("weekend_primary", "Weekend-first", lambda c: c["weekend_orders"] > c["weekday_orders"]),
        ("weekday_primary", "Weekday-first", lambda c: c["weekday_orders"] > c["weekend_orders"]),
        ("balanced", "Balanced rhythm", lambda c: c["weekend_orders"] == c["weekday_orders"] and c["orders"] > 0),
    ]
    rhythm_segments = []
    for key, label, pred in rhythm_defs:
        matched = [c for c in customers.values() if pred(c)]
        if not matched:
            continue
        rhythm_segments.append(
            {
                "key": key,
                "label": label,
                "count": len(matched),
                "pct": round(100 * len(matched) / n_customers, 1),
                "avg_spend": round(sum(c["spend"] for c in matched) / len(matched), 2),
            }
        )

    small = [o["total"] for o in orders.values() if o["total"] < 25]
    medium = [o["total"] for o in orders.values() if 25 <= o["total"] < 55]
    large = [o["total"] for o in orders.values() if o["total"] >= 55]

    def basket_seg(key, label, lst):
        if not lst:
            return None
        return {
            "key": key,
            "label": label,
            "orders": len(lst),
            "pct": round(100 * len(lst) / n_orders, 1),
            "avg_basket": round(sum(lst) / len(lst), 2),
        }

    basket_segments = [
        s
        for s in [
            basket_seg("basket_small", "Small basket (<$25)", small),
            basket_seg("basket_medium", "Medium ($25–$54)", medium),
            basket_seg("basket_large", "Large ($55+)", large),
        ]
        if s
    ]

    orders_with_customer = sum(1 for o in orders.values() if o.get("customer"))

    return {
        "has_customer_ids": True,
        "unique_customers": n_customers,
        "orders_with_customer": orders_with_customer,
        "retention_rate_pct": retention,
        "segments": segments,
        "loyalty_tiers": loyalty_tiers,
        "rhythm_segments": rhythm_segments,
        "basket_segments": basket_segments,
        "top_customers": _build_top_customers(customers),
        "trade_area": _build_trade_area(
            customers, orders, store_location=store_location, zip_centroids=zip_centroids
        ),
    }
