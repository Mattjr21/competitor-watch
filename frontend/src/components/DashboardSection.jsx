import { ArrowRight, Beef, CloudSun, Sparkles } from "lucide-react";
import HeroBanner from "./HeroBanner";
import WeekDigestPanel from "./WeekDigestPanel";
import StorePulsePanel from "./StorePulsePanel";
import {
  PageHeader,
  StatCard,
  PANEL,
  TAB_SECTION_SPACE,
  NAV_LINK_SEMIBOLD,
  META_CHIP,
} from "../lib/sectionUi";
import { APP_NAV } from "../lib/nav";
import { computeCategoryWinners, formatDealPrice, MEAT_TYPES } from "../lib/dealWinners";
import { describeLoadedMarkets } from "../lib/marketAreas";
import { Button } from "@/components/ui/button";

const QUICK_LINKS = APP_NAV.filter((item) => item.id !== "home");

function HubSummaryCard({ icon: Icon, iconClass, title, actionLabel, onAction, children }) {
  return (
    <div className={PANEL + " flex h-full flex-col p-4 sm:p-5"}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon size={18} className={"shrink-0 " + iconClass} aria-hidden />}
          <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">{title}</h3>
        </div>
        <Button
          type="button"
          variant="link"
          onClick={onAction}
          className="min-h-11 shrink-0 px-0 text-sky"
        >
          {actionLabel}
          <ArrowRight size={14} aria-hidden />
        </Button>
      </div>
      <div className="mt-3 min-h-0 flex-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function WeekendStrip({ days }) {
  if (!days?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((day) => (
        <span
          key={day.label}
          className={META_CHIP}
        >
          <strong className="font-semibold text-foreground">{day.label}</strong>
          {" · "}
          {day.temp_high_f}°F · {day.rain_prob_pct}% rain
        </span>
      ))}
    </div>
  );
}

function QuickLinks({ onNavigate }) {
  return (
    <nav aria-label="Jump to section" className="flex flex-wrap gap-2">
      {QUICK_LINKS.map((link) => (
        <Button
          key={link.id}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onNavigate(link.id)}
          className="h-9 rounded-full px-3.5 text-xs font-medium"
        >
          {link.label}
        </Button>
      ))}
    </nav>
  );
}

export default function DashboardSection({
  forecast,
  dealsData,
  loading,
  marketLabel = "your market",
  homeMarketLabel = "Calhoun GA",
  isBenchmarking = false,
  pendingMarket = false,
  onNavigate,
  onGoInsightsSection,
}) {
  const loc = forecast?.location || {};
  const storeName = dealsData?.store_name || "La Bodega";
  const totalDeals = dealsData
    ? Object.values(dealsData.deals_by_category || {}).flat().length
    : 0;
  const storeCount = dealsData?.merchants?.length || 0;
  const marketInfo = describeLoadedMarkets(dealsData?.zips?.join(","), dealsData?.area_presets);
  const winners = computeCategoryWinners(dealsData?.deals_by_category, dealsData?.categories || []);
  const statPending = pendingMarket || (loading && !dealsData);
  const adsStatValue = statPending ? "…" : totalDeals;
  const winnersStatValue = statPending ? "…" : winners.length;
  const marketStatValue = statPending ? "…" : marketInfo.short;
  const meatWinners = MEAT_TYPES.map((t) => winners.find((w) => w.meatType === t.key)).filter(Boolean);
  const isSampleData = /default/i.test(dealsData?.data_source || "");
  const hasUploadedData = dealsData && !isSampleData;
  const recommendations = dealsData?.recommendations || [];

  const weekendDays = (forecast?.weather_days || []).filter((d) =>
    /sat|sun|sáb|dom/i.test(d.label || "")
  );
  const playbookNote = weekendDays[0]?.playbook_note || forecast?.weather_days?.[0]?.playbook_note;

  const hubCards = [
    weekendDays.length > 0 && {
      key: "weather",
      card: (
        <HubSummaryCard
          icon={CloudSun}
          iconClass="text-brand"
          title="Weekend playbook"
          actionLabel="Open playbook"
          onAction={() => onNavigate("weather")}
        >
          <WeekendStrip days={weekendDays} />
          {playbookNote && (
            <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{playbookNote}</p>
          )}
        </HubSummaryCard>
      ),
    },
    recommendations.length > 0 && {
      key: "ideas",
      card: (
        <HubSummaryCard
          icon={Sparkles}
          iconClass="text-brand"
          title="Promo ideas"
          actionLabel="Open ideas"
          onAction={() => onGoInsightsSection?.("insights-ideas") ?? onNavigate("insights")}
        >
          <ul className="m-0 list-none space-y-1.5 p-0 text-muted-foreground">
            {recommendations.slice(0, 2).map((rec) => (
              <li key={rec.title} className="truncate">
                <span className="font-medium text-foreground">{rec.tag}:</span> {rec.title}
              </li>
            ))}
          </ul>
          {recommendations.length > 2 && (
            <p className="mt-2 text-xs text-muted-foreground">
              +{recommendations.length - 2} more in Your store data
            </p>
          )}
        </HubSummaryCard>
      ),
    },
    meatWinners.length > 0 && {
      key: "meat",
      card: (
        <HubSummaryCard
          icon={Beef}
          iconClass="text-meat"
          title="Fresh meat leaders"
          actionLabel="Best near you"
          onAction={() => onNavigate("deals")}
        >
          <ul className="m-0 list-none space-y-1.5 p-0">
            {meatWinners.map((row) => (
              <li key={row.rowKey} className="truncate text-muted-foreground">
                <span className="font-medium text-meat">{row.catLabel}:</span>{" "}
                {formatDealPrice(row.winner.price, row.winner.unit)} at {row.winner.merchant}
              </li>
            ))}
          </ul>
        </HubSummaryCard>
      ),
    },
  ].filter(Boolean);

  return (
    <section className={TAB_SECTION_SPACE}>
      <PageHeader
        eyebrow="Dashboard"
        eyebrowDot
        title={`Welcome back, ${storeName}.`}
        description="At-a-glance summary for the week — open a section below for full detail."
        meta={
          dealsData?.generated_at
            ? `${marketInfo.short} · ${storeCount} retailers · synced ${dealsData.generated_at}`
            : `${loc.city || "Calhoun"}, ${loc.state || "GA"} · loading market data…`
        }
      />

      <HeroBanner location={forecast?.location || { city: "Calhoun", state: "GA" }} compactOnMobile />

      <WeekDigestPanel
        dealsData={dealsData}
        forecast={forecast}
        storeName={storeName}
        onGoActions={() => onGoInsightsSection?.("insights-ideas") ?? onNavigate("insights")}
      />

      <StorePulsePanel
        dealsData={dealsData}
        compact
        onGoFullAnalytics={() => onGoInsightsSection?.("insights-pulse") ?? onNavigate("insights")}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Competitor ads"
          value={adsStatValue}
          hint={
            statPending
              ? `Updating ${marketLabel}…`
              : storeCount
                ? `Across ${storeCount} stores`
                : undefined
          }
          accentClass="text-sky"
        />
        <StatCard
          label="Category winners"
          value={winnersStatValue}
          hint={statPending ? "Refreshing deal scan…" : "Best near you rows"}
          accentClass="text-brand"
        />
        <StatCard
          label="Benchmark market"
          value={marketStatValue}
          hint={
            statPending
              ? "Loading market…"
              : isBenchmarking
                ? `Playbook uses ${homeMarketLabel}`
                : storeCount
                  ? `${storeCount} retailers in scan`
                  : "Change market above"
          }
        />
        <StatCard
          label="Store data"
          value={hasUploadedData ? "Live" : "Sample"}
          hint={
            hasUploadedData
              ? "Sales summary uses your uploads"
              : "May sample — connect or upload to replace"
          }
          accentClass={hasUploadedData ? "text-leaf" : "text-muted-foreground"}
        />
      </div>

      {hubCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hubCards.map(({ key, card }) => (
            <div key={key}>{card}</div>
          ))}
        </div>
      )}

      {!hasUploadedData && (
        <div className={PANEL + " flex flex-col gap-3 p-4 sm:p-5"}>
          <p className="text-sm text-muted-foreground">
            Upload your POS sales CSV on{" "}
            <button
              type="button"
              onClick={() => onNavigate("insights")}
              className={NAV_LINK_SEMIBOLD}
            >
              Your store data
            </button>{" "}
            to replace sample pulse with your store&apos;s daily trends. See{" "}
            <button
              type="button"
              onClick={() => onGoInsightsSection?.("insights-pulse") ?? onNavigate("insights")}
              className={NAV_LINK_SEMIBOLD}
            >
              Sales summary
            </button>
            .
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">Jump to a section</p>
        <QuickLinks onNavigate={onNavigate} />
      </div>
    </section>
  );
}
