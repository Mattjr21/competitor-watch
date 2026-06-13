/** Market area chips — synced with benchmark profile presets when provided. */

import { getAreaPresetsForProfile } from "./benchmarkProfiles";

const GROUP_FLAGS = {
  local: "🏠",
  georgia: "🍑",
  texas: "🤠",
  florida: "🌴",
  california: "🌊",
  southwest: "🌵",
  midwest: "🌽",
  northeast: "🗽",
  other: "📍",
};

function inferGroup(label) {
  const l = (label || "").toLowerCase();
  if (/my area|calhoun|gordon/.test(l) && !/atlanta|miami|orlando|houston|dallas|san antonio|valley|tx|fl|chicago|los angeles|phoenix|bronx|paterson|fresno|vegas|sacramento|el paso/.test(l)) {
    return "local";
  }
  if (/atlanta|marietta|doraville|chamblee|decatur|buford/.test(l)) return "georgia";
  if (/tx|texas|houston|dallas|san antonio|valley|fort worth|rgv|rio grande|el paso/.test(l)) return "texas";
  if (/fl|florida|miami|hialeah|orlando/.test(l)) return "florida";
  if (/los angeles|fresno|sacramento|california|\bca\b/.test(l)) return "california";
  if (/phoenix|arizona|las vegas|nevada|\baz\b|\bnv\b/.test(l)) return "southwest";
  if (/chicago|illinois|\bil\b/.test(l)) return "midwest";
  if (/bronx|nyc|paterson|new jersey|new york|\bnj\b/.test(l)) return "northeast";
  if (/\bga\b|georgia/.test(l)) return "georgia";
  return "other";
}

function cleanLabel(label) {
  return (label || "Market").replace(/^My area \(/, "").replace(/\)$/, "").trim();
}

export const DEFAULT_LOCAL_ZIPS =
  "30701,30735,30733,30746,30103,30720,30721,30705";

/** La Bodega trade area — always used for weekend playbook & price intel. */
export const HOME_MARKET_ZIPS = DEFAULT_LOCAL_ZIPS;

const FALLBACK_PRESETS = getAreaPresetsForProfile("latino");

export function marketAreasFromPresets(presets) {
  const list = presets?.length ? presets : FALLBACK_PRESETS;
  return list.map((p, i) => {
    const group = inferGroup(p.label);
    const zips = (p.zips || "")
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean);
    return {
      id: `area-${i}`,
      label: cleanLabel(p.label),
      zips,
      zipsCsv: zips.join(", "),
      zipCount: zips.length,
      criteria: p.criteria || "",
      group,
      flag: GROUP_FLAGS[group] || GROUP_FLAGS.other,
    };
  });
}

export const MARKET_GROUPS = [
  { id: "local", label: "🏠 Your local area" },
  { id: "georgia", label: "🍑 Georgia" },
  { id: "texas", label: "🤠 Texas" },
  { id: "florida", label: "🌴 Florida" },
  { id: "california", label: "🌊 California" },
  { id: "southwest", label: "🌵 Southwest" },
  { id: "midwest", label: "🌽 Midwest" },
  { id: "northeast", label: "🗽 Northeast" },
];

export function groupMarketAreas(areas) {
  const byGroup = new Map(MARKET_GROUPS.map((g) => [g.id, []]));
  byGroup.set("other", []);
  for (const area of areas) {
    const key = byGroup.has(area.group) ? area.group : "other";
    byGroup.get(key).push(area);
  }
  const groups = MARKET_GROUPS.map((g) => ({ ...g, areas: byGroup.get(g.id) || [] })).filter(
    (g) => g.areas.length > 0
  );
  if (byGroup.get("other")?.length) {
    groups.push({ id: "other", label: "📍 Other", areas: byGroup.get("other") });
  }
  return groups;
}

export function primarySelectedAreaId(draft, areas) {
  const selected = areas.filter((a) => draft[a.id]);
  if (selected.length === 1) return selected[0].id;
  const local = areas.find((a) => a.group === "local" && draft[a.id]);
  if (local) return local.id;
  return selected[0]?.id || areas.find((a) => a.group === "local")?.id || areas[0]?.id;
}

export function isMultiMarketSelection(draft) {
  return Object.values(draft).filter(Boolean).length > 1;
}

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

/** Human-readable summary of loaded preset areas + custom ZIPs (not raw ZIP count). */
export function describeLoadedMarkets(zipsCsv, presets) {
  const areas = marketAreasFromPresets(presets);
  const applied = selectionFromZips(zipsCsv, areas);
  const loadedAreas = areasFromSelection(applied, areas);
  const custom = customZipsFromCsv(zipsCsv, areas);
  const zipCount = (zipsCsv || "").split(",").map((z) => z.trim()).filter(Boolean).length;
  const labels = loadedAreas.map((a) => a.label);
  let short = "No markets";
  if (labels.length === 1) short = labels[0];
  else if (labels.length === 2) short = labels.join(" + ");
  else if (labels.length > 2) short = `${labels[0]} + ${labels.length - 1} more`;
  else if (custom.length) short = `${custom.length} custom ZIP${custom.length !== 1 ? "s" : ""}`;
  return {
    areas: loadedAreas,
    customZips: custom,
    areaCount: loadedAreas.length,
    zipCount,
    labels,
    short,
  };
}

export { initialSelected };
