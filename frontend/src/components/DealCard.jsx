import { useEffect, useRef, useState } from "react";

const CAT_COLORS = {
  produce:    { bg: "#f0faf0", border: "#1f8a1f", color: "#1a6b1a" },
  verduras:   { bg: "#f0faf0", border: "#1f8a1f", color: "#1a6b1a" },
  vegetables: { bg: "#f0faf0", border: "#1f8a1f", color: "#1a6b1a" },
  fruits:     { bg: "#f0faf0", border: "#1f8a1f", color: "#1a6b1a" },
  frutas:     { bg: "#f0faf0", border: "#1f8a1f", color: "#1a6b1a" },
  meat:       { bg: "#fff1f0", border: "#c0392b", color: "#a93226" },
  carne:      { bg: "#fff1f0", border: "#c0392b", color: "#a93226" },
  carnes:     { bg: "#fff1f0", border: "#c0392b", color: "#a93226" },
  seafood:    { bg: "#fff1f0", border: "#c0392b", color: "#a93226" },
  poultry:    { bg: "#fff1f0", border: "#c0392b", color: "#a93226" },
  beef:       { bg: "#fff1f0", border: "#c0392b", color: "#a93226" },
  pork:       { bg: "#fff1f0", border: "#c0392b", color: "#a93226" },
  dairy:      { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  lacteos:    { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  cheese:     { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  queso:      { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  milk:       { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  leche:      { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  cream:      { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  crema:      { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  butter:     { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  yogurt:     { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
  tortillas:  { bg: "#fffbeb", border: "#d97706", color: "#b45309" },
  bread:      { bg: "#fffbeb", border: "#d97706", color: "#b45309" },
  bakery:     { bg: "#fffbeb", border: "#d97706", color: "#b45309" },
  pan:        { bg: "#fffbeb", border: "#d97706", color: "#b45309" },
  masa:       { bg: "#fffbeb", border: "#d97706", color: "#b45309" },
  chips:      { bg: "#fffbeb", border: "#d97706", color: "#b45309" },
  snacks:     { bg: "#fffbeb", border: "#d97706", color: "#b45309" },
  salsa:      { bg: "#fff7ed", border: "#ea580c", color: "#c2410c" },
  spices:     { bg: "#fff7ed", border: "#ea580c", color: "#c2410c" },
  especias:   { bg: "#fff7ed", border: "#ea580c", color: "#c2410c" },
  chile:      { bg: "#fff7ed", border: "#ea580c", color: "#c2410c" },
  drinks:     { bg: "#f0fdfa", border: "#0d9488", color: "#0f766e" },
  beverages:  { bg: "#f0fdfa", border: "#0d9488", color: "#0f766e" },
  bebidas:    { bg: "#f0fdfa", border: "#0d9488", color: "#0f766e" },
  soda:       { bg: "#f0fdfa", border: "#0d9488", color: "#0f766e" },
  juice:      { bg: "#f0fdfa", border: "#0d9488", color: "#0f766e" },
  agua:       { bg: "#f0fdfa", border: "#0d9488", color: "#0f766e" },
  beer:       { bg: "#f0fdfa", border: "#0d9488", color: "#0f766e" },
  cerveza:    { bg: "#f0fdfa", border: "#0d9488", color: "#0f766e" },
  household:  { bg: "#f5f3ff", border: "#7c3aed", color: "#6d28d9" },
  cleaning:   { bg: "#f5f3ff", border: "#7c3aed", color: "#6d28d9" },
  limpieza:   { bg: "#f5f3ff", border: "#7c3aed", color: "#6d28d9" },
  personal:   { bg: "#f5f3ff", border: "#7c3aed", color: "#6d28d9" },
};
const DEFAULT_CAT = { bg: "#f3f4f6", border: "#d1d5db", color: "#6b7280" };

function getCatStyle(catLabel) {
  if (!catLabel) return DEFAULT_CAT;
  const words = catLabel.toLowerCase().replace(/[/()]/g, " ").split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (CAT_COLORS[word]) return CAT_COLORS[word];
  }
  return DEFAULT_CAT;
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function AnimatedPrice({ value, unit }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const target = parseFloat(value);

  useEffect(() => {
    if (isNaN(target)) return;
    const duration = 600;
    const start = performance.now();
    const from = target * 0.6;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * ease);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  const formatted = isNaN(target)
    ? value
    : "$" + display.toFixed(2).replace(/\.00$/, "") + (unit ? "/" + unit : "");

  return (
    <span style={{ fontWeight: "800", fontSize: "17px", color: "#1a7a1a", fontVariantNumeric: "tabular-nums" }}>
      {formatted}
    </span>
  );
}

export default function DealCard({ d }) {
  const displayPrice = d.price != null ? String(d.price) : null;
  const saleStory = d.sale_story || "";
  const hasBuyCondition = /when you buy|buy \d|limit|must buy/i.test(saleStory);
  const condition = hasBuyCondition ? saleStory : null;
  const validTo = fmtDate(d.valid_to);
  const catStyle = getCatStyle(d.catLabel);

  return (
    <div style={{
      background: "#fff", border: "1px solid #e1e4e8",
      borderRadius: "10px", padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: "6px",
      minHeight: "120px",
      height: "100%",
      boxSizing: "border-box",
    }}>
      <span style={{
        fontWeight: "600", fontSize: "13px", lineHeight: "1.4", color: "#1a1a1a",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }} title={d.name}>{d.name}</span>

      <div>
        {displayPrice ? (
          <>
            <AnimatedPrice value={displayPrice} unit={d.unit} />
            {condition && (
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>{condition}</div>
            )}
          </>
        ) : (
          <span style={{ fontSize: "12px", color: "#6b7280" }}>{saleStory || "See ad"}</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {d.catLabel && (
          <span style={{
            background: catStyle.bg, border: "1px solid " + catStyle.border,
            color: catStyle.color, fontSize: "11px", fontWeight: "600",
            padding: "2px 8px", borderRadius: "999px",
          }}>{d.catLabel}</span>
        )}
        {validTo && <span style={{ fontSize: "11px", color: "#9ca3af" }}>· thru {validTo}</span>}
      </div>
    </div>
  );
}