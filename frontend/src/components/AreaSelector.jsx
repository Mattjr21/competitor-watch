import { useState, useCallback, useEffect } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";

const AREAS = [
  { id: "30701", label: "Calhoun GA",          zips: ["30701"], group: "local",   flag: "🏠" },
  { id: "30735", label: "Resaca GA",            zips: ["30735"], group: "local",   flag: "🏠" },
  { id: "30733", label: "Plainville GA",        zips: ["30733"], group: "local",   flag: "🏠" },
  { id: "30746", label: "Sugar Valley GA",      zips: ["30746"], group: "local",   flag: "🏠" },
  { id: "30103", label: "Adairsville GA",       zips: ["30103"], group: "local",   flag: "🏠" },
  { id: "30720", label: "Dalton GA",            zips: ["30720"], group: "local",   flag: "🏠" },
  { id: "houston",    label: "Houston TX",           zips: ["77001","77002","77003"], group: "texas",   flag: "🤠" },
  { id: "dallas",     label: "Dallas TX",            zips: ["75201","75202","76101"], group: "texas",   flag: "🤠" },
  { id: "sanantonio", label: "San Antonio TX",       zips: ["78201","78202","78203"], group: "texas",   flag: "🤠" },
  { id: "rgv",        label: "Rio Grande Valley TX", zips: ["78501","78502","78503"], group: "texas",   flag: "🤠" },
  { id: "hialeah",    label: "Hialeah / Miami FL",   zips: ["33010","33012","33016"], group: "florida", flag: "🌴" },
  { id: "orlando",    label: "Orlando FL",            zips: ["32801","32805","32808"], group: "florida", flag: "🌴" },
];

const GROUP_LABELS = {
  local:   "🏠 Your Local Area",
  texas:   "🤠 Texas Markets",
  florida: "🌴 Florida Markets",
};

// Semantic states — color means status, NOT region
const STATE_STYLES = {
  idle: {
    border: "1.5px solid #c6c6cd", background: "#fff",
    color: "#5f6b7a", fontWeight: "400",
  },
  loading: {
    border: "2px solid #e07b00", background: "#fff8f0",
    color: "#e07b00", fontWeight: "700",
  },
  active: {
    border: "2px solid #1f8a1f", background: "#f0faf0",
    color: "#1f8a1f", fontWeight: "700",
  },
};

export default function AreaSelector({ onApply, isLoading }) {
  const [selected, setSelected] = useState(() => {
    const init = {};
    AREAS.forEach((a) => { init[a.id] = a.group === "local"; });
    return init;
  });
  const [loadedIds, setLoadedIds] = useState(() =>
    AREAS.filter(a => a.group === "local").map(a => a.id)
  );
  const [pendingIds, setPendingIds] = useState([]);

  // When parent signals loading done, promote pending → loaded
  useEffect(() => {
    if (!isLoading && pendingIds.length > 0) {
      queueMicrotask(() => {
        setLoadedIds(pendingIds);
        setPendingIds([]);
      });
    }
  }, [isLoading, pendingIds]);

  const applySelection = useCallback((nextSelected) => {
    const activeAreas = AREAS.filter(a => nextSelected[a.id]);
    const zips = activeAreas.flatMap(a => a.zips).join(",");
    const ids = activeAreas.map(a => a.id);
    setPendingIds(ids);
    onApply(zips, activeAreas);
  }, [onApply]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = { ...prev, [id]: !prev[id] };
      applySelection(next);
      return next;
    });
  };

  const selectAll = (g) => setSelected(prev => {
    const next = { ...prev };
    AREAS.filter(a => a.group === g).forEach(a => next[a.id] = true);
    applySelection(next);
    return next;
  });

  const clearAll = (g) => setSelected(prev => {
    const next = { ...prev };
    AREAS.filter(a => a.group === g).forEach(a => next[a.id] = false);
    applySelection(next);
    return next;
  });

  const getChipState = (id) => {
    if (!selected[id]) return "idle";
    if (pendingIds.includes(id)) return "loading";
    if (loadedIds.includes(id)) return "active";
    return "idle";
  };

  const activeAreas = AREAS.filter(a => loadedIds.includes(a.id));
  const pendingAreas = AREAS.filter(a => pendingIds.includes(a.id));

  return (
    <Container header={<Header variant="h3">Market Areas</Header>}>
      <SpaceBetween size="m">

        {/* Status bar — only shows truly loaded areas */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "6px",
          padding: "10px 14px", borderRadius: "8px",
          background: "#f8f9fa", border: "1px solid #e1e4e8",
          alignItems: "center", minHeight: "44px",
        }}>
          <Box fontSize="body-s" color="text-body-secondary" fontWeight="bold">Active:</Box>

          {pendingAreas.map(area => (
            <span key={area.id} style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "3px 10px", borderRadius: "999px",
              background: "#fff8f0", border: "1.5px solid #e07b00",
              color: "#e07b00", fontSize: "12px", fontWeight: "600",
            }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px",
                borderRadius: "50%", border: "2px solid #e07b00",
                borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite" }} />
              {area.flag} {area.label}
            </span>
          ))}

          {activeAreas.filter(a => !pendingIds.includes(a.id)).map(area => (
            <span key={area.id} style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              padding: "3px 10px", borderRadius: "999px",
              background: "#f0faf0", border: "1.5px solid #1f8a1f",
              color: "#1f8a1f", fontSize: "12px", fontWeight: "600",
            }}>
              ✓ {area.flag} {area.label}
            </span>
          ))}

          {activeAreas.length === 0 && pendingAreas.length === 0 && (
            <Box fontSize="body-s" color="text-body-secondary">No areas selected</Box>
          )}
        </div>

        {/* Chip groups */}
        {["local", "texas", "florida"].map(group => (
          <SpaceBetween key={group} size="xs">
            <SpaceBetween direction="horizontal" size="xs">
              <Box fontWeight="bold" fontSize="body-s" color="text-body-secondary">
                {GROUP_LABELS[group]}
              </Box>
              <button onClick={() => selectAll(group)} style={linkBtn}>All</button>
              <button onClick={() => clearAll(group)} style={linkBtn}>None</button>
            </SpaceBetween>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {AREAS.filter(a => a.group === group).map(area => {
                const state = getChipState(area.id);
                const s = STATE_STYLES[state];
                return (
                  <div key={area.id} onClick={() => toggle(area.id)} style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "6px 14px", borderRadius: "20px",
                    cursor: "pointer", userSelect: "none",
                    transition: "all 0.15s ease",
                    fontSize: "13px",
                    ...s,
                  }}>
                    {area.flag} {area.label}
                    {state === "active" && " ✓"}
                    {state === "loading" && (
                      <span style={{ display: "inline-block", width: "10px", height: "10px",
                        borderRadius: "50%", border: "2px solid #e07b00",
                        borderTopColor: "transparent",
                        animation: "spin 0.7s linear infinite" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </SpaceBetween>
        ))}
      </SpaceBetween>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </Container>
  );
}

const linkBtn = {
  background: "none", border: "none", cursor: "pointer",
  color: "#0972d3", fontSize: "12px", padding: "0 2px", textDecoration: "underline",
};
