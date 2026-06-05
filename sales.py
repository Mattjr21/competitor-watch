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


def analyze(csv_text, categories, weather_categories=None):
    reader = csv.DictReader(io.StringIO(csv_text))
    headers = reader.fieldnames or []
    if not headers:
        raise ValueError("No header row found in CSV.")

    c_order = _pick(headers, "Order", "Order Ref", "Order Reference")
    c_date = _pick(headers, "Order Date", "Date")
    c_prod = _pick(headers, "Product", "Product Variant", "Order Lines/Product")
    c_qty = _pick(headers, "Qty Ordered", "Order Lines/Quantity", "Quantity")
    c_total = _pick(headers, "Total", "Order Lines/Total cost", "Subtotal")
    c_unit = _pick(headers, "Unit Price", "Order Lines/Unit Price", "Price")

    if not (c_order and c_prod and c_total):
        raise ValueError(
            "CSV must have at least Order, Product and Total columns. "
            f"Found headers: {headers}"
        )

    cat_keys = [c["key"] for c in categories]
    orders = {}            # order_id -> {total, date, cats:set}
    prod_rev = {}          # product -> revenue
    prod_units = {}        # product -> units
    prod_price_sum = {}    # product -> sum(unit price * weight)
    prod_price_wt = {}
    cat_price_rev = {k: 0.0 for k in cat_keys}   # weighted price accumulation
    cat_price_units = {k: 0.0 for k in cat_keys}

    wcats = weather_categories or []
    wkeys = [c["key"] for c in wcats]
    wcat_rev = {k: [0.0] * 7 for k in wkeys}
    wcat_dates = {k: [set() for _ in range(7)] for k in wkeys}

    rows = 0
    for r in reader:
        rows += 1
        oid = (r.get(c_order) or "").strip()
        if not oid:
            continue
        name = (r.get(c_prod) or "").strip()
        line_total = _f(r.get(c_total)) or 0.0
        qty = _f(r.get(c_qty)) if c_qty else None
        unit = _f(r.get(c_unit)) if c_unit else None
        if unit is None and qty:
            unit = line_total / qty if qty else None

        o = orders.setdefault(oid, {"total": 0.0, "date": None, "cats": set()})
        o["total"] += line_total
        if o["date"] is None and c_date:
            o["date"] = _parse_date(r.get(c_date))

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
        raise ValueError("No valid orders parsed from CSV.")

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
        "weather_baselines": weather_baselines,
    }
    return facts
