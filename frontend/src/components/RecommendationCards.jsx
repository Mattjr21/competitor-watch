import { motion } from "motion/react";
import { EASE } from "../lib/ui";
import { PANEL } from "../lib/sectionUi";

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

export default function RecommendationCards({
  recommendations = [],
  title = "What to feature this weekend",
  description = "Plain-language plan from live competitor ads and your sales patterns.",
  compact = false,
  limit,
  reduceMotion = false,
}) {
  const items = limit ? recommendations.slice(0, limit) : recommendations;
  if (!items.length) return null;

  const Wrapper = reduceMotion ? "div" : motion.div;

  return (
    <section aria-label={title}>
      {(title || description) && (
        <header className={compact ? "mb-3" : "mb-5"}>
          {title && (
            <h3 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
              {title}
            </h3>
          )}
          {description && <p className="mt-1 text-sm text-white/55">{description}</p>}
        </header>
      )}
      <div className={"grid gap-3 " + (compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
        {items.map((rec, i) => {
          const tone = TONE_STYLE[rec.tone] || TONE_STYLE.anchor;
          return (
            <Wrapper
              key={`${rec.tag}-${i}`}
              {...(reduceMotion
                ? {}
                : {
                    initial: { opacity: 0, y: 8 },
                    animate: { opacity: 1, y: 0 },
                    transition: { duration: 0.25, delay: i * 0.04, ease: EASE },
                  })}
              className={
                PANEL +
                " border-l-4 " +
                tone.border +
                " p-4 sm:p-5"
              }
              role="article"
              aria-label={`${rec.tag}: ${rec.title}`}
            >
              <span
                className={
                  "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider " +
                  tone.tag
                }
              >
                {rec.tag}
              </span>
              <h4 className="mt-2 font-display text-base font-semibold leading-snug text-white sm:text-[17px]">
                {rec.title}
              </h4>
              {(rec.plain || rec.goal) && (
                <p className="mt-1 text-xs text-white/50">
                  {rec.plain}
                  {rec.goal ? ` · Goal: ${rec.goal}` : ""}
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-white/70">{rec.body}</p>
              <Benchmark benchmark={rec.benchmark} />
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
