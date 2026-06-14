import { useState, useEffect } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import BenchmarkProfileSelector from "./BenchmarkProfileSelector";
import AreaSelector from "./AreaSelector";
import { cn } from "@/lib/utils";

export default function MarketSettingsBar({
  marketLabel,
  profileLabel,
  profiles,
  activeProfile,
  onProfileChange,
  profileDisabled,
  areaProps,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const summary = [profileLabel, marketLabel].filter(Boolean).join(" · ");

  return (
    <div className="no-print rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="market-settings-panel"
        className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <SlidersHorizontal size={16} className="shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Market settings</p>
            <p className="truncate text-xs text-muted-foreground">{summary || "Benchmark profile and ZIP market"}</p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-muted-foreground transition", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id="market-settings-panel"
          className="grid gap-3 border-t border-border p-3 sm:p-4 lg:grid-cols-2"
        >
          <BenchmarkProfileSelector
            profiles={profiles}
            activeProfile={activeProfile}
            onChange={onProfileChange}
            disabled={profileDisabled}
          />
          <AreaSelector {...areaProps} />
        </div>
      )}
    </div>
  );
}
