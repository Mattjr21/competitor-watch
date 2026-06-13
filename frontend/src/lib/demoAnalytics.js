/** Illustrative customer analytics — shown before POS upload (same shape as live data). */

export const DEMO_BADGE = "Sample · May sales analysis";

export const DEMO_BASKET = {
  avg_basket: 30.24,
  meat_basket_avg: 54.64,
  nonmeat_basket_avg: 17.01,
  weekend_avg_basket: 33.15,
  weekday_avg_basket: 27.32,
  basket_segments: [
    { key: "basket_small", label: "Small basket (<$25)", orders: 412, pct: 41.2, avg_basket: 18.4 },
    { key: "basket_medium", label: "Medium ($25–$54)", orders: 378, pct: 37.8, avg_basket: 38.6 },
    { key: "basket_large", label: "Large ($55+)", orders: 210, pct: 21.0, avg_basket: 72.3 },
  ],
};

export const DEMO_LOYALTY = {
  unique_customers: 1842,
  retention_rate_pct: 38.5,
  orders_with_customer: 2840,
  loyalty_new_count: 1132,
  loyalty_repeat_count: 710,
  loyalty_tiers: [
    { key: "new", label: "New (1 visit)", count: 1132, pct: 61.5, avg_spend: 24.8, avg_orders: 1 },
    { key: "returning", label: "Returning (2–3)", count: 498, pct: 27.0, avg_spend: 86.4, avg_orders: 2.4 },
    { key: "loyal", label: "Loyal (4–10)", count: 168, pct: 9.1, avg_spend: 214.2, avg_orders: 6.2 },
    { key: "champion", label: "Champion (11+)", count: 44, pct: 2.4, avg_spend: 612.5, avg_orders: 14.8 },
  ],
  segments: [
    { key: "value_low", label: "Value shoppers", count: 614, pct: 33.3, avg_basket: 22.1 },
    { key: "value_mid", label: "Core shoppers", count: 627, pct: 34.0, avg_basket: 31.8 },
    { key: "value_high", label: "High spenders", count: 601, pct: 32.7, avg_basket: 48.6 },
  ],
  rhythm_segments: [
    { key: "weekend_heavy", label: "Weekend-heavy", count: 692, pct: 37.6 },
    { key: "weekday_heavy", label: "Weekday-heavy", count: 554, pct: 30.1 },
    { key: "mixed", label: "Mixed rhythm", count: 596, pct: 32.3 },
  ],
};

export const DEMO_TOP_CUSTOMERS = [
  { id_masked: "C-•••4821", orders: 18, spend: 1248, avg_basket: 69.3, tier: "Champion", last_visit: "2026-05-28" },
  { id_masked: "C-•••9034", orders: 14, spend: 986, avg_basket: 70.4, tier: "Champion", last_visit: "2026-05-30" },
  { id_masked: "C-•••7712", orders: 11, spend: 842, avg_basket: 76.5, tier: "Loyal", last_visit: "2026-05-27" },
  { id_masked: "C-•••3389", orders: 9, spend: 715, avg_basket: 79.4, tier: "Loyal", last_visit: "2026-05-29" },
  { id_masked: "C-•••5560", orders: 8, spend: 628, avg_basket: 78.5, tier: "Loyal", last_visit: "2026-05-25" },
  { id_masked: "C-•••2147", orders: 7, spend: 542, avg_basket: 77.4, tier: "Returning", last_visit: "2026-05-31" },
];

/** Build attach-rate rows from config facts + category labels. */
export function demoAttachRateRows(attachRates, categoryLabels = {}) {
  if (!attachRates) return [];
  return Object.entries(attachRates)
    .map(([key, pct]) => ({
      key,
      label: categoryLabels[key] || key,
      value: pct,
    }))
    .sort((a, b) => b.value - a.value);
}

export function demoTopCustomerRows(customers = DEMO_TOP_CUSTOMERS) {
  return customers.map((row, i) => ({
    key: row.id_masked || i,
    label: row.id_masked,
    value: row.spend,
    sub: `${row.orders} visits · $${row.avg_basket} avg · ${row.tier}`,
  }));
}
