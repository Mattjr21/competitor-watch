import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Badge from "@cloudscape-design/components/badge";

function WeatherCard({ day }) {
  const profile = day.profile || "";
  const isHot = profile === "hot_grill";
  const isRain = profile === "rain_comfort";
  const isCold = profile === "cold_comfort";

  const emoji = isHot ? "☀️" : isRain ? "🌧️" : isCold ? "❄️" : "🌤️";
  const badgeColor = isHot ? "severity-high" : isRain ? "blue" : isCold ? "severity-low" : "grey";

  return (
    <Container
      header={
        <Header variant="h3">
          {emoji} {day.label} · {day.date}
        </Header>
      }
    >
      <SpaceBetween size="xs">
        <SpaceBetween direction="horizontal" size="xs">
          <Badge color={badgeColor}>{day.temp_high_f}°F high</Badge>
          <Badge color="grey">{day.rain_prob_pct}% rain</Badge>
          {day.source && <Badge color="grey">{day.source}</Badge>}
        </SpaceBetween>
        <Box fontSize="body-s" color="text-body-secondary">{day.weather}</Box>
        {day.playbook_note && <Box fontSize="body-m">{day.playbook_note}</Box>}
        {day.push_categories?.length > 0 && (
          <Box fontSize="body-s">
            <strong>Push:</strong> {day.push_categories.join(", ")}
            {day.skip_categories?.length > 0 && ` · ease off: ${day.skip_categories.join(", ")}`}
          </Box>
        )}
      </SpaceBetween>
    </Container>
  );
}

export default WeatherCard;
