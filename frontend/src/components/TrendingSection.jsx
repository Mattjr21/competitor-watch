import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";

function TrendCard({ item, rank }) {
  const price = item.min != null
    ? item.min === item.max ? `$${item.min}` : `$${item.min}–$${item.max}`
    : null;

  const storeCount = item.stores ?? 0;
  const merchantList = (item.merchants || []).slice(0, 3).join(", ")
    + ((item.merchants || []).length > 3 ? ` +${item.merchants.length - 3}` : "");

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e1e4e8",
      borderRadius: "10px",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    }}>
      {/* Rank + Name inline */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <span style={{
          color: "#c0392b", fontWeight: "800", fontSize: "13px",
          minWidth: "28px", paddingTop: "1px",
        }}>#{rank}</span>
        <span style={{ fontWeight: "700", fontSize: "14px", lineHeight: "1.3", color: "#1a1a1a" }}>
          {item.name}
        </span>
      </div>

      {/* Price */}
      {price && (
        <span style={{ fontWeight: "700", fontSize: "16px", color: "#1f8a1f" }}>{price}</span>
      )}

      {/* Store count badge only — no redundant "metros" badge */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{
          background: "#0972d3", color: "#fff",
          fontSize: "11px", fontWeight: "600",
          padding: "2px 8px", borderRadius: "999px",
        }}>
          {storeCount} {storeCount === 1 ? "store" : "stores"}
        </span>
      </div>

      {/* Merchant names */}
      {merchantList && (
        <span style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.4" }}>
          {merchantList}
        </span>
      )}
    </div>
  );
}

function TrendGrid({ items, loading, emptyMsg }) {
  if (loading && !items?.length) return (
    <Box padding="l" color="text-body-secondary">{emptyMsg}</Box>
  );
  if (!items?.length) return (
    <Box padding="l" color="text-body-secondary">No data this week.</Box>
  );
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: "12px",
    }}>
      {items.map((item, i) => <TrendCard key={i} item={item} rank={i + 1} />)}
    </div>
  );
}

export default function TrendingSection({ data, loading, onRefresh }) {
  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header
            variant="h2"
            description="Most-advertised products across US Latino metros this week"
            actions={<Button iconName="refresh" loading={loading} onClick={onRefresh}>Refresh</Button>}
          >
            🌮 Latino Supermarkets
          </Header>
        }
      >
        <TrendGrid items={data?.latino} loading={loading} emptyMsg="Scanning Latino metros..." />
      </Container>

      <Container
        header={
          <Header
            variant="h2"
            description="What mainstream supermarkets are pushing this week"
          >
            🛒 American Supermarkets
          </Header>
        }
      >
        <TrendGrid items={data?.mainstream} loading={loading} emptyMsg="Loading..." />
      </Container>
    </SpaceBetween>
  );
}
