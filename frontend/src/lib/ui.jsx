import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const EASE = [0.22, 1, 0.36, 1];

export function Eyebrow({ children, dot = false, className = "" }) {
  return (
    <div
      className={
        "flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground " +
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
      className={
        "inline-block animate-spin rounded-full border-2 border-muted-foreground/25 border-t-primary " +
        className
      }
      style={{ width: size, height: size }}
    />
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <Alert variant="destructive" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <AlertTriangle size={26} />
      <AlertDescription>{message || "Something went wrong."}</AlertDescription>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry} className="mt-1">
          <RotateCw size={14} /> Try again
        </Button>
      )}
    </Alert>
  );
}

export function EmptyState({ children }) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6 sm:py-14">
        {children}
      </CardContent>
    </Card>
  );
}

export function CardSkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

export function TabPanelFallback() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading section">
      <div className="skeleton h-10 w-56 rounded-xl" />
      <div className="skeleton h-32 rounded-xl sm:h-40" />
      <CardSkeletonGrid count={4} />
    </div>
  );
}

export function LoadProgress({ steps }) {
  const active = steps.filter((s) => s.active);
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const slowStep = steps.find((s) => s.active && s.slow);

  if (active.length === 0 && done === total) return null;

  return (
    <div className="border-b border-border bg-muted/30 py-3">
      <div className="px-4 md:px-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {active.length > 0
              ? active.map((s) => s.label).join(" · ")
              : "Loading complete"}
          </span>
          <span className="tabular-nums">{done}/{total}</span>
        </div>
        <Progress value={Math.max(pct, active.length ? 8 : 0)} className="h-1.5" />
        {slowStep?.hint && (
          <p className="mt-2 text-xs text-amber-700">{slowStep.hint}</p>
        )}
      </div>
    </div>
  );
}
