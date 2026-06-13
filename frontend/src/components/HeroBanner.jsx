import { motion } from "motion/react";
import { EASE } from "../lib/ui";

const HERO_SRC = "/hero-la-bodega.png?v=7";

const textShadow =
  "drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.75)]";

export default function HeroBanner({ location }) {
  const city = location?.city || "Calhoun";
  const state = location?.state || "GA";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative mb-4 overflow-hidden rounded-xl border border-white/10 sm:mb-8 sm:rounded-2xl lg:mb-10"
      aria-label="La Bodega store"
    >
      <img
        src={HERO_SRC}
        alt="La Bodega Supermercado — produce, grocery aisles, and meat counter"
        className="aspect-[16/10] max-h-[200px] w-full object-cover object-[22%_38%] sm:aspect-[21/9] sm:max-h-[360px] sm:object-center"
        fetchPriority="high"
      />

      {/* Mobile: short bottom fade — image stays visible above */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-ink/95 via-ink/45 to-transparent sm:hidden"
        aria-hidden
      />

      {/* Desktop: left + bottom scrims */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] bg-gradient-to-r from-ink/70 via-ink/25 to-transparent sm:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[42%] bg-gradient-to-t from-ink/45 via-ink/10 to-transparent sm:block"
        aria-hidden
      />

      {/* Mobile: text on gradient only — no solid card */}
      <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3 pt-10 sm:hidden">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] text-brand ${textShadow}`}>
          La Bodega Supermercado
        </p>
        <p className={`mt-0.5 font-display text-lg font-bold leading-snug tracking-tight text-white ${textShadow}`}>
          See the market before your customers do.
        </p>
        <p className={`mt-1 text-xs text-white/80 ${textShadow}`}>
          {city}, {state} · weather & competitor intel
        </p>
      </div>

      {/* Desktop: left-aligned overlay */}
      <div className="absolute inset-0 hidden flex-col justify-end p-6 sm:flex lg:p-8 md:max-w-lg">
        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-4 -z-10 rounded-xl bg-ink/25 backdrop-blur-[1px]"
            aria-hidden
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand drop-shadow-sm">
            La Bodega Supermercado
          </p>
          <p className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
            See the market before your customers do.
          </p>
          <p className="mt-2 text-sm text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
            {city}, {state} · weather, competitor ads, and pricing intelligence
          </p>
        </div>
      </div>
    </motion.section>
  );
}
