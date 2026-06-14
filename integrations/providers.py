"""Registry of store-data providers (Odoo, CSV, Square, Toast, Clover)."""

PROVIDERS = {
    "odoo": {
        "id": "odoo",
        "label": "Odoo",
        "mode": "api",
        "available": True,
        "description": "Sync order lines from Odoo POS or Sales via XML-RPC for near real-time data.",
        "docs": "Create an API user in Odoo with read access to POS/Sales. Generate an API key under user preferences.",
        "fields": [
            {"key": "url", "label": "Instance URL", "type": "url", "required": True},
            {"key": "database", "label": "Database name", "type": "text", "required": True},
            {"key": "username", "label": "Login / email", "type": "text", "required": True},
            {"key": "api_key", "label": "API key or password", "type": "password", "required": True, "secret": True},
            {
                "key": "order_model",
                "label": "Order source",
                "type": "select",
                "options": [
                    {"value": "pos.order", "label": "POS orders (pos.order)"},
                    {"value": "sale.order", "label": "Sales orders (sale.order)"},
                ],
                "default": "pos.order",
            },
            {"key": "days_back", "label": "Days of history", "type": "number", "default": 90},
        ],
        "env_vars": ["ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_API_KEY"],
        "optional_env": ["ODOO_PASSWORD", "ODOO_DAYS_BACK", "ODOO_ORDER_MODEL"],
    },
    "csv": {
        "id": "csv",
        "label": "CSV only",
        "mode": "manual",
        "available": True,
        "description": "Upload exports manually — works with any ERP or POS.",
        "fields": [],
        "env_vars": [],
    },
    "square": {
        "id": "square",
        "label": "Square",
        "mode": "api",
        "available": False,
        "description": "Square Orders API — access token plus location ID.",
        "fields": [
            {"key": "access_token", "label": "Access token", "type": "password", "required": True, "secret": True},
            {"key": "location_id", "label": "Location ID", "type": "text", "required": True},
        ],
        "env_vars": ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID"],
    },
    "toast": {
        "id": "toast",
        "label": "Toast",
        "mode": "api",
        "available": False,
        "description": "Toast REST API — client credentials and restaurant GUID.",
        "fields": [
            {"key": "client_id", "label": "Client ID", "type": "text", "required": True},
            {"key": "client_secret", "label": "Client secret", "type": "password", "required": True, "secret": True},
            {"key": "restaurant_guid", "label": "Restaurant GUID", "type": "text", "required": True},
        ],
        "env_vars": ["TOAST_CLIENT_ID", "TOAST_CLIENT_SECRET", "TOAST_RESTAURANT_GUID"],
    },
    "clover": {
        "id": "clover",
        "label": "Clover",
        "mode": "api",
        "available": False,
        "description": "Clover merchant API — merchant ID and access token.",
        "fields": [
            {"key": "merchant_id", "label": "Merchant ID", "type": "text", "required": True},
            {"key": "access_token", "label": "Access token", "type": "password", "required": True, "secret": True},
        ],
        "env_vars": ["CLOVER_MERCHANT_ID", "CLOVER_ACCESS_TOKEN"],
    },
}

CSV_FILE_TYPES = {
    "sales": {
        "label": "Sales / order lines",
        "required": True,
        "hint": "One row per line item: Order, Date, Product, Qty, Total (Odoo sale.report style).",
    },
    "customers": {
        "label": "Customers",
        "required": False,
        "hint": "Customer ID or name plus ZIP for trade-area and loyalty views.",
    },
    "products": {
        "label": "Products",
        "required": False,
        "hint": "SKU or internal ID mapped to product name when sales rows use codes only.",
    },
    "loyalty": {
        "label": "Loyalty",
        "required": False,
        "hint": "Member ID, points balance, tier — stored for future outreach segments.",
    },
    "offers": {
        "label": "Offers / promotions",
        "required": False,
        "hint": "Active promos and discounts — stored for merchandising context.",
    },
    "pricelist": {
        "label": "Pricelist",
        "required": False,
        "hint": "Shelf or list prices by product — enriches competitive price views later.",
    },
}


def list_providers():
    out = []
    for p in PROVIDERS.values():
        item = dict(p)
        item.pop("fields", None)
        out.append(item)
    return out


def get_provider(provider_id):
    return PROVIDERS.get(provider_id)


def provider_fields(provider_id):
    p = PROVIDERS.get(provider_id) or {}
    return p.get("fields") or []
