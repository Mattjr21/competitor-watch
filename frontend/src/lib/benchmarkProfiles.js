import catalog from "@benchmark-catalog";
import { DEFAULT_LOCAL_ZIPS } from "./marketAreas";

/** Fallback when /api/data has not returned benchmark_profiles yet. */
export const FALLBACK_BENCHMARK_PROFILES = Object.entries(catalog.profiles || {}).map(
  ([id, p]) => ({
    id,
    label: p.label || id,
    preset_count: (p.area_presets || []).length,
    description: p.description || "",
  })
);

const DEFAULT_PROFILE = catalog.default_profile || "latino";

/** Area presets for a store-type profile (client-side source of truth). */
export function getAreaPresetsForProfile(profileId) {
  const profiles = catalog.profiles || {};
  const pid = profileId && profiles[profileId] ? profileId : DEFAULT_PROFILE;
  return profiles[pid]?.area_presets || profiles[DEFAULT_PROFILE]?.area_presets || [];
}

export function getProfileLabel(profileId) {
  const profiles = catalog.profiles || {};
  const pid = profileId && profiles[profileId] ? profileId : DEFAULT_PROFILE;
  return profiles[pid]?.label || pid;
}

function isLocalPreset(label) {
  return /my area|calhoun|your store/i.test(label || "");
}

/** Top non-local preset labels for empty-state hints (profile catalog order). */
export function getSuggestedBenchmarkPresets(profileId, limit = 3) {
  const presets = getAreaPresetsForProfile(profileId);
  return presets
    .filter((p) => !isLocalPreset(p.label))
    .slice(0, limit)
    .map((p) => (p.label || "").replace(/\s*\([^)]*\)/, "").trim())
    .filter(Boolean);
}

/** Default benchmark ZIPs when switching store type — picks a relevant ethnic market. */
export function getDefaultBenchmarkZips(profileId) {
  const presets = getAreaPresetsForProfile(profileId);

  if (profileId === "latino") {
    const local = presets.find((p) => isLocalPreset(p.label));
    return local?.zips || DEFAULT_LOCAL_ZIPS;
  }

  // Prefer nearest GA corridor market for this tenant (Calhoun / Atlanta area).
  const gaMarket = presets.find(
    (p) =>
      !isLocalPreset(p.label) &&
      /\bGA\b|atlanta|decatur|stone mountain|buford|gordon/i.test(p.label || "")
  );
  if (gaMarket) return gaMarket.zips;

  const nonLocal = presets.find((p) => !isLocalPreset(p.label));
  return nonLocal?.zips || presets[0]?.zips || DEFAULT_LOCAL_ZIPS;
}

export function getDefaultBenchmarkLabel(profileId) {
  const presets = getAreaPresetsForProfile(profileId);
  const zips = getDefaultBenchmarkZips(profileId);
  const match = presets.find((p) => p.zips === zips);
  return match?.label?.replace(/^My area \(/, "").replace(/\)$/, "") || "benchmark market";
}

/** Prefer API presets when profile matches and list is complete. */
export function resolveAreaPresets(apiPresets, profileId, apiProfileId) {
  const fromProfile = getAreaPresetsForProfile(profileId);
  if (!apiPresets?.length) return fromProfile;
  if (apiProfileId && apiProfileId !== profileId) return fromProfile;
  if (fromProfile.length > apiPresets.length) return fromProfile;
  return apiPresets;
}
