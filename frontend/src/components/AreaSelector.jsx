import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";
import { PANEL, PANEL_INSET } from "../lib/layout";
import {
  DEFAULT_LOCAL_ZIPS,
  MARKET_GROUPS,
  areasFromSelection,
  buildZipsCsv,
  customZipsFromCsv,
  hasAnyMarket,
  initialSelected,
  marketAreasFromPresets,
  selectionDiff,
  selectionFromZips,
} from "../lib/marketAreas";

export { DEFAULT_LOCAL_ZIPS, customZipsFromCsv } from "../lib/marketAreas";

const PANEL_X = "px-4 sm:px-5 lg:px-6";
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
  const truncated = valid.length > MAX_CUSTOM_ZIPS;
  return {
    valid: valid.slice(0, MAX_CUSTOM_ZIPS),
    invalid,
    truncated,
  };
}

export default function AreaSelector({ onApply, isLoading, appliedZips, areaPresets }) {
  const areas = useMemo(() => marketAreasFromPresets(areaPresets), [areaPresets]);
  const visibleGroups = useMemo(
    () => MARKET_GROUPS.filter((g) => areas.some((a) => a.group === g.id)),
    [areas]
  );

  const [expanded, setExpanded] = useState(false);
  const loadedSelection = useMemo(
    () => (appliedZips ? selectionFromZips(appliedZips, areas) : initialSelected(areas)),
    [appliedZips, areas]
  );
  const loadedCustom = useMemo(() => customZipsFromCsv(appliedZips, areas), [appliedZips, areas]);

  const [draft, setDraft] = useState(loadedSelection);
  const [applied, setApplied] = useState(loadedSelection);
  const [draftCustom, setDraftCustom] = useState(loadedCustom);
  const [appliedCustom, setAppliedCustom] = useState(loadedCustom);
  const [customInput, setCustomInput] = useState(() => loadedCustom.join(", "));
  const [customInvalid, setCustomInvalid] = useState([]);
  const [customTruncated, setCustomTruncated] = useState(false);
  const applyingRef = useRef(null);

  useEffect(() => {
    setApplied(loadedSelection);
    setAppliedCustom(loadedCustom);
    setDraft((prev) => {
      const unchanged = JSON.stringify(prev) === JSON.stringify(applied);
      return unchanged ? loadedSelection : prev;
    });
    setDraftCustom((prev) => {
      const unchanged = JSON.stringify(prev) === JSON.stringify(appliedCustom);
      if (unchanged) {
        setCustomInput(loadedCustom.join(", "));
        return loadedCustom;
      }
      return prev;
    });
  }, [loadedSelection, loadedCustom]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when parent zips change

  useEffect(() => {
    if (!isLoading && applyingRef.current) {
      setApplied(applyingRef.current.selection);
      setAppliedCustom(applyingRef.current.custom);
      setCustomInput(applyingRef.current.custom.join(", "));
      applyingRef.current = null;
    }
  }, [isLoading]);

  const hasPendingChanges = useMemo(() => {
    const presetChanged = JSON.stringify(draft) !== JSON.stringify(applied);
    const customChanged =
      JSON.stringify([...draftCustom].sort()) !== JSON.stringify([...appliedCustom].sort());
    return presetChanged || customChanged;
  }, [draft, applied, draftCustom, appliedCustom]);

  const updateCustomInput = useCallback((value) => {
    setCustomInput(value);
    const { valid, invalid, truncated } = parseCustomZips(value);
    setDraftCustom(valid);
    setCustomInvalid(invalid);
    setCustomTruncated(truncated);
  }, []);

  const removeCustomZip = useCallback(
    (zip) => {
      const next = draftCustom.filter((z) => z !== zip);
      setDraftCustom(next);
      setCustomInput(next.join(", "));
      setCustomInvalid([]);
      setCustomTruncated(false);
    },
    [draftCustom]
  );

  const applySelection = useCallback(() => {
    if (customInvalid.length > 0) return;
    if (!hasAnyMarket(draft, draftCustom)) return;
    applyingRef.current = { selection: { ...draft }, custom: [...draftCustom] };
    onApply(buildZipsCsv(draft, draftCustom, areas));
  }, [draft, draftCustom, customInvalid, onApply, areas]);

  const toggle = (id) =>
    setDraft((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!hasAnyMarket(next, draftCustom)) return prev;
      return next;
    });

  const setGroup = (group, value) =>
    setDraft((prev) => {
      const next = { ...prev };
      areas.filter((a) => a.group === group).forEach((a) => (next[a.id] = value));
      if (!hasAnyMarket(next, draftCustom)) return prev;
      return next;
    });

  const loadedAreas = areasFromSelection(applied, areas);
  const draftAreas = areasFromSelection(draft, areas);
  const { added, removed } = selectionDiff(applied, draft, areas);
  const customAdded = draftCustom.filter((z) => !appliedCustom.includes(z));
  const customRemoved = appliedCustom.filter((z) => !draftCustom.includes(z));

  const summaryLabels = loadedAreas.slice(0, 3).map((a) => a.label.split(" ")[0]);
  const summaryParts = [];
  if (loadedAreas.length > 0) {
    summaryParts.push(
      `${loadedAreas.length} market${loadedAreas.length !== 1 ? "s" : ""}${
        summaryLabels.length
          ? ` · ${summaryLabels.join(", ")}${loadedAreas.length > 3 ? "…" : ""}`
          : ""
      }`
    );
  }
  if (appliedCustom.length > 0) {
    summaryParts.push(
      `${appliedCustom.length} ZIP code${appliedCustom.length !== 1 ? "s" : ""}`
    );
  }
  const summary = summaryParts.length ? summaryParts.join(" · ") : "No markets selected";

  const isApplying = isLoading && applyingRef.current != null;
  const canApply =
    hasPendingChanges && customInvalid.length === 0 && hasAnyMarket(draft, draftCustom);

  return (
    <div className={`${PANEL} overflow-hidden !p-0`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`flex w-full items-center justify-between gap-3 py-4 text-left transition hover:bg-white/4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset ${PANEL_X}`}
        aria-expanded={expanded}
        aria-controls="market-areas-panel"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <MapPin size={16} className="shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white/90">Market areas</div>
            <div className="truncate text-xs text-white/55">{summary}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasPendingChanges && !isApplying && (
            <span className="text-xs text-amber-300">Unsaved changes</span>
          )}
          {isApplying && <span className="text-xs text-amber-400">Updating…</span>}
          <ChevronDown
            size={18}
            className={"text-white/55 transition-transform " + (expanded ? "rotate-180" : "")}
            aria-hidden
          />
        </div>
      </button>

      {expanded && (
        <div id="market-areas-panel" className={`border-t border-white/8 pb-5 pt-5 sm:pb-6 ${PANEL_X}`}>
          <div className="space-y-3">
            <div className={`flex min-h-[44px] flex-wrap items-center gap-2 ${PANEL_INSET}`}>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Loaded in deals:
              </span>
              {loadedAreas.length === 0 && appliedCustom.length === 0 ? (
                <span className="text-xs text-white/45">None</span>
              ) : (
                <>
                  {loadedAreas.map((area) => (
                    <span
                      key={area.id}
                      className="inline-flex items-center gap-1 rounded-full border border-leaf/40 bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf"
                    >
                      ✓ {area.flag} {area.label}
                    </span>
                  ))}
                  {appliedCustom.map((zip) => (
                    <span
                      key={zip}
                      className="inline-flex items-center gap-1 rounded-full border border-sky/40 bg-sky/10 px-2.5 py-1 text-xs font-semibold text-sky"
                    >
                      ✓ 📍 {zip}
                    </span>
                  ))}
                </>
              )}
            </div>

            {hasPendingChanges && (
              <div className={`flex min-h-[44px] flex-wrap items-center gap-2 ${PANEL_INSET} border-amber-500/25 bg-amber-500/5`}>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                  Selected (unsaved):
                </span>
                {draftAreas.map((area) => (
                  <span
                    key={area.id}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100"
                  >
                    {area.flag} {area.label}
                  </span>
                ))}
                {draftCustom.map((zip) => (
                  <span
                    key={zip}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100"
                  >
                    📍 {zip}
                  </span>
                ))}
                {(added.length > 0 ||
                  removed.length > 0 ||
                  customAdded.length > 0 ||
                  customRemoved.length > 0) && (
                  <span className="w-full text-[11px] text-amber-200/70">
                    {added.length > 0 && `+ ${added.map((a) => a.label).join(", ")}`}
                    {added.length > 0 && removed.length > 0 && " · "}
                    {removed.length > 0 && `− ${removed.map((a) => a.label).join(", ")}`}
                    {customAdded.length > 0 &&
                      `${added.length || removed.length ? " · " : ""}+ ZIP ${customAdded.join(", ")}`}
                    {customRemoved.length > 0 &&
                      `${added.length || removed.length || customAdded.length ? " · " : ""}− ZIP ${customRemoved.join(", ")}`}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 space-y-5">
            {visibleGroups.map((group) => (
              <div key={group.id}>
                <div className="mb-2.5 flex items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    {group.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGroup(group.id, true)}
                    className="text-xs text-sky underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroup(group.id, false)}
                    className="text-xs text-white/55 underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    None
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {areas.filter((a) => a.group === group.id).map((area) => {
                    const selected = draft[area.id];
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggle(area.id)}
                        disabled={isApplying}
                        aria-pressed={selected}
                        className={
                          "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 " +
                          (selected
                            ? "border-leaf/60 bg-leaf/10 text-leaf"
                            : "border-white/12 text-white/60 hover:border-white/35 hover:text-white/85")
                        }
                      >
                        {area.flag} {area.label}
                        {selected && " ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-white/8 pt-5">
            <label
              htmlFor="custom-zip-input"
              className="block text-[11px] font-semibold uppercase tracking-wider text-white/60"
            >
              Additional markets
            </label>
            <p className="mt-1 text-xs text-white/50">
              Enter up to {MAX_CUSTOM_ZIPS} US ZIP codes, separated by commas.
            </p>
            <input
              id="custom-zip-input"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              value={customInput}
              onChange={(e) => updateCustomInput(e.target.value)}
              placeholder="e.g. 77036, 60632, 90255"
              disabled={isApplying}
              className="mt-3 min-h-[44px] w-full rounded-xl border border-white/15 bg-ink px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-white/40 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
            />
            {customInvalid.length > 0 && (
              <p className="mt-2 text-xs text-red-300" role="alert">
                Invalid ZIP{customInvalid.length !== 1 ? "s" : ""}: {customInvalid.join(", ")} —
                use 5-digit US ZIP codes.
              </p>
            )}
            {customTruncated && (
              <p className="mt-2 text-xs text-amber-200/80">
                Only the first {MAX_CUSTOM_ZIPS} valid ZIPs are kept.
              </p>
            )}
            {draftCustom.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {draftCustom.map((zip) => (
                  <button
                    key={zip}
                    type="button"
                    onClick={() => removeCustomZip(zip)}
                    disabled={isApplying}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-sky/40 bg-sky/10 px-2.5 py-1 text-xs font-semibold text-sky transition hover:bg-sky/15 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
                    aria-label={`Remove ZIP ${zip}`}
                  >
                    📍 {zip}
                    <X size={12} aria-hidden />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={applySelection}
              disabled={isApplying || !canApply}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink-2"
            >
              {isApplying ? "Updating…" : "Apply markets"}
            </button>
            <p className="text-xs text-white/55">
              Apply updates competitor deals for your selected markets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
