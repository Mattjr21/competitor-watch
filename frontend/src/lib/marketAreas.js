/** Market area chips — synced with config.json area_presets when provided. */

const GROUP_FLAGS = {
  local: "🏠",
  texas: "🤠",
  florida: "🌴",
  other: "📍",
};

function inferGroup(label) {
  const l = (label || "").toLowerCase();
  if (/my area|calhoun|gordon|local|ga\b/.test(l) && !/miami|orlando|houston|dallas|san antonio|valley|tx|fl/.test(l)) {
    return "local";
  }
  if (/tx|texas|houston|dallas|san antonio|valley|fort worth|rgv|rio grande/.test(l)) return "texas";
  if (/fl|florida|miami|hialeah|orlando/.test(l)) return "florida";
  return "other";
}

function cleanLabel(label) {
  return (label || "Market").replace(/^My area \(/, "").replace(/\)$/, "").trim();
}

export const DEFAULT_LOCAL_ZIPS =
  "30701,30735,30733,30746,30103,30720,30721,30705";

const FALLBACK_PRESETS = [
  { label: "My area (Calhoun GA)", zips: DEFAULT_LOCAL_ZIPS },
  { label: "Houston TX", zips: "77081,77036,77023" },
  { label: "Dallas / Ft Worth TX", zips: "75211,75217,76106" },
  { label: "San Antonio TX", zips: "78207,78228" },
  { label: "Rio Grande Valley TX", zips: "78521,78539" },
  { label: "Hialeah / Miami FL", zips: "33012,33125,33135" },
  { label: "Orlando FL", zips: "32811,32807" },
];

export function marketAreasFromPresets(presets) {
  const list = presets?.length ? presets : FALLBACK_PRESETS;
  return list.map((p, i) => {
    const group = inferGroup(p.label);
    return {
      id: `area-${i}`,
      label: cleanLabel(p.label),
      zips: (p.zips || "")
        .split(",")
        .map((z) => z.trim())
        .filter(Boolean),
      group,
      flag: GROUP_FLAGS[group] || GROUP_FLAGS.other,
    };
  });
}

export const MARKET_GROUPS = [
  { id: "local", label: "🏠 Your local area" },
  { id: "texas", label: "🤠 Texas markets" },
  { id: "florida", label: "🌴 Florida markets" },
];

export function presetZipSet(areas) {
  return new Set(areas.flatMap((a) => a.zips));
}

export function customZipsFromCsv(zipsCsv, areas) {
  const preset = presetZipSet(areas);
  return (zipsCsv || "")
    .split(",")
    .map((z) => z.trim())
    .filter((z) => z && !preset.has(z));
}

function initialSelected(areas) {
  const init = {};
  areas.forEach((a) => (init[a.id] = a.group === "local"));
  return init;
}

export function selectionFromZips(zipsCsv, areas) {
  const preset = presetZipSet(areas);
  const zipSet = new Set((zipsCsv || "").split(",").map((z) => z.trim()).filter(Boolean));
  if (zipSet.size === 0) return initialSelected(areas);
  const sel = {};
  let anyPreset = false;
  areas.forEach((a) => {
    sel[a.id] = a.zips.some((z) => zipSet.has(z));
    if (sel[a.id]) anyPreset = true;
  });
  const custom = [...zipSet].filter((z) => !preset.has(z));
  if (!anyPreset && custom.length === 0) return initialSelected(areas);
  return sel;
}

export function buildZipsCsv(selected, customZips, areas) {
  const preset = areas.filter((a) => selected[a.id]).flatMap((a) => a.zips);
  const merged = [...preset];
  for (const z of customZips) {
    if (!merged.includes(z)) merged.push(z);
  }
  return merged.join(",");
}

export function areasFromSelection(selected, areas) {
  return areas.filter((a) => selected[a.id]);
}

export function selectionDiff(applied, draft, areas) {
  return {
    added: areas.filter((a) => draft[a.id] && !applied[a.id]),
    removed: areas.filter((a) => applied[a.id] && !draft[a.id]),
  };
}

export function hasAnyMarket(selected, customZips) {
  return Object.values(selected).some(Boolean) || customZips.length > 0;
}

export { initialSelected };
