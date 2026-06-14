import { useId, useMemo, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Search, X, RefreshCw, Download, Flame, Tags, Gift, Trophy } from "lucide-react";
import DealCard from "./DealCard";
import BestDealsPanel from "./BestDealsPanel";
import CombosSection from "./CombosSection";
import DealSearchPanel from "./DealSearchPanel";
import FilterSelect from "./FilterSelect";
import { customZipsFromCsv, marketAreasFromPresets } from "../lib/marketAreas";
import { exportDealsCsv } from "../lib/export";
import { computeCategoryWinners } from "../lib/dealWinners";
import { CardSkeletonGrid, ErrorState, EmptyState, EASE } from "../lib/ui";
import {
  PANEL,
  PANEL_MUTED,
  FILTER_GRID,
  FILTER_ACTIONS,
} from "../lib/layout";
import { PageHeader, TAB_SECTION_SPACE, NAV_LINK } from "../lib/sectionUi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const NationalRankPanel = lazy(() => import("./NationalRankPanel"));

const DEALS_PAGE_LEDE =
  "Lowest price per category and the full ad catalog. For what's advertised most often, see Market trends.";

const DEALS_GRID =
  "grid gap-3 grid-cols-[repeat(auto-fill,minmax(168px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(188px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]";
const FLAT_RESULT_LIMIT = 12;
const FILTER_LABEL =
  "mb-2.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

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

export default function DealsSection({
  data,
  loading,
  error,
  onRefresh,
  marketLabel = "your market",
  homeMarketLabel,
  profileLabel = "Latino grocery",
  isBenchmarking = false,
  pendingMarket = false,
  onUploadGuide,
}) {
  const reduceMotion = useReducedMotion();
  const bestPanelId = useId();
  const dealsPanelId = useId();
  const combosPanelId = useId();
  const nationalPanelId = useId();
  const resultsLiveId = useId();
  const latinoFilterId = useId();

  const [dealsView, setDealsView] = useState("best");
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

  const categoryWinners = useMemo(
    () => computeCategoryWinners(data?.deals_by_category, data?.categories || []),
    [data]
  );

  const hasFilters = search || catFilter || merchFilter || latinoOnly;
  const useFlatGrid = hasFilters && filteredDeals.length <= FLAT_RESULT_LIMIT;
  const comboCount = data?.combos?.length || 0;
  const nationalRankReady = Boolean(
    data?.national_ranking &&
      ((data.national_ranking.rows || []).some((r) => r.national_low != null || r.own_avg != null) ||
        data.national_ranking.overall_score)
  );
  const activeZips = data?.zips || [];
  const customZips = useMemo(
    () => customZipsFromCsv(activeZips.join(","), marketAreasFromPresets(data?.area_presets)),
    [activeZips, data?.area_presets]
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

  const viewDealInStore = (merchant, catKey = "", searchHint = "") => {
    setDealsView("all");
    setMerchFilter(merchant || "");
    setCatFilter(catKey || "");
    setSearch(searchHint || "");
    setLatinoOnly(false);
  };

  if (error && !data) return <ErrorState message={error} onRetry={onRefresh} />;
  if ((loading && !data) || pendingMarket) {
    return (
      <section className={TAB_SECTION_SPACE} aria-labelledby="deals-section-heading">
        <PageHeader
          eyebrow="Competitor deals"
          eyebrowDot
          titleId="deals-section-heading"
          title="Competitor deals"
          description={DEALS_PAGE_LEDE}
          loading={true}
        />
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-foreground/85"
        >
          <RefreshCw size={14} className="mr-2 inline animate-spin" aria-hidden />
          Loading competitor ads for <span className="font-semibold text-foreground">{marketLabel}</span>
          {profileLabel && (
            <>
              {" "}
              (<span className="font-semibold text-foreground">{profileLabel}</span> search terms)
            </>
          )}
          … first load can take up to 60 seconds.
        </div>
        <CardSkeletonGrid count={8} />
      </section>
    );
  }
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
    <section className={TAB_SECTION_SPACE + " relative"} aria-labelledby="deals-section-heading">
      <PageHeader
        eyebrow="Competitor deals"
        eyebrowDot
        titleId="deals-section-heading"
        title="Competitor deals"
        description={DEALS_PAGE_LEDE}
        meta={
          data?.generated_at
            ? `${marketLabel} · ${data.merchants?.length || 0} retailers · synced ${data.generated_at}`
            : undefined
        }
      />

      {loading && data && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-0 z-10 flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw size={12} className="animate-spin" aria-hidden />
          Updating deals…
        </div>
      )}

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div
        role="note"
        className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground"
      >
        Showing benchmark ads for{" "}
        <span className="font-semibold text-foreground/90">{marketLabel}</span>
        {isBenchmarking && homeMarketLabel && (
          <span className="text-muted-foreground/80"> · playbook uses {homeMarketLabel}</span>
        )}
        {activeZips.length > 0 && (
          <>
            {" "}
            · <span className="font-mono text-muted-foreground">{activeZips.join(", ")}</span>
          </>
        )}
        {data.generated_at && (
          <span className="text-muted-foreground/70"> · synced {data.generated_at}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-border">
        <div role="tablist" aria-label="Deal views" className="-mb-px flex gap-0.5">
          {[
            { id: "best", label: "Best near you", icon: Flame, count: categoryWinners.length, countSuffix: "winners", panelId: bestPanelId },
            { id: "all", label: "Deals by store", icon: Tags, count: deals.length, countSuffix: "deals", panelId: dealsPanelId },
            { id: "combos", label: "Combo packs", icon: Gift, count: comboCount, countSuffix: "packs", panelId: combosPanelId },
            ...(nationalRankReady
              ? [
                  {
                    id: "national",
                    label: "National rank",
                    icon: Trophy,
                    count: data.national_ranking?.overall_score ?? data.national_ranking?.categories_ranked ?? 0,
                    countSuffix: data.national_ranking?.overall_score ? "score" : "categories",
                    panelId: nationalPanelId,
                  },
                ]
              : []),
          ].map((tab) => {
            const active = dealsView === tab.id;
            const TabIcon = tab.icon;
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
                  "relative inline-flex min-h-[44px] items-center gap-1.5 px-4 py-3 text-sm font-medium transition focus-visible:rounded-t focus-visible:ring-2 focus-visible:ring-brand " +
                  (active ? "text-foreground" : "text-muted-foreground hover:text-foreground/90")
                }
              >
                <TabIcon size={15} className="shrink-0 opacity-80" aria-hidden />
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 text-muted-foreground" aria-hidden>
                    ({tab.count} {tab.countSuffix})
                  </span>
                )}
                <span className="sr-only">
                  {tab.count} {tab.countSuffix}
                </span>
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
        {dealsView === "best" && (
          <p className="pb-3 text-xs text-muted-foreground sm:text-sm" aria-hidden>
            {categoryWinners.length} winner{categoryWinners.length !== 1 ? "s" : ""} · {grouped.length} stores
            {data.generated_at && <span className="text-muted-foreground/70"> · {data.generated_at}</span>}
          </p>
        )}
        {dealsView === "all" && (
          <p className="pb-3 text-xs text-muted-foreground sm:text-sm" aria-hidden>
            {filteredDeals.length} deals · {grouped.length} stores
            {data.generated_at && <span className="text-muted-foreground/70"> · {data.generated_at}</span>}
          </p>
        )}
      </div>

      {dealsView === "best" ? (
        <div
          id={bestPanelId}
          role="tabpanel"
          aria-labelledby="tab-best"
          aria-live="polite"
          className="mt-6"
        >
          <BestDealsPanel
            data={data}
            onViewDeal={viewDealInStore}
            onBrowseByStore={() => setDealsView("all")}
            reduceMotion={reduceMotion}
          />
        </div>
      ) : dealsView === "combos" ? (
        <div
          id={combosPanelId}
          role="tabpanel"
          aria-labelledby="tab-combos"
          className="mt-6"
        >
          <CombosSection data={data} embedded />
        </div>
      ) : dealsView === "national" ? (
        <div
          id={nationalPanelId}
          role="tabpanel"
          aria-labelledby="tab-national"
          className="mt-6"
        >
          <Suspense
            fallback={
              <div className="space-y-3 rounded-2xl border border-border p-4 sm:p-5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full" />
              </div>
            }
          >
            <NationalRankPanel ranking={data.national_ranking} onUploadGuide={onUploadGuide} />
          </Suspense>
        </div>
      ) : (
        <div id={dealsPanelId} role="tabpanel" aria-labelledby="tab-all">
          <div className="mt-6 space-y-6">
            <DealSearchPanel
              zips={activeZips.join(",")}
              searchHints={data.search_hints}
            />
          </div>

          <div className={`mt-6 ${PANEL}`}>
            <form
              className="space-y-5 sm:space-y-6"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Filter competitor deals"
            >
              <div>
                <label id="deals-search-label" htmlFor="deals-search" className={FILTER_LABEL}>
                  Search deals
                </label>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="deals-search"
                    type="search"
                    placeholder="Product name, store, or category"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 pl-10"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
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
                  <FilterSelect
                    id="deals-cat-filter"
                    aria-label="Filter by category"
                    value={catFilter}
                    onChange={setCatFilter}
                    options={[
                      { value: "", label: "All categories" },
                      ...(data.categories || []).map((c) => ({
                        value: c.key,
                        label: `${c.label} (${(data.deals_by_category[c.key] || []).length})`,
                      })),
                    ]}
                  />

                  <FilterSelect
                    id="deals-merch-filter"
                    aria-label="Filter by retailer"
                    value={merchFilter}
                    onChange={setMerchFilter}
                    options={[
                      { value: "", label: "All retailers" },
                      ...(data.merchants || []).map((m) => ({ value: m, label: m })),
                    ]}
                  />

                  <FilterSelect
                    id="deals-sort"
                    aria-label="Sort store groups"
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { value: "merchant", label: "Store A–Z" },
                      { value: "count", label: "Most deals per store" },
                      { value: "price", label: "Store order by cheapest item" },
                    ]}
                  />

                  <label
                    htmlFor={latinoFilterId}
                    className={
                      "flex h-11 min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border bg-input/50 px-3 text-sm " +
                      (latinoOnly ? "border-leaf/50 bg-leaf/10 text-leaf" : "text-foreground")
                    }
                  >
                    <input
                      id={latinoFilterId}
                      type="checkbox"
                      checked={latinoOnly}
                      onChange={(e) => setLatinoOnly(e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-border"
                    />
                    Latino grocers only
                  </label>

                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={"inline-flex h-11 shrink-0 items-center self-start px-3 text-sm " + NAV_LINK + " sm:self-auto"}
                    >
                      Clear filters
                    </button>
                  )}

                  <div className={FILTER_ACTIONS}>
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
                className="mt-5 border-t border-border/70 pt-5 sm:mt-6 sm:pt-6"
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
                            ? "border-primary bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:border-border hover:text-foreground")
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
                    <p className="text-sm text-muted-foreground">
                      {customZips.length > 0
                        ? "This ZIP may not have weekly ad coverage yet. Try a nearby code or select a preset market in Market areas."
                        : "Try selecting another market above, or add a nearby ZIP under Additional markets."}
                    </p>
                  )}
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      Clear all filters
                    </button>
                  ) : null}
                </div>
              </EmptyState>
            </div>
          ) : useFlatGrid ? (
            <div className="mt-6" aria-labelledby={resultsLiveId}>
              <p className="mb-3 text-sm text-muted-foreground">
                {filteredDeals.length} result{filteredDeals.length !== 1 ? "s" : ""}
                {search ? (
                  <>
                    {" "}
                    for <strong className="text-foreground/90">&ldquo;{search}&rdquo;</strong>
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
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
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
