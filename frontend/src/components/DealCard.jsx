import { useEffect, useRef, useState } from "react";
import { getCategoryMeta } from "../lib/categories";

function fmtDate(d) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPrice(value, unit) {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return "$" + n.toFixed(2).replace(/\.00$/, "") + (unit ? "/" + unit : "");
}

function AnimatedPrice({ value, unit, compact = false }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const target = parseFloat(value);
  const formatted = formatPrice(value, unit);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (isNaN(target) || reduceMotion) {
      setDisplay(target);
      return;
    }
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
  }, [target, reduceMotion]);

  const shown = reduceMotion || isNaN(target) ? formatted : formatPrice(display, unit);

  return (
    <span
      className={
        (compact ? "text-lg" : "text-xl") +
        " font-display font-bold tabular-nums text-leaf"
      }
      aria-label={`Price ${formatted}`}
    >
      {shown}
    </span>
  );
}

export default function DealCard({ d, compact = false, showMerchant = true }) {
  const displayPrice = d.price != null ? String(d.price) : null;
  const saleStory = d.sale_story || "";
  const hasBuyCondition = /when you buy|buy \d|limit|must buy/i.test(saleStory);
  const condition = hasBuyCondition ? saleStory : null;
  const validTo = fmtDate(d.valid_to);
  const meta = getCategoryMeta(d.catLabel);
  const Icon = meta.icon;
  const merchantLabel = showMerchant && !compact && d.merchant ? `${d.merchant} · ` : "";

  const imageFrameClass = compact
    ? "aspect-[5/4] max-h-28 w-full"
    : "aspect-[4/3] w-full";

  return (
    <article
      aria-label={`${merchantLabel}${d.name}${displayPrice ? `, ${formatPrice(displayPrice, d.unit)}` : ""}`}
      className={
        "flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-ink-2 transition-colors hover:border-white/25 " +
        (compact ? "gap-1.5 p-3 sm:p-3.5" : "gap-2 p-4 sm:p-5")
      }
    >
      <div
        className={
          "shrink-0 overflow-hidden rounded-xl border border-white/8 bg-white/5 " +
          (compact ? "" : "mb-1")
        }
      >
        {d.image ? (
          <img
            src={d.image}
            alt=""
            loading="lazy"
            className={imageFrameClass + " object-cover"}
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <div className={imageFrameClass} aria-hidden />
        )}
      </div>
      {showMerchant && !compact && (
        <div className="min-h-[1rem] shrink-0 truncate text-[11px] font-semibold uppercase tracking-wide text-white/60">
          {d.merchant || "\u00A0"}
        </div>
      )}
      <div className="flex min-h-[2.5rem] shrink-0 items-start gap-2">
        <span
          aria-hidden
          className={
            "grid shrink-0 place-items-center rounded-lg " +
            (compact ? "mt-0 h-6 w-6" : "mt-0.5 h-7 w-7")
          }
          style={{ background: `${meta.color}1f`, color: meta.color }}
        >
          <Icon size={compact ? 13 : 15} strokeWidth={2} />
        </span>
        <h4
          className={
            (compact ? "line-clamp-2 text-xs" : "line-clamp-2 text-[13px]") +
            " m-0 font-medium leading-snug text-white/90"
          }
        >
          {d.name}
        </h4>
      </div>

      <div className={compact ? "min-h-[1.75rem] shrink-0" : "min-h-[2.5rem] shrink-0"}>
        {displayPrice ? (
          <>
            <AnimatedPrice value={displayPrice} unit={d.unit} compact={compact} />
            {!compact && (
              <p className="mt-0.5 line-clamp-2 min-h-[1.25rem] text-[11px] leading-snug text-white/60">
                {condition || "\u00A0"}
              </p>
            )}
          </>
        ) : (
          <p className="line-clamp-2 text-xs text-white/60">
            {saleStory || "See weekly ad for price"}
          </p>
        )}
      </div>

      <div
        className={
          "mt-auto flex min-h-[1.75rem] shrink-0 flex-wrap items-center gap-1.5 " +
          (compact ? "pt-0.5" : "pt-1 gap-2")
        }
      >
        {d.catLabel && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `${meta.color}1a`, color: meta.color }}
          >
            {d.catLabel}
          </span>
        )}
        {validTo && (
          <span className="text-[11px] text-white/50">
            Valid thru {validTo}
          </span>
        )}
        {d.is_latino && (
          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
            Latino grocer
          </span>
        )}
      </div>
    </article>
  );
}
