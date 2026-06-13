import { motion } from "motion/react";
import { EASE } from "../lib/ui";

const CHART_COLORS = ["#4aa3ff", "#34c759", "#ff6a3d", "#f0b429", "#a78bfa", "#38bdf8"];

function chartColor(index, override) {
  return override || CHART_COLORS[index % CHART_COLORS.length];
}

/** Horizontal segment bars — spend bands, shopping rhythm, etc. */
export function SegmentBar({ items, valueKey = "pct", color = "#4aa3ff", label }) {
  if (!items?.length) return null;
  return (
    <div role="img" aria-label={label || "Segment breakdown"} className="space-y-3">
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

/** Side-by-side bars — e.g. meat vs non-meat basket, weekend vs weekday. */
export function CompareBars({ items, unit = "$", label = "Comparison" }) {
  if (!items?.length) return null;
  const max = Math.max(...items.map((i) => i.value || 0), 1);

  return (
    <div role="img" aria-label={label} className="space-y-4">
      {items.map((item, i) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-white/80">{item.label}</span>
            <span className="shrink-0 tabular-nums text-white/55">
              {unit}
              {typeof item.value === "number" ? item.value.toFixed(2) : item.value}
              {item.hint ? ` · ${item.hint}` : ""}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (item.value / max) * 100)}%` }}
              transition={{ duration: 0.65, ease: EASE, delay: i * 0.06 }}
              className="h-full rounded-full"
              style={{ background: item.color || chartColor(i) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** SVG donut for segment mix — loyalty tiers, basket size, spend bands. */
export function DonutChart({ segments, size = 168, stroke = 14, label = "Segment mix" }) {
  if (!segments?.length) return null;

  const total = segments.reduce((sum, s) => sum + (s.pct || 0), 0) || 100;
  const summary = segments.map((s) => `${s.label} ${s.pct}%`).join(", ");
  const r = (size - stroke) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <figure className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <figcaption className="sr-only">
        {label}: {summary}
      </figcaption>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgb(255 255 255 / 0.08)"
            strokeWidth={stroke}
          />
          {segments.map((seg, i) => {
            const pct = (seg.pct || 0) / total;
            const dash = pct * circumference;
            const el = (
              <circle
                key={seg.key || seg.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={chartColor(i, seg.color)}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={0.92}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-2xl font-bold tabular-nums text-white">
              {segments.reduce((n, s) => n + (s.count ?? s.orders ?? 0), 0).toLocaleString()}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/45">total</div>
          </div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        {segments.map((seg, i) => (
          <li key={seg.key || seg.label} className="flex items-start gap-2 text-xs">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: chartColor(i, seg.color) }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="font-medium text-white/80">{seg.label}</div>
              <div className="tabular-nums text-white/50">
                {seg.pct}% · {seg.count ?? seg.orders ?? "—"}
                {seg.avg_basket != null && ` · $${seg.avg_basket} avg`}
                {seg.avg_spend != null && ` · $${seg.avg_spend} spend`}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Retention rate ring + one-line repeat vs new split. */
export function RetentionGauge({ rate, repeatCount, newCount }) {
  const pct = Math.min(100, Math.max(0, rate ?? 0));
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div
      className="flex items-center gap-5"
      role="img"
      aria-label={`Retention rate ${pct} percent. ${repeatCount ?? 0} returning shoppers, ${newCount ?? 0} one-time shoppers.`}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgb(255 255 255 / 0.08)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#34c759"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${dash} ${circumference}` }}
            transition={{ duration: 0.8, ease: EASE }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="font-display text-xl font-bold tabular-nums text-white">{pct}%</span>
        </div>
      </div>
      <div className="text-sm">
        <div className="font-medium text-white/85">2+ visit shoppers</div>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          {repeatCount != null && newCount != null ? (
            <>
              <span className="text-leaf">{repeatCount.toLocaleString()} returning</span>
              {" · "}
              <span className="text-white/65">{newCount.toLocaleString()} one-time</span>
            </>
          ) : (
            "Share of customers who came back at least once."
          )}
        </p>
      </div>
    </div>
  );
}

/** Horizontal ranked bars — top customers by spend or attach rates. */
export function RankedBars({
  items,
  valueKey = "value",
  labelKey = "label",
  formatValue = (v) => `$${Number(v).toLocaleString()}`,
  color = "#4aa3ff",
  maxItems = 8,
  label = "Ranked values",
}) {
  if (!items?.length) return null;

  const rows = items.slice(0, maxItems);
  const max = Math.max(...rows.map((r) => r[valueKey] || 0), 1);

  return (
    <div role="img" aria-label={label} className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.key || row[labelKey] || i}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium text-white/80">{row[labelKey]}</span>
            <span className="shrink-0 tabular-nums text-white/55">{formatValue(row[valueKey])}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((row[valueKey] || 0) / max) * 100)}%` }}
              transition={{ duration: 0.55, ease: EASE, delay: i * 0.04 }}
              className="h-full rounded-full"
              style={{ background: row.color || color, opacity: 1 - i * 0.06 }}
            />
          </div>
          {row.sub && <div className="mt-0.5 text-[10px] text-white/40">{row.sub}</div>}
        </div>
      ))}
    </div>
  );
}
