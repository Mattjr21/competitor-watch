import catalog from "@benchmark-catalog";

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

/** Prefer API presets when profile matches and list is complete. */
export function resolveAreaPresets(apiPresets, profileId, apiProfileId) {
  const fromProfile = getAreaPresetsForProfile(profileId);
  if (!apiPresets?.length) return fromProfile;
  if (apiProfileId && apiProfileId !== profileId) return fromProfile;
  if (fromProfile.length > apiPresets.length) return fromProfile;
  return apiPresets;
}
