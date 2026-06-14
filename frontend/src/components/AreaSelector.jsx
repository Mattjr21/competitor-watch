import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_LOCAL_ZIPS,
  buildZipsCsv,
  customZipsFromCsv,
  describeLoadedMarkets,
  groupMarketAreas,
  hasAnyMarket,
  initialSelected,
  isMultiMarketSelection,
  marketAreasFromPresets,
  selectionFromZips,
} from "../lib/marketAreas";

function zipsKey(zips) {
  return (zips || "")
    .split(",")
    .map((z) => z.trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

export { DEFAULT_LOCAL_ZIPS, customZipsFromCsv, describeLoadedMarkets } from "../lib/marketAreas";

const MAX_CUSTOM_ZIPS = 5;

function parseCustomZips(input) {
  const tokens = (input || "").split(/[,\s]+/).map((z) => z.trim()).filter(Boolean);
  const valid = [];
  const invalid = [];
  for (const token of tokens) {
    const digits = token.replace(/\D/g, "");
    if (digits.length === 5) {
      if (!valid.includes(digits)) valid.push(digits);
    } else if (token) {
      invalid.push(token);
    }
  }
  return {
    valid: valid.slice(0, MAX_CUSTOM_ZIPS),
    invalid,
    truncated: valid.length > MAX_CUSTOM_ZIPS,
  };
}

function MarketPill({ area, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={
        "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 " +
        (selected
          ? "border-leaf/60 bg-leaf/10 font-medium text-leaf"
          : "border-border text-muted-foreground hover:border-border hover:text-foreground/90")
      }
    >
      {area.flag} {area.label}
    </button>
  );
}

function RegionalPills({ groups, draft, disabled, compareMode, onPick }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <fieldset key={group.id} className="min-w-0 border-0 p-0">
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
            {group.label}
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.areas.map((area) => (
              <MarketPill
                key={area.id}
                area={area}
                selected={draft[area.id]}
                disabled={disabled}
                onClick={() => onPick(area.id)}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export default function AreaSelector({ onApply, isLoading, appliedZips, homeZips, areaPresets }) {
  const areas = useMemo(() => marketAreasFromPresets(areaPresets), [areaPresets]);
  const marketGroups = useMemo(() => groupMarketAreas(areas), [areas]);

  const loadedSelection = useMemo(
    () => (appliedZips ? selectionFromZips(appliedZips, areas) : initialSelected(areas)),
    [appliedZips, areas]
  );
  const loadedCustom = useMemo(() => customZipsFromCsv(appliedZips, areas), [appliedZips, areas]);
  const loadedSummary = useMemo(
    () => describeLoadedMarkets(appliedZips, areaPresets),
    [appliedZips, areaPresets]
  );

  const [open, setOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(() => isMultiMarketSelection(loadedSelection));
  const [draft, setDraft] = useState(loadedSelection);
  const [draftCustom, setDraftCustom] = useState(loadedCustom);
  const [customInput, setCustomInput] = useState(() => loadedCustom.join(", "));
  const [customInvalid, setCustomInvalid] = useState([]);
  const applyingRef = useRef(null);

  useEffect(() => {
    setDraft(loadedSelection);
    setDraftCustom(loadedCustom);
    setCustomInput(loadedCustom.join(", "));
    setCompareMode(isMultiMarketSelection(loadedSelection));
  }, [loadedSelection, loadedCustom]);

  useEffect(() => {
    if (!isLoading && applyingRef.current) {
      applyingRef.current = null;
      setOpen(false);
    }
  }, [isLoading]);

  const hasPendingChanges = useMemo(() => {
    const presetChanged = JSON.stringify(draft) !== JSON.stringify(loadedSelection);
    const customChanged =
      JSON.stringify([...draftCustom].sort()) !== JSON.stringify([...loadedCustom].sort());
    return presetChanged || customChanged;
  }, [draft, loadedSelection, draftCustom, loadedCustom]);

  const commitSelection = useCallback(
    (selection, custom) => {
      if (customInvalid.length > 0) return;
      if (!hasAnyMarket(selection, custom)) return;
      applyingRef.current = true;
      onApply(buildZipsCsv(selection, custom, areas));
    },
    [customInvalid, onApply, areas]
  );

  const updateCustomInput = useCallback((value) => {
    setCustomInput(value);
    const { valid, invalid } = parseCustomZips(value);
    setDraftCustom(valid);
    setCustomInvalid(invalid);
  }, []);

  const pickMarket = (id) => {
    if (compareMode) {
      setDraft((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        return hasAnyMarket(next, draftCustom) ? next : prev;
      });
      return;
    }

    const next = {};
    areas.forEach((a) => {
      next[a.id] = a.id === id;
    });
    setDraft(next);
    commitSelection(next, draftCustom);
  };

  const isApplying = isLoading && applyingRef.current != null;
  const loadedLine =
    loadedSummary.areaCount > 0 || loadedSummary.customZips.length > 0
      ? loadedSummary.areaCount > 1
        ? `${loadedSummary.short} · comparing ${loadedSummary.areaCount} markets`
        : loadedSummary.short
      : "Pick a market to load competitor ads";
  const isHomeMarket = homeZips ? zipsKey(appliedZips) === zipsKey(homeZips) : true;
  const homeSummary = useMemo(
    () => (homeZips ? describeLoadedMarkets(homeZips, areaPresets) : null),
    [homeZips, areaPresets]
  );

  return (
    <div
      className="no-print rounded-xl border border-border bg-muted/40"
      role="region"
      aria-label="Benchmark market"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <MapPin size={15} className="shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Benchmark market</p>
            <p className="truncate text-xs text-muted-foreground">
              {isHomeMarket ? loadedLine : `Research: ${loadedLine}`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="area-selector-panel"
          className="min-h-11 shrink-0"
        >
          {open ? "Close" : "Change"}
          <ChevronDown size={14} className={"transition " + (open ? "rotate-180" : "")} aria-hidden />
        </Button>
      </div>

      {open && (
        <div id="area-selector-panel" className="border-t border-border/70 px-4 pb-4 pt-3 sm:px-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {compareMode
                ? "Select multiple markets to compare ads, then Apply."
                : "Tap a market to browse its competitor ads."}
              {homeSummary && !isHomeMarket && (
                <span className="block mt-1 text-muted-foreground/80">
                  Home market for playbook: {homeSummary.short}
                </span>
              )}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                className="size-3.5 rounded border-white/30 accent-brand"
              />
              Compare multiple
            </label>
          </div>

          <RegionalPills
            groups={marketGroups}
            draft={draft}
            disabled={isApplying}
            compareMode={compareMode}
            onPick={pickMarket}
          />

          {compareMode && hasPendingChanges && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => commitSelection(draft, draftCustom)}
                disabled={isApplying || customInvalid.length > 0}
                className="min-h-11"
              >
                {isApplying ? "Loading ads…" : "Apply selection"}
              </Button>
              {isApplying && (
                <span className="text-xs text-muted-foreground/80">First load can take up to 60 seconds</span>
              )}
            </div>
          )}

          <details className="group mt-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-muted-foreground">
              Which ZIP codes are tracked?
            </summary>
            <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
              {loadedSummary.areas.map((area) => (
                <div key={area.id}>
                  <p className="text-xs font-medium text-foreground/85">
                    {area.flag} {area.label}{" "}
                    <span className="font-normal text-muted-foreground/80">({area.zipCount} ZIPs)</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {area.zips.join(", ")}
                  </p>
                  {area.criteria && (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">{area.criteria}</p>
                  )}
                </div>
              ))}
              {loadedSummary.customZips.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground/85">Custom ZIPs</p>
                  <p className="mt-1 font-mono text-[11px] text-sky">{loadedSummary.customZips.join(", ")}</p>
                </div>
              )}
            </div>
          </details>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-muted-foreground">
              Add custom ZIP codes
            </summary>
            <div className="mt-2">
              <label htmlFor="area-custom-zips" className="sr-only">
                Custom ZIP codes, up to five, comma separated
              </label>
              <Input
                id="area-custom-zips"
                type="text"
                inputMode="numeric"
                value={customInput}
                onChange={(e) => updateCustomInput(e.target.value)}
                placeholder="e.g. 77036, 60632 (up to 5)"
                disabled={isApplying}
                className="min-h-11"
              />
              {customInvalid.length > 0 && (
                <p className="mt-1.5 text-xs text-destructive">Invalid: {customInvalid.join(", ")}</p>
              )}
              {draftCustom.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {draftCustom.map((zip) => (
                    <button
                      key={zip}
                      type="button"
                      onClick={() => {
                        const next = draftCustom.filter((z) => z !== zip);
                        setDraftCustom(next);
                        setCustomInput(next.join(", "));
                      }}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-sky/40 bg-sky/10 px-2.5 py-1 text-xs text-sky"
                    >
                      {zip}
                      <X size={12} aria-hidden />
                    </button>
                  ))}
                </div>
              )}
              {hasPendingChanges && (
                <button
                  type="button"
                  onClick={() => commitSelection(draft, draftCustom)}
                  disabled={isApplying || customInvalid.length > 0}
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground/85 hover:border-border"
                >
                  Apply custom ZIPs
                </button>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
