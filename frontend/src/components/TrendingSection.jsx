import { RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { ErrorState, EmptyState, EASE } from "../lib/ui";
import { getSuggestedBenchmarkPresets } from "../lib/benchmarkProfiles";
import { PageHeader, PANEL, SectionHeader, TAB_SECTION_SPACE, TAG_BADGE } from "../lib/sectionUi";

const TRENDING_PAGE_LEDE =
  "National Latino grocery ad scan — what chains advertise most, not your store’s daily sales. For lowest prices near you, see Competitor deals.";

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
      className={"flex flex-col gap-2 transition-colors hover:border-border " + PANEL + " p-4 sm:p-5"}
    >
      {item.image && (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/60">
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
        <span className="text-sm font-semibold leading-snug text-foreground">{item.name}</span>
      </div>
      {price && <span className="font-display text-lg font-bold text-leaf">{price}</span>}
      <div className="flex items-center gap-2">
        <span className={TAG_BADGE}>
          {item.stores ?? 0} {item.stores === 1 ? "store" : "stores"}
        </span>
      </div>
      {merchantList && <span className="text-xs leading-relaxed text-muted-foreground/80">{merchantList}</span>}
    </motion.div>
  );
}

function TrendGrid({ items, loading, accent, emptyMsg, loadingMsg }) {
  if (loading && !items?.length) {
    return (
      <div>
        {loadingMsg && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm text-muted-foreground"
          >
            <RefreshCw size={14} className="animate-spin shrink-0" aria-hidden />
            {loadingMsg}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      </div>
    );
  }
  if (!items?.length) return <EmptyState>{emptyMsg}</EmptyState>;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <TrendCard key={i} item={item} rank={i + 1} accent={accent} />
      ))}
    </div>
  );
}

export default function TrendingSection({
  data,
  loading,
  pendingScope = false,
  error,
  onRefresh,
  marketLabel = "your selected market",
  profileLabel = "Latino grocery",
  profileId = "latino",
}) {
  if (error) return <ErrorState message={error} onRetry={onRefresh} />;

  if (pendingScope || (loading && !data)) {
    return (
      <section className={TAB_SECTION_SPACE}>
        <PageHeader
          eyebrow="Market trends"
          title="What's being advertised"
          description={TRENDING_PAGE_LEDE}
          meta={`Loading ${profileLabel.toLowerCase()} vs mainstream in ${marketLabel}…`}
        />
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-foreground/85"
        >
          <RefreshCw size={14} className="mr-2 inline animate-spin" aria-hidden />
          Scanning Flipp ads for <span className="font-semibold text-foreground">{profileLabel}</span> in{" "}
          <span className="font-semibold text-foreground">{marketLabel}</span> — can take up to 60 seconds.
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      </section>
    );
  }

  const ethnicLabel = profileLabel;
  const ethnicItems = data?.ethnic || data?.latino || [];
  const zipCount = data?.scanned_zips?.length || 0;
  const scopeLine =
    marketLabel && marketLabel !== "No markets"
      ? marketLabel
      : zipCount
        ? `${zipCount} ZIP${zipCount !== 1 ? "s" : ""}`
        : "selected ZIP codes";

  const suggestedMarkets = getSuggestedBenchmarkPresets(profileId, 3);
  const marketHint =
    suggestedMarkets.length > 0
      ? `Try a denser Flipp market preset (e.g. ${suggestedMarkets.join(", ")}).`
      : "Try a larger ethnic market preset from Compare markets.";

  const ethnicEmptyMsg =
    ethnicItems.length === 0 && !loading
      ? `No ${ethnicLabel.toLowerCase()} weekly ads found in ${scopeLine} on Flipp. ${marketHint} Pick one market preset at a time for best results. Flipp often lists ethnic circulars without product titles — category-level signals are shown when available.`
      : `No ${ethnicLabel.toLowerCase()} ads in ${scopeLine} yet.`;

  const loadingMsg = loading
    ? `Scanning ${ethnicLabel.toLowerCase()} ads in ${scopeLine}…`
    : null;

  return (
    <section className={TAB_SECTION_SPACE}>
      <PageHeader
        eyebrow="Market trends"
        title="What's being advertised"
        description={TRENDING_PAGE_LEDE}
        meta={`${scopeLine} · ${ethnicLabel.toLowerCase()} vs mainstream`}
      />

      <div
        role="note"
        className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground"
      >
        Scanning <span className="font-medium text-foreground/85">{scopeLine}</span>
        {zipCount > 0 && data?.scanned_zips && (
          <>
            {" "}
            · <span className="font-mono text-muted-foreground">{data.scanned_zips.join(", ")}</span>
          </>
        )}
        {data?.generated_at && (
          <span className="text-muted-foreground/70"> · updated {data.generated_at}</span>
        )}
        {data?.discovered_merchants?.length > 0 && (
          <>
            {" "}
            ·{" "}
            <span className="text-muted-foreground">
              {data.discovered_merchants.length} Flipp{" "}
              {ethnicLabel.toLowerCase()} grocer{data.discovered_merchants.length !== 1 ? "s" : ""}:{" "}
              {data.discovered_merchants.slice(0, 4).join(", ")}
              {data.discovered_merchants.length > 4
                ? ` +${data.discovered_merchants.length - 4} more`
                : ""}
            </span>
          </>
        )}
      </div>

      <div>
        <SectionHeader
          title={`${ethnicLabel} supermarkets`}
          description={`Top advertised items at ${ethnicLabel.toLowerCase()} grocers in ${scopeLine}.`}
        />
        <TrendGrid
          items={ethnicItems}
          loading={loading}
          accent="#22c55e"
          emptyMsg={ethnicEmptyMsg}
          loadingMsg={loadingMsg}
        />
      </div>

      <div>
        <SectionHeader
          title="Mainstream supermarkets"
          description={`Top items at Kroger, Walmart, Publix, and other national chains in the same ${scopeLine}.`}
        />
        <TrendGrid
          items={data?.mainstream}
          loading={loading}
          accent="#4aa3ff"
          emptyMsg={`No mainstream ads found in ${scopeLine}.`}
          loadingMsg={loading ? `Scanning mainstream ads in ${scopeLine}…` : null}
        />
      </div>
    </section>
  );
}
