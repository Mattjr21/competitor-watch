import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import AreaSelector, { DEFAULT_LOCAL_ZIPS } from "./components/AreaSelector";
import DealsSection from "./components/DealsSection";
import WeatherSection from "./components/WeatherSection";
import TrendingSection from "./components/TrendingSection";
import InsightsSection from "./components/InsightsSection";
import HeroBanner from "./components/HeroBanner";
import { DemoModeBanner } from "./components/OutreachSection";
import { LoadProgress } from "./lib/ui";
import { APP_ICON_SRC } from "./lib/brand";

const API = import.meta.env.VITE_API_URL || "";

const TABS = [
  { id: "weather", label: "☀️ Daily Ops" },
  { id: "deals", label: "🏪 Deals" },
  { id: "insights", label: "📊 Your Store" },
  { id: "trending", label: "📈 Trending" },
];

export default function App() {
  const [forecast, setForecast] = useState(null);
  const [dealsData, setDealsData] = useState(null);
  const [trendingData, setTrendingData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState("weather");
  const [activeZips, setActiveZips] = useState(DEFAULT_LOCAL_ZIPS);

  const setErr = (k, v) => setErrors((e) => ({ ...e, [k]: v }));

  async function fetchForecast(refresh = false) {
    setWeatherLoading(true);
    setErr("weather", null);
    try {
      const res = await fetch(`${API}/api/forecast${refresh ? "?refresh=1" : ""}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setForecast(await res.json());
    } catch (e) {
      setErr("weather", e.message || "Failed to load forecast");
    } finally {
      setWeatherLoading(false);
    }
  }

  async function fetchDeals(refresh = false, zips = "") {
    setDealsLoading(true);
    setErr("deals", null);
    try {
      const params = [];
      if (refresh) params.push("refresh=1");
      if (zips) params.push("zips=" + encodeURIComponent(zips));
      const res = await fetch(`${API}/api/data${params.length ? "?" + params.join("&") : ""}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setDealsData(await res.json());
    } catch (e) {
      setErr("deals", e.message || "Failed to load deals");
    } finally {
      setDealsLoading(false);
    }
  }

  async function fetchTrending(refresh = false) {
    setTrendingLoading(true);
    setErr("trending", null);
    try {
      const res = await fetch(`${API}/api/trending${refresh ? "?refresh=1" : ""}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setTrendingData(await res.json());
    } catch (e) {
      setErr("trending", e.message || "Failed to load trending");
    } finally {
      setTrendingLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([fetchForecast(), fetchDeals(false, DEFAULT_LOCAL_ZIPS), fetchTrending()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyLoading = weatherLoading || dealsLoading || trendingLoading;
  const totalDeals = dealsData
    ? Object.values(dealsData.deals_by_category || {}).flat().length
    : 0;

  const refreshAll = () => {
    fetchDeals(true, activeZips);
    fetchForecast(true);
    fetchTrending(true);
  };

  const refreshCurrentTab = () => {
    if (activeTab === "weather") fetchForecast(true);
    else if (activeTab === "trending") fetchTrending(true);
    else fetchDeals(true, activeZips);
  };

  const tabRefreshLabel = {
    weather: "Refresh forecast",
    deals: "Refresh deals",
    insights: "Refresh data",
    trending: "Refresh trends",
  }[activeTab];

  const tabRefreshLoading =
    activeTab === "weather"
      ? weatherLoading
      : activeTab === "trending"
        ? trendingLoading
        : dealsLoading;

  const marketCount = dealsData?.zips?.length || 6;
  const headerDesc = dealsData
    ? `${marketCount} market${marketCount !== 1 ? "s" : ""} · ${dealsData.merchants?.length} retailers · updated ${dealsData.generated_at}`
    : forecast
      ? `${forecast.location?.city || "Calhoun"}, ${forecast.location?.state || "GA"} · loading competitor data…`
      : "Calhoun, GA · Live competitor pricing";

  const loadSteps = [
    {
      id: "weather",
      label: "Weather forecast",
      active: weatherLoading,
      done: !!forecast || !!errors.weather,
    },
    {
      id: "deals",
      label: "Competitor deals",
      active: dealsLoading,
      done: !!dealsData || !!errors.deals,
      slow: true,
      hint: dealsLoading
        ? "Scanning live weekly ads — first load can take up to 60 seconds. Daily Ops and Trending may appear sooner."
        : null,
    },
    {
      id: "trending",
      label: "Trending products",
      active: trendingLoading,
      done: !!trendingData || !!errors.trending,
    },
  ];

  return (
    <div className="min-h-screen bg-ink text-white selection:bg-brand/30">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <DemoModeBanner />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <img
              src={APP_ICON_SRC}
              alt="La Bodega Supermercado y Restaurante"
              className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-0.5 shadow-sm ring-1 ring-black/10 sm:h-12 sm:w-12"
            />
            <div className="min-w-0 border-l border-white/10 pl-3 sm:pl-4">
              <h1 className="font-display text-base font-bold tracking-tight sm:text-lg">
                Competitor Watch
              </h1>
              <p className="text-xs text-white/50 sm:text-sm">{headerDesc}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshCurrentTab}
              disabled={tabRefreshLoading}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-brand hover:text-white disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              <RefreshCw size={15} className={tabRefreshLoading ? "animate-spin" : ""} />
              {tabRefreshLabel}
            </button>
            <button
              type="button"
              onClick={refreshAll}
              disabled={anyLoading}
              title="Re-scrapes competitor ads — can take up to 60 seconds"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-white/65 transition hover:border-white/35 hover:text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand"
            >
              Refresh all
            </button>
          </div>
        </div>
        {anyLoading && <LoadProgress steps={loadSteps} />}
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 pb-24">
        <div className="flex gap-1 border-b border-white/10">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const badge = tab.id === "deals" && totalDeals ? ` (${totalDeals})` : "";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  "relative px-4 py-3 text-sm font-medium transition focus-visible:rounded-t focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset sm:px-5 " +
                  (active ? "text-white" : "text-white/55 hover:text-white/85")
                }
              >
                {tab.label}
                {badge}
                {active && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-8">
          {activeTab === "weather" && (
            <HeroBanner location={forecast?.location} />
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {activeTab === "weather" && (
                <WeatherSection
                  forecast={forecast}
                  loading={weatherLoading}
                  error={errors.weather}
                  onRefresh={() => fetchForecast(true)}
                />
              )}
              {activeTab === "deals" && (
                <>
                  <AreaSelector
                    isLoading={dealsLoading}
                    appliedZips={activeZips}
                    onApply={(zips) => {
                      setActiveZips(zips);
                      fetchDeals(false, zips);
                    }}
                  />
                  <div className="mt-8">
                    <DealsSection
                      data={dealsData}
                      loading={dealsLoading}
                      error={errors.deals}
                      onRefresh={() => fetchDeals(true, activeZips)}
                    />
                  </div>
                </>
              )}
              {activeTab === "insights" && (
                <InsightsSection
                  data={dealsData}
                  loading={dealsLoading}
                  error={errors.deals}
                  onRefresh={() => fetchDeals(true, activeZips)}
                  onUploadComplete={() => fetchDeals(false, activeZips)}
                />
              )}
              {activeTab === "trending" && (
                <TrendingSection
                  data={trendingData}
                  loading={trendingLoading}
                  error={errors.trending}
                  onRefresh={() => fetchTrending(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

const EASE = [0.22, 1, 0.36, 1];
