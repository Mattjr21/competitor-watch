import { useId } from "react";
import { PANEL } from "../lib/sectionUi";
import { FALLBACK_BENCHMARK_PROFILES } from "../lib/benchmarkProfiles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <label htmlFor={selectId} className="text-sm font-semibold text-foreground">
          Store type benchmark
        </label>
        <p id={descId} className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          {active?.description ||
            "Pick your ethnic grocery focus — market presets and national ranking update to match."}{" "}
          <span className="text-muted-foreground/80">
            Changing type auto-selects a relevant benchmark market and reloads deals.
          </span>
        </p>
      </div>
      <Select value={activeProfile} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={selectId} aria-describedby={descId} className="h-11 w-full max-w-md">
          <SelectValue placeholder="Choose store type" />
        </SelectTrigger>
        <SelectContent>
          {options.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label} ({p.preset_count} markets)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
