import { motion } from "motion/react";
import {
  ArrowRight,
  CloudSun,
  Store,
  BarChart3,
  TrendingUp,
  Beef,
  Upload,
} from "lucide-react";
import HeroBanner from "./HeroBanner";
import RecommendationCards from "./RecommendationCards";
import NationalRankPanel from "./NationalRankPanel";
import { EASE } from "../lib/ui";
import {
  PageHeader,
  StatCard,
  PANEL,
  TAB_SECTION_SPACE,
  SECTION_LEDE,
} from "../lib/sectionUi";
import { computeCategoryWinners, formatDealPrice, MEAT_TYPES } from "../lib/dealWinners";
import { describeLoadedMarkets } from "../lib/marketAreas";

const NAV_CARDS = [
  {
    id: "weather",
    icon: CloudSun,
    accent: "#ff6a3d",
    title: "Daily Ops",
    description: "Weekend weather playbook and category push/skip guidance.",
  },
  {
    id: "deals",
    icon: Store,
    accent: "#4aa3ff",
    title: "Deals",
    description: "Best near you, competitor ads by store, and combo packs.",
  },
  {
    id: "insights",
    icon: BarChart3,
    accent: "#34c759",
    title: "Your Store",
    description: "Pricing, basket, retention, trade area, and promo ideas.",
  },
  {
    id: "trending",
    icon: TrendingUp,
    accent: "#f0b429",
    title: "Trending",
    description: "Most-advertised products across Latino and mainstream grocers.",
  },
];

function NavCard({ card, metric, detail, onNavigate, index, reduceMotion }) {
  const Icon = card.icon;
  const Wrapper = reduceMotion ? "article" : motion.article;

  return (
    <Wrapper
      {...(reduceMotion
        ? {}
        : {
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.28, delay: index * 0.05, ease: EASE },
          })}
      className={
        PANEL +
        " group flex h-full flex-col gap-4 transition-colors hover:border-white/25 hover:bg-ink-2/70"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ background: `${card.accent}1a`, color: card.accent }}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden />
        </div>
        {metric && (
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold tabular-nums text-white/75">
            {metric}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-semibold tracking-tight text-white">{card.title}</h3>
        <p className={"mt-1.5 " + SECTION_LEDE.replace("mt-3 ", "")}>{card.description}</p>
        {detail && <p className="mt-2 text-xs leading-relaxed text-white/50">{detail}</p>}
      </div>

      <button
        type="button"
        onClick={() => onNavigate(card.id)}
        className="inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/85 transition group-hover:border-white/20 group-hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
      >
        Open {card.title}
        <ArrowRight
          size={16}
          className="shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
    </Wrapper>
  );
}

function WeekendStrip({ days }) {
  if (!days?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((day) => (
        <span
          key={day.label}
          className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-white/75"
        >
          <strong className="font-semibold text-white/90">{day.label}</strong>
          {" · "}
          {day.temp_high_f}°F · {day.rain_prob_pct}% rain
        </span>
      ))}
    </div>
  );
}

export default function DashboardSection({
  forecast,
  dealsData,
  trendingData,
  loading,
  marketLabel = "your market",
  homeMarketLabel = "Calhoun GA",
  isBenchmarking = false,
  pendingMarket = false,
  onNavigate,
  onUploadGuide,
  onRefreshNational,
  reduceMotion = false,
}) {
  const loc = forecast?.location || {};
  const storeName = dealsData?.store_name || "La Bodega";
  const totalDeals = dealsData
    ? Object.values(dealsData.deals_by_category || {}).flat().length
    : 0;
  const storeCount = dealsData?.merchants?.length || 0;
  const marketInfo = describeLoadedMarkets(dealsData?.zips?.join(","), dealsData?.area_presets);
  const homeMarketInfo = describeLoadedMarkets(
    dealsData?.home_zips?.join(",") || dealsData?.zips?.join(","),
    dealsData?.area_presets
  );
  const winners = computeCategoryWinners(dealsData?.deals_by_category, dealsData?.categories || []);
  const meatWinners = MEAT_TYPES.map((t) => winners.find((w) => w.meatType === t.key)).filter(Boolean);
  const isSampleData = /default/i.test(dealsData?.data_source || "");
  const hasUploadedData = dealsData && !isSampleData;
  const priceRows = (dealsData?.price_comparison || []).filter((r) => r.market);
  const ethnicTrends = trendingData?.ethnic || trendingData?.latino || [];
  const latinoTrends = ethnicTrends.length;
  const mainstreamTrends = trendingData?.mainstream?.length || 0;
  const trendProfileLabel = trendingData?.profile_label || "Latino grocery";

  const weekendDays = (forecast?.weather_days || []).filter((d) =>
    /sat|sun|sáb|dom/i.test(d.label || "")
  );

  const navMetrics = {
    weather: weekendDays.length
      ? `${weekendDays.length} weekend day${weekendDays.length !== 1 ? "s" : ""}`
      : forecast
        ? "Forecast ready"
        : loading
          ? "Loading…"
          : "—",
    deals: pendingMarket
      ? `Loading ${marketLabel}…`
      : totalDeals
        ? `${totalDeals} ads`
        : loading
          ? "Loading…"
          : "—",
    insights: hasUploadedData
      ? "CSV uploaded"
      : priceRows.length
        ? `${priceRows.length} categories`
        : "Sample data",
    trending:
      latinoTrends + mainstreamTrends
        ? `${latinoTrends + mainstreamTrends} items`
        : loading
          ? "Loading…"
          : "—",
  };

  const navDetails = {
    weather: weekendDays[0]?.playbook_note || forecast?.weather_days?.[0]?.playbook_note || null,
    deals: meatWinners[0]
      ? `Top fresh cut: ${meatWinners[0].winner.name} at ${formatDealPrice(meatWinners[0].winner.price, meatWinners[0].winner.unit)} · ${meatWinners[0].winner.merchant}`
      : winners[0]
        ? `Lowest: ${winners[0].catLabel} · ${formatDealPrice(winners[0].winner.price, winners[0].winner.unit)}`
        : null,
    insights: hasUploadedData
      ? "Your sales CSV powers basket, retention, and trade area."
      : "Upload POS data to unlock customer and trade area insights.",
    trending: ethnicTrends[0]
      ? `#1 ${trendProfileLabel} ad: ${ethnicTrends[0].name}`
      : null,
  };

  return (
    <section className={TAB_SECTION_SPACE}>
      <HeroBanner location={forecast?.location || { city: "Calhoun", state: "GA" }} />

      <PageHeader
        eyebrow="Dashboard"
        eyebrowDot
        title={`Welcome back, ${storeName}.`}
        description="Your weekend command center — competitor ads, weather playbook, and store insights in one place."
        meta={
          dealsData?.generated_at
            ? `${marketInfo.short} · ${storeCount} retailers · synced ${dealsData.generated_at}`
            : `${loc.city || "Calhoun"}, ${loc.state || "GA"} · loading market data…`
        }
      />

      {dealsData?.week_signal && (
        <div
          role="note"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100"
        >
          <strong className="font-semibold text-amber-50">This week:</strong> {dealsData.week_signal}
        </div>
      )}

      {dealsData?.recommendations?.length > 0 && (
        <RecommendationCards
          recommendations={dealsData.recommendations}
          title="What to feature this weekend"
          description={
            isBenchmarking
              ? `Playbook for ${homeMarketLabel} — based on your local competitors, not ${marketLabel}.`
              : `Based on competitor ads near ${homeMarketInfo.short}.`
          }
          limit={4}
          reduceMotion={reduceMotion}
        />
      )}

      {dealsData?.national_ranking && (
        <NationalRankPanel
          ranking={dealsData.national_ranking}
          onRefresh={onRefreshNational}
          loading={loading}
          onUploadGuide={onUploadGuide}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Competitor ads"
          value={loading && !totalDeals ? "…" : totalDeals}
          hint={storeCount ? `Across ${storeCount} stores` : undefined}
          accentClass="text-sky"
        />
        <StatCard
          label="Category winners"
          value={loading && !winners.length ? "…" : winners.length}
          hint="Best near you rows"
          accentClass="text-brand"
        />
        <StatCard
          label="Benchmark market"
          value={
            loading && !marketInfo.areaCount && !marketInfo.customZips.length
              ? "…"
              : marketInfo.short
          }
          hint={
            isBenchmarking
              ? `Playbook uses ${homeMarketLabel}`
              : storeCount
                ? `${storeCount} retailers in scan`
                : "Change market above"
          }
        />
        <StatCard
          label="Your data"
          value={hasUploadedData ? "Live" : "Sample"}
          hint={hasUploadedData ? "POS CSV connected" : "Upload to unlock"}
          accentClass={hasUploadedData ? "text-leaf" : "text-white/70"}
        />
      </div>

      {weekendDays.length > 0 && (
        <div className={PANEL + " p-4 sm:p-5"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-white sm:text-lg">Weekend outlook</h3>
              <p className="mt-1 text-sm text-white/55">
                {loc.city || "Calhoun"}, {loc.state || "GA"} — plan meat and produce promos
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("weather")}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 text-sm font-semibold text-sky underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
            >
              Full playbook
              <ArrowRight size={14} aria-hidden />
            </button>
          </div>
          <div className="mt-4">
            <WeekendStrip days={weekendDays} />
          </div>
        </div>
      )}

      {!hasUploadedData && (
        <div className={PANEL + " flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"}>
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid shrink-0 place-items-center rounded-lg border border-brand/30 bg-brand/15 p-2.5 text-brand">
              <Upload size={20} aria-hidden />
            </div>
            <div>
              <p className="font-display font-semibold text-white">Upload sales CSV</p>
              <p className="mt-1 text-sm text-white/60">
                Unlock basket analysis, retention, top customers, and trade area on Your Store.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onUploadGuide}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
          >
            Upload sales CSV
            <ArrowRight size={15} aria-hidden />
          </button>
        </div>
      )}

      <div>
        <h3 className="mb-4 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Explore sections
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {NAV_CARDS.map((card, i) => (
            <NavCard
              key={card.id}
              card={card}
              metric={navMetrics[card.id]}
              detail={navDetails[card.id]}
              onNavigate={onNavigate}
              index={i}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>

      {meatWinners.length > 0 && (
        <div className={PANEL + " p-4 sm:p-5"}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Beef size={18} className="text-brand" aria-hidden />
              <h3 className="font-display text-base font-semibold text-white sm:text-lg">
                Fresh meat leaders
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("deals")}
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-sky underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
            >
              Best near you
              <ArrowRight size={14} aria-hidden />
            </button>
          </div>
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-3">
            {meatWinners.map((row) => (
              <li
                key={row.rowKey}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 sm:px-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  {row.catLabel}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-white/90">{row.winner.name}</p>
                <p className="mt-0.5 font-display text-base font-bold tabular-nums text-leaf">
                  {formatDealPrice(row.winner.price, row.winner.unit)}
                </p>
                <p className="truncate text-xs text-white/45">{row.winner.merchant}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
