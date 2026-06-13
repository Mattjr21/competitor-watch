import { useId } from "react";
import { PANEL } from "../lib/sectionUi";
import { FALLBACK_BENCHMARK_PROFILES } from "../lib/benchmarkProfiles";

const PROFILE_STORAGE_KEY = "cw_benchmark_profile";

export function getStoredBenchmarkProfile() {
  try {
    return localStorage.getItem(PROFILE_STORAGE_KEY) || "latino";
  } catch {
    return "latino";
  }
}

export function setStoredBenchmarkProfile(id) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export default function BenchmarkProfileSelector({
  profiles = [],
  activeProfile = "latino",
  onChange,
  disabled = false,
}) {
  const selectId = useId();
  const descId = useId();
  const options = profiles.length ? profiles : FALLBACK_BENCHMARK_PROFILES;
  const active = options.find((p) => p.id === activeProfile) || options[0];

  return (
    <div className={PANEL + " space-y-3 px-4 py-3 sm:px-5"}>
      <div className="min-w-0">
        <label htmlFor={selectId} className="text-sm font-semibold text-white/90">
          Store type benchmark
        </label>
        <p id={descId} className="mt-1 max-w-2xl text-xs leading-relaxed text-white/65">
          {active?.description ||
            "Pick your ethnic grocery focus — market presets and national ranking update to match."}{" "}
          <span className="text-white/45">
            Changing type auto-selects a relevant benchmark market and reloads deals.
          </span>
        </p>
      </div>
      <select
        id={selectId}
        aria-describedby={descId}
        value={activeProfile}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="toolbar-control w-full max-w-md text-sm text-white"
      >
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label} ({p.preset_count} markets)
          </option>
        ))}
      </select>
    </div>
  );
}
