import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, RefreshCw } from "lucide-react";
import DealCard from "./DealCard";
import CombosSection from "./CombosSection";
import { Eyebrow, CardSkeletonGrid, ErrorState, EmptyState, EASE } from "../lib/ui";

const DEALS_GRID = "grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]";
const FLAT_RESULT_LIMIT = 12;

function filterDeals(deals, { search, catFilter, merchFilter, latinoOnly }) {
  const q = search.toLowerCase();
  return deals.filter((d) => {
    if (catFilter && d.catKey !== catFilter) return false;
    if (merchFilter && d.merchant !== merchFilter) return false;
    if (latinoOnly && !d.is_latino) return false;
    if (!q) return true;
    return (
      d.merchant?.toLowerCase().includes(q) ||
      d.name?.toLowerCase().includes(q) ||
      d.catLabel?.toLowerCase().includes(q) ||
      d.sale_story?.toLowerCase().includes(q)
    );
  });
}

function groupByMerchant(filtered, sortBy) {
  const map = {};
  filtered.forEach((deal) => {
    const key = deal.merchant || "Other";
    (map[key] = map[key] || []).push(deal);
  });
  const entries = Object.entries(map);
  if (sortBy === "merchant") entries.sort((a, b) => a[0].localeCompare(b[0]));
  else if (sortBy === "count") entries.sort((a, b) => b[1].length - a[1].length);
  else if (sortBy === "price") {
    entries.sort((a, b) => {
      const aMin = Math.min(...a[1].map((d) => parseFloat(d.price) || 999));
      const bMin = Math.min(...b[1].map((d) => parseFloat(d.price) || 999));
      return aMin - bMin;
    });
  }
  return entries;
}

export default function DealsSection({ data, loading, error, onRefresh }) {
  const [dealsView, setDealsView] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("merchant");
  const [catFilter, setCatFilter] = useState("");
  const [merchFilter, setMerchFilter] = useState("");
  const [latinoOnly, setLatinoOnly] = useState(false);

  const catMap = useMemo(() => {
    const map = {};
    (data?.categories || []).forEach((c) => (map[c.key] = c.label));
    return map;
  }, [data]);

  const deals = useMemo(() => {
    if (!data?.deals_by_category) return [];
    return Object.entries(data.deals_by_category).flatMap(([cat, items]) =>
      items.map((d) => ({ ...d, catLabel: catMap[cat] || cat, catKey: cat }))
    );
  }, [data, catMap]);

  const filteredDeals = useMemo(
    () => filterDeals(deals, { search, catFilter, merchFilter, latinoOnly }),
    [deals, search, catFilter, merchFilter, latinoOnly]
  );

  const grouped = useMemo(
    () => groupByMerchant(filteredDeals, sortBy),
    [filteredDeals, sortBy]
  );

  const hasFilters = search || catFilter || merchFilter || latinoOnly;
  const useFlatGrid = hasFilters && filteredDeals.length <= FLAT_RESULT_LIMIT;
  const sparseCards = filteredDeals.length <= 3;
  const comboCount = data?.combos?.length || 0;

  const clearFilters = () => {
    setSearch("");
    setCatFilter("");
    setMerchFilter("");
    setLatinoOnly(false);
  };

  if (error && !data) return <ErrorState message={error} onRetry={onRefresh} />;
  if (loading && !data) return <CardSkeletonGrid count={8} />;
  if (!data) return <EmptyState>No deals loaded yet.</EmptyState>;

  return (
    <section className="relative">
      {loading && data && (
        <div className="absolute right-0 top-0 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-ink-2 px-3 py-1.5 text-xs text-white/60">
          <RefreshCw size={12} className="animate-spin" /> Updating deals…
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {data.week_signal && (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          📣 {data.week_signal}
        </div>
      )}

      <Eyebrow>Competitor ads</Eyebrow>

      <div className="mt-5 flex gap-1 border-b border-white/10">
        {[
          { id: "all", label: "🏷️ Deals by store", count: deals.length },
          { id: "combos", label: "🎁 Combo packs", count: comboCount },
        ].map((tab) => {
          const active = dealsView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDealsView(tab.id)}
              className={
                "relative px-4 py-3 text-sm font-medium transition focus-visible:rounded-t focus-visible:ring-2 focus-visible:ring-brand " +
                (active ? "text-white" : "text-white/55 hover:text-white/85")
              }
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1 text-white/45">({tab.count})</span>}
              {active && (
                <motion.span
                  layoutId="deals-subtab"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {dealsView === "combos" ? (
        <div className="mt-8">
          <CombosSection data={data} embedded />
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Browse by store
              </h2>
              <p className="mt-1 text-sm text-white/50">
                {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""} ·{" "}
                {grouped.length} store{grouped.length !== 1 ? "s" : ""}
                {data.generated_at && (
                  <span className="text-white/35"> · updated {data.generated_at}</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="deals-search" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Search deals
              </label>
              <div className="relative flex items-center">
                <Search size={15} className="pointer-events-none absolute left-3.5 text-white/40" />
                <input
                  id="deals-search"
                  type="search"
                  placeholder="Product name, store, or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-52 rounded-full border border-white/15 bg-ink-2 py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-white/40 focus-visible:ring-2 focus-visible:ring-brand sm:w-64"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 text-white/40 transition hover:text-white"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="cursor-pointer rounded-full border border-white/15 bg-ink-2 px-4 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {(data.categories || []).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} ({(data.deals_by_category[c.key] || []).length})
                </option>
              ))}
            </select>

            <select
              value={merchFilter}
              onChange={(e) => setMerchFilter(e.target.value)}
              className="cursor-pointer rounded-full border border-white/15 bg-ink-2 px-4 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Filter by retailer"
            >
              <option value="">All retailers</option>
              {(data.merchants || []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="cursor-pointer rounded-full border border-white/15 bg-ink-2 px-4 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Sort stores"
            >
              <option value="merchant">Store A–Z</option>
              <option value="count">Most deals</option>
              <option value="price">Lowest price</option>
            </select>

            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-white/60">
              <input
                type="checkbox"
                checked={latinoOnly}
                onChange={(e) => setLatinoOnly(e.target.checked)}
                className="rounded border-white/20"
              />
              Latino only
            </label>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/40 hover:text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            )}
          </div>

          {filteredDeals.length === 0 ? (
            <div className="mt-10">
              <EmptyState>
                <div className="space-y-4">
                  <p>
                    {hasFilters
                      ? "No deals match these filters."
                      : "No deals available for this area."}
                  </p>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </EmptyState>
            </div>
          ) : useFlatGrid ? (
            <div className="mt-8">
              {hasFilters && (
                <p className="mb-4 text-sm text-white/55">
                  {filteredDeals.length} result{filteredDeals.length !== 1 ? "s" : ""} matching your
                  filters
                </p>
              )}
              <div className={DEALS_GRID}>
                {filteredDeals.map((deal, i) => (
                  <motion.div
                    key={`${deal.merchant}-${deal.name}-${i}`}
                    className={sparseCards ? "max-w-xs" : ""}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02, ease: EASE }}
                    whileHover={{ y: -4 }}
                  >
                    <DealCard d={deal} />
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-10 space-y-12">
              <AnimatePresence mode="popLayout">
                {grouped.map(([merchant, merchantDeals], idx) => (
                  <motion.div
                    key={merchant}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, delay: idx * 0.04, ease: EASE }}
                  >
                    <div className="mb-5 flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 font-display text-sm font-bold text-brand">
                        {merchant.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-display text-lg font-semibold tracking-tight">
                        {merchant}
                      </span>
                      <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-white/55">
                        {merchantDeals.length}
                      </span>
                    </div>
                    <div className={DEALS_GRID}>
                      {merchantDeals.map((deal, i) => (
                        <motion.div
                          key={`${merchant}-${deal.name}-${i}`}
                          className={merchantDeals.length <= 2 ? "max-w-xs" : ""}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.025, ease: EASE }}
                          whileHover={{ y: -5 }}
                        >
                          <DealCard d={deal} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </section>
  );
}
