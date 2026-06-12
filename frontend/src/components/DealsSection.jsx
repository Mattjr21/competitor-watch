import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import DealCard from "./DealCard";

export default function DealsSection({ data, loading, onRefresh }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("merchant");

  const deals = useMemo(() => {
    if (!data?.deals_by_category) return [];
    return Object.entries(data.deals_by_category).flatMap(([cat, items]) =>
      items.map((d) => ({ ...d, catLabel: d.catLabel || cat }))
    );
  }, [data]);

  const grouped = useMemo(() => {
    const filtered = deals.filter((d) => {
      const q = search.toLowerCase();
      return (
        d.merchant?.toLowerCase().includes(q) ||
        d.name?.toLowerCase().includes(q) ||
        d.catLabel?.toLowerCase().includes(q) ||
        d.sale_story?.toLowerCase().includes(q)
      );
    });

    const map = {};
    filtered.forEach((deal) => {
      const key = deal.merchant || "Other";
      if (!map[key]) map[key] = [];
      map[key].push(deal);
    });

    const entries = Object.entries(map);

    if (sortBy === "merchant") entries.sort((a, b) => a[0].localeCompare(b[0]));
    else if (sortBy === "count") entries.sort((a, b) => b[1].length - a[1].length);
    else if (sortBy === "price") entries.sort((a, b) => {
      const aMin = Math.min(...a[1].map((d) => parseFloat(d.price) || 999));
      const bMin = Math.min(...b[1].map((d) => parseFloat(d.price) || 999));
      return aMin - bMin;
    });

    return entries;
  }, [deals, search, sortBy]);

  if (loading) return (
    <div style={{ padding: "32px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            height: "110px", borderRadius: "10px",
            background: "linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease-in-out infinite",
          }} />
        ))}
      </div>
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  );

  if (!data) return (
    <div style={{ padding: "40px 0", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
      No deals loaded yet.
    </div>
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Controls bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "14px", marginBottom: "22px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            <strong style={{ color: "#1a1d21" }}>{deals.length}</strong> deals ·{" "}
            <strong style={{ color: "#1a1d21" }}>{grouped.length}</strong> stores
          </span>
          {data?.generated_at && (
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
              Updated {new Date(data.generated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg style={{ position: "absolute", left: "11px", pointerEvents: "none", color: "#9ca3af" }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: "30px", paddingRight: search ? "30px" : "12px",
                paddingTop: "10px", paddingBottom: "10px",
                border: "1px solid #e5e7eb", borderRadius: "12px",
                fontSize: "13px", width: "220px", background: "#fff", color: "#1a1d21",
                outline: "none",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position: "absolute", right: "8px", background: "none",
                border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "11px", padding: 0,
              }}>✕</button>
            )}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
            padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "12px",
            fontSize: "13px", background: "#fff", color: "#1a1d21", cursor: "pointer", minWidth: "170px",
          }}>
            <option value="merchant">Store A–Z</option>
            <option value="count">Most Deals</option>
            <option value="price">Lowest Price</option>
          </select>

          {/* Refresh */}
          {onRefresh && (
            <button onClick={onRefresh} style={{
              padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: "12px",
              fontSize: "13px", background: "#fff", color: "#1f2937",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", minWidth: "120px",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      <AnimatePresence mode="wait">
        {grouped.length === 0 && (
          <motion.div key="empty"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ padding: "40px 0", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
            {search
              ? <>No deals match "<strong>{search}</strong>" — <button onClick={() => setSearch("")}
                  style={{ color: "#b91c1c", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "13px" }}>clear</button></>
              : "No deals available."}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merchant groups */}
      <AnimatePresence mode="popLayout">
        {grouped.map(([merchant, merchantDeals], idx) => (
          <motion.div key={merchant}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
            layout style={{ marginBottom: "24px" }}>

            {/* Store header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "10px",
                background: "#fef2f2", color: "#b91c1c",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "800", fontSize: "12px", flexShrink: 0,
              }}>
                {merchant.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: "700", fontSize: "14px", color: "#1a1d21" }}>{merchant}</span>
              <span style={{
                fontSize: "12px", color: "#475569",
                background: "#f8fafc", borderRadius: "999px",
                padding: "4px 10px", marginLeft: "4px",
              }}>
                {merchantDeals.length}
              </span>
            </div>

            {/* Cards grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gridAutoRows: "1fr",
              gap: "16px",
              alignItems: "stretch",
            }}>
              <AnimatePresence mode="popLayout">
                {merchantDeals.map((deal, i) => (
                  <motion.div key={deal.id || `${merchant}-${i}`}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.28, delay: i * 0.025, ease: [0.16, 1, 0.3, 1] }}
                    layout
                    style={{ height: "100%" }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}>
                    <DealCard d={deal} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </section>
  );
}