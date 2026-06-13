import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { RefreshCw } from "lucide-react";
import AreaSelector from "./components/AreaSelector";
import DealsSection from "./components/DealsSection";
import WeatherSection from "./components/WeatherSection";
import TrendingSection from "./components/TrendingSection";
import InsightsSection from "./components/InsightsSection";
import DashboardSection from "./components/DashboardSection";
import AppFooter from "./components/AppFooter";
import { DemoModeBanner } from "./components/OutreachSection";
import { LoadProgress, EASE } from "./lib/ui";
import { BTN_GHOST, BTN_PRIMARY } from "./lib/sectionUi";
import { APP_ICON_SRC } from "./lib/brand";
import { DEFAULT_LOCAL_ZIPS } from "./lib/marketAreas";

const API = import.meta.env.VITE_API_URL || "";

const TABS = [
  { id: "home", label: "🏠 Dashboard" },
  { id: "weather", label: "☀️ Daily Ops" },
  { id: "deals", label: "🏪 Deals" },
  { id: "insights", label: "📊 Your Store" },
  { id: "trending", label: "📈 Trending" },
];

export default function App() {
  const reduceMotion = useReducedMotion();
  const homePanelId = useId();
  const weatherPanelId = useId();
  const dealsPanelId = useId();
  const insightsPanelId = useId();
  const trendingPanelId = useId();
  const tabPanelIds = {
    home: homePanelId,
    weather: weatherPanelId,
    deals: dealsPanelId,
    insights: insightsPanelId,
    trending: trendingPanelId,
  };

  const [forecast, setForecast] = useState(null);
  const [dealsData, setDealsData] = useState(null);
  const [trendingData, setTrendingData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState("home");
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
    if (activeTab === "home") {
      refreshAll();
      return;
    }
    if (activeTab === "weather") fetchForecast(true);
    else if (activeTab === "trending") fetchTrending(true);
    else fetchDeals(true, activeZips);
  };

  const navigateToTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openUploadGuide = () => {
    setActiveTab("insights");
    requestAnimationFrame(() => {
      document.getElementById("insights-upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const tabRefreshLabel = {
    home: "Refresh dashboard",
    weather: "Refresh forecast",
    deals: "Refresh deals",
    insights: "Refresh data",
    trending: "Refresh trends",
  }[activeTab];

  const tabRefreshLoading =
    activeTab === "home"
      ? anyLoading
      : activeTab === "weather"
        ? weatherLoading
        : activeTab === "trending"
          ? trendingLoading
          : dealsLoading;

  const marketCount = dealsData?.zips?.length || 0;
  const headerDesc = dealsData
    ? `${marketCount} market${marketCount !== 1 ? "s" : ""} · ${dealsData.merchants?.length || 0} retailers · synced ${dealsData.generated_at}`
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

  const TabContent = reduceMotion ? "div" : motion.div;
  const tabContentProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.2, ease: EASE },
      };

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white selection:bg-brand/30">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="no-print sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
        <DemoModeBanner />
        <div className="app-shell flex flex-wrap items-center justify-between gap-3 py-3 sm:gap-4 sm:py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <img
              src={APP_ICON_SRC}
              alt="La Bodega Supermercado y Restaurante"
              className="h-14 w-14 shrink-0 rounded-full object-contain sm:h-16 sm:w-16"
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
              className={BTN_PRIMARY + " disabled:opacity-60"}
            >
              <RefreshCw size={15} className={tabRefreshLoading ? "animate-spin" : ""} aria-hidden />
              {tabRefreshLabel}
            </button>
            <button
              type="button"
              onClick={refreshAll}
              disabled={anyLoading}
              title="Re-scrapes competitor ads — can take up to 60 seconds"
              className={BTN_GHOST + " px-3 py-2 text-xs disabled:opacity-50"}
            >
              Refresh all
            </button>
          </div>
        </div>
        {anyLoading && <LoadProgress steps={loadSteps} />}
      </header>

      <main id="main-content" className="app-shell flex-1 py-6 sm:py-8 lg:py-10 pb-10 sm:pb-12">
        <nav
          role="tablist"
          aria-label="Main sections"
          className="no-print flex gap-0.5 overflow-x-auto border-b border-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const badge = tab.id === "deals" && totalDeals ? ` (${totalDeals})` : "";
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`main-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={tabPanelIds[tab.id]}
                onClick={() => setActiveTab(tab.id)}
                className={
                  "relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition focus-visible:rounded-t focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset " +
                  (active ? "text-white" : "text-white/55 hover:text-white/85")
                }
              >
                {tab.label}
                {badge}
                {active && !reduceMotion && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {active && reduceMotion && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-6 sm:pt-8">
          <AnimatePresence mode="wait">
            <TabContent key={activeTab} {...tabContentProps}>
              {activeTab === "home" && (
                <div
                  id={homePanelId}
                  role="tabpanel"
                  aria-labelledby="main-tab-home"
                  tabIndex={0}
                >
                  <DashboardSection
                    forecast={forecast}
                    dealsData={dealsData}
                    trendingData={trendingData}
                    loading={anyLoading}
                    onNavigate={navigateToTab}
                    onUploadGuide={openUploadGuide}
                    reduceMotion={reduceMotion}
                  />
                </div>
              )}
              {activeTab === "weather" && (
                <div
                  id={weatherPanelId}
                  role="tabpanel"
                  aria-labelledby="main-tab-weather"
                  tabIndex={0}
                >
                  <WeatherSection
                    forecast={forecast}
                    loading={weatherLoading}
                    error={errors.weather}
                    onRefresh={() => fetchForecast(true)}
                  />
                </div>
              )}
              {activeTab === "deals" && (
                <div
                  id={dealsPanelId}
                  role="tabpanel"
                  aria-labelledby="main-tab-deals"
                  tabIndex={0}
                >
                  <AreaSelector
                    isLoading={dealsLoading}
                    appliedZips={activeZips}
                    areaPresets={dealsData?.area_presets}
                    onApply={(zips) => {
                      setActiveZips(zips);
                      fetchDeals(false, zips);
                    }}
                  />
                  <div className="mt-6 sm:mt-8">
                    <DealsSection
                      data={dealsData}
                      loading={dealsLoading}
                      error={errors.deals}
                      onRefresh={() => fetchDeals(true, activeZips)}
                    />
                  </div>
                </div>
              )}
              {activeTab === "insights" && (
                <div
                  id={insightsPanelId}
                  role="tabpanel"
                  aria-labelledby="main-tab-insights"
                  tabIndex={0}
                >
                  <InsightsSection
                    data={dealsData}
                    loading={dealsLoading}
                    error={errors.deals}
                    onRefresh={() => fetchDeals(true, activeZips)}
                    onUploadComplete={() => fetchDeals(false, activeZips)}
                  />
                </div>
              )}
              {activeTab === "trending" && (
                <div
                  id={trendingPanelId}
                  role="tabpanel"
                  aria-labelledby="main-tab-trending"
                  tabIndex={0}
                >
                  <TrendingSection
                    data={trendingData}
                    loading={trendingLoading}
                    error={errors.trending}
                    onRefresh={() => fetchTrending(true)}
                  />
                </div>
              )}
            </TabContent>
          </AnimatePresence>
        </div>
      </main>

      <AppFooter
        storeName={dealsData?.store_name}
        lastSynced={dealsData?.generated_at}
        onUploadGuide={openUploadGuide}
      />
    </div>
  );
}
