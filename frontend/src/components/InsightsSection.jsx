import { useRef, useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  ShoppingBasket,
  Sparkles,
  RefreshCw,
  MapPin,
  MessageSquare,
  Lock,
  Download,
  Printer,
} from "lucide-react";
import { Eyebrow, CountUp, EmptyState, ErrorState, EASE } from "../lib/ui";
import { exportPriceComparisonCsv, printReport } from "../lib/export";
import TradeAreaCard from "./TradeAreaCard";
import TradeAreaMapPreview from "./TradeAreaMapPreview";
import OutreachSection from "./OutreachSection";

const API = import.meta.env.VITE_API_URL || "";

const INSIGHTS_NAV = [
  { id: "insights-pricing", label: "Pricing" },
  { id: "insights-outreach", label: "Outreach" },
  { id: "insights-customers", label: "Customers" },
  { id: "insights-ideas", label: "Ideas" },
];

function positionMeta(position) {
  switch (position) {
    case "competitive":
      return { label: "Competitive", color: "#34c759", Icon: TrendingDown };
    case "mid_market":
      return { label: "Mid-market", color: "#f0b429", Icon: Minus };
    case "above_market":
      return { label: "Above market", color: "#ff6a3d", Icon: TrendingUp };
    default:
      return { label: "Needs data", color: "#8b95a5", Icon: Minus };
  }
}

function SegmentBar({ items, valueKey = "pct", color = "#4aa3ff" }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key || item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-white/80">{item.label}</span>
            <span className="tabular-nums text-white/55">
              {item.count ?? item.orders} · {item[valueKey]}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(item[valueKey], 100)}%` }}
              transition={{ duration: 0.7, ease: EASE }}
              className="h-full rounded-full"
              style={{ background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, suffix = "", hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-2 p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold tabular-nums text-white">
        {typeof value === "number" ? (
          <>
            {value < 1000 ? <CountUp to={value} /> : value.toLocaleString()}
            {suffix}
          </>
        ) : (
          value
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-white/55">{hint}</p>}
    </div>
  );
}

function UploadUnlock({ title, detail }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-ink-2/50 px-6 py-10 text-center">
      <Lock size={22} className="mx-auto text-white/35" />
      <p className="mt-3 font-medium text-white/85">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/55">{detail}</p>
    </div>
  );
}

function PriceComparisonSection({ priceRows, hasUploadedData, marketCount, generatedAt }) {
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
        <p className="mb-4 rounded-xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/60">
          Upload your sales CSV to unlock <strong className="text-white/85">your avg</strong> and
          competitive position for each category.
        </p>
      )}

      <div className="no-print mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => exportPriceComparisonCsv(priceRows, { hasUploadedData, generatedAt })}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Download size={14} aria-hidden />
          Export CSV
        </button>
        <button
          type="button"
          onClick={printReport}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Printer size={14} aria-hidden />
          Print
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/55">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:px-5">Category</th>
                {hasUploadedData && (
                  <th className="px-4 py-2.5 font-semibold sm:px-5">Your avg</th>
                )}
                <th className="px-4 py-2.5 font-semibold sm:px-5">Market low</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell sm:px-5">Median</th>
                {hasUploadedData && (
                  <th className="px-4 py-2.5 font-semibold sm:px-5">Status</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const meta = positionMeta(row.position);
                const Icon = meta.Icon;
                const showStatus = hasUploadedData && row.own_avg != null && row.position !== "no_data";
                return (
                  <tr key={row.key} className="border-t border-white/8">
                    <td className="px-4 py-3 font-medium text-white/90 sm:px-5">{row.label}</td>
                    {hasUploadedData && (
                      <td className="px-4 py-3 tabular-nums text-white/80 sm:px-5">
                        {row.own_avg != null ? `$${row.own_avg}` : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 sm:px-5">
                      {row.market ? (
                        <span className="tabular-nums text-white/80">
                          <strong className="text-leaf">${row.market.low}</strong>
                          {row.market.cheapest_merchant && (
                            <span className="text-white/50"> · {row.market.cheapest_merchant}</span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-white/55 sm:table-cell sm:px-5">
                      {row.market ? `$${row.market.median} · ${row.market.count} ads` : "—"}
                    </td>
                    {hasUploadedData && (
                      <td className="px-4 py-3 sm:px-5">
                        {showStatus ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: `${meta.color}22`, color: meta.color }}
                          >
                            <Icon size={12} /> {meta.label}
                          </span>
                        ) : (
                          <span className="text-xs text-white/45">—</span>
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
              <p key={row.key} className="text-xs leading-relaxed text-white/55">
                <span className="font-medium text-white/70">{row.label}:</span> {row.suggested_action}
              </p>
            ))}
        </div>
      )}

      {marketCount > 0 && (
        <p className="mt-3 text-[11px] text-white/45">
          vs {marketCount} market{marketCount !== 1 ? "s" : ""}
          {generatedAt ? ` · ads updated ${generatedAt}` : ""} · change markets on Deals tab
        </p>
      )}
    </>
  );
}

function InsightsSubNav() {
  return (
    <nav
      aria-label="Your Store sections"
      className="no-print sticky top-[4.25rem] z-40 mb-6 flex gap-1 overflow-x-auto border-b border-white/10 bg-ink/95 py-2 backdrop-blur-md sm:top-[4.75rem] lg:top-[5rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {INSIGHTS_NAV.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white/55 transition hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export default function InsightsSection({ data, loading, error, onRefresh, onUploadComplete }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [uploadErr, setUploadErr] = useState(null);

  const facts = data?.facts || {};
  const ca = facts.customer_analytics || {};
  const tradeArea = ca.trade_area || {};
  const topCustomers = ca.top_customers || [];
  const priceRows = data?.price_comparison || [];
  const suggestions = data?.segment_suggestions || { weekday: [], weekend: [] };
  const isSampleData = /default/i.test(data?.data_source || "");
  const hasUploadedData = !isSampleData;
  const marketCount = data?.zips?.length || 0;

  const categoryLabels = useMemo(() => {
    const map = {};
    (data?.categories || []).forEach((c) => {
      map[c.key] = c.label;
    });
    return map;
  }, [data]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    setUploadMsg(`Analyzing ${file.name}…`);
    try {
      const text = await file.text();
      const res = await fetch(`${API}/api/upload`, {
        method: "POST",
        headers: { "Content-Type": "text/csv", "X-Filename": file.name },
        body: text,
      });
      const out = await res.json();
      if (out.error) throw new Error(out.error);
      setUploadMsg(`Loaded ${out.source_label}`);
      onUploadComplete?.();
    } catch (err) {
      setUploadErr(err.message || "Upload failed");
      setUploadMsg(null);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (error && !data) return <ErrorState message={error} onRetry={onRefresh} />;
  if (loading && !data)
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-40" />
        ))}
      </div>
    );
  if (!data) return <EmptyState>Load competitor data first, then upload your sales CSV.</EmptyState>;

  return (
    <section className="space-y-14">
      <div>
        <Eyebrow dot>Your store</Eyebrow>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
              Price & customer intelligence
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              Compare your shelf prices to live competitor ads, then layer in basket, customer, and
              WhatsApp outreach insights.
            </p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/40 hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Upload — always first */}
      <div
        id="insights-upload"
        className="no-print scroll-mt-36 rounded-2xl border border-dashed border-white/20 bg-ink-2/80 p-4 sm:p-5 lg:p-6"
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand">
            <Upload size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-semibold">Upload sales CSV</h3>
            <p className="mt-1 text-sm text-white/60">
              Use a standard order-line export from your POS. Include shopper ID and ZIP for customer
              and trade-area views.
              {data.data_source && (
                <>
                  {" "}
                  Current view:{" "}
                  <span className="text-white/80">{data.data_source}</span>
                </>
              )}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleUpload} />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand hover:text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink-2"
              >
                {uploading ? "Analyzing…" : "Choose CSV file"}
              </button>
              {uploadMsg && <span className="text-sm text-leaf">{uploadMsg}</span>}
              {uploadErr && <span className="text-sm text-red-300">{uploadErr}</span>}
            </div>
          </div>
        </div>
      </div>

      <InsightsSubNav />

      {/* Pricing — above the fold */}
      <div id="insights-pricing" className="scroll-mt-36">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-leaf" />
            <div>
              <h3 className="font-display text-2xl font-semibold">
                {hasUploadedData ? "Your prices vs market" : "Market reference prices"}
              </h3>
              <p className="mt-1 text-xs text-white/55">
                {hasUploadedData
                  ? "Your shelf averages compared to live competitor ads."
                  : "Competitor lows by category until you upload POS data."}
              </p>
            </div>
          </div>
        </div>

        <PriceComparisonSection
          priceRows={priceRows}
          hasUploadedData={hasUploadedData}
          marketCount={marketCount}
          generatedAt={data.generated_at}
        />
      </div>

      {/* Outreach */}
      <div id="insights-outreach" className="no-print scroll-mt-36">
        <div className="mb-6 flex items-center gap-2">
          <MessageSquare size={18} className="text-leaf" />
          <h3 className="font-display text-2xl font-semibold">WhatsApp outreach</h3>
        </div>
        <OutreachSection facts={facts} compactDemo={isSampleData} />
      </div>

      {/* Customers — basket, loyalty, top customers, trade area */}
      <div id="insights-customers" className="no-print scroll-mt-36 space-y-14">
        <div>
          <div className="mb-6 flex items-center gap-2">
            <ShoppingBasket size={18} className="text-brand" />
            <h3 className="font-display text-2xl font-semibold">Basket analysis</h3>
          </div>
          {!hasUploadedData ? (
            <UploadUnlock
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
                />
                <StatCard label="Weekend basket" value={facts.weekend_avg_basket} hint="Sat & Sun trips" />
                <StatCard label="Weekday basket" value={facts.weekday_avg_basket} hint="Mon–Fri trips" />
              </div>
              {ca.basket_segments?.length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-ink-2 p-6">
                  <h4 className="text-sm font-semibold text-white/80">Basket size mix</h4>
                  <div className="mt-4">
                    <SegmentBar items={ca.basket_segments} valueKey="pct" color="#ff6a3d" />
                  </div>
                </div>
              )}
              {facts.attach_rates_pct && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-ink-2 p-6">
                  <h4 className="text-sm font-semibold text-white/80">Add-on attach rates (meat baskets)</h4>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(facts.attach_rates_pct).map(([key, pct]) => (
                      <div key={key} className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-white/55">
                          {categoryLabels[key] || key}
                        </div>
                        <div className="font-display text-xl font-bold text-leaf">{pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <div className="mb-6 flex items-center gap-2">
            <Users size={18} className="text-sky" />
            <h3 className="font-display text-2xl font-semibold">Retention & loyalty</h3>
          </div>
          {!hasUploadedData ? (
            <UploadUnlock
              title="Upload POS data to unlock loyalty segments"
              detail="Include a shopper ID on each order to see retention, tiers, and shopping rhythm."
            />
          ) : !ca.has_customer_ids ? (
            <div className="rounded-2xl border border-white/10 bg-ink-2 px-6 py-8 text-sm text-white/60">
              Loyalty tiers, retention, and shopping rhythm need a shopper ID on each order in your
              export — the same identifier you use for rewards or receipts.
            </div>
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
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-ink-2 p-6">
                  <h4 className="text-sm font-semibold text-white/80">Loyalty tiers</h4>
                  <div className="mt-4">
                    <SegmentBar items={ca.loyalty_tiers} color="#34c759" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-ink-2 p-6">
                  <h4 className="text-sm font-semibold text-white/80">Spend segments</h4>
                  <div className="mt-4">
                    <SegmentBar items={ca.segments} color="#4aa3ff" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-ink-2 p-6">
                  <h4 className="text-sm font-semibold text-white/80">Shopping rhythm</h4>
                  <div className="mt-4">
                    <SegmentBar items={ca.rhythm_segments} color="#f0b429" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <div className="mb-6 flex items-center gap-2">
            <Users size={18} className="text-brand" />
            <h3 className="font-display text-2xl font-semibold">Top customers</h3>
          </div>
          {!hasUploadedData ? (
            <UploadUnlock
              title="Upload POS data to unlock top customers"
              detail="Ranked shoppers appear after upload. IDs are always masked for privacy."
            />
          ) : topCustomers.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/55">
                    <tr>
                      <th className="px-4 py-3 font-semibold sm:px-5">Customer</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Visits</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Spend</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Avg basket</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Last visit</th>
                      <th className="px-4 py-3 font-semibold sm:px-5">Segment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((row, i) => (
                      <tr key={i} className="border-t border-white/8">
                        <td className="px-4 py-3 font-mono text-xs text-white/80 sm:px-5">{row.id_masked}</td>
                        <td className="px-4 py-3 tabular-nums text-white/75 sm:px-5">{row.orders}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-white sm:px-5">
                          ${row.spend?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-white/75 sm:px-5">${row.avg_basket}</td>
                        <td className="px-4 py-3 text-white/55 sm:px-5">{row.last_visit || "—"}</td>
                        <td className="px-4 py-3 sm:px-5">
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                            {row.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-white/8 px-4 py-2 text-[11px] text-white/45 sm:px-5">
                IDs are masked for privacy · ranked by lifetime spend
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-ink-2 px-6 py-8 text-sm text-white/60">
              {ca.has_customer_ids
                ? "No ranked customers yet for this period."
                : "Top customer rankings need a shopper ID on each order in your POS export."}
            </div>
          )}
        </div>

        <div>
          <div className="mb-6 flex items-center gap-2">
            <MapPin size={18} className="text-sky" />
            <h3 className="font-display text-2xl font-semibold">Trade area</h3>
          </div>
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
                <div className="border-t border-white/10 bg-ink/85 p-4 backdrop-blur-md sm:p-5">
                  <TradeAreaCard tradeArea={tradeArea} embedded />
                </div>
              </TradeAreaMapPreview>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-ink-2 px-6 py-8 text-sm text-white/60">
              {tradeArea.note ||
                "Include ZIP or postal codes in your sales export to see how far your shoppers travel."}
            </div>
          )}
        </div>
      </div>

      {/* Promo ideas */}
      <div id="insights-ideas" className="no-print scroll-mt-36">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles size={18} className="text-brand" />
          <h3 className="font-display text-2xl font-semibold">This week&apos;s promo ideas</h3>
        </div>

        {!hasUploadedData ? (
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
                        className="rounded-2xl border border-white/10 bg-ink-2 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                            {s.segment}
                          </span>
                          {s.from_recommendation && (
                            <Sparkles size={12} className="text-brand" aria-label="Market-driven" />
                          )}
                        </div>
                        <div className="mt-2 font-medium text-white/90">{s.title}</div>
                        <p className="mt-1 text-xs text-white/55">{s.reason}</p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">{s.action}</p>
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
    </section>
  );
}
