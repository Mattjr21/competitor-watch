import { motion } from "motion/react";
import { EASE } from "../lib/ui";

const HERO_SRC = "/hero-la-bodega.png?v=7";

export default function HeroBanner({ location, compactOnMobile = false }) {
  const city = location?.city || "Calhoun";
  const state = location?.state || "GA";
  const imageClass =
    "aspect-[16/10] w-full object-cover object-[62%_42%] sm:aspect-[21/9] sm:max-h-[400px] sm:object-[68%_45%] " +
    (compactOnMobile ? "max-h-[200px] sm:max-h-[400px]" : "max-h-[240px] sm:max-h-[400px]");

  const headlineClass = compactOnMobile
    ? "text-[15px] leading-[1.25] sm:text-lg lg:text-xl"
    : "text-base leading-[1.25] sm:text-lg lg:text-xl";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative mb-4 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-border/50 sm:mb-8 lg:mb-10"
      aria-label="La Bodega store"
    >
      <img
        src={HERO_SRC}
        alt="La Bodega Supermercado — produce, grocery aisles, and meat counter"
        className={imageClass}
        fetchPriority="high"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(15,23,42,0.55)_0%,rgba(15,23,42,0.18)_42%,transparent_68%)] sm:bg-[radial-gradient(ellipse_85%_90%_at_0%_100%,rgba(15,23,42,0.5)_0%,rgba(15,23,42,0.12)_45%,transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/30 to-transparent sm:hidden"
        aria-hidden
      />

      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[22rem] md:max-w-[24rem] lg:bottom-5 lg:left-5 lg:max-w-[25rem]">
        <div className="rounded-xl border border-white/50 bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm supports-[backdrop-filter:blur(0)]:bg-white/95 sm:rounded-2xl sm:px-4 sm:py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-4 w-0.5 shrink-0 rounded-full bg-brand" aria-hidden />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand sm:text-[11px]">
              La Bodega Supermercado
              <span className="font-normal normal-case tracking-normal text-secondary-foreground">
                {" "}
                · {city}, {state}
              </span>
            </p>
          </div>

          <h2 className={"mt-1.5 font-display font-bold tracking-tight text-ink " + headlineClass}>
            <span className="block">See what competitors are pushing</span>
            <span className="block text-foreground/90">before the weekend starts.</span>
          </h2>

          <p className="mt-1.5 text-[11px] leading-snug text-secondary-foreground sm:text-xs">
            Live ad intel, weather demand signals, and pricing gaps — all in one dashboard.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
