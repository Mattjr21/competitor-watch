function escapeCsv(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportDealsCsv(deals, { zips = [], generatedAt = "" } = {}) {
  const headers = [
    "Merchant",
    "Product",
    "Category",
    "Price",
    "Unit",
    "Valid through",
    "Latino grocer",
    "Sale terms",
  ];
  const rows = deals.map((d) => ({
    Merchant: d.merchant || "",
    Product: d.name || "",
    Category: d.catLabel || "",
    Price: d.price ?? "",
    Unit: d.unit ?? "",
    "Valid through": d.valid_to ?? "",
    "Latino grocer": d.is_latino ? "Yes" : "No",
    "Sale terms": d.sale_story ?? "",
  }));
  const zipTag = zips.length ? `-${zips.slice(0, 3).join("-")}` : "";
  downloadCsv(`competitor-deals${zipTag}-${stamp()}.csv`, headers, rows);
}

export function exportPriceComparisonCsv(rows, { hasUploadedData = false, generatedAt = "" } = {}) {
  const headers = hasUploadedData
    ? [
        "Category",
        "Your avg",
        "Market low",
        "Cheapest retailer",
        "Market median",
        "Ad count",
        "Status",
        "Suggested action",
      ]
    : ["Category", "Market low", "Cheapest retailer", "Market median", "Ad count"];

  const statusLabel = {
    competitive: "Competitive",
    mid_market: "Mid-market",
    above_market: "Above market",
    no_data: "Needs data",
  };

  const mapped = rows.map((row) => {
    const base = {
      Category: row.label || "",
      "Market low": row.market?.low != null ? row.market.low : "",
      "Cheapest retailer": row.market?.cheapest_merchant || "",
      "Market median": row.market?.median != null ? row.market.median : "",
      "Ad count": row.market?.count ?? "",
    };
    if (!hasUploadedData) return base;
    return {
      Category: row.label || "",
      "Your avg": row.own_avg != null ? row.own_avg : "",
      "Market low": row.market?.low != null ? row.market.low : "",
      "Cheapest retailer": row.market?.cheapest_merchant || "",
      "Market median": row.market?.median != null ? row.market.median : "",
      "Ad count": row.market?.count ?? "",
      Status: statusLabel[row.position] || "",
      "Suggested action": row.suggested_action || "",
    };
  });

  downloadCsv(`price-comparison-${stamp()}.csv`, headers, mapped);
}

export function printReport() {
  window.print();
}
