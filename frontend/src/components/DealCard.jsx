import { useEffect, useRef, useState } from "react";
import { getCategoryMeta } from "../lib/categories";

function fmtDate(d) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function AnimatedPrice({ value, unit }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const target = parseFloat(value);

  useEffect(() => {
    if (isNaN(target)) return;
    const duration = 600;
    const start = performance.now();
    const from = target * 0.6;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * ease);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  const formatted = isNaN(target)
    ? value
    : "$" + display.toFixed(2).replace(/\.00$/, "") + (unit ? "/" + unit : "");

  return <span className="font-display text-xl font-bold tabular-nums text-leaf">{formatted}</span>;
}

export default function DealCard({ d }) {
  const displayPrice = d.price != null ? String(d.price) : null;
  const saleStory = d.sale_story || "";
  const hasBuyCondition = /when you buy|buy \d|limit|must buy/i.test(saleStory);
  const condition = hasBuyCondition ? saleStory : null;
  const validTo = fmtDate(d.valid_to);
  const meta = getCategoryMeta(d.catLabel);
  const Icon = meta.icon;

  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl border border-white/10 bg-ink-2 p-4 transition-colors hover:border-white/25">
      {d.merchant && (
        <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/45">
          {d.merchant}
        </div>
      )}
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
          style={{ background: `${meta.color}1f`, color: meta.color }}
        >
          <Icon size={15} strokeWidth={2} />
        </span>
        <span
          className="line-clamp-2 text-[13px] font-medium leading-snug text-white/90"
          title={d.name}
        >
          {d.name}
        </span>
      </div>

      <div>
        {displayPrice ? (
          <>
            <AnimatedPrice value={displayPrice} unit={d.unit} />
            {condition && <div className="mt-0.5 text-[11px] text-white/45">{condition}</div>}
          </>
        ) : (
          <span className="text-xs text-white/50">{saleStory || "See ad"}</span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {d.catLabel && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `${meta.color}1a`, color: meta.color }}
          >
            {d.catLabel}
          </span>
        )}
        {validTo && <span className="text-[11px] text-white/35">· thru {validTo}</span>}
        {d.is_latino && (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
            Latino
          </span>
        )}
      </div>
    </div>
  );
}
