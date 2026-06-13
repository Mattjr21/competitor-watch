import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import {
  Beef,
  Flame,
  CupSoda,
  Wheat,
  Carrot,
  Milk,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

const CATEGORIES = {
  meat: { label: "Meat", icon: Beef, color: "#ff6a3d" },
  produce: { label: "Produce", icon: Carrot, color: "#34c759" },
  tortilla: { label: "Tortilla", icon: Wheat, color: "#f0b429" },
  soda: { label: "Soda", icon: CupSoda, color: "#4aa3ff" },
  charcoal: { label: "Charcoal", icon: Flame, color: "#ff5d5d" },
  dairy: { label: "Dairy", icon: Milk, color: "#9b8cff" },
};

const DEALS = [
  { id: 1, merchant: "El Rancho", product: "Bone-In Ribeye Steak", price: 5.99, was: 8.99, unit: "/lb", cat: "meat", latino: true },
  { id: 2, merchant: "Fiesta Mart", product: "Carne Asada, Marinated", price: 6.49, was: 9.99, unit: "/lb", cat: "meat", latino: true },
  { id: 3, merchant: "Food Lion", product: "Boneless Chicken Breast", price: 1.99, was: 3.49, unit: "/lb", cat: "meat" },
  { id: 4, merchant: "La Michoacana", product: "Maseca Corn Tortillas, 80ct", price: 3.99, was: 5.49, unit: "", cat: "tortilla", latino: true },
  { id: 5, merchant: "Ingles", product: "Vine Roma Tomatoes", price: 0.88, was: 1.49, unit: "/lb", cat: "produce" },
  { id: 6, merchant: "Walmart", product: "Coca-Cola, 12-pack cans", price: 5.99, was: 7.99, unit: "", cat: "soda" },
  { id: 7, merchant: "Publix", product: "Kingsford Charcoal, 16lb", price: 9.99, was: 14.99, unit: "", cat: "charcoal" },
  { id: 8, merchant: "El Rancho", product: "Queso Fresco, 10oz", price: 2.99, was: 4.29, unit: "", cat: "dairy", latino: true },
];

const STATS = [
  { value: 14, suffix: "", label: "Retailers tracked" },
  { value: 96, suffix: "", label: "Live deals near you" },
  { value: 6, suffix: "", label: "Market areas" },
];

function CountUp({ to, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const duration = 1100;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

function Eyebrow({ children, dot = false }) {
  return (
    <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
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

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-ink">
            <Sparkles size={17} strokeWidth={2.4} />
          </span>
          <span className="font-display text-[15px] font-700 tracking-tight">
            La&nbsp;Bodega
            <span className="text-white/40"> / Competitor Watch</span>
          </span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          <a className="transition hover:text-white" href="#deals">Deals</a>
          <a className="transition hover:text-white" href="#">Daily Ops</a>
          <a className="transition hover:text-white" href="#">Trending</a>
        </nav>
        <button className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-600 text-ink transition hover:bg-brand hover:text-white">
          <RefreshCw size={15} className="transition group-hover:rotate-180" />
          Refresh all
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ambient color glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-brand/25 blur-[140px]" />
        <div className="absolute right-0 top-20 h-[380px] w-[380px] rounded-full bg-sky/15 blur-[150px]" />
        <div className="absolute bottom-[-120px] left-1/3 h-[360px] w-[360px] rounded-full bg-leaf/10 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-24">
        <Reveal>
          <Eyebrow dot>Live competitor pricing · Calhoun, GA</Eyebrow>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-700 leading-[0.98] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            Know every deal
            <br />
            <span className="text-white/45">before your</span> customers do.
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/60">
            Live weekly-ad pricing from every competitor near your store — scored
            against your own sales — so you know exactly what to feature this weekend.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-12 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-display text-4xl font-700 tracking-tight sm:text-5xl">
                  <CountUp to={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function DealCard({ deal, index }) {
  const meta = CATEGORIES[deal.cat];
  const Icon = meta.icon;
  const savings = Math.round(((deal.was - deal.price) / deal.was) * 100);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.05 }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-2 transition-colors hover:border-white/25"
    >
      {/* image / category placeholder */}
      <div
        className="relative flex h-36 items-center justify-center"
        style={{
          background: `radial-gradient(120% 120% at 30% 20%, ${meta.color}33, transparent 70%), #0d1219`,
        }}
      >
        <Icon size={44} strokeWidth={1.4} style={{ color: meta.color }} />
        <span className="absolute right-3 top-3 rounded-full bg-leaf px-2.5 py-1 text-[11px] font-700 text-ink">
          −{savings}%
        </span>
        {deal.latino && (
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-ink/60 px-2.5 py-1 text-[10px] font-600 uppercase tracking-wider text-white/80 backdrop-blur">
            Latino grocer
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="text-[11px] font-600 uppercase tracking-[0.16em]" style={{ color: meta.color }}>
          {deal.merchant}
        </div>
        <h3 className="mt-1.5 font-display text-lg font-600 leading-snug tracking-tight">
          {deal.product}
        </h3>

        <div className="mt-auto flex items-end justify-between pt-5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-700 tracking-tight">
              ${deal.price.toFixed(2)}
            </span>
            <span className="text-sm text-white/35">{deal.unit}</span>
          </div>
          <span className="text-sm text-white/35 line-through">${deal.was.toFixed(2)}</span>
        </div>
      </div>
    </motion.article>
  );
}

function DealsSection() {
  const [active, setActive] = useState("all");
  const filters = ["all", ...Object.keys(CATEGORIES)];
  const shown = active === "all" ? DEALS : DEALS.filter((d) => d.cat === active);

  return (
    <section id="deals" className="relative mx-auto max-w-7xl px-6 py-24">
      <Reveal>
        <Eyebrow>This weekend</Eyebrow>
      </Reveal>
      <Reveal delay={0.06}>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-2xl font-display text-4xl font-700 leading-tight tracking-[-0.02em] sm:text-5xl">
            The sharpest deals near you, right now.
          </h2>
          <a href="#" className="group inline-flex items-center gap-1.5 text-sm font-600 text-white/70 transition hover:text-white">
            View full report
            <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </Reveal>

      {/* category filter chips */}
      <Reveal delay={0.12}>
        <div className="mt-10 flex flex-wrap gap-2.5">
          {filters.map((f) => {
            const isActive = active === f;
            const label = f === "all" ? "All deals" : CATEGORIES[f].label;
            return (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={
                  "rounded-full border px-4 py-2 text-sm font-500 transition " +
                  (isActive
                    ? "border-white bg-white text-ink"
                    : "border-white/15 text-white/65 hover:border-white/40 hover:text-white")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </Reveal>

      <motion.div layout className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {shown.map((deal, i) => (
            <DealCard key={deal.id} deal={deal} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-10 text-sm text-white/40 sm:flex-row">
        <span>La Bodega — Competitor Watch · UI preview</span>
        <span>Updated Jun 12, 6:40 PM · 30701, 30735, 30720</span>
      </div>
    </footer>
  );
}

export default function Prototype() {
  return (
    <div className="min-h-screen bg-ink text-white selection:bg-brand/30">
      <Nav />
      <Hero />
      <DealsSection />
      <Footer />
    </div>
  );
}
