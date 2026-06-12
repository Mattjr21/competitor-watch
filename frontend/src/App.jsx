import { useState, useEffect } from "react";
import AppLayout from "@cloudscape-design/components/app-layout";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Tabs from "@cloudscape-design/components/tabs";
import Box from "@cloudscape-design/components/box";
import WeatherSection from "./components/WeatherSection";
import DealsSection from "./components/DealsSection";
import TrendingSection from "./components/TrendingSection";
import AreaSelector from "./components/AreaSelector";

export default function App() {
  const [forecast, setForecast] = useState(null);
  const [dealsData, setDealsData] = useState(null);
  const [trendingData, setTrendingData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("weather");
  const [activeZips, setActiveZips] = useState("");

  async function fetchForecast(refresh = false) {
    setWeatherLoading(true);
    try {
      const res = await fetch("/api/forecast" + (refresh ? "?refresh=1" : ""));
      setForecast(await res.json());
    } catch (e) { console.error(e); }
    finally { setWeatherLoading(false); }
  }

  async function fetchDeals(refresh = false, zips = "") {
    setDealsLoading(true);
    try {
      const params = [];
      if (refresh) params.push("refresh=1");
      if (zips) params.push("zips=" + encodeURIComponent(zips));
      const res = await fetch("/api/data" + (params.length ? "?" + params.join("&") : ""));
      setDealsData(await res.json());
    } catch (e) { console.error(e); }
    finally { setDealsLoading(false); }
  }

  async function fetchTrending(refresh = false) {
    setTrendingLoading(true);
    try {
      const res = await fetch("/api/trending" + (refresh ? "?refresh=1" : ""));
      setTrendingData(await res.json());
    } catch (e) { console.error(e); }
    finally { setTrendingLoading(false); }
  }

  useEffect(() => {
    const init = async () => {
      await fetchForecast();
      await fetchDeals();
      await fetchTrending();
    };
    init();
  }, []);

  const totalDeals = dealsData
    ? Object.values(dealsData.deals_by_category || {}).flat().length
    : 0;

  return (
    <AppLayout
      navigationHide={true}
      toolsHide={true}
      content={
        <ContentLayout
          header={
            <Header
              variant="h1"
              description={
                dealsData
                  ? `${dealsData.zips?.join(", ")} · ${dealsData.merchants?.length} retailers · updated ${dealsData.generated_at}`
                  : "Calhoun, GA · Live competitor pricing"
              }
              actions={
                <Button
                  iconName="refresh"
                  variant="primary"
                  onClick={() => { fetchDeals(true, activeZips); fetchForecast(true); fetchTrending(true); }}
                  loading={dealsLoading || weatherLoading || trendingLoading}
                >
                  Refresh all
                </Button>
              }
            >
              La Bodega — Competitor Watch
            </Header>
          }
        >
          <SpaceBetween size="l">
            <AreaSelector isLoading={dealsLoading}
              onApply={(zips) => {
                setActiveZips(zips);
                fetchDeals(false, zips);
              }}
            />
            <Tabs
              activeTabId={activeTab}
              onChange={({ detail }) => setActiveTab(detail.activeTabId)}
              tabs={[
                {
                  id: "weather",
                  label: "☀️ Daily Ops",
                  content: (
                    <Box padding={{ top: "l" }}>
                      <WeatherSection forecast={forecast} onRefresh={() => fetchForecast(true)} loading={weatherLoading} />
                    </Box>
                  ),
                },
                {
                  id: "deals",
                  label: `🏪 Deals${totalDeals ? " (" + totalDeals + ")" : ""}`,
                  content: (
                    <Box padding={{ top: "l" }}>
                      <DealsSection data={dealsData} loading={dealsLoading} onRefresh={() => fetchDeals(true, activeZips)} />
                    </Box>
                  ),
                },
                {
                  id: "trending",
                  label: "📈 Trending",
                  content: (
                    <Box padding={{ top: "l" }}>
                      <TrendingSection data={trendingData} loading={trendingLoading} onRefresh={() => fetchTrending(true)} />
                    </Box>
                  ),
                },
              ]}
            />
          </SpaceBetween>
        </ContentLayout>
      }
    />
  );
}
