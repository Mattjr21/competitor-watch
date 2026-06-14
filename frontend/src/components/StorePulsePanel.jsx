import { TrendingDown, TrendingUp, BarChart3, Tag, ArrowRight } from "lucide-react";
import { StatCard, PANEL, SAMPLE_BADGE, NAV_LINK } from "../lib/sectionUi";
import { pickStoreAnalytics } from "../lib/demoStorePulse";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const WEEK_COMPARE_HINT = "This week vs the week before";

function formatDelta(pct) {
  if (pct == null) return null;
  return `${pct > 0 ? "up" : "down"} ${Math.abs(pct)} percent`;
}

function buildPulseSummary(pulse) {
  if (!pulse?.has_date_data) return "";
  const parts = [];
  const y = pulse.yesterday;
  const l7 = pulse.last_7_days;
  if (y?.revenue != null) {
    parts.push(`Yesterday revenue ${y.revenue.toLocaleString()} dollars on ${y.orders || 0} orders`);
  }
  if (l7?.revenue != null) {
    parts.push(
      `Last seven days ${l7.revenue.toLocaleString()} dollars revenue, ${l7.orders || 0} orders, average basket ${l7.avg_basket} dollars`
    );
  }
  if (pulse.wow_revenue_pct != null) {
    parts.push(`Revenue ${formatDelta(pulse.wow_revenue_pct)} vs the week before`);
  }
  if (pulse.wow_orders_pct != null) {
    parts.push(`Orders ${formatDelta(pulse.wow_orders_pct)} vs the week before`);
  }
  if (pulse.wow_avg_basket_pct != null) {
    parts.push(`Average basket ${formatDelta(pulse.wow_avg_basket_pct)} vs the week before`);
  }
  return parts.join(". ");
}

function WeekChangeHint({ value, label }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        up ? "text-leaf" : "text-destructive"
      )}
    >
      {up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
      {up ? "+" : ""}
      {value}% {label}
    </span>
  );
}

function chartDayLabel(label, compact) {
  if (!label) return "";
  if (compact) {
    if (label.includes("/")) {
      const parts = label.split("/");
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : label;
    }
    return label.includes(" ") ? label.split(" ").pop() : label;
  }
  return label.includes(" ") ? label.split(" ").pop() : label;
}

function MiniBarChart({ daily, compact = false }) {
  if (!daily?.length) return null;
  const slice = daily.slice(compact ? -7 : -14);
  const max = Math.max(...slice.map((d) => d.revenue), 1);
  const summary = slice.map((d) => `${d.label} ${d.revenue.toLocaleString()} dollars`).join("; ");
  return (
    <div>
      <div
        className="flex h-16 items-end gap-1"
        role="img"
        aria-label={`Daily revenue trend. ${summary}`}
      >
        {slice.map((d) => (
          <div
            key={d.date}
            title={`${d.label}: $${d.revenue.toLocaleString()}`}
            className="min-w-0 flex-1 rounded-sm bg-brand/70 transition-colors hover:bg-brand"
            style={{ height: `${Math.max(8, (d.revenue / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        {slice.map((d) => (
          <span
            key={d.date}
            className="min-w-0 flex-1 truncate text-center text-[9px] tabular-nums text-muted-foreground sm:text-[10px]"
          >
            {chartDayLabel(d.label, compact)}
          </span>
        ))}
      </div>
    </div>
  );
}

function MoverList({ title, items, emptyHint, variant = "up" }) {
  if (!items?.length) {
    return (
      <div className="rounded-xl border border-border bg-background/60 p-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((row) => (
          <li key={row.name || row.key} className="flex items-start justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-foreground">{row.name || row.label}</span>
            <span
              className={cn(
                "shrink-0 tabular-nums text-xs font-semibold",
                variant === "up" ? "text-leaf" : "text-destructive"
              )}
            >
              {row.change_pct != null ? `${row.change_pct > 0 ? "+" : ""}${row.change_pct}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DailySalesTable({ daily }) {
  if (!daily?.length) return null;
  const rows = [...daily].reverse();
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background/60">
      <h4 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Daily sales</h4>
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-semibold">Day</th>
            <th className="px-4 py-2.5 font-semibold text-right">Revenue</th>
            <th className="px-4 py-2.5 font-semibold text-right">Orders</th>
            <th className="px-4 py-2.5 font-semibold text-right">Avg basket</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.date} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-2.5 font-medium text-foreground">{d.label}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">${d.revenue.toLocaleString()}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{d.orders.toLocaleString()}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">${d.avg_basket}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StorePulsePanel({ dealsData, onGoFullAnalytics, compact = false }) {
  const facts = dealsData?.facts || {};
  const isSample = /default/i.test(dealsData?.data_source || "");
  const analytics = pickStoreAnalytics(facts, isSample);
  const { pulse, daily_sales, product_movers, category_movers, promo_intelligence } = analytics;

  if (!pulse?.has_date_data && !isSample) {
    return (
      <div className={PANEL + " p-4 sm:p-5"}>
        <p className="text-sm text-muted-foreground">
          {pulse?.note || "Connect sales data with order dates to unlock store pulse."}
        </p>
      </div>
    );
  }

  const y = pulse.yesterday || {};
  const l7 = pulse.last_7_days || {};
  const a11ySummary = buildPulseSummary(pulse);

  return (
    <div className={PANEL + " space-y-6 p-4 sm:p-6"}>
      <p className="sr-only">{a11ySummary}</p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 size={18} className="text-brand" aria-hidden />
            <h3 className="font-display text-lg font-semibold sm:text-xl">Store pulse</h3>
            {isSample && <span className={SAMPLE_BADGE}>Sample · May sales</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily sales, movers, and deals in baskets
            {pulse.anchor_date && !isSample && <> · through {pulse.anchor_date}</>}
          </p>
          {compact && (
            <p className="mt-1 text-xs text-muted-foreground">
              Daily breakdown and full history in{" "}
              <button
                type="button"
                onClick={onGoFullAnalytics}
                className={NAV_LINK}
              >
                Your store data → Sales summary
              </button>
              .
            </p>
          )}
          {isSample && compact && (
            <p className="mt-1 text-xs text-muted-foreground">
              Connect Odoo or upload CSVs to replace this sample view.
            </p>
          )}
        </div>
        {compact && onGoFullAnalytics && (
          <Button type="button" variant="link" className="min-h-11 px-0 text-sky" onClick={onGoFullAnalytics}>
            Full analytics
            <ArrowRight size={14} aria-hidden />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Yesterday revenue" value={`$${(y.revenue || 0).toLocaleString()}`} hint={`${y.orders || 0} orders`} accentClass="text-foreground" />
        <StatCard label="Yesterday basket" value={`$${y.avg_basket || 0}`} hint="Avg ticket" accentClass="text-foreground" />
        <StatCard label="Last 7 days" value={`$${(l7.revenue || 0).toLocaleString()}`} hint={`${l7.orders || 0} orders · $${l7.avg_basket || 0} avg`} accentClass="text-brand" />
        <StatCard
          label="Revenue vs last week"
          value={pulse.wow_revenue_pct != null ? `${pulse.wow_revenue_pct > 0 ? "+" : ""}${pulse.wow_revenue_pct}%` : "—"}
          hint={WEEK_COMPARE_HINT}
          accentClass={(pulse.wow_revenue_pct ?? 0) >= 0 ? "text-leaf" : "text-destructive"}
        />
        <StatCard
          label="Orders vs last week"
          value={pulse.wow_orders_pct != null ? `${pulse.wow_orders_pct > 0 ? "+" : ""}${pulse.wow_orders_pct}%` : "—"}
          hint={WEEK_COMPARE_HINT}
          accentClass={(pulse.wow_orders_pct ?? 0) >= 0 ? "text-leaf" : "text-destructive"}
        />
        <StatCard
          label="Avg basket vs last week"
          value={pulse.wow_avg_basket_pct != null ? `${pulse.wow_avg_basket_pct > 0 ? "+" : ""}${pulse.wow_avg_basket_pct}%` : "—"}
          hint={WEEK_COMPARE_HINT}
          accentClass={(pulse.wow_avg_basket_pct ?? 0) >= 0 ? "text-leaf" : "text-destructive"}
        />
      </div>

      <MiniBarChart daily={daily_sales} compact={compact} />

      {!compact && <DailySalesTable daily={daily_sales} />}

      {(product_movers?.has_data || category_movers?.has_data) && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Movers · {product_movers.period_label || "This week vs last week"}
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <MoverList title="Products rising" items={product_movers.rising} variant="up" emptyHint="Need at least two weeks of sales with order dates." />
            <MoverList title="Products declining" items={product_movers.falling} variant="down" emptyHint="Need at least two weeks of sales with order dates." />
            <MoverList title="Categories rising" items={category_movers.rising} variant="up" emptyHint="Category trends appear with dated lines." />
            <MoverList title="Categories declining" items={category_movers.falling} variant="down" emptyHint="Category trends appear with dated lines." />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Tag size={16} className="text-brand" aria-hidden />
          <p className="text-sm font-semibold">Deals in baskets</p>
          {promo_intelligence?.promo_order_pct > 0 && (
            <Badge variant="secondary">{promo_intelligence.promo_order_pct}% of orders include a deal item</Badge>
          )}
        </div>
        {promo_intelligence?.has_data ? (
          <ul className="mt-3 space-y-2">
            {promo_intelligence.items_in_baskets.map((row) => (
              <li key={row.name} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium text-foreground">{row.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {row.orders} orders · ${row.revenue.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {promo_intelligence?.note ||
              "Upload an offers CSV or connect Odoo — promo keywords from your config are matched to basket lines."}
          </p>
        )}
      </div>
    </div>
  );
}
