import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { EASE } from "../lib/ui";

const TONE_STYLE = {
  anchor: { border: "border-l-brand", tag: "bg-brand/20 text-brand" },
  protect: { border: "border-l-sky", tag: "bg-sky/15 text-sky" },
  attach: { border: "border-l-leaf", tag: "bg-leaf/15 text-leaf" },
  midweek: { border: "border-l-amber-400", tag: "bg-amber-500/15 text-amber-200" },
};

function formatBenchPrice(b) {
  if (!b) return null;
  if (b.price != null) {
    const unit = b.unit ? `/${b.unit}` : "";
    return `$${b.price}${unit}`;
  }
  return b.sale_story || null;
}

function Benchmark({ benchmark }) {
  if (!benchmark) return null;
  const price = formatBenchPrice(benchmark);
  return (
    <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/60">
      <span className="font-semibold text-white/75">{benchmark.merchant}</span>
      {benchmark.is_latino && (
        <span className="ml-1.5 rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/50">
          Latino
        </span>
      )}
      {price && <span className="ml-1.5 font-display font-bold text-leaf">{price}</span>}
      {benchmark.valid_to && (
        <span className="ml-1.5 text-white/40">thru {benchmark.valid_to}</span>
      )}
    </div>
  );
}

function RecommendationItem({ rec }) {
  const tone = TONE_STYLE[rec.tone] || TONE_STYLE.anchor;

  return (
    <details
      className={
        "group overflow-hidden rounded-2xl border border-white/10 bg-ink-2/40 border-l-4 " +
        tone.border
      }
    >
      <summary
        className={
          "flex min-h-[44px] cursor-pointer list-none items-start gap-3 rounded-r-2xl px-4 py-3 " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset " +
          "sm:px-5 sm:py-3.5 [&::-webkit-details-marker]:hidden"
        }
        aria-label={`${rec.tag}: ${rec.title}. Expand for details.`}
      >
        <div className="min-w-0 flex-1">
          <span
            className={
              "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " +
              tone.tag
            }
          >
            {rec.tag}
          </span>
          <h4 className="mt-1.5 font-display text-sm font-semibold leading-snug text-white sm:text-[15px]">
            {rec.title}
          </h4>
        </div>
        <ChevronDown
          size={18}
          className="mt-1 shrink-0 text-white/40 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-white/8 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        {(rec.plain || rec.goal) && (
          <p className="text-xs text-white/50">
            {rec.plain}
            {rec.goal ? ` · Goal: ${rec.goal}` : ""}
          </p>
        )}
        {rec.body && <p className="mt-2 text-sm leading-relaxed text-white/70">{rec.body}</p>}
        <Benchmark benchmark={rec.benchmark} />
      </div>
    </details>
  );
}

export default function RecommendationCards({
  recommendations = [],
  title = "What to feature this weekend",
  description = "Tap any item to open the full playbook.",
  compact = false,
  limit,
  reduceMotion = false,
}) {
  const items = limit ? recommendations.slice(0, limit) : recommendations;
  if (!items.length) return null;

  return (
    <section aria-label={title}>
      {(title || description) && (
        <header className={compact ? "mb-3" : "mb-4"}>
          {title && (
            <h3 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
              {title}
            </h3>
          )}
          {description && <p className="mt-1 text-sm text-white/50">{description}</p>}
        </header>
      )}
      <div className="space-y-2">
        {items.map((rec, i) => {
          const key = `${rec.tag}-${rec.title}-${i}`;
          if (reduceMotion) {
            return <RecommendationItem key={key} rec={rec} />;
          }
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03, ease: EASE }}
            >
              <RecommendationItem rec={rec} />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
