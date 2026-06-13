import { useId, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Search, X, RefreshCw, Download } from "lucide-react";
import DealCard from "./DealCard";
import CombosSection from "./CombosSection";
import { customZipsFromCsv } from "./AreaSelector";
import { exportDealsCsv } from "../lib/export";
import { Eyebrow, CardSkeletonGrid, ErrorState, EmptyState, EASE } from "../lib/ui";
import {
  PANEL,
  PANEL_MUTED,
  FILTER_GRID,
  FILTER_ACTIONS,
} from "../lib/layout";

const DEALS_GRID =
  "grid gap-3 grid-cols-[repeat(auto-fill,minmax(168px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(188px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]";
const FLAT_RESULT_LIMIT = 12;
const FILTER_LABEL =
  "mb-2.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50";

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

function DealGrid({ deals, compact = false, showMerchant = true, reduceMotion = false }) {
  const Wrapper = reduceMotion ? "div" : motion.div;
  const wrapperProps = reduceMotion
    ? { className: "h-full" }
    : {
        className: "h-full",
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        whileHover: { y: -3 },
        transition: { duration: 0.2, ease: EASE },
      };

  return (
    <ul className={`${DEALS_GRID} m-0 list-none items-stretch p-0`}>
      {deals.map((deal, i) => (
        <li key={`${deal.merchant}-${deal.name}-${deal.catKey}-${i}`} className="flex min-h-0">
          <Wrapper {...wrapperProps} transition={{ ...wrapperProps.transition, delay: Math.min(i * 0.015, 0.12) }}>
            <DealCard d={deal} compact={compact} showMerchant={showMerchant} />
          </Wrapper>
        </li>
      ))}
    </ul>
  );
}

export default function DealsSection({ data, loading, error, onRefresh }) {
  const reduceMotion = useReducedMotion();
  const dealsPanelId = useId();
  const combosPanelId = useId();
  const resultsLiveId = useId();
  const latinoFilterId = useId();

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
  const comboCount = data?.combos?.length || 0;
  const activeZips = data?.zips || [];
  const customZips = useMemo(
    () => customZipsFromCsv(activeZips.join(",")),
    [activeZips]
  );
  const noDealsLoaded = deals.length === 0;

  const resultsSummary =
    filteredDeals.length === 0
      ? hasFilters
        ? "No deals match the current filters."
        : noDealsLoaded
          ? activeZips.length
            ? `No weekly ads found for ${activeZips.join(", ")}.`
            : "No deals available for this area."
          : "No deals available for this area."
      : `${filteredDeals.length} deal${filteredDeals.length !== 1 ? "s" : ""} across ${grouped.length} store${grouped.length !== 1 ? "s" : ""}.`;

  const clearFilters = () => {
    setSearch("");
    setCatFilter("");
    setMerchFilter("");
    setLatinoOnly(false);
  };

  if (error && !data) return <ErrorState message={error} onRetry={onRefresh} />;
  if (loading && !data) return <CardSkeletonGrid count={8} />;
  if (!data) return <EmptyState>No deals loaded yet.</EmptyState>;

  const SectionWrapper = reduceMotion ? "section" : motion.section;
  const sectionMotion = reduceMotion
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.3, ease: EASE },
      };

  return (
    <section className="relative" aria-labelledby="deals-section-heading">
      <h2 id="deals-section-heading" className="sr-only">
        Competitor deals
      </h2>

      {loading && data && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-0 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-ink-2 px-3 py-1.5 text-xs text-white/60"
        >
          <RefreshCw size={12} className="animate-spin" aria-hidden />
          Updating deals…
        </div>
      )}

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {data.week_signal && (
        <div role="note" className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {data.week_signal}
        </div>
      )}

      <Eyebrow>Competitor ads</Eyebrow>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-white/10">
        <div role="tablist" aria-label="Deal views" className="-mb-px flex gap-0.5">
          {[
            { id: "all", label: "Deals by store", count: deals.length, panelId: dealsPanelId },
            { id: "combos", label: "Combo packs", count: comboCount, panelId: combosPanelId },
          ].map((tab) => {
            const active = dealsView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls={tab.panelId}
                onClick={() => setDealsView(tab.id)}
                className={
                  "relative min-h-[44px] px-4 py-3 text-sm font-medium transition focus-visible:rounded-t focus-visible:ring-2 focus-visible:ring-brand " +
                  (active ? "text-white" : "text-white/55 hover:text-white/85")
                }
              >
                {tab.id === "all" ? "🏷️ " : "🎁 "}
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 text-white/50" aria-hidden>
                    ({tab.count})
                  </span>
                )}
                <span className="sr-only">{tab.count} items</span>
                {active && !reduceMotion && (
                  <motion.span
                    layoutId="deals-subtab"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {active && reduceMotion && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
        {dealsView === "all" && (
          <p className="pb-3 text-xs text-white/50 sm:text-sm" aria-hidden>
            {filteredDeals.length} deals · {grouped.length} stores
            {data.generated_at && <span className="text-white/40"> · {data.generated_at}</span>}
          </p>
        )}
      </div>

      {dealsView === "combos" ? (
        <div
          id={combosPanelId}
          role="tabpanel"
          aria-labelledby="tab-combos"
          className="mt-6"
        >
          <CombosSection data={data} embedded />
        </div>
      ) : (
        <div id={dealsPanelId} role="tabpanel" aria-labelledby="tab-all">
          <div className={`mt-6 ${PANEL}`}>
            <form
              className="space-y-5 sm:space-y-6"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Filter competitor deals"
            >
              <div>
                <label htmlFor="deals-search" className={FILTER_LABEL}>
                  Search deals
                </label>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
                    aria-hidden
                  />
                  <input
                    id="deals-search"
                    type="search"
                    placeholder="Product name, store, or category"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="toolbar-control text-white placeholder:text-white/45 outline-none transition focus:border-white/40 focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/50 transition hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
                      aria-label="Clear search"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className={FILTER_LABEL}>Filters</p>
                <div className={FILTER_GRID}>
                  <select
                    id="deals-cat-filter"
                    aria-label="Filter by category"
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value)}
                    className="toolbar-control w-full min-w-0 text-white outline-none focus:border-white/40 focus-visible:ring-2 focus-visible:ring-brand sm:w-auto sm:min-w-[11rem]"
                  >
                    <option value="">All categories</option>
                    {(data.categories || []).map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} ({(data.deals_by_category[c.key] || []).length})
                      </option>
                    ))}
                  </select>

                  <select
                    id="deals-merch-filter"
                    aria-label="Filter by retailer"
                    value={merchFilter}
                    onChange={(e) => setMerchFilter(e.target.value)}
                    className="toolbar-control w-full min-w-0 text-white outline-none focus:border-white/40 focus-visible:ring-2 focus-visible:ring-brand sm:w-auto sm:min-w-[10.5rem]"
                  >
                    <option value="">All retailers</option>
                    {(data.merchants || []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    id="deals-sort"
                    aria-label="Sort store groups"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="toolbar-control w-full min-w-0 text-white outline-none focus:border-white/40 focus-visible:ring-2 focus-visible:ring-brand sm:w-auto sm:min-w-[10rem]"
                  >
                    <option value="merchant">Store A–Z</option>
                    <option value="count">Most deals per store</option>
                    <option value="price">Store order by cheapest item</option>
                  </select>

                  <label
                    htmlFor={latinoFilterId}
                    className={
                      "toolbar-control toolbar-toggle w-full shrink-0 sm:w-auto " +
                      (latinoOnly ? "border-leaf/50 bg-leaf/10 text-leaf" : "")
                    }
                  >
                    <input
                      id={latinoFilterId}
                      type="checkbox"
                      checked={latinoOnly}
                      onChange={(e) => setLatinoOnly(e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-white/25"
                    />
                    Latino grocers only
                  </label>

                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-11 shrink-0 items-center self-start px-3 text-sm font-medium text-sky underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand sm:self-auto"
                    >
                      Clear filters
                    </button>
                  )}

                  <div className={FILTER_ACTIONS}>
                    {onRefresh && (
                      <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        aria-busy={loading}
                        className="toolbar-control w-full shrink-0 sm:w-auto"
                      >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
                        Refresh deals
                      </button>
                    )}

                    {filteredDeals.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          exportDealsCsv(filteredDeals, {
                            zips: activeZips,
                            generatedAt: data.generated_at,
                          })
                        }
                        className="toolbar-control w-full shrink-0 sm:w-auto"
                      >
                        <Download size={14} aria-hidden />
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {!useFlatGrid && grouped.length > 4 && (
              <div
                className="mt-5 border-t border-white/8 pt-5 sm:mt-6 sm:pt-6"
                role="group"
                aria-label="Jump to store"
              >
                <p className={FILTER_LABEL}>Jump to store</p>
                <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:overflow-x-auto lg:pb-0.5 [scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
                  {grouped.slice(0, 12).map(([merchant]) => {
                    const pressed = merchFilter === merchant;
                    return (
                      <button
                        key={merchant}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => setMerchFilter((prev) => (prev === merchant ? "" : merchant))}
                        className={
                          "toolbar-control shrink-0 text-xs font-medium focus-visible:ring-2 focus-visible:ring-brand " +
                          (pressed
                            ? "border-brand bg-brand text-white"
                            : "text-white/75 hover:border-white/30 hover:text-white")
                        }
                      >
                        {merchant}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <p id={resultsLiveId} className="sr-only" aria-live="polite" aria-atomic="true">
            {resultsSummary}
          </p>

          {filteredDeals.length === 0 ? (
            <div className="mt-8">
              <EmptyState>
                <div className="mx-auto max-w-md space-y-4">
                  <p>{resultsSummary}</p>
                  {noDealsLoaded && !hasFilters && activeZips.length > 0 && (
                    <p className="text-sm text-white/55">
                      {customZips.length > 0
                        ? "This ZIP may not have weekly ad coverage yet. Try a nearby code or select a preset market in Market areas."
                        : "Try selecting another market above, or add a nearby ZIP under Additional markets."}
                    </p>
                  )}
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      Clear all filters
                    </button>
                  ) : (
                    onRefresh && (
                      <button
                        type="button"
                        onClick={onRefresh}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <RefreshCw size={14} aria-hidden />
                        Refresh deals
                      </button>
                    )
                  )}
                </div>
              </EmptyState>
            </div>
          ) : useFlatGrid ? (
            <div className="mt-6" aria-labelledby={resultsLiveId}>
              <p className="mb-3 text-sm text-white/60">
                {filteredDeals.length} result{filteredDeals.length !== 1 ? "s" : ""}
                {search ? (
                  <>
                    {" "}
                    for <strong className="text-white/85">&ldquo;{search}&rdquo;</strong>
                  </>
                ) : (
                  " matching filters"
                )}
              </p>
              <DealGrid
                deals={filteredDeals}
                showMerchant
                reduceMotion={reduceMotion}
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {grouped.map(([merchant, merchantDeals], idx) => (
                  <SectionWrapper
                    key={merchant}
                    {...sectionMotion}
                    transition={{
                      ...sectionMotion.transition,
                      delay: reduceMotion ? 0 : Math.min(idx * 0.03, 0.15),
                    }}
                    className={`${PANEL_MUTED}`}
                    aria-labelledby={`store-${merchant.replace(/\W+/g, "-").toLowerCase()}`}
                  >
                    <div className="mb-3 flex min-w-0 items-center gap-2.5">
                      <div
                        aria-hidden
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 font-display text-xs font-bold text-brand"
                      >
                        {merchant.charAt(0).toUpperCase()}
                      </div>
                      <h3
                        id={`store-${merchant.replace(/\W+/g, "-").toLowerCase()}`}
                        className="truncate font-display text-base font-semibold tracking-tight sm:text-lg"
                      >
                        {merchant}
                      </h3>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums text-white/60">
                        {merchantDeals.length} deal{merchantDeals.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <DealGrid
                      deals={merchantDeals}
                      compact
                      showMerchant={false}
                      reduceMotion={reduceMotion}
                    />
                  </SectionWrapper>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
