import { motion } from "motion/react";
import { EASE } from "../lib/ui";

const HERO_SRC = "/hero-la-bodega.png";

export default function HeroBanner({ location }) {
  const city = location?.city || "Calhoun";
  const state = location?.state || "GA";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative mb-10 overflow-hidden rounded-2xl border border-white/10"
      aria-label="La Bodega store"
    >
      <img
        src={HERO_SRC}
        alt="La Bodega Supermercado — produce, grocery aisles, and meat counter"
        className="aspect-[21/9] max-h-[min(42vh,360px)] w-full object-cover object-[center_35%] sm:max-h-[360px]"
        fetchPriority="high"
      />

      {/* Light scrims — left/bottom only so the scene stays visible */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-ink/70 via-ink/25 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-ink/45 via-ink/10 to-transparent"
        aria-hidden
      />

      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 md:max-w-lg">
        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-3 -z-10 rounded-xl bg-ink/25 backdrop-blur-[1px] sm:-inset-4"
            aria-hidden
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand drop-shadow-sm">
            La Bodega Supermercado
          </p>
          <p className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-3xl">
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
