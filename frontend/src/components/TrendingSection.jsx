import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { Eyebrow, ErrorState, EmptyState, EASE } from "../lib/ui";

function TrendCard({ item, rank, accent }) {
  const price =
    item.min != null ? (item.min === item.max ? `$${item.min}` : `$${item.min}–$${item.max}`) : null;
  const merchants = item.merchants || [];
  const merchantList =
    merchants.slice(0, 3).join(", ") + (merchants.length > 3 ? ` +${merchants.length - 3}` : "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: (rank - 1) * 0.03, ease: EASE }}
      whileHover={{ y: -4 }}
      className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-2 p-4 transition-colors hover:border-white/25 sm:p-5"
    >
      <div className="flex items-start gap-2.5">
        <span className="font-display text-sm font-bold" style={{ color: accent }}>
          #{rank}
        </span>
        <span className="text-sm font-semibold leading-snug text-white/90">{item.name}</span>
      </div>
      {price && <span className="font-display text-lg font-bold text-leaf">{price}</span>}
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: `${accent}1a`, color: accent }}
        >
          {item.stores ?? 0} {item.stores === 1 ? "store" : "stores"}
        </span>
      </div>
      {merchantList && <span className="text-xs leading-relaxed text-white/45">{merchantList}</span>}
    </motion.div>
  );
}

function TrendGrid({ items, loading, accent, emptyMsg }) {
  if (loading && !items?.length)
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-32" />
        ))}
      </div>
    );
  if (!items?.length) return <EmptyState>{emptyMsg}</EmptyState>;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <TrendCard key={i} item={item} rank={i + 1} accent={accent} />
      ))}
    </div>
  );
}

export default function TrendingSection({ data, loading, error, onRefresh }) {
  if (error) return <ErrorState message={error} onRetry={onRefresh} />;

  return (
    <section className="space-y-14">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Trending</Eyebrow>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
              What’s being advertised everywhere.
            </h2>
            <p className="mt-3 text-sm text-white/50">
              Most-advertised products across US Latino metros this week
            </p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/40 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-6 font-display text-xl font-semibold tracking-tight text-white/90">
          🌮 Latino supermarkets
        </h3>
        <TrendGrid items={data?.latino} loading={loading} accent="#ff6a3d" emptyMsg="Scanning Latino metros..." />
      </div>

      <div>
        <h3 className="mb-6 font-display text-xl font-semibold tracking-tight text-white/90">
          🛒 Mainstream supermarkets
        </h3>
        <TrendGrid items={data?.mainstream} loading={loading} accent="#4aa3ff" emptyMsg="Loading..." />
      </div>
    </section>
  );
}
