"""
Merge multiple manual CSV exports (sales, customers, products, etc.) into sale lines.
"""

import csv
import io

import sales


def _read_rows(csv_text):
    reader = csv.DictReader(io.StringIO(csv_text))
    headers = reader.fieldnames or []
    if not headers:
        raise ValueError("No header row found in CSV.")
    return headers, list(reader)


def _customer_zip_map(csv_text):
    """Build customer id/name -> ZIP from a customers export."""
    headers, rows = _read_rows(csv_text)
    c_id = sales._pick(headers, "Customer", "Partner", "Member", "Customer ID", "ID", "External ID")
    c_zip = sales._pick(headers, "Zip", "ZIP", "Postal Code", "Postcode", "Zip Code")
    if not (c_id and c_zip):
        return {}
    out = {}
    for r in rows:
        cid = (r.get(c_id) or "").strip()
        z = sales._normalize_zip(r.get(c_zip))
        if cid and z:
            out[cid] = z
    return out


def _product_name_map(csv_text):
    """Build product code/SKU -> display name."""
    headers, rows = _read_rows(csv_text)
    c_code = sales._pick(headers, "SKU", "Internal Reference", "Default Code", "Product Code", "ID")
    c_name = sales._pick(headers, "Product", "Product Name", "Name", "Display Name")
    if not (c_code and c_name):
        return {}
    out = {}
    for r in rows:
        code = (r.get(c_code) or "").strip()
        name = (r.get(c_name) or "").strip()
        if code and name:
            out[code] = name
    return out


def _parse_offers(csv_text):
    """Parse offers/promotions export into match terms for promo-in-basket detection."""
    headers, rows = _read_rows(csv_text)
    c_label = sales._pick(headers, "Offer", "Promotion", "Name", "Campaign", "Deal")
    c_prod = sales._pick(headers, "Product", "Product Name", "Item", "SKU")
    if not (c_label or c_prod):
        return []
    out = []
    for r in rows:
        label = (r.get(c_label) or "").strip() if c_label else ""
        prod = (r.get(c_prod) or "").strip() if c_prod else ""
        if not (label or prod):
            continue
        out.append({"label": label or prod, "product": prod or label})
    return out


def _summarize_auxiliary(csv_text, kind):
    headers, rows = _read_rows(csv_text)
    return {"kind": kind, "rows": len(rows), "columns": headers[:12]}


def build_lines_from_bundle(files):
    """
    files: dict keyed by sales|customers|products|loyalty|offers|pricelist -> csv text.
    Returns (lines, integration_meta).
    """
    sales_text = (files.get("sales") or "").strip()
    if not sales_text:
        raise ValueError("Sales / order-lines CSV is required.")

    lines = sales.lines_from_csv(sales_text)
    meta = {"source": "csv_bundle", "files_loaded": ["sales"]}

    customers_text = (files.get("customers") or "").strip()
    if customers_text:
        zmap = _customer_zip_map(customers_text)
        if zmap:
            for line in lines:
                if not line.get("zip") and line.get("customer"):
                    line["zip"] = zmap.get(line["customer"])
            meta["customers_enriched"] = len(zmap)
        meta["files_loaded"].append("customers")

    products_text = (files.get("products") or "").strip()
    if products_text:
        pmap = _product_name_map(products_text)
        if pmap:
            for line in lines:
                prod = line.get("product") or ""
                if prod in pmap:
                    line["product"] = pmap[prod]
            meta["products_mapped"] = len(pmap)
        meta["files_loaded"].append("products")

    for kind in ("loyalty", "pricelist"):
        text = (files.get(kind) or "").strip()
        if text:
            meta[kind] = _summarize_auxiliary(text, kind)
            meta["files_loaded"].append(kind)

    offers_text = (files.get("offers") or "").strip()
    if offers_text:
        parsed = _parse_offers(offers_text)
        if parsed:
            meta["offers_parsed"] = parsed
        meta["offers"] = _summarize_auxiliary(offers_text, "offers")
        meta["files_loaded"].append("offers")

    return lines, meta
