import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Table from "@cloudscape-design/components/table";
import WeatherCard from "./WeatherCards";

export default function WeatherSection({ forecast, onRefresh, loading }) {
  if (loading && !forecast) {
    return <Box color="text-body-secondary" padding="l">Loading weather forecast...</Box>;
  }
  if (!forecast) return null;

  const days = forecast.weather_days || [];
  const targets = forecast.targets || {};
  const todayTargets = (targets.days || [])[0];
  const loc = forecast.location || {};

  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header
            variant="h2"
            description={`${loc.city || "Calhoun"}, ${loc.state || "GA"} · updated ${forecast.generated_at}`}
            actions={<Button iconName="refresh" loading={loading} onClick={onRefresh}>Refresh</Button>}
          >
            Weather Forecast
          </Header>
        }
      >
        <ColumnLayout columns={3} variant="text-grid">
          {days.map((day, i) => <WeatherCard key={i} day={day} />)}
        </ColumnLayout>
      </Container>

      {todayTargets && (
        <Container
          header={<Header variant="h2" description={targets.note || ""}>Today's Sales Targets</Header>}
        >
          <Table
            items={todayTargets.categories || []}
            columnDefinitions={[
              { id: "cat", header: "Category", cell: (r) => <strong>{r.label}</strong> },
              { id: "baseline", header: "Typical day", cell: (r) => `$${r.baseline.toLocaleString()}` },
              { id: "target", header: "Today's target", cell: (r) => (
                <Box color={r.target > r.baseline ? "text-status-success" : "text-status-warning"} fontWeight="bold">
                  ${r.target.toLocaleString()}
                </Box>
              )},
              { id: "why", header: "Why", cell: (r) => r.why },
            ]}
            variant="embedded"
            stripedRows
          />
        </Container>
      )}
    </SpaceBetween>
  );
}
