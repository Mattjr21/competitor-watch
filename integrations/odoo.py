"""
Odoo XML-RPC sync — POS or Sales order lines (stdlib only).
"""

import datetime
import os
import xmlrpc.client

from integrations.state import get_credentials, load_integration_state, save_integration_state


def _env(name, default=""):
    return os.environ.get(name, default).strip()


def _saved_odoo():
    return get_credentials("odoo")


def _credentials():
    saved = _saved_odoo()
    url = _env("ODOO_URL") or (saved.get("url") or "").strip()
    db = _env("ODOO_DB") or (saved.get("database") or saved.get("db") or "").strip()
    user = _env("ODOO_USERNAME") or (saved.get("username") or "").strip()
    secret = _env("ODOO_API_KEY") or _env("ODOO_PASSWORD") or (saved.get("api_key") or "").strip()
    source = "env" if _env("ODOO_URL") else ("saved" if saved.get("url") else None)
    if not all([url, db, user, secret]):
        missing = []
        if not url:
            missing.append("Instance URL")
        if not db:
            missing.append("Database name")
        if not user:
            missing.append("Login / email")
        if not secret:
            missing.append("API key or password")
        raise ValueError(f"Odoo not connected — fill in: {', '.join(missing)}")
    return url.rstrip("/"), db, user, secret, source


def connection_status():
    """Return saved/env credential status without a network call."""
    saved = _saved_odoo()
    try:
        url, db, user, secret, source = _credentials()
        return {
            "configured": True,
            "url": url,
            "database": db,
            "username": user,
            "has_secret": bool(secret),
            "source": source or "saved",
            "order_model": _order_model(),
            "days_back": _days_back(),
        }
    except ValueError as e:
        out = {
            "configured": False,
            "error": str(e),
            "url": saved.get("url") or _env("ODOO_URL") or "",
            "database": saved.get("database") or saved.get("db") or _env("ODOO_DB") or "",
            "username": saved.get("username") or _env("ODOO_USERNAME") or "",
            "has_secret": bool(saved.get("api_key") or _env("ODOO_API_KEY") or _env("ODOO_PASSWORD")),
            "order_model": saved.get("order_model") or _env("ODOO_ORDER_MODEL") or "pos.order",
            "days_back": _days_back(saved.get("days_back")),
        }
        return out


def public_connection(saved=None):
    """Safe subset for API responses — never returns secrets."""
    saved = saved if saved is not None else _saved_odoo()
    status = connection_status()
    return {
        "url": status.get("url") or saved.get("url") or "",
        "database": status.get("database") or saved.get("database") or saved.get("db") or "",
        "username": status.get("username") or saved.get("username") or "",
        "has_secret": status.get("has_secret", False),
        "configured": status.get("configured", False),
        "source": status.get("source"),
        "order_model": status.get("order_model") or saved.get("order_model") or "pos.order",
        "days_back": status.get("days_back") or _days_back(saved.get("days_back")),
        "error": None if status.get("configured") else status.get("error"),
    }


def _connect():
    url, db, user, secret, _source = _credentials()
    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common", allow_none=True)
    uid = common.authenticate(db, user, secret, {})
    if not uid:
        raise ValueError("Odoo login failed — check URL, database, username, and API key/password.")
    models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object", allow_none=True)
    return db, uid, secret, models, url


def test_connection():
    """Authenticate only — confirms credentials work."""
    _db, uid, _secret, _models, url = _connect()
    return {
        "ok": True,
        "message": f"Connected to Odoo as user id {uid} at {url}.",
        "user_id": uid,
    }


def _days_back(override=None):
    if override is not None:
        try:
            return max(7, min(int(override), 365))
        except (TypeError, ValueError):
            pass
    raw = _env("ODOO_DAYS_BACK")
    if not raw:
        saved = _saved_odoo().get("days_back")
        if saved is not None:
            try:
                return max(7, min(int(saved), 365))
            except (TypeError, ValueError):
                pass
        return 90
    try:
        return max(7, min(int(raw), 365))
    except ValueError:
        return 90


def _order_model():
    model = _env("ODOO_ORDER_MODEL")
    if not model:
        model = (_saved_odoo().get("order_model") or "pos.order").strip()
    if model not in ("pos.order", "sale.order"):
        raise ValueError("Order source must be pos.order (POS) or sale.order (Sales).")
    return model


def _line_model(order_model):
    return "pos.order.line" if order_model == "pos.order" else "sale.order.line"


def fetch_sale_lines():
    """
    Pull recent order lines from Odoo and normalize to sales.analyze_lines format.
    Requires Odoo POS or Sales app with orders in the chosen model.
    """
    db, uid, secret, models, _url = _connect()
    order_model = _order_model()
    line_model = _line_model(order_model)
    date_field = "date_order"
    since = datetime.datetime.utcnow() - datetime.timedelta(days=_days_back())
    since_str = since.strftime("%Y-%m-%d %H:%M:%S")

    line_domain = [(f"order_id.{date_field}", ">=", since_str)]
    line_fields = ["product_id", "qty", "price_subtotal", "price_unit", "order_id"]
    raw_lines = models.execute_kw(
        db, uid, secret,
        line_model, "search_read",
        [line_domain],
        {"fields": line_fields, "limit": 50000},
    )
    if not raw_lines:
        raise ValueError(
            f"No {line_model} records in the last {_days_back()} days. "
            "Check POS is posting orders, or switch order source to sale.order."
        )

    order_ids = sorted({ln["order_id"][0] for ln in raw_lines if ln.get("order_id")})
    order_fields = ["name", date_field, "partner_id"]
    if order_model == "pos.order":
        order_fields.append("pos_reference")
    orders = models.execute_kw(
        db, uid, secret,
        order_model, "read",
        [order_ids],
        {"fields": order_fields},
    )
    order_by_id = {o["id"]: o for o in orders}

    partner_ids = sorted({
        o["partner_id"][0]
        for o in orders
        if o.get("partner_id") and isinstance(o["partner_id"], (list, tuple))
    })
    partner_zip = {}
    if partner_ids:
        partners = models.execute_kw(
            db, uid, secret,
            "res.partner", "read",
            [partner_ids],
            {"fields": ["zip", "name"]},
        )
        for p in partners:
            z = sales_normalize_zip(p.get("zip"))
            partner_zip[p["id"]] = {"zip": z, "name": p.get("name") or ""}

    product_ids = sorted({
        ln["product_id"][0]
        for ln in raw_lines
        if ln.get("product_id") and isinstance(ln["product_id"], (list, tuple))
    })
    product_names = {}
    if product_ids:
        products = models.execute_kw(
            db, uid, secret,
            "product.product", "read",
            [product_ids],
            {"fields": ["display_name", "name"]},
        )
        for p in products:
            product_names[p["id"]] = p.get("display_name") or p.get("name") or f"Product {p['id']}"

    lines = []
    for ln in raw_lines:
        order_ref = ln.get("order_id")
        if not order_ref:
            continue
        oid = order_ref[0]
        order = order_by_id.get(oid)
        if not order:
            continue
        order_key = order.get("pos_reference") or order.get("name") or str(oid)
        dt_raw = order.get(date_field)
        dt = parse_odoo_datetime(dt_raw)
        partner = order.get("partner_id")
        cust = None
        z = None
        if partner and isinstance(partner, (list, tuple)):
            pinfo = partner_zip.get(partner[0], {})
            cust = partner[1] or pinfo.get("name") or str(partner[0])
            z = pinfo.get("zip")
        prod_ref = ln.get("product_id")
        prod_name = prod_ref[1] if prod_ref else ""
        if prod_ref and prod_ref[0] in product_names:
            prod_name = product_names[prod_ref[0]]
        qty = float(ln.get("qty") or 0)
        total = float(ln.get("price_subtotal") or 0)
        unit = ln.get("price_unit")
        unit_f = float(unit) if unit is not None else None
        lines.append({
            "order_id": str(order_key),
            "date": dt,
            "product": (prod_name or "").strip(),
            "qty": qty or None,
            "total": total,
            "unit_price": unit_f,
            "customer": cust,
            "zip": z,
        })

    if not lines:
        raise ValueError("Odoo returned orders but no usable line items.")

    meta = {
        "source": "odoo",
        "order_model": order_model,
        "days_back": _days_back(),
        "lines": len(lines),
        "orders": len(order_ids),
    }
    return lines, meta


def sales_normalize_zip(raw):
    if not raw:
        return None
    s = str(raw).strip()
    m = __import__("re").search(r"\d{5}", s)
    return m.group(0) if m else None


def parse_odoo_datetime(raw):
    if not raw:
        return None
    if isinstance(raw, datetime.datetime):
        return raw
    s = str(raw).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.datetime.strptime(s[:19], fmt)
        except ValueError:
            continue
    return None
