/** Illustrative store pulse — shown before POS upload (matches live API shape). */

export const DEMO_STORE_PULSE = {
  pulse: {
    has_date_data: true,
    anchor_date: "2026-05-31",
    yesterday: { revenue: 8420, orders: 248, avg_basket: 33.95 },
    last_7_days: { revenue: 53880, orders: 1624, avg_basket: 33.15 },
    prior_7_days: { revenue: 49120, orders: 1588, avg_basket: 30.93 },
    wow_revenue_pct: 9.7,
    wow_orders_pct: 2.3,
    wow_avg_basket_pct: 7.2,
  },
  daily_sales: [
    { date: "2026-05-25", label: "Sun 05/25", revenue: 8120, orders: 241, avg_basket: 33.7 },
    { date: "2026-05-26", label: "Mon 05/26", revenue: 6240, orders: 228, avg_basket: 27.4 },
    { date: "2026-05-27", label: "Tue 05/27", revenue: 6980, orders: 252, avg_basket: 27.7 },
    { date: "2026-05-28", label: "Wed 05/28", revenue: 7120, orders: 261, avg_basket: 27.3 },
    { date: "2026-05-29", label: "Thu 05/29", revenue: 7340, orders: 268, avg_basket: 27.4 },
    { date: "2026-05-30", label: "Fri 05/30", revenue: 9680, orders: 286, avg_basket: 33.8 },
    { date: "2026-05-31", label: "Sat 05/31", revenue: 8420, orders: 248, avg_basket: 33.95 },
  ],
  product_movers: {
    has_data: true,
    period_label: "This week vs last week",
    rising: [
      { name: "El Milagro Corn Tortillas", recent_revenue: 2840, prior_revenue: 2410, change_pct: 17.8 },
      { name: "Carne Asada (thin cut)", recent_revenue: 4120, prior_revenue: 3680, change_pct: 12.0 },
      { name: "Jarritos Mandarin", recent_revenue: 980, prior_revenue: 820, change_pct: 19.5 },
    ],
    falling: [
      { name: "Store-brand rice 20lb", recent_revenue: 620, prior_revenue: 840, change_pct: -26.2 },
      { name: "Whole chicken fryer", recent_revenue: 1180, prior_revenue: 1320, change_pct: -10.6 },
    ],
  },
  category_movers: {
    has_data: true,
    period_label: "This week vs last week",
    rising: [
      { key: "meat", label: "Meat / Carne", recent_revenue: 18420, prior_revenue: 16840, change_pct: 9.4 },
      { key: "produce", label: "Produce", recent_revenue: 6240, prior_revenue: 5780, change_pct: 8.0 },
    ],
    falling: [
      { key: "grocery", label: "Grocery", recent_revenue: 8420, prior_revenue: 8960, change_pct: -6.0 },
    ],
  },
  promo_intelligence: {
    has_data: true,
    period_label: "Last 7 days",
    promo_order_pct: 18.4,
    promo_orders: 299,
    total_orders: 1624,
    items_in_baskets: [
      { name: "Weekend carne asada pack", orders: 142, revenue: 4260, source: "promo_keyword" },
      { name: "Family taco combo", orders: 98, revenue: 1960, source: "promo_keyword" },
      { name: "El Milagro Corn Tortillas (2/$5)", orders: 86, revenue: 430, source: "offers_csv" },
    ],
    note: null,
  },
};

export function pickStoreAnalytics(facts, isSample) {
  if (isSample || !facts?.store_pulse?.has_date_data) {
    return { ...DEMO_STORE_PULSE, isSample: true };
  }
  return {
    pulse: facts.store_pulse,
    daily_sales: facts.daily_sales || [],
    product_movers: facts.product_movers || { has_data: false },
    category_movers: facts.category_movers || { has_data: false },
    promo_intelligence: facts.promo_intelligence || { has_data: false },
    isSample: false,
  };
}
