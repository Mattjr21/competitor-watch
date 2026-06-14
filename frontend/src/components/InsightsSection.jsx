import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  ShoppingBasket,
  Sparkles,
  MapPin,
  MessageSquare,
  Lock,
  Download,
  Printer,
} from "lucide-react";
import { EmptyState, ErrorState, EASE } from "../lib/ui";
import { exportPriceComparisonCsv, printReport } from "../lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BTN_GHOST,
  NeedsDataPanel,
  PageHeader,
  PANEL,
  SCROLL_MT,
  SectionHeader,
  StatCard,
  TAB_SECTION_SPACE,
  TABLE_HEAD,
  UploadCtaLink,
} from "../lib/sectionUi";
import TradeAreaCard from "./TradeAreaCard";
import TradeAreaMapPreview from "./TradeAreaMapPreview";
import OutreachSection from "./OutreachSection";
import { CompareBars, DonutChart, RankedBars, RetentionGauge, SegmentBar } from "./InsightCharts";
import RecommendationCards from "./RecommendationCards";
import StoreDataConnectPanel from "./StoreDataConnectPanel";
import { describeLoadedMarkets } from "../lib/marketAreas";
import {
  BasketAnalysisDemoPreview,
  RetentionLoyaltyDemoPreview,
  TopCustomersDemoPreview,
} from "./DemoCustomerPreviews";

const INSIGHTS_CUSTOMER_NAV = [
  { id: "insights-basket", label: "Basket" },
  { id: "insights-retention", label: "Retention" },
  { id: "insights-top-customers", label: "Top customers" },
  { id: "insights-trade-area", label: "Trade area" },
];

const INSIGHTS_CUSTOMER_IDS = INSIGHTS_CUSTOMER_NAV.map((item) => item.id);

function customerTabForHash(hash) {
  if (["insights-outreach", "insights-ideas"].includes(hash)) return "actions";
  if (INSIGHTS_CUSTOMER_IDS.includes(hash)) return "customers";
  if (hash === "insights-pricing") return "competitive";
  return null;
}

function positionMeta(position) {
  switch (position) {
    case "competitive":
      return { label: "Competitive", color: "#34c759", Icon: TrendingDown };
    case "mid_market":
      return { label: "Mid-market", color: "#f0b429", Icon: Minus };
    case "above_market":
      return { label: "Above market", color: "#d97706", Icon: TrendingUp };
    default:
      return { label: "Needs data", color: "#8b95a5", Icon: Minus };
  }
}

function UploadUnlock({ title, detail }) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center"
      role="status"
    >
      <Lock size={22} className="mx-auto text-muted-foreground/80" aria-hidden />
      <p className="mt-3 font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{detail}</p>
      <div className="mt-5 flex justify-center">
        <UploadCtaLink />
      </div>
    </div>
  );
}

function PriceComparisonSection({ priceRows, hasUploadedData, marketLabel, generatedAt }) {
  const [showAll, setShowAll] = useState(false);
  const limit = 4;
  const hiddenCount = Math.max(0, priceRows.length - limit);
  const rows = showAll || hiddenCount === 0 ? priceRows : priceRows.slice(0, limit);

  if (priceRows.length === 0) {
    return <EmptyState>Upload sales data to compare your category averages to competitor ads.</EmptyState>;
  }

  return (
    <>
      {!hasUploadedData && (
        <p
          className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
          role="note"
        >
          Upload your sales CSV to unlock <strong className="text-foreground">your avg</strong> and
          competitive position for each category.{" "}
          <UploadCtaLink className="min-h-0 inline text-sm" />
        </p>
      )}

      <div className="no-print mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => exportPriceComparisonCsv(priceRows, { hasUploadedData, generatedAt })}
          className={BTN_GHOST}
        >
          <Download size={14} aria-hidden />
          Export CSV
        </button>
        <button
          type="button"
          onClick={printReport}
          className={BTN_GHOST}
        >
          <Printer size={14} aria-hidden />
          Print
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">
              {hasUploadedData
                ? "Your average prices compared to competitor market lows"
                : "Competitor market reference prices by category"}
            </caption>
            <thead className={TABLE_HEAD}>
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">
                  Category
                </th>
                {hasUploadedData && (
                  <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">
                    Your avg
                  </th>
                )}
                <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">
                  Market low
                </th>
                <th scope="col" className="hidden px-4 py-2.5 font-semibold sm:table-cell sm:px-5">
                  Median
                </th>
                {hasUploadedData && (
                  <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">
                    Status
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const meta = positionMeta(row.position);
                const Icon = meta.Icon;
                const showStatus = hasUploadedData && row.own_avg != null && row.position !== "no_data";
                return (
                  <tr key={row.key} className="border-t border-border/70">
                    <td className="px-4 py-3 font-medium text-foreground sm:px-5">{row.label}</td>
                    {hasUploadedData && (
                      <td className="px-4 py-3 tabular-nums text-foreground/85 sm:px-5">
                        {row.own_avg != null ? `$${row.own_avg}` : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 sm:px-5">
                      {row.market ? (
                        <span className="tabular-nums text-foreground/85">
                          <strong className="text-leaf">${row.market.low}</strong>
                          {row.market.cheapest_merchant && (
                            <span className="text-muted-foreground"> · {row.market.cheapest_merchant}</span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-muted-foreground sm:table-cell sm:px-5">
                      {row.market ? `$${row.market.median} · ${row.market.count} ads` : "—"}
                    </td>
                    {hasUploadedData && (
                      <td className="px-4 py-3 sm:px-5">
                        {showStatus ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: `${meta.color}22`, color: meta.color }}
                            title={`Price position: ${meta.label}`}
                          >
                            <Icon size={12} aria-hidden /> {meta.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/80">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm font-medium text-sky underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
        >
          Show all {priceRows.length} categories
        </button>
      )}

      {hasUploadedData && (
        <div className="mt-4 space-y-2">
          {rows
            .filter((r) => r.own_avg != null && r.suggested_action && r.position !== "no_data")
            .slice(0, showAll ? undefined : 2)
            .map((row) => (
              <p key={row.key} className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-muted-foreground">{row.label}:</span> {row.suggested_action}
              </p>
            ))}
        </div>
      )}

      {marketLabel && (
        <p className="mt-3 text-[11px] text-muted-foreground/80">
          vs {marketLabel}
          {generatedAt ? ` · ads updated ${generatedAt}` : ""} · change markets above
        </p>
      )}
    </>
  );
}

function InsightsCustomersSubNav() {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const elements = INSIGHTS_CUSTOMER_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.15, 0.4] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Customer analytics sections"
      className="no-print mb-6 flex gap-1 overflow-x-auto border-b border-border pb-2 [scrollbar-width:thin]"
    >
      {INSIGHTS_CUSTOMER_NAV.map((item) => {
        const active = activeId === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active ? "location" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3.5",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

export default function InsightsSection({
  data,
  loading,
  error,
  onRefresh,
  onUploadComplete,
  marketLabel = "your market",
  compareMarketLabel,
  isBenchmarking = false,
  pendingMarket = false,
}) {
  const [insightsTab, setInsightsTab] = useState("competitive");

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      const tab = customerTabForHash(hash);
      if (tab) setInsightsTab(tab);
      if (hash && document.getElementById(hash)) {
        requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const facts = data?.facts || {};
  const ca = facts.customer_analytics || {};
  const tradeArea = ca.trade_area || {};
  const topCustomers = ca.top_customers || [];
  const priceRows = data?.price_comparison || [];
  const suggestions = data?.segment_suggestions || { weekday: [], weekend: [] };
  const isSampleData = /default/i.test(data?.data_source || "");
  const hasUploadedData = !isSampleData;
  const marketInfo = useMemo(
    () => describeLoadedMarkets(data?.home_zips?.join(",") || data?.zips?.join(","), data?.area_presets),
    [data?.home_zips, data?.zips, data?.area_presets]
  );

  const categoryLabels = useMemo(() => {
    const map = {};
    (data?.categories || []).forEach((c) => {
      map[c.key] = c.label;
    });
    return map;
  }, [data]);

  const loyaltyNewCount = useMemo(() => {
    const tier = (ca.loyalty_tiers || []).find((t) => t.key === "new");
    return tier?.count ?? null;
  }, [ca.loyalty_tiers]);

  const loyaltyRepeatCount = useMemo(() => {
    if (!ca.unique_customers || loyaltyNewCount == null) return null;
    return ca.unique_customers - loyaltyNewCount;
  }, [ca.unique_customers, loyaltyNewCount]);

  const attachRateRows = useMemo(() => {
    if (!facts.attach_rates_pct) return [];
    return Object.entries(facts.attach_rates_pct)
      .map(([key, pct]) => ({
        key,
        label: categoryLabels[key] || key,
        value: pct,
      }))
      .sort((a, b) => b.value - a.value);
  }, [facts.attach_rates_pct, categoryLabels]);

  const topCustomerRows = useMemo(
    () =>
      topCustomers.map((row, i) => ({
        key: row.id_masked || i,
        label: row.id_masked,
        value: row.spend,
        sub: `${row.orders} visits · $${row.avg_basket} avg · ${row.tier}`,
      })),
    [topCustomers]
  );

  if (error && !data) return <ErrorState message={error} onRetry={onRefresh} />;
  if (loading && !data)
    return (
      <div className="space-y-6">
        {pendingMarket && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-foreground/85"
          >
            Loading competitor data for <span className="font-semibold text-foreground">{marketLabel}</span>…
          </div>
        )}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-40" />
        ))}
      </div>
    );
  if (!data) return <EmptyState>Load competitor data first, then upload your sales CSV.</EmptyState>;

  return (
    <section className={TAB_SECTION_SPACE} aria-labelledby="insights-page-title">
      <PageHeader
        eyebrow="Your store data"
        eyebrowDot
        titleId="insights-page-title"
        title="Price & customer intelligence"
        description={
          isBenchmarking
            ? `Shelf prices vs competitors in ${marketLabel}. Competitor deals tab shows ${compareMarketLabel || "another market"} for research.`
            : "Connect Odoo or upload CSVs, then use Competitive, Customers, and Actions tabs for pricing, analytics, and outreach."
        }
        onRefresh={onRefresh}
        loading={loading}
      />

      <StoreDataConnectPanel dataSource={data.data_source} onComplete={onUploadComplete} />

      {!hasUploadedData && (
        <div
          role="status"
          className="rounded-xl border border-brand/20 bg-brand/8 px-4 py-3 text-sm leading-relaxed text-foreground/85"
        >
          <strong className="text-foreground">Sample previews below</strong> use May sales analysis numbers.
          Upload your CSV to replace them with your store&apos;s data.{" "}
          <UploadCtaLink className="min-h-0 inline text-sm" />
        </div>
      )}

      <Tabs value={insightsTab} onValueChange={setInsightsTab} className="gap-6">
        <TabsList className="no-print h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="competitive" className="px-3 sm:px-4">
            Competitive
          </TabsTrigger>
          <TabsTrigger value="customers" className="px-3 sm:px-4">
            Customers
          </TabsTrigger>
          <TabsTrigger value="actions" className="px-3 sm:px-4">
            Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="competitive" className="mt-0">
          <div id="insights-pricing" className={SCROLL_MT}>
            <SectionHeader
              icon={TrendingUp}
              iconClass="text-leaf"
              title={hasUploadedData ? "Your prices vs market" : "Market reference prices"}
              description={
                hasUploadedData
                  ? "Your shelf averages compared to live competitor ads."
                  : "Competitor lows by category until you upload POS data."
              }
            />

            <PriceComparisonSection
              priceRows={priceRows}
              hasUploadedData={hasUploadedData}
              marketLabel={marketInfo.short}
              generatedAt={data.generated_at}
            />
          </div>
        </TabsContent>

        <TabsContent value="customers" className="mt-0">
          <InsightsCustomersSubNav />

          <div className="no-print space-y-14">
        <div id="insights-basket" className={SCROLL_MT}>
          <SectionHeader
            icon={ShoppingBasket}
            iconClass="text-brand"
            title="Basket analysis"
            description="Ticket size, meat anchor effect, and add-on attach rates from your orders."
          />
          {!hasUploadedData ? (
            <BasketAnalysisDemoPreview
              attachRates={facts.attach_rates_pct}
              categoryLabels={categoryLabels}
              title="Upload POS data to unlock basket metrics"
              detail="Avg basket, meat attach rates, and basket size mix appear after you upload your sales export."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Avg basket" value={facts.avg_basket} hint="All orders" />
                <StatCard
                  label="With meat"
                  value={facts.meat_basket_avg}
                  hint={`vs $${facts.nonmeat_basket_avg} without meat`}
                  accentClass="text-meat"
                />
                <StatCard label="Weekend basket" value={facts.weekend_avg_basket} hint="Sat & Sun trips" />
                <StatCard label="Weekday basket" value={facts.weekday_avg_basket} hint="Mon–Fri trips" />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={PANEL}>
                  <h4 className="text-sm font-semibold text-foreground/85">Basket size comparison</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Meat anchor effect vs trips without meat</p>
                  <div className="mt-4">
                    <CompareBars
                      label="Basket averages: with meat, without meat, weekend, and weekday"
                      items={[
                        {
                          label: "With meat",
                          value: facts.meat_basket_avg,
                          color: "#b91c1c",
                        },
                        {
                          label: "Without meat",
                          value: facts.nonmeat_basket_avg,
                          color: "#4aa3ff",
                        },
                        {
                          label: "Weekend",
                          value: facts.weekend_avg_basket,
                          color: "#34c759",
                        },
                        {
                          label: "Weekday",
                          value: facts.weekday_avg_basket,
                          color: "#f0b429",
                        },
                      ]}
                    />
                  </div>
                </div>

                {ca.basket_segments?.length > 0 && (
                  <div className={PANEL}>
                    <h4 className="text-sm font-semibold text-foreground/85">Basket size mix</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Share of orders by ticket size</p>
                    <div className="mt-4">
                      <DonutChart segments={ca.basket_segments} label="Basket size mix by order count" />
                    </div>
                  </div>
                )}
              </div>

              {attachRateRows.length > 0 && (
                <div className={"mt-6 " + PANEL}>
                  <h4 className="text-sm font-semibold text-meat">Add-on attach rates (meat baskets)</h4>
                  <p className="mt-1 text-xs text-muted-foreground">How often categories ride with a meat purchase</p>
                  <div className="mt-4">
                    <RankedBars
                      items={attachRateRows}
                      valueKey="value"
                      labelKey="label"
                      color="#b91c1c"
                      formatValue={(v) => `${v}%`}
                      label="Add-on attach rates for meat baskets"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div id="insights-retention" className={SCROLL_MT}>
          <SectionHeader
            icon={Users}
            iconClass="text-sky"
            title="Retention & loyalty"
            description="Repeat visits, spend tiers, and weekend vs weekday shopping rhythm."
          />
          {!hasUploadedData ? (
            <RetentionLoyaltyDemoPreview
              title="Upload POS data to unlock retention & loyalty"
              detail="Retention, tiers, and shopping rhythm appear after you upload your sales export. Include a shopper ID on each order."
            />
          ) : !ca.has_customer_ids ? (
            <NeedsDataPanel
              title="Shopper ID required for loyalty views"
              detail="Loyalty tiers, retention, and shopping rhythm need a shopper ID on each order in your export — the same identifier you use for rewards or receipts."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Unique customers" value={ca.unique_customers} />
                <StatCard
                  label="Retention rate"
                  value={ca.retention_rate_pct}
                  suffix="%"
                  hint="Shoppers with 2+ visits"
                />
                <StatCard
                  label="Orders linked"
                  value={ca.orders_with_customer}
                  hint="Orders with a shopper ID"
                />
              </div>

              {ca.retention_rate_pct != null && (
                <div className={"mt-6 " + PANEL}>
                  <h4 className="text-sm font-semibold text-foreground/85">Retention snapshot</h4>
                  <div className="mt-4">
                    <RetentionGauge
                      rate={ca.retention_rate_pct}
                      repeatCount={loyaltyRepeatCount}
                      newCount={loyaltyNewCount}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {ca.loyalty_tiers?.length > 0 && (
                  <div className={PANEL + " lg:col-span-1"}>
                    <h4 className="text-sm font-semibold text-foreground/85">Loyalty tiers</h4>
                    <p className="mt-1 text-xs text-muted-foreground">By visit frequency</p>
                    <div className="mt-4">
                      <DonutChart segments={ca.loyalty_tiers} label="Customer loyalty tiers by visit count" />
                    </div>
                  </div>
                )}
                <div className={PANEL}>
                  <h4 className="text-sm font-semibold text-foreground/85">Spend segments</h4>
                  <div className="mt-4">
                    <SegmentBar items={ca.segments} color="#4aa3ff" label="Spend segments by customer count" />
                  </div>
                </div>
                <div className={PANEL}>
                  <h4 className="text-sm font-semibold text-foreground/85">Shopping rhythm</h4>
                  <div className="mt-4">
                    <SegmentBar items={ca.rhythm_segments} color="#f0b429" label="Shopping rhythm segments" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div id="insights-top-customers" className={SCROLL_MT}>
          <SectionHeader
            icon={Users}
            iconClass="text-brand"
            title="Top customers"
            description="Highest lifetime spenders — customer IDs are always masked for privacy."
          />
          {!hasUploadedData ? (
            <TopCustomersDemoPreview
              title="Upload POS data to unlock top customers"
              detail="Ranked shoppers appear after you upload your sales export. IDs are always masked for privacy."
            />
          ) : topCustomers.length > 0 ? (
            <div className="space-y-6">
              <div className={PANEL}>
                <h4 className="text-sm font-semibold text-foreground/85">Spend ranking</h4>
                <p className="mt-1 text-xs text-muted-foreground">Top shoppers by lifetime spend — IDs masked</p>
                <div className="mt-4">
                  <RankedBars
                    items={topCustomerRows}
                    valueKey="value"
                    labelKey="label"
                    color="#22c55e"
                    label="Top customers by lifetime spend"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <caption className="sr-only">Top customers ranked by lifetime spend</caption>
                  <thead className={TABLE_HEAD}>
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                        Customer
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                        Visits
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                        Spend
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                        Avg basket
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                        Last visit
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                        Segment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((row) => (
                      <tr key={row.id_masked} className="border-t border-border/70">
                        <td className="px-4 py-3 font-mono text-xs text-foreground/85 sm:px-5">{row.id_masked}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground sm:px-5">{row.orders}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-foreground sm:px-5">
                          ${row.spend?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground sm:px-5">${row.avg_basket}</td>
                        <td className="px-4 py-3 text-muted-foreground sm:px-5">{row.last_visit || "—"}</td>
                        <td className="px-4 py-3 sm:px-5">
                          <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {row.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground/80 sm:px-5">
                IDs are masked for privacy · ranked by lifetime spend
              </p>
            </div>
            </div>
          ) : (
            <NeedsDataPanel
              title={
                ca.has_customer_ids
                  ? "No ranked customers yet for this period"
                  : "Shopper ID required for rankings"
              }
              detail={
                ca.has_customer_ids
                  ? "Try uploading a longer date range or check that orders include totals."
                  : "Top customer rankings need a shopper ID on each order in your POS export."
              }
            />
          )}
        </div>

        <div id="insights-trade-area" className={SCROLL_MT}>
          <SectionHeader
            icon={MapPin}
            iconClass="text-sky"
            title="Trade area"
            description="How far shoppers travel — ZIP reach and radius from your store."
          />
          {!hasUploadedData ? (
            <TradeAreaMapPreview
              title="Upload POS data to unlock trade area"
              detail="Include ZIP or postal codes in your export to see reach and top ZIP codes."
              zip={tradeArea.store_zip || undefined}
              city={tradeArea.store_city || undefined}
            />
          ) : tradeArea.has_zip_data ? (
            <div className="space-y-4">
              <TradeAreaMapPreview locked={false} zip={tradeArea.store_zip} city={tradeArea.store_city}>
                <div className="border-t border-border bg-background/85 p-4 backdrop-blur-md sm:p-5">
                  <TradeAreaCard tradeArea={tradeArea} embedded />
                </div>
              </TradeAreaMapPreview>
            </div>
          ) : (
            <NeedsDataPanel
              title="ZIP codes required for trade area"
              detail={
                tradeArea.note ||
                "Include ZIP or postal codes in your sales export to see how far your shoppers travel."
              }
            />
          )}
        </div>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="mt-0 space-y-14">
          <div id="insights-outreach" className={"no-print " + SCROLL_MT}>
            <SectionHeader
              icon={MessageSquare}
              iconClass="text-leaf"
              title="WhatsApp outreach"
              description="Campaign reach and reply rates from your CRM — sample metrics until you connect live data."
            />
            <OutreachSection facts={facts} compactDemo={isSampleData} />
          </div>

          <div id="insights-ideas" className={"no-print " + SCROLL_MT}>
        <SectionHeader
          icon={Sparkles}
          iconClass="text-brand"
          title="This week&apos;s promo ideas"
          description="Segment-targeted promos based on your sales patterns and live competitor ads."
        />

        {!hasUploadedData && data?.recommendations?.length > 0 ? (
          <RecommendationCards
            recommendations={data.recommendations}
            title="Weekend plan from live ads"
            description="Tap any suggestion for the full playbook."
            compact
          />
        ) : !hasUploadedData ? (
          <UploadUnlock
            title="Upload POS data to unlock promo ideas"
            detail="Ideas combine your sales patterns with live competitor ads — upload first for tailored suggestions."
          />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {[
              { key: "weekday", title: "Weekday promos", icon: "📅", items: suggestions.weekday },
              { key: "weekend", title: "Weekend promos", icon: "🌮", items: suggestions.weekend },
            ].map((block) => (
              <div key={block.key}>
                <h4 className="mb-4 font-display text-lg font-semibold">
                  {block.icon} {block.title}
                </h4>
                {block.items?.length ? (
                  <div className="space-y-3">
                    {block.items.slice(0, 3).map((s, i) => (
                      <div
                        key={`${block.key}-${i}`}
                        className={PANEL + " p-4"}
                        role="article"
                        aria-label={`${block.title}: ${s.title}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {s.segment}
                          </span>
                          {s.from_recommendation && (
                            <Sparkles size={12} className="text-brand" aria-label="Market-driven" />
                          )}
                        </div>
                        <div className="mt-2 font-medium text-foreground">{s.title}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.action}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>No {block.key} ideas yet.</EmptyState>
                )}
              </div>
            ))}
          </div>
        )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
