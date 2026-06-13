import { useState, useEffect, useId, useRef, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { RefreshCw } from "lucide-react";
import AreaSelector from "./components/AreaSelector";
import BenchmarkProfileSelector, {
  getStoredBenchmarkProfile,
  setStoredBenchmarkProfile,
} from "./components/BenchmarkProfileSelector";
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
import { DEFAULT_LOCAL_ZIPS, HOME_MARKET_ZIPS, describeLoadedMarkets } from "./lib/marketAreas";
import { resolveAreaPresets } from "./lib/benchmarkProfiles";

const API = import.meta.env.VITE_API_URL || "";

function zipsKey(zips) {
  const list = Array.isArray(zips)
    ? zips
    : (zips || "").split(",");
  return list
    .map((z) => String(z).trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

const TABS = [
  { id: "home", label: "Dashboard", icon: "🏠" },
  { id: "weather", label: "Daily Ops", icon: "☀️" },
  { id: "deals", label: "Deals", icon: "🏪" },
  { id: "insights", label: "Your Store", icon: "📊" },
  { id: "trending", label: "Trending", icon: "📈" },
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
  const [benchmarkProfile, setBenchmarkProfile] = useState(getStoredBenchmarkProfile);
  const headerRef = useRef(null);
  const dealsRequestRef = useRef(0);
  const trendingRequestRef = useRef(0);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty("--app-header-height", `${node.offsetHeight}px`);
    };

    syncHeaderHeight();
    const ro = new ResizeObserver(syncHeaderHeight);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

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

  async function fetchDeals(
    refresh = false,
    zips = activeZips,
    profile = benchmarkProfile,
    refreshNational = false
  ) {
    const requestId = ++dealsRequestRef.current;
    setDealsLoading(true);
    setErr("deals", null);
    try {
      const params = [];
      if (refresh) params.push("refresh=1");
      if (refreshNational) params.push("refresh_national=1");
      if (zips) params.push("zips=" + encodeURIComponent(zips));
      if (HOME_MARKET_ZIPS) params.push("home_zips=" + encodeURIComponent(HOME_MARKET_ZIPS));
      if (profile) params.push("profile=" + encodeURIComponent(profile));
      const res = await fetch(`${API}/api/data${params.length ? "?" + params.join("&") : ""}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const payload = await res.json();
      if (requestId !== dealsRequestRef.current) return;
      setDealsData(payload);
    } catch (e) {
      if (requestId !== dealsRequestRef.current) return;
      setErr("deals", e.message || "Failed to load deals");
    } finally {
      if (requestId === dealsRequestRef.current) setDealsLoading(false);
    }
  }

  function handleBenchmarkProfileChange(profileId) {
    setBenchmarkProfile(profileId);
    setStoredBenchmarkProfile(profileId);
  }

  function refreshNationalRanking() {
    fetchDeals(false, activeZips, benchmarkProfile, true);
  }

  async function fetchTrending(
    refresh = false,
    zips = activeZips,
    profile = benchmarkProfile
  ) {
    const requestId = ++trendingRequestRef.current;
    setTrendingLoading(true);
    setErr("trending", null);
    try {
      const params = [];
      if (refresh) params.push("refresh=1");
      if (zips) params.push("zips=" + encodeURIComponent(zips));
      if (profile) params.push("profile=" + encodeURIComponent(profile));
      const res = await fetch(
        `${API}/api/trending${params.length ? "?" + params.join("&") : ""}`
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const payload = await res.json();
      if (requestId !== trendingRequestRef.current) return;
      setTrendingData(payload);
    } catch (e) {
      if (requestId !== trendingRequestRef.current) return;
      setErr("trending", e.message || "Failed to load trending");
    } finally {
      if (requestId === trendingRequestRef.current) setTrendingLoading(false);
    }
  }

  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDeals(false, activeZips, benchmarkProfile);
    fetchTrending(false, activeZips, benchmarkProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeZips, benchmarkProfile]);

  const anyLoading = weatherLoading || dealsLoading || trendingLoading;
  const totalDeals = dealsData
    ? Object.values(dealsData.deals_by_category || {}).flat().length
    : 0;

  const refreshAll = () => {
    fetchDeals(true, activeZips, benchmarkProfile);
    fetchForecast(true);
    fetchTrending(true, activeZips, benchmarkProfile);
  };

  const refreshCurrentTab = () => {
    if (activeTab === "home") {
      refreshAll();
      return;
    }
    if (activeTab === "weather") fetchForecast(true);
    else if (activeTab === "trending") fetchTrending(true, activeZips, benchmarkProfile);
    else fetchDeals(true, activeZips, benchmarkProfile);
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

  const activeProfileId = dealsData?.benchmark_profile || benchmarkProfile;
  const areaPresets = useMemo(
    () => resolveAreaPresets(dealsData?.area_presets, activeProfileId, dealsData?.benchmark_profile),
    [dealsData?.area_presets, dealsData?.benchmark_profile, activeProfileId]
  );

  const marketSummary = describeLoadedMarkets(
    dealsData?.zips?.join(",") || activeZips,
    areaPresets
  );
  const pendingMarketSummary = describeLoadedMarkets(activeZips, areaPresets);
  const dealsScopeMismatch =
    dealsLoading &&
    dealsData?.zips?.length &&
    zipsKey(dealsData.zips) !== zipsKey(activeZips);
  const homeMarketSummary = useMemo(
    () => describeLoadedMarkets(HOME_MARKET_ZIPS, areaPresets),
    [areaPresets]
  );
  const compareMarketSummary = pendingMarketSummary;
  const isBenchmarking = zipsKey(HOME_MARKET_ZIPS) !== zipsKey(activeZips);
  const headerDesc = dealsData
    ? `${marketSummary.short} · ${dealsData.merchants?.length || 0} retailers · synced ${dealsData.generated_at}`
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
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2, ease: EASE },
      };

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white selection:bg-brand/30">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header
        ref={headerRef}
        className="no-print sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur-xl"
      >
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
                  (active ? "text-white" : "text-white/65 hover:text-white/90")
                }
              >
                <span aria-hidden="true">{tab.icon} </span>
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

        <div className="space-y-3 pt-4 sm:pt-5">
          <BenchmarkProfileSelector
            profiles={dealsData?.benchmark_profiles || []}
            activeProfile={dealsData?.benchmark_profile || benchmarkProfile}
            onChange={handleBenchmarkProfileChange}
            disabled={dealsLoading}
          />
          <AreaSelector
            isLoading={dealsLoading}
            appliedZips={activeZips}
            homeZips={HOME_MARKET_ZIPS}
            areaPresets={areaPresets}
            onApply={(zips) => setActiveZips(zips)}
          />
          {isBenchmarking && (
            <div
              role="note"
              className="rounded-xl border border-sky/25 bg-sky/10 px-4 py-3 text-xs leading-relaxed text-white/70"
            >
              <span className="font-semibold text-white/90">Weekend playbook &amp; Your Store</span>{" "}
              use your home market ({homeMarketSummary.short}).{" "}
              <span className="font-semibold text-white/90">Deals &amp; Trending</span> show{" "}
              {compareMarketSummary.short} competitors for benchmarking.
            </div>
          )}
        </div>

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
                    dealsData={dealsScopeMismatch ? null : dealsData}
                    trendingData={trendingData}
                    loading={anyLoading}
                    marketLabel={pendingMarketSummary.short}
                    homeMarketLabel={homeMarketSummary.short}
                    isBenchmarking={isBenchmarking}
                    pendingMarket={dealsScopeMismatch}
                    onNavigate={navigateToTab}
                    onUploadGuide={openUploadGuide}
                    onRefreshNational={refreshNationalRanking}
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
                  <DealsSection
                    data={dealsScopeMismatch ? null : dealsData}
                    loading={dealsLoading}
                    error={errors.deals}
                    marketLabel={pendingMarketSummary.short}
                    homeMarketLabel={homeMarketSummary.short}
                    isBenchmarking={isBenchmarking}
                    pendingMarket={dealsScopeMismatch}
                    onRefresh={() => fetchDeals(true, activeZips, benchmarkProfile)}
                  />
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
                    data={dealsScopeMismatch ? null : dealsData}
                    loading={dealsLoading}
                    error={errors.deals}
                    marketLabel={homeMarketSummary.short}
                    compareMarketLabel={compareMarketSummary.short}
                    isBenchmarking={isBenchmarking}
                    pendingMarket={dealsScopeMismatch}
                    onRefresh={() => fetchDeals(true, activeZips, benchmarkProfile)}
                    onUploadComplete={() => fetchDeals(false, activeZips, benchmarkProfile)}
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
                    marketLabel={marketSummary.short}
                    profileLabel={
                      dealsData?.benchmark_profile_label ||
                      trendingData?.profile_label ||
                      "Latino grocery"
                    }
                    onRefresh={() => fetchTrending(true, activeZips, benchmarkProfile)}
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
