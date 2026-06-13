import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Sparkles } from "lucide-react";
import AreaSelector from "./components/AreaSelector";
import DealsSection from "./components/DealsSection";
import WeatherSection from "./components/WeatherSection";
import TrendingSection from "./components/TrendingSection";
import { LoadProgress } from "./lib/ui";

const API = import.meta.env.VITE_API_URL || "";

const TABS = [
  { id: "weather", label: "☀️ Daily Ops" },
  { id: "deals", label: "🏪 Deals" },
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
  const [activeZips, setActiveZips] = useState("");

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
    Promise.all([fetchForecast(), fetchDeals(), fetchTrending()]);
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-ink">
              <Sparkles size={18} strokeWidth={2.4} />
            </span>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
                La Bodega — Competitor Watch
              </h1>
              <p className="text-xs text-white/50 sm:text-sm">{headerDesc}</p>
            </div>
          </div>
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-brand hover:text-white"
          >
            <RefreshCw size={15} className={anyLoading ? "animate-spin" : ""} />
            Refresh all
          </button>
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
                  "relative px-4 py-3 text-sm font-medium transition sm:px-5 " +
                  (active ? "text-white" : "text-white/50 hover:text-white/80")
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
