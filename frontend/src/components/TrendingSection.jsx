import { motion } from "motion/react";
import { ErrorState, EmptyState, EASE } from "../lib/ui";
import { PageHeader, PANEL, SectionHeader, TAB_SECTION_SPACE } from "../lib/sectionUi";

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
      className={"flex flex-col gap-2 transition-colors hover:border-white/25 " + PANEL + " p-4 sm:p-5"}
    >
      {item.image && (
        <div className="overflow-hidden rounded-xl border border-white/8 bg-white/5">
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
            onError={(e) => {
              e.currentTarget.parentElement.style.display = "none";
            }}
          />
        </div>
      )}
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
    <section className={TAB_SECTION_SPACE}>
      <PageHeader
        eyebrow="Trending"
        title="What's being advertised everywhere."
        description="Most-advertised products across US Latino metros this week"
        onRefresh={onRefresh}
        loading={loading}
      />

      <div>
        <SectionHeader title="Latino supermarkets" description="Top advertised items at Latino grocers." />
        <TrendGrid items={data?.latino} loading={loading} accent="#ff6a3d" emptyMsg="Scanning Latino metros..." />
      </div>

      <div>
        <SectionHeader title="Mainstream supermarkets" description="Top items at national chains." />
        <TrendGrid items={data?.mainstream} loading={loading} accent="#4aa3ff" emptyMsg="Loading..." />
      </div>
    </section>
  );
}
