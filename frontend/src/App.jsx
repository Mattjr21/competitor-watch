import { useState, useEffect, useId, useRef, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { RefreshCw } from "lucide-react";
import AppSidebar from "./components/AppSidebar";
import AppRefreshButton from "./components/AppRefreshButton";
import MarketSettingsBar from "./components/MarketSettingsBar";
import {
  getStoredBenchmarkProfile,
  setStoredBenchmarkProfile,
} from "./components/BenchmarkProfileSelector";
import AppFooter from "./components/AppFooter";
import { DemoModeBanner } from "./components/OutreachSection";
import { LoadProgress, TabPanelFallback, EASE } from "./lib/ui";
import { DEFAULT_LOCAL_ZIPS, HOME_MARKET_ZIPS, describeLoadedMarkets } from "./lib/marketAreas";
import {
  resolveAreaPresets,
  getDefaultBenchmarkZips,
  getDefaultBenchmarkLabel,
  getProfileLabel,
} from "./lib/benchmarkProfiles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TAB_LABELS } from "./lib/nav";
import { META_CHIP, META_CHIP_ACCENT } from "./lib/sectionUi";

const DashboardSection = lazy(() => import("./components/DashboardSection"));
const WeatherSection = lazy(() => import("./components/WeatherSection"));
const DealsSection = lazy(() => import("./components/DealsSection"));
const InsightsSection = lazy(() => import("./components/InsightsSection"));
const TrendingSection = lazy(() => import("./components/TrendingSection"));

const API = import.meta.env.VITE_API_URL || "";

const MARKET_FILTER_TABS = new Set(["home", "deals", "trending"]);

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
  const [profileSwitchNotice, setProfileSwitchNotice] = useState(null);
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
    const nextZips = getDefaultBenchmarkZips(profileId);
    const nextLabel = getDefaultBenchmarkLabel(profileId);
    setBenchmarkProfile(profileId);
    setStoredBenchmarkProfile(profileId);
    setTrendingData(null);
    setDealsData(null);
    setActiveZips(nextZips);
    setProfileSwitchNotice(
      profileId === "latino"
        ? `Switched to ${getProfileLabel(profileId)} — benchmark market set to ${nextLabel}.`
        : `Switched to ${getProfileLabel(profileId)} — loading ads for ${nextLabel} (playbook still uses Calhoun).`
    );
  }

  useEffect(() => {
    if (!profileSwitchNotice) return;
    const t = setTimeout(() => setProfileSwitchNotice(null), 12000);
    return () => clearTimeout(t);
  }, [profileSwitchNotice]);

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
    else if (activeTab === "deals") fetchDeals(true, activeZips, benchmarkProfile, true);
    else fetchDeals(true, activeZips, benchmarkProfile);
  };

  const navigateToTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goInsightsSection = (sectionId) => {
    setActiveTab("insights");
    window.location.hash = sectionId;
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openUploadGuide = () => {
    goInsightsSection("insights-pulse");
  };

  const tabRefreshLabel = {
    home: "Update dashboard",
    weather: "Update playbook",
    deals: "Update deals",
    insights: "Update store data",
    trending: "Update trends",
  }[activeTab];

  const tabRefreshLoading =
    activeTab === "home"
      ? anyLoading
      : activeTab === "weather"
        ? weatherLoading
        : activeTab === "trending"
          ? trendingLoading
          : dealsLoading;

  const areaPresets = useMemo(
    () => resolveAreaPresets(dealsData?.area_presets, benchmarkProfile, dealsData?.benchmark_profile),
    [dealsData?.area_presets, dealsData?.benchmark_profile, benchmarkProfile]
  );

  const marketSummary = describeLoadedMarkets(
    dealsData?.zips?.join(",") || activeZips,
    areaPresets
  );
  const pendingMarketSummary = describeLoadedMarkets(activeZips, areaPresets);
  const dealsScopeMismatch =
    dealsLoading &&
    (!dealsData ||
      dealsData.benchmark_profile !== benchmarkProfile ||
      (dealsData?.zips?.length && zipsKey(dealsData.zips) !== zipsKey(activeZips)));
  const trendingScopeMismatch =
    trendingLoading &&
    (!trendingData ||
      trendingData.profile_id !== benchmarkProfile ||
      zipsKey(trendingData.scanned_zips) !== zipsKey(activeZips));
  const dealsBadge =
    dealsScopeMismatch && dealsLoading ? "updating" : totalDeals > 0 ? totalDeals : null;
  const nationalRankReady = Boolean(
    dealsData?.national_ranking &&
      ((dealsData.national_ranking.rows || []).some((r) => r.national_low != null || r.own_avg != null) ||
        dealsData.national_ranking.overall_score)
  );
  const activeProfileLabel = getProfileLabel(benchmarkProfile);
  const homeMarketSummary = useMemo(
    () => describeLoadedMarkets(HOME_MARKET_ZIPS, areaPresets),
    [areaPresets]
  );
  const compareMarketSummary = pendingMarketSummary;
  const isBenchmarking = zipsKey(HOME_MARKET_ZIPS) !== zipsKey(activeZips);
  const showMarketChrome = MARKET_FILTER_TABS.has(activeTab);
  const showMarketScanAlert = showMarketChrome && (dealsLoading || trendingLoading);
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
        ? "Scanning live weekly ads — first load can take up to 60 seconds. Weekend playbook and Market trends may appear sooner."
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
    <SidebarProvider defaultOpen>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <AppSidebar
        activeTab={activeTab}
        onTabChange={navigateToTab}
        dealsBadge={dealsBadge}
        nationalRankReady={nationalRankReady}
        onUploadGuide={openUploadGuide}
      />

      <SidebarInset className="bg-background">
        <DemoModeBanner />

        <header
          ref={headerRef}
          className="no-print sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6"
        >
          <SidebarTrigger className="-ml-1" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
              {TAB_LABELS[activeTab]}
            </h1>
            {isBenchmarking ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={META_CHIP} title="Your home store (Calhoun) — weekend playbook and your sales data">
                  <span className="text-muted-foreground">Playbook</span>
                  <span className="truncate">{homeMarketSummary.short}</span>
                </span>
                <span
                  className={META_CHIP_ACCENT}
                  title="Ad research market — competitor deals and national trends (not your store sales)"
                >
                  <span className="text-muted-foreground">Scanning</span>
                  <span className="truncate">{compareMarketSummary.short}</span>
                </span>
              </div>
            ) : (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{headerDesc}</p>
            )}
          </div>
          <AppRefreshButton
            onRefreshSection={refreshCurrentTab}
            onRefreshAll={refreshAll}
            sectionLabel={tabRefreshLabel}
            loading={tabRefreshLoading}
            allLoading={anyLoading}
          />
        </header>

        {anyLoading && <LoadProgress steps={loadSteps} />}

        <main id="main-content" className="flex flex-1 flex-col gap-6 p-4 pb-10 md:p-6 md:pb-12">
          {showMarketChrome && (
            <MarketSettingsBar
              marketLabel={compareMarketSummary.short}
              profileLabel={activeProfileLabel}
              profiles={dealsData?.benchmark_profiles || []}
              activeProfile={dealsData?.benchmark_profile || benchmarkProfile}
              onProfileChange={handleBenchmarkProfileChange}
              profileDisabled={dealsLoading || trendingLoading}
              areaProps={{
                isLoading: dealsLoading,
                appliedZips: activeZips,
                homeZips: HOME_MARKET_ZIPS,
                areaPresets,
                onApply: (zips) => setActiveZips(zips),
              }}
            />
          )}

          {showMarketChrome && profileSwitchNotice && (
            <Alert className="border-primary/25 bg-primary/5">
              <AlertDescription>{profileSwitchNotice}</AlertDescription>
            </Alert>
          )}

          {showMarketChrome && showMarketScanAlert && (
            <Alert className="border-border bg-muted/40">
              <AlertDescription className="text-muted-foreground">
                <RefreshCw size={13} className="mr-2 inline animate-spin" aria-hidden />
                Scanning{" "}
                <span className="font-medium text-foreground">{activeProfileLabel}</span> ads in{" "}
                <span className="font-medium text-foreground">{compareMarketSummary.short}</span>
                … first load can take up to 60 seconds.
              </AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait">
            <TabContent key={activeTab} {...tabContentProps}>
              <Suspense fallback={<TabPanelFallback />}>
              {activeTab === "home" && (
                <div id={homePanelId} tabIndex={0}>
                  <DashboardSection
                    forecast={forecast}
                    dealsData={dealsData}
                    loading={anyLoading}
                    marketLabel={pendingMarketSummary.short}
                    homeMarketLabel={homeMarketSummary.short}
                    isBenchmarking={isBenchmarking}
                    pendingMarket={dealsScopeMismatch}
                    onNavigate={navigateToTab}
                    onGoInsightsSection={goInsightsSection}
                  />
                </div>
              )}
              {activeTab === "weather" && (
                <div id={weatherPanelId} tabIndex={0}>
                  <WeatherSection
                    forecast={forecast}
                    loading={weatherLoading}
                    error={errors.weather}
                    onRefresh={() => fetchForecast(true)}
                  />
                </div>
              )}
              {activeTab === "deals" && (
                <div id={dealsPanelId} tabIndex={0}>
                  <DealsSection
                    data={dealsScopeMismatch ? null : dealsData}
                    loading={dealsLoading}
                    error={errors.deals}
                    marketLabel={pendingMarketSummary.short}
                    homeMarketLabel={homeMarketSummary.short}
                    profileLabel={activeProfileLabel}
                    isBenchmarking={isBenchmarking}
                    pendingMarket={dealsScopeMismatch}
                    onRefresh={() => fetchDeals(true, activeZips, benchmarkProfile)}
                    onUploadGuide={openUploadGuide}
                  />
                </div>
              )}
              {activeTab === "insights" && (
                <div id={insightsPanelId} tabIndex={0}>
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
                <div id={trendingPanelId} tabIndex={0}>
                  <TrendingSection
                    data={trendingScopeMismatch ? null : trendingData}
                    loading={trendingLoading}
                    pendingScope={trendingScopeMismatch}
                    error={errors.trending}
                    marketLabel={compareMarketSummary.short}
                    profileLabel={activeProfileLabel}
                    profileId={benchmarkProfile}
                    onRefresh={() => fetchTrending(true, activeZips, benchmarkProfile)}
                  />
                </div>
              )}
              </Suspense>
            </TabContent>
          </AnimatePresence>
        </main>

        <AppFooter storeName={dealsData?.store_name} lastSynced={dealsData?.generated_at} />
      </SidebarInset>
    </SidebarProvider>
  );
}
