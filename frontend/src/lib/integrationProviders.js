/** Static ERP/POS provider definitions — mirrors backend integrations/providers.py */

export const CSV_FILE_TYPES = {
  sales: {
    label: "Sales / order lines",
    required: true,
    hint: "One row per line item: Order, Date, Product, Qty, Total.",
  },
  customers: {
    label: "Customers",
    required: false,
    hint: "Customer ID or name plus ZIP for trade-area and loyalty views.",
  },
  products: {
    label: "Products",
    required: false,
    hint: "SKU or internal ID mapped to product name when sales rows use codes only.",
  },
  loyalty: {
    label: "Loyalty",
    required: false,
    hint: "Member ID, points balance, tier — stored for future outreach segments.",
  },
  offers: {
    label: "Offers / promotions",
    required: false,
    hint: "Active promos and discounts — stored for merchandising context.",
  },
  pricelist: {
    label: "Pricelist",
    required: false,
    hint: "Shelf or list prices by product — enriches competitive price views later.",
  },
};

export const PROVIDERS = [
  {
    id: "odoo",
    label: "Odoo",
    mode: "api",
    available: true,
    description:
      "Odoo exposes order lines over XML-RPC. Use a dedicated API user with read access to POS/Sales orders.",
    docs: "In Odoo: Settings → Users → your API user → API Keys → New. Grant POS and Sales read access.",
    fields: [
      { key: "url", label: "Instance URL", type: "url", placeholder: "https://yourstore.odoo.com", required: true },
      { key: "database", label: "Database name", type: "text", placeholder: "yourstore-main", required: true },
      { key: "username", label: "Login / email", type: "text", placeholder: "api@labodega.com", required: true },
      {
        key: "api_key",
        label: "API key or password",
        type: "password",
        placeholder: "Paste API key (preferred) or user password",
        required: true,
        secret: true,
      },
      {
        key: "order_model",
        label: "Order source",
        type: "select",
        options: [
          { value: "pos.order", label: "POS orders (pos.order)" },
          { value: "sale.order", label: "Sales orders (sale.order)" },
        ],
        default: "pos.order",
      },
      { key: "days_back", label: "Days of history", type: "number", default: 90, min: 7, max: 365 },
    ],
  },
  {
    id: "square",
    label: "Square",
    mode: "api",
    available: false,
    description: "Square Orders API — access token plus location ID.",
    fields: [
      { key: "access_token", label: "Access token", type: "password", required: true, secret: true },
      { key: "location_id", label: "Location ID", type: "text", required: true },
    ],
  },
  {
    id: "toast",
    label: "Toast",
    mode: "api",
    available: false,
    description: "Toast REST API — client ID, secret, and restaurant GUID.",
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client secret", type: "password", required: true, secret: true },
      { key: "restaurant_guid", label: "Restaurant GUID", type: "text", required: true },
    ],
  },
  {
    id: "clover",
    label: "Clover",
    mode: "api",
    available: false,
    description: "Clover merchant API — merchant ID and access token from the developer dashboard.",
    fields: [
      { key: "merchant_id", label: "Merchant ID", type: "text", required: true },
      { key: "access_token", label: "Access token", type: "password", required: true, secret: true },
    ],
  },
  {
    id: "csv",
    label: "CSV only",
    mode: "manual",
    available: true,
    description: "No API — upload exports from any ERP or POS manually.",
    fields: [],
  },
];

export function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
}

export const DEFAULT_STATUS = {
  provider: "odoo",
  providers: PROVIDERS.map(({ fields, ...p }) => p),
  csv_file_types: CSV_FILE_TYPES,
  last_sync_at: null,
  last_sync_status: null,
  last_sync_error: null,
  connection: {},
};
