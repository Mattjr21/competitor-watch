import DemoInsightPreview from "./DemoInsightPreview";
import { CompareBars, DonutChart, RankedBars, RetentionGauge, SegmentBar } from "./InsightCharts";
import {
  DEMO_BASKET,
  DEMO_LOYALTY,
  DEMO_TOP_CUSTOMERS,
  demoAttachRateRows,
  demoTopCustomerRows,
} from "../lib/demoAnalytics";

function DemoStat({ label, value, hint, suffix = "" }) {
  return (
    <div className="rounded-xl border border-white/8 bg-ink-2/80 p-3 sm:p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 font-display text-xl font-bold tabular-nums text-white sm:text-2xl">
        {value}
        {suffix}
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-white/50">{hint}</p>}
    </div>
  );
}

export function BasketAnalysisDemoPreview({ attachRates, categoryLabels, title, detail }) {
  const attachRows = demoAttachRateRows(attachRates, categoryLabels);
  const b = DEMO_BASKET;

  return (
    <DemoInsightPreview title={title} detail={detail} previewMaxH="max-h-[168px] sm:max-h-[188px]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <DemoStat label="Avg basket" value={`$${b.avg_basket}`} hint="All orders" />
        <DemoStat
          label="With meat"
          value={`$${b.meat_basket_avg}`}
          hint={`vs $${b.nonmeat_basket_avg} without`}
        />
        <DemoStat label="Weekend" value={`$${b.weekend_avg_basket}`} hint="Sat & Sun" />
        <DemoStat label="Weekday" value={`$${b.weekday_avg_basket}`} hint="Mon–Fri" />
      </div>
      <div className="mt-3 rounded-xl border border-white/8 bg-ink-2/70 p-3">
        <CompareBars
          label="Basket size comparison preview"
          items={[
            { label: "With meat", value: b.meat_basket_avg, color: "#ff6a3d" },
            { label: "Without meat", value: b.nonmeat_basket_avg, color: "#4aa3ff" },
          ]}
        />
      </div>
      {/* Extra charts clip below fold — full set visible after upload */}
      <div className="mt-3 hidden sm:block">
        <DonutChart segments={b.basket_segments} size={120} stroke={10} />
      </div>
      {attachRows.length > 0 && (
        <div className="mt-3 hidden lg:block">
          <RankedBars
            items={attachRows.slice(0, 3)}
            valueKey="value"
            labelKey="label"
            color="#34c759"
            formatValue={(v) => `${v}%`}
            maxItems={3}
          />
        </div>
      )}
    </DemoInsightPreview>
  );
}

export function RetentionLoyaltyDemoPreview({ title, detail }) {
  const d = DEMO_LOYALTY;

  return (
    <DemoInsightPreview title={title} detail={detail} previewMaxH="max-h-[176px] sm:max-h-[196px]">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <DemoStat label="Unique customers" value={d.unique_customers.toLocaleString()} />
        <DemoStat label="Retention rate" value={d.retention_rate_pct} suffix="%" hint="2+ visits" />
        <DemoStat label="Orders linked" value={d.orders_with_customer.toLocaleString()} />
      </div>
      <div className="mt-3 rounded-xl border border-white/8 bg-ink-2/70 p-3">
        <RetentionGauge
          rate={d.retention_rate_pct}
          repeatCount={d.loyalty_repeat_count}
          newCount={d.loyalty_new_count}
        />
      </div>
      <div className="mt-3 hidden sm:grid sm:grid-cols-2 sm:gap-3">
        <DonutChart segments={d.loyalty_tiers.slice(0, 3)} size={110} stroke={10} />
        <SegmentBar items={d.segments.slice(0, 2)} color="#4aa3ff" label="Spend segments preview" />
      </div>
    </DemoInsightPreview>
  );
}

export function TopCustomersDemoPreview({ title, detail }) {
  const rows = demoTopCustomerRows(DEMO_TOP_CUSTOMERS.slice(0, 5));

  return (
    <DemoInsightPreview title={title} detail={detail} previewMaxH="max-h-[160px] sm:max-h-[180px]">
      <RankedBars
        items={rows}
        valueKey="value"
        labelKey="label"
        color="#ff6a3d"
        maxItems={5}
        label="Top customers by spend preview"
      />
    </DemoInsightPreview>
  );
}
