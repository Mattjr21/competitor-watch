import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { AlertTriangle, RotateCw } from "lucide-react";

export const EASE = [0.22, 1, 0.36, 1];

export function Eyebrow({ children, dot = false, className = "" }) {
  return (
    <div
      className={
        "flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55 " +
        className
      }
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
        </span>
      )}
      {children}
    </div>
  );
}

export function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ to, suffix = "", duration = 1000 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView || to == null || isNaN(to)) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

export function Spinner({ size = 16, className = "" }) {
  return (
    <span
      className={"inline-block animate-spin rounded-full border-2 border-white/25 border-t-white " + className}
      style={{ width: size, height: size }}
    />
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/25 bg-red-500/5 px-6 py-12 text-center">
      <AlertTriangle className="text-red-400" size={26} />
      <p className="text-sm text-white/70">{message || "Something went wrong."}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
        >
          <RotateCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-2 px-6 py-14 text-center text-sm text-white/45">
      {children}
    </div>
  );
}

export function CardSkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-40" />
      ))}
    </div>
  );
}

/** Global fetch progress — keeps users informed during slow API calls. */
export function LoadProgress({ steps }) {
  const active = steps.filter((s) => s.active);
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const slowStep = steps.find((s) => s.active && s.slow);

  if (active.length === 0 && done === total) return null;

  return (
    <div className="border-b border-white/10 bg-ink-2/90 px-6 py-3">
      <div className="mx-auto max-w-7xl">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/55">
          <span>
            {active.length > 0
              ? active.map((s) => s.label).join(" · ")
              : "Loading complete"}
          </span>
          <span className="tabular-nums">{done}/{total}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
            style={{ width: `${Math.max(pct, active.length ? 8 : 0)}%` }}
          />
        </div>
        {slowStep?.hint && (
          <p className="mt-2 text-xs text-amber-200/80">{slowStep.hint}</p>
        )}
      </div>
    </div>
  );
}
